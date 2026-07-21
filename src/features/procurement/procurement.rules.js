/**
 * orders.rules.js — Pure Business Rules, Status Enums, & Validations for Orders Domain
 *
 * 10x MNC RULE:
 * 1. Zero React Hooks (no useState, useEffect)
 * 2. Zero Network Calls (no Axios, apiClient)
 * 3. 100% Pure Functions — Instant Unit Testable with Jest!
 */

// ─── STATUS ENUMS ─────────────────────────────────────────────────────────────
export const REQUIREMENT_STATUS = {
  OPEN: 'OPEN',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  FILLED: 'FILLED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

export const QUOTE_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
};

export const ORDER_STATUS = {
  PENDING_DISPATCH: 'Pending Dispatch',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
};

// ─── BUSINESS VALIDATION RULES ────────────────────────────────────────────────

/**
 * validatePriceMovement: Ensures counter-offer rules (Buyer negotiates DOWN, Seller negotiates UP)
 * @param {number} currentPrice 
 * @param {number} newPrice 
 * @param {'BUYER'|'SELLER'} role 
 * @returns {{ isValid: boolean, message: string }}
 */
export const validatePriceMovement = (currentPrice, newPrice, role = 'BUYER') => {
  const current = Number(currentPrice || 0);
  const next = Number(newPrice || 0);

  if (isNaN(next) || next <= 0) {
    return { isValid: false, message: 'Please enter a valid price greater than zero.' };
  }

  if (role === 'BUYER' && next >= current) {
    return { isValid: false, message: 'As a buyer, your counter-offer must be lower than the current price.' };
  }

  if (role === 'SELLER' && next <= current) {
    return { isValid: false, message: 'As a seller, your counter-offer must be higher than the current price.' };
  }

  return { isValid: true, message: '' };
};

/**
 * isRoundsExhausted: Checks if maximum allowed negotiation rounds have been reached
 * @param {number} currentRounds 
 * @param {number} maxRounds 
 * @returns {boolean}
 */
export const isRoundsExhausted = (currentRounds, maxRounds = 5) => {
  return Number(currentRounds || 0) >= maxRounds;
};

/**
 * computeRemainingCooldown: Calculates remaining time (seconds) before next counter-offer is allowed
 * @param {string|number} lastActionTimestamp 
 * @param {number} cooldownSeconds 
 * @returns {number} Remaining seconds (0 if cooldown passed)
 */
export const computeRemainingCooldown = (lastActionTimestamp, cooldownSeconds = 60) => {
  if (!lastActionTimestamp) return 0;
  const lastTime = new Date(lastActionTimestamp).getTime();
  if (isNaN(lastTime)) return 0;

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastTime) / 1000);
  const remaining = cooldownSeconds - elapsedSeconds;

  return remaining > 0 ? remaining : 0;
};

/**
 * calculateOrderTotal: Pure formula for order cost breakdown
 * @param {number} quantityKg 
 * @param {number} pricePerKg 
 * @returns {number}
 */
export const calculateOrderTotal = (quantityKg, pricePerKg) => {
  const qty = Number(quantityKg || 0);
  const price = Number(pricePerKg || 0);
  return qty * price;
};
