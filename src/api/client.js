// Network layer: shared HTTP client and interceptors.
// Patterns: request-ID tracing, retry/backoff, 429 rate-limit, GET dedup, typed errors.

import axios from 'axios';
import config from '../config';
import {
  getStoredToken,
  getStoredRefreshToken,
  saveAuthSession,
  removeAuthSession,
  getStoredAuthSession,
} from '../features/auth/auth.storage';


// ─────────────────────────────────────────────
// 1. TYPED ERROR CATALOGUE
// Single source of truth for every user-visible error string.
// Screens import getFriendlyError(err) — never hardcode messages in UI.
// ─────────────────────────────────────────────
export const ERROR_MESSAGES = {
  NETWORK_ERROR:          'No internet connection. Please check your network and try again.',
  TIMEOUT_ERROR:          'The request timed out. Please try again in a moment.',
  SESSION_EXPIRED:        'Your session has expired. Please log in again.',
  SESSION_REFRESH_FAILED: 'Could not refresh your session. Please log in again.',
  RATE_LIMITED:           'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR:           'Our servers are experiencing issues. Please try again shortly.',
  API_ERROR:              'Something went wrong. Please try again.',
  UNKNOWN:                'An unexpected error occurred. Please try again.',
};

/**
 * Returns the most user-friendly error message for a caught error.
 * Works for: axios interceptor errors, validation errors, unexpected throws.
 *
 * Usage in screens:
 *   import { getFriendlyError } from '../../api/client';
 *   setApiError(getFriendlyError(err));
 */
export const getFriendlyError = (err) => {
  if (!err) return ERROR_MESSAGES.UNKNOWN;
  // Typed error from our interceptor — message is already user-friendly
  if (err.message && err.type) return err.message;
  // Plain Error or validation error with a message
  if (err.message) return err.message;
  // Fallback by type code
  if (err.type) return ERROR_MESSAGES[err.type] || ERROR_MESSAGES.UNKNOWN;
  return ERROR_MESSAGES.UNKNOWN;
};

// ─────────────────────────────────────────────
// 2. REQUEST-ID GENERATOR
// Lightweight ID: timestamp + 6 random hex chars.
// Sent as X-Request-ID header so the backend can correlate logs.
// ─────────────────────────────────────────────
const generateRequestId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

// ─────────────────────────────────────────────
// 3. RETRY CONFIG
// Mirrors patterns used by Swiggy / Zepto / GPay:
//   - Retry network errors and 5xx responses (not 4xx — those are client errors)
//   - Exponential backoff: 1s → 2s → 4s
//   - Do NOT retry POST/PATCH/DELETE (non-idempotent) unless explicitly opted-in
// ─────────────────────────────────────────────
const RETRY_CONFIG = {
  maxAttempts: 3,
  retryableStatusCodes: [500, 502, 503, 504],
  retryableMethods: ['get', 'head', 'options'],  // idempotent only by default
  baseDelayMs: 1000,
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryable = (error, reqConfig) => {
  if (axios.isCancel(error)) return false;
  // Already at max retries
  if ((reqConfig._retryCount || 0) >= RETRY_CONFIG.maxAttempts) return false;
  const method = reqConfig.method?.toLowerCase();
  // Only retry idempotent methods (or explicitly opted-in via _allowRetry)
  if (!RETRY_CONFIG.retryableMethods.includes(method) && !reqConfig._allowRetry) return false;
  // Network / timeout errors — always retryable
  if (!error.response) return true;
  // 5xx server errors
  return RETRY_CONFIG.retryableStatusCodes.includes(error.response.status);
};

// ─────────────────────────────────────────────
// 4. GET REQUEST DEDUPLICATION
// Prevents double-firing when two components mount simultaneously
// and request the same endpoint (common in tab switches / modals).
// ─────────────────────────────────────────────
const inFlightRequests = new Map();

const getDedupeKey = (reqConfig) => {
  if (reqConfig.method?.toLowerCase() !== 'get') return null;
  const params = reqConfig.params ? JSON.stringify(reqConfig.params) : '';
  return `${reqConfig.url}::${params}`;
};

// ─────────────────────────────────────────────
// 5. UNAUTHORIZED CALLBACK (navigation to Login)
// ─────────────────────────────────────────────
let onUnauthorizedCallback = null;
export const setUnauthorizedCallback = (cb) => {
  onUnauthorizedCallback = cb;
};

// ─────────────────────────────────────────────
// 6. AXIOS INSTANCE
// ─────────────────────────────────────────────
const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
});

