// src/features/orders/utils/negotiationValidators.js
// Pure functions — no React, no side effects, fully unit-testable.

/**
 * Validates whether a new counter price is within the allowed movement band.
 * Default band: +/-5% of last round's price.
 *
 * @param {number} newPrice       - The proposed counter price
 * @param {number} lastRoundPrice - The price from the most recent negotiation round
 * @param {number} maxPct         - Max allowed fractional movement (default 0.05 = 5%)
 * @returns {{ valid: boolean, min?: number, max?: number }}
 */
export function validatePriceMovement(newPrice, lastRoundPrice, maxPct = 0.05) {
  if (!lastRoundPrice || lastRoundPrice <= 0) return { valid: true };
  const delta = Math.abs(newPrice - lastRoundPrice) / lastRoundPrice;
  if (delta >= maxPct) {
    return {
      valid: false,
      min: +(lastRoundPrice * (1 - maxPct + 0.001)).toFixed(0),
      max: +(lastRoundPrice * (1 + maxPct - 0.001)).toFixed(0),
    };
  }
  return { valid: true };
}

/**
 * Returns true when the negotiation round limit has been reached.
 *
 * @param {number} displayRoundCount - Current round count
 * @param {number} maxRounds         - Maximum allowed rounds
 * @returns {boolean}
 */
export function isRoundsExhausted(displayRoundCount, maxRounds) {
  return displayRoundCount >= maxRounds;
}

/**
 * Computes the remaining cooldown in seconds from a cooldownEndsAt ISO string.
 * Returns 0 if the cooldown has already passed or if no value is provided.
 *
 * @param {string | null | undefined} cooldownEndsAt - ISO 8601 timestamp from API
 * @returns {number} Remaining seconds (always >= 0)
 */
export function computeRemainingCooldown(cooldownEndsAt) {
  if (!cooldownEndsAt) return 0;
  return Math.max(0, Math.floor((new Date(cooldownEndsAt) - Date.now()) / 1000));
}

/**
 * Returns true if a cooldown period is still active.
 *
 * @param {string | null | undefined} cooldownEndsAt - ISO 8601 timestamp from API
 * @returns {boolean}
 */
export function isCooldownActive(cooldownEndsAt) {
  if (!cooldownEndsAt) return false;
  return new Date(cooldownEndsAt) > Date.now();
}
