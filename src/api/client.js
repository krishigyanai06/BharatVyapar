/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NETWORK LAYER: shared HTTP client (Axios) and interceptors.
 * ─────────────────────────────────────────────────────────────────────────────
 * RELATIONSHIP WITH errorUtils.js:
 *   - client.js is the "Network layer" (communicator with the server). It handles
 *     auth headers, request-ID logging, retries, 429 rate-limiting, and refreshes
 *     expired auth tokens. If a request fails, it intercepts the Axios error and
 *     packages it into a standardized schema object:
 *       { message, type, statusCode, backendError }
 *   - client.js DOES NOT map or translate raw database errors or custom message texts
 *     into friendly UI labels. Instead, it rejects the standard error object,
 *     which the screens/hooks pass to `getFriendlyErrorMessage(error)` in `errorUtils.js`.
 * 
 * WHY IT EXISTS:
 *   Without client.js, we would have to duplicate authentication header setting,
 *   token refresh checks, request tracing IDs, rate limit delays, and error wrappers
 *   across every single API call block in the app.
 * 
 * WHAT HAPPENS IF WE REMOVE IT:
 *   API integration would become extremely fragile, duplicate requests would trigger,
 *   auth session sync would break, and network failures would cause unhandled crashes.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';
import {
  getStoredToken,
  getStoredRefreshToken,
  saveAuthSession,
  removeAuthSession,
  getStoredAuthSession,
} from '../features/auth/auth.storage';
import { getNetworkStatusStatic } from '../shared/components/NetworkProvider';


// ─────────────────────────────────────────────
// 1. TYPED ERROR CATALOGUE
// Single source of truth for every user-visible error string.
// Screens import getFriendlyErrorMessage from errorUtils.js — never hardcode messages in UI.
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
 * @deprecated - Use getFriendlyErrorMessage(err) from shared/utils/errorUtils.js instead!
 * 
 * getFriendlyErrorMessage handles complex object parsing, validation errors,
 * and comprehensive HTTP status code mappings.
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

// ─────────────────────────────────────────────────────────────────
// 3. RETRY CONFIG
// Mirrors patterns used by Swiggy / Zepto / GPay:
//   - Retry network errors and 5xx responses (not 4xx — those are client errors)
//   - Exponential backoff: 1s → 2s → 4s
//   - Do NOT retry POST/PATCH/DELETE (non-idempotent) unless explicitly opted-in
// ─────────────────────────────────────────────────────────────────
const RETRY_CONFIG = {
  maxAttempts: 3,
  retryableStatusCodes: [500, 502, 503, 504],
  retryableMethods: ['get', 'head', 'options'],  // idempotent only by default
  baseDelayMs: 1000,
};

// ─────────────────────────────────────────────────────────────────
// 3a. OFFLINE GET CACHE CONFIG
// TTL: How long cached data is considered "fresh" before it is treated as stale.
// Stale cache is NOT served — error propagates so the UI can show a proper message.
// Key prefix: '@cache_' keeps all cache entries namespaced, easy to audit/clear.
// _noCache flag: Sensitive endpoints (e.g. bank details, auth tokens) can opt out.
// _offlineSync flag: Write operations that are safe to queue offline opt IN.
// ─────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY_PREFIX = '@cache_';

const sleep = (ms, signal) => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new axios.Cancel('Request aborted during retry backoff'));
    }
    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new axios.Cancel('Request aborted during retry backoff'));
    }

    if (signal) {
      signal.addEventListener('abort', onAbort);
    }
  });
};