// ─────────────────────────────────────────────
// 7. REQUEST INTERCEPTOR
// ─────────────────────────────────────────────
api.interceptors.request.use(async reqConfig => {
  // 7a. Auth token
  const token = await getStoredToken();
  reqConfig.headers = reqConfig.headers ?? {};
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }

  // 7b. Content-Type
  if (reqConfig.data instanceof FormData) {
    delete reqConfig.headers['Content-Type'];
  } else if (reqConfig.data) {
    reqConfig.headers['Content-Type'] = 'application/json';
  }

  // 7c. Request ID tracing — every request gets a unique ID
  const requestId = generateRequestId();
  reqConfig.headers['X-Request-ID'] = requestId;
  reqConfig._requestId = requestId;

  // 7d. GET deduplication — attach to existing in-flight promise if duplicate
  const dedupeKey = getDedupeKey(reqConfig);
  if (dedupeKey) {
    if (inFlightRequests.has(dedupeKey)) {
      if (__DEV__) {
        console.log(`🔁 [DEDUP] Reusing in-flight GET: ${reqConfig.url}`);
      }
    }
    reqConfig._dedupeKey = dedupeKey;
  }

  // 7e. Dev logging
  if (__DEV__) {
    let bodyLog = reqConfig.data;
    if (reqConfig.data instanceof FormData) {
      bodyLog = reqConfig.data._parts
        ? Object.fromEntries(reqConfig.data._parts)
        : '[FormData]';
    }
    console.log(
      `📤 [${reqConfig._requestId}] ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`,
      bodyLog !== undefined ? { payload: bodyLog } : '',
    );
  }

  return reqConfig;
});

// ─────────────────────────────────────────────
// 8. RESPONSE INTERCEPTOR
// ─────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];
let refreshFailureCount = 0;

