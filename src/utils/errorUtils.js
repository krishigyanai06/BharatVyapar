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
 *
 * @param {string | any} errorMsg - The raw error message or error object
 * @returns {string} User-friendly error message
 */
export const getFriendlyErrorMessage = (errorMsg) => {
  if (!errorMsg) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Handle case where object is passed instead of string
  let message = '';
  if (typeof errorMsg === 'string') {
    message = errorMsg;
  } else {
    message = extractErrorMessage(errorMsg);
  }

  // Trim whitespace
  message = message.trim();

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
    /econnrefused/i.test(message) ||
    /enotfound/i.test(message) ||
    /network error/i.test(message) ||
    /unable to reach/i.test(message) ||
    /timeout/i.test(message) ||
    /econnaborted/i.test(message)
  ) {
    return 'Could not connect to the server. Please check your internet connection and try again.';
  }

  // 4. Technical System & Server Crash errors (Generic Database, Server status, JS Exceptions)
  if (
    /mongo/i.test(message) ||
    /cast to objectid/i.test(message) ||
    /duplicate key/i.test(message) ||
    /validationerror/i.test(message) ||
    /db_/i.test(message) ||
    /e11000/i.test(message) ||
    /500/i.test(message) ||
    /internal server error/i.test(message) ||
    /502/i.test(message) ||
    /bad gateway/i.test(message) ||
    /503/i.test(message) ||
    /504/i.test(message) ||
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
