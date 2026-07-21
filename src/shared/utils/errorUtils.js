/**
 * ─────────────────────────────────────────────────────────────────────────────
 * UI ERROR MAPPER: Centralizes error extraction and maps technical errors to
 * user-friendly localized messages.
 * ─────────────────────────────────────────────────────────────────────────────
 * RELATIONSHIP WITH client.js:
 *   - client.js is the "Network layer" (HTTP Client). It fetches raw responses
 *     and wraps network/Axios exceptions into standard objects with status codes:
 *       { message, type, statusCode, backendError }
 *   - errorUtils.js is the "UI layer helper". It takes those standard error objects
 *     (or raw strings) and extracts the message. It then translates developer jargon
 *     (like MongoDB tracebacks or OpenSSL errors) into polite, safe, human-readable
 *     strings for our B2B farmers and traders.
 * 
 * WHY IT EXISTS:
 *   Without errorUtils.js, developers would have to manually parse API error objects,
 *   write repeated try/catch string extraction logic on every screen, and risk
 *   exposing raw database code stack-traces directly to app users (which is bad UX
 *   and a security issue).
 * 
 * WHAT HAPPENS IF WE REMOVE IT:
 *   Users would see confusing, highly technical system crash logs (like "E11000 duplicate
 *   key collection...") when things go wrong, and screens would require massive
 *   amounts of boilerplate catch code.
 */

/**
 * Extracts the raw backend error message safely from any API response error object.
 * Reusable across all Redux thunks and API call catch blocks.
 *
 * @param {any} err - The error object caught in try-catch
 * @returns {string} The raw message sent by the server or standard network message
 */
export const extractErrorMessage = (err) => {
  if (!err) return 'An unexpected error occurred';
  return err?.backendError?.message ||
         err?.backendError?.error?.message ||
         err?.response?.data?.message ||
         err?.response?.data?.error?.message ||
         err?.message ||
         'An unexpected error occurred';
};

/**
 * Maps raw backend/technical errors to user-friendly messages.
 * If the message is already user-friendly, returns it as-is.
 * Supports status-code based mapping for standard HTTP responses.
 *
 * @param {string | any} errorMsg - The raw error message or error object
 * @returns {string} User-friendly error message
 */
export const getFriendlyErrorMessage = (errorMsg) => {
  if (!errorMsg) {
    return 'An unexpected error occurred. Please try again.';
  }

  // 1. Extract status code if complex object is passed
  let statusCode = null;
  if (errorMsg && typeof errorMsg === 'object') {
    statusCode = errorMsg.statusCode || errorMsg.status || errorMsg.response?.status;
  }

  // 2. Extract message string
  let message = '';
  if (typeof errorMsg === 'string') {
    message = errorMsg;
  } else {
    message = extractErrorMessage(errorMsg);
  }

  // Trim whitespace
  message = message.trim();

  // 3. Status Code Mapping (Best Practice)
  if (statusCode) {
    switch (Number(statusCode)) {
      case 400:
        return message || 'Invalid request details. Please check your inputs.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource could not be found.';
      case 409:
        if (/active offer/i.test(message) || /offer/i.test(message)) {
          return message;
        }
        return 'A duplicate listing or entry already exists. Please verify your details.';
      case 422:
        return 'Validation failed. Some required details are missing or invalid.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Something went wrong on our end. Please try again in a moment, or contact support if the issue persists.';
      default:
        break;
    }
  }

  // 4. Regex string match mapping (Defensive Fallback for raw text/unmapped status codes)

  // 0. Unique/Duplicate constraint checks (e.g. duplicate listings, MongoDB unique index violations)
  if (
    /duplicate key/i.test(message) ||
    /e11000/i.test(message) ||
    /duplicate listing/i.test(message)
  ) {
    return 'A duplicate listing already exists. You have already created a listing with the same details.';
  }

  // 1. Commodity delete blocked by active negotiations
  if (
    /cannot delete commodity listing while offers or negotiations are ongoing/i.test(message) ||
    /negotiations are ongoing/i.test(message) ||
    /active offers.*ongoing/i.test(message)
  ) {
    return 'This listing cannot be deleted because one or more active buyer negotiations are currently in progress. Please wait for all negotiations to conclude (accepted, rejected, or expired) before deleting this listing.';
  }

  // 2. Verification Service / Decoder issues
  if (
    /decoder/i.test(message) ||
    /unsupported/i.test(message) ||
    /error:\w{8}:/i.test(message) ||
    /cipher/i.test(message) ||
    /key/i.test(message)
  ) {
    return 'We are experiencing a connection issue with the verification service. Please try again later or contact support.';
  }

  // 3. Network Connectivity & Timeout issues
  if (
    /NO_INTERNET_WRITE_BLOCKED/i.test(message)
  ) {
    return 'Please connect to Wi-Fi or mobile data to perform this action.';
  }

  if (
    /econnrefused/i.test(message) ||
    /enotfound/i.test(message) ||
    /network error/i.test(message) ||
    /unable to reach/i.test(message) ||
    /timeout/i.test(message) ||
    /econnaborted/i.test(message)
  ) {
    return 'Could not connect to the server. Please check your internet connection and try again.';
  }

  // 4. Technical System & Server Crash errors (Fallback)
  if (
    /mongo/i.test(message) ||
    /cast to objectid/i.test(message) ||
    /validationerror/i.test(message) ||
    /db_/i.test(message) ||
    /\b500\b/i.test(message) ||
    /internal server error/i.test(message) ||
    /\b502\b/i.test(message) ||
    /bad gateway/i.test(message) ||
    /\b503\b/i.test(message) ||
    /\b504\b/i.test(message) ||
    /typeerror/i.test(message) ||
    /referenceerror/i.test(message) ||
    /syntaxerror/i.test(message) ||
    /cannot read/i.test(message) ||
    /is not a function/i.test(message) ||
    /cannot (get|post|patch|put|delete)\s+\//i.test(message) ||
    /multer/i.test(message) ||
    /limit_file_size/i.test(message) ||
    /payload too large/i.test(message)
  ) {
    return 'Something went wrong on our end. Please try again in a moment, or contact support if the issue persists.';
  }

  // 5. Authentication & OTP errors
  if (/invalid otp/i.test(message)) {
    const attemptsMatch = message.match(/(\d+)\s+attempt/i);
    if (attemptsMatch) {
      const attempts = attemptsMatch[1];
      return `Incorrect OTP entered. You have ${attempts} attempt(s) remaining before your account gets locked.`;
    }
    return 'Incorrect OTP entered. Please verify the code sent to your mobile and try again.';
  }

  // Actionable messages pass through as-is
  return message;
};

/**
 * Determines if a caught error represents a silent cancellation (e.g., user-aborted or unmount)
 * that should not trigger any user-facing error UI.
 *
 * @param {any} err - The caught error object
 * @returns {boolean} True if it is a silent cancel
 */
export const isSilentCancel = (err) => {
  if (!err) return false;
  if (err.message === 'NO_INTERNET_WRITE_BLOCKED' || err.message?.includes('NO_INTERNET_WRITE_BLOCKED')) {
    return false;
  }
  const isAxiosCancel = !!err.__CANCEL__;
  const isAbortError = err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED';
  return isAxiosCancel || isAbortError;
};