const flushQueue = (token, error) => {
  failedQueue.forEach(p => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
};

const forceLogout = async () => {
  if (__DEV__) console.log('🔴 [AUTH] Session expired — forcing logout');
  await removeAuthSession();
  if (onUnauthorizedCallback) onUnauthorizedCallback();
};

api.interceptors.response.use(
  // ── SUCCESS ──
  res => {
    // Clean up deduplication tracker
    if (res.config?._dedupeKey) {
      inFlightRequests.delete(res.config._dedupeKey);
    }
    if (__DEV__) {
      console.log(
        `📥 [${res.config?._requestId}] ${res.config?.method?.toUpperCase()} ${res.config?.url}`,
        { status: res.status, data: res.data },
      );
    }
    return res;
  },

  // ── ERROR ──
  async error => {
    const original = error.config || {};
    const statusCode = error.response?.status;
    const requestId = original._requestId;

    // Clean up dedup tracker on error too
    if (original._dedupeKey) {
      inFlightRequests.delete(original._dedupeKey);
    }

    // 8a. Cancelled requests — pass through untouched (AbortController / axios.CancelToken)
    if (axios.isCancel(error)) return Promise.reject(error);

    // 8b. Dev error logging
    if (__DEV__) {
      console.log(
        `❌ [${requestId}] ${original?.method?.toUpperCase?.()} ${original?.url}`,
        {
          status: statusCode || 'NO_RESPONSE',
          error: error.response?.data || error.message,
          code: error.code,
        },
      );
    }

    // ── 8c. RETRY WITH EXPONENTIAL BACKOFF ──
    if (isRetryable(error, original)) {
      original._retryCount = (original._retryCount || 0) + 1;
      const delayMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, original._retryCount - 1);

      if (__DEV__) {
        console.log(
          `♻️ [${requestId}] Retry ${original._retryCount}/${RETRY_CONFIG.maxAttempts} in ${delayMs}ms — ${original.url}`,
        );
      }

      await sleep(delayMs);
      return api(original);
    }

    // ── 8d. 429 RATE LIMITING ──
    if (statusCode === 429) {
      const retryAfterSec = parseInt(error.response?.headers?.['retry-after'] || '5', 10);
      const retryAfterMs = Math.min(retryAfterSec * 1000, 30_000); // cap at 30s

      if (__DEV__) {
        console.log(`⏳ [${requestId}] Rate limited (429) — retrying in ${retryAfterSec}s`);
      }

      if (!original._rateLimitRetried) {
        original._rateLimitRetried = true;
        await sleep(retryAfterMs);
        return api(original);
      }

      return Promise.reject({
        message: ERROR_MESSAGES.RATE_LIMITED,
        type: 'RATE_LIMITED',
        statusCode: 429,
        requestId,
        backendError: error.response?.data || null,
      });
    }

    // ── 8e. NETWORK / TIMEOUT ERRORS (no response) ──
    if (!error.response) {
      const isTimeout =
        error.code === 'ECONNABORTED' || error.message?.includes('timeout');

      return Promise.reject({
        message: isTimeout ? ERROR_MESSAGES.TIMEOUT_ERROR : ERROR_MESSAGES.NETWORK_ERROR,
        type: isTimeout ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
        statusCode: null,
        requestId,
        backendError: null,
      });
    }

    // ── 8f. 401 — Already retried once (token refresh itself failed) ──
    if (statusCode === 401 && original._retry) {
      const sessionExpiredError = {
        message: ERROR_MESSAGES.SESSION_EXPIRED,
        type: 'SESSION_EXPIRED',
        statusCode: 401,
        requestId,
      };
      flushQueue(null, sessionExpiredError);
      await forceLogout();
      refreshFailureCount = 0;
      return Promise.reject(sessionExpiredError);
    }

    // ── 8g. 401 — First occurrence → attempt token refresh ──
    if (statusCode === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getStoredRefreshToken();

        if (!refreshToken) {
          const sessionExpiredError = {
            message: ERROR_MESSAGES.SESSION_EXPIRED,
            type: 'SESSION_EXPIRED',
            statusCode: 401,
            requestId,
          };
          flushQueue(null, sessionExpiredError);
          await forceLogout();
          refreshFailureCount = 0;
          return Promise.reject(sessionExpiredError);
        }

        const res = await axios.post(`${config.API_BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = res.data.token;
        const newRefreshToken = res.data.refreshToken || refreshToken;

        const session = await getStoredAuthSession();
        await saveAuthSession({ ...session, token: newToken, refreshToken: newRefreshToken });

        refreshFailureCount = 0;
        flushQueue(newToken, null);

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        refreshFailureCount += 1;

        const refreshFailureError = {
          message: err?.message || ERROR_MESSAGES.SESSION_REFRESH_FAILED,
          type: 'SESSION_REFRESH_FAILED',
          statusCode: 401,
          requestId,
        };

        flushQueue(null, refreshFailureError);

        if (refreshFailureCount >= 2) {
          const sessionExpiredError = {
            message: ERROR_MESSAGES.SESSION_EXPIRED,
            type: 'SESSION_EXPIRED',
            statusCode: 401,
            requestId,
          };
          await forceLogout();
          refreshFailureCount = 0;
          return Promise.reject(sessionExpiredError);
        }

        return Promise.reject(refreshFailureError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 8h. 5xx SERVER ERRORS (after retry exhaustion) ──
    if (statusCode >= 500) {
      return Promise.reject({
        message: ERROR_MESSAGES.SERVER_ERROR,
        type: 'SERVER_ERROR',
        statusCode,
        requestId,
        backendError: error.response?.data || null,
      });
    }

    // ── 8i. ALL OTHER API ERRORS (4xx) ──
    // Backend message is shown directly — it's already user-relevant
    return Promise.reject({
      message: error.response?.data?.message || ERROR_MESSAGES.API_ERROR,
      type: 'API_ERROR',
      statusCode,
      requestId,
      backendError: error.response?.data || null,
    });
  },
);

export default api;