const isRetryable = (error, reqConfig) => {
  if (axios.isCancel(error)) return false;
  if (reqConfig._noRetry) return false;
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

  // 7c. Request ID tracing — preserve original across retries for correlation, append attempt suffix
  if (!reqConfig._requestId) {
    reqConfig._requestId = generateRequestId();
  }
  const attempt = reqConfig._retryCount ? `;attempt=${reqConfig._retryCount + 1}` : '';
  reqConfig.headers['X-Request-ID'] = `${reqConfig._requestId}${attempt}`;

  // 7d. GET deduplication — attach to existing in-flight promise if duplicate
  const dedupeKey = getDedupeKey(reqConfig);
  if (dedupeKey) {
    if (inFlightRequests.has(dedupeKey)) {
      // If this request is already retrying, let it pass through to perform the actual call
      if (reqConfig._retryCount > 0 || reqConfig._rateLimitRetried || reqConfig._retry) {
        // Active retry/refresh attempt — bypass duplicate rejection
      } else {
        if (__DEV__) {
          console.log(`🔁 [DEDUP] Reusing in-flight GET: ${reqConfig.url}`);
        }
        return Promise.reject({ __isDeduplicated: true, dedupeKey });
      }
    } else {
      inFlightRequests.set(dedupeKey, { callbacks: [] });
      reqConfig._dedupeKey = dedupeKey;
    }
  }

  // 7e. OFFLINE WRITE BLOCKER
  // Blocks non-GET requests when offline UNLESS caller explicitly opts in
  // via { _offlineSync: true } at the call site (service/screen layer).
  //
  // WHY Config Flag instead of URL check:
  //   URL check (config.url.includes('/counter')) = Feature logic inside Infrastructure = ❌
  //   Config flag check (config._offlineSync) = Infrastructure reads generic intent = ✅
  //
  // Stale/duplicate prevention: This runs at request time, so cancelled requests
  // never reach the network — no duplicate entries in server or queue.
  if (!getNetworkStatusStatic() && reqConfig.method?.toLowerCase() !== 'get') {
    if (!reqConfig._offlineSync) {
      const cancelSource = axios.CancelToken.source();
      reqConfig.cancelToken = cancelSource.token;
      cancelSource.cancel('NO_INTERNET_WRITE_BLOCKED');
      if (__DEV__) {
        console.log(`🚫 [OfflineBlocker] Non-syncable write blocked (offline): ${reqConfig.url}`);
      }
    }
  }

  // 7f. Dev logging
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
  async res => {
    // Clean up deduplication tracker
    if (res.config?._dedupeKey) {
      const dedupeKey = res.config._dedupeKey;
      const active = inFlightRequests.get(dedupeKey);
      if (active) {
        active.callbacks.forEach(cb => cb.resolve(res));
      }
      inFlightRequests.delete(dedupeKey);
    }

    // 8a-cache. WRITE GET RESPONSE TO LOCAL CACHE
    // Runs on every successful GET unless caller opts out via { _noCache: true }.
    // Stores { data, timestamp } so we can enforce TTL on retrieval.
    // Wrapped in try/catch — AsyncStorage failure must NEVER crash a successful API response.
    // Memory safety: Same key always overwrites — no unbounded growth per endpoint.
    if (res.config?.method?.toLowerCase() === 'get' && !res.config?._noCache) {
      try {
        const cacheKey = `${CACHE_KEY_PREFIX}${res.config.url}`;
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ data: res.data, timestamp: Date.now() }),
        );
      } catch (cacheWriteErr) {
        // Silent fail — cache write failure is non-critical
        if (__DEV__) console.warn('💾 [Cache] Write failed (non-critical):', cacheWriteErr?.message);
      }
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
    // Handle queue waiting for duplicate requests
    if (error && error.__isDeduplicated) {
      const { dedupeKey } = error;
      if (__DEV__) {
        console.log(`⏳ [DEDUP] Request queued: waiting for in-flight GET to complete`);
      }
      return new Promise((resolve, reject) => {
        const active = inFlightRequests.get(dedupeKey);
        if (active) {
          active.callbacks.push({ resolve, reject });
        } else {
          reject(error);
        }
      });
    }

    const original = error.config || {};
    const statusCode = error.response?.status;
    const requestId = original._requestId;

    // Standardized rejection helper that also rejects any queued duplicates
    const rejectWithStandardizedError = (formatted) => {
      if (original._dedupeKey) {
        const dedupeKey = original._dedupeKey;
        const active = inFlightRequests.get(dedupeKey);
        if (active) {
          active.callbacks.forEach(cb => cb.reject(formatted));
        }
        inFlightRequests.delete(dedupeKey);
      }
      return Promise.reject(formatted);
    };

    // 8a. Cancelled requests — pass through untouched (AbortController / axios.CancelToken)
    if (axios.isCancel(error)) {
      if (original._dedupeKey) {
        const dedupeKey = original._dedupeKey;
        const active = inFlightRequests.get(dedupeKey);
        if (active) {
          active.callbacks.forEach(cb => cb.reject(error));
        }
        inFlightRequests.delete(dedupeKey);
      }
      return Promise.reject(error);
    }

    // 8b. GET CACHE FALLBACK (network errors only)
    // Triggered when a GET request fails with no server response (ERR_NETWORK).
    // Guards:
    //   - Only GET requests (POST/PUT never fall back to cache)
    //   - Only if caller did NOT opt out via { _noCache: true }
    //   - TTL check: cache older than CACHE_TTL_MS is treated as stale and NOT served
    //   - Full try/catch: AsyncStorage failure must not shadow the original network error
    if (
      !error.response &&
      original?.method?.toLowerCase() === 'get' &&
      !original?._noCache
    ) {
      try {
        const cacheKey = `${CACHE_KEY_PREFIX}${original.url}`;
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        if (cachedStr) {
          const { data: cachedData, timestamp } = JSON.parse(cachedStr);
          const isStale = (Date.now() - timestamp) > CACHE_TTL_MS;

          if (isStale) {
            // Stale data — do NOT serve it. Let error propagate naturally.
            if (__DEV__) console.warn(`⏰ [Cache] Stale cache ignored for: ${original.url}`);
          } else {
            if (__DEV__) console.log(`📵 [Cache] Serving cached response for: ${original.url}`);
            // Mock Axios response shape so callers receive identical structure
            return Promise.resolve({
              data: cachedData,
              status: 200,
              statusText: 'OK',
              headers: original.headers ?? {},
              config: original,
              isFromCache: true, // UI checks this to show 'Showing Saved Data' banner
            });
          }
        }
      } catch (cacheReadErr) {
        // Silent fail — cache read failure must not shadow the real error
        if (__DEV__) console.warn('💾 [Cache] Read failed (non-critical):', cacheReadErr?.message);
      }
    }

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

      try {
        await sleep(delayMs, original.signal);
        return api(original);
      } catch (sleepError) {
        return rejectWithStandardizedError(sleepError);
      }
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
        try {
          await sleep(retryAfterMs, original.signal);
          return api(original);
        } catch (sleepError) {
          return rejectWithStandardizedError(sleepError);
        }
      }

      return rejectWithStandardizedError({
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

      return rejectWithStandardizedError({
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
      return rejectWithStandardizedError(sessionExpiredError);
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
          return rejectWithStandardizedError(sessionExpiredError);
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
        const isTerminalRefreshError = err?.response?.status === 401 || err?.response?.status === 403;

        const refreshFailureError = {
          message: err?.message || ERROR_MESSAGES.SESSION_REFRESH_FAILED,
          type: 'SESSION_REFRESH_FAILED',
          statusCode: err?.response?.status || null,
          requestId,
        };

        flushQueue(null, refreshFailureError);

        // OPTIMIZATION: Only force logout if the token refresh endpoint specifically rejects with 401/403 (Terminal Auth Error).
        // Transient failures like network disconnects or gateway timeouts should NOT clear the user session.
        if (isTerminalRefreshError) {
          const sessionExpiredError = {
            message: ERROR_MESSAGES.SESSION_EXPIRED,
            type: 'SESSION_EXPIRED',
            statusCode: 401,
            requestId,
          };
          await forceLogout();
          refreshFailureCount = 0;
          return rejectWithStandardizedError(sessionExpiredError);
        }

        return rejectWithStandardizedError(refreshFailureError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 8h. 5xx SERVER ERRORS (after retry exhaustion) ──
    if (statusCode >= 500) {
      return rejectWithStandardizedError({
        message: ERROR_MESSAGES.SERVER_ERROR,
        type: 'SERVER_ERROR',
        statusCode,
        requestId,
        backendError: error.response?.data || null,
      });
    }

    // ── 8i. ALL OTHER API ERRORS (4xx) ──
    // Backend message is shown directly — it's already user-relevant
    return rejectWithStandardizedError({
      message: error.response?.data?.message || ERROR_MESSAGES.API_ERROR,
      type: 'API_ERROR',
      statusCode,
      requestId,
      backendError: error.response?.data || null,
    });
  },
);

export default api;
