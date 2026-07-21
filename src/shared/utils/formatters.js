/**
 * formatters.js — Centralized "Data Guard" Utility
 *
 * Flipkart/Amazon 2026 pattern: Every field that touches the UI goes
 * through a formatter. The formatter decides:
 *   1. Is this a real value?          → return it as-is
 *   2. Is it a MongoDB ObjectId?      → return tokenized role label (e.g. "Seller (#3589)")
 *   3. Is it empty / null / 0 / '—'? → return a human-readable contextual fallback
 *
 * HOW TO USE IN A COMPONENT:
 *   import { safeText, safePrice, safeLocation, safeRating, resolveName, getStatusBadgeConfig } from '../../../shared/utils/formatters';
 *   <Text>{safeText(item.dispatchTime, 'Not Set')}</Text>
 *   <Text>{safePrice(item.price) ? `${safePrice(item.price)}` : 'Negotiable'}</Text>
 *   <Text>{safeLocation(item.location)}</Text>
 */

const MONGO_ID_REGEX = /^[a-fA-F0-9]{24}$/;

// ─── 1. CORE ID/NAME GUARD ────────────────────────────────────────────────────
/**
 * getSafeUserName: Resolves a user name or ID into a human-readable string.
 * - If it's a real name           → return name
 * - If it's a MongoDB ObjectId    → return "Role (#LAST4)" e.g. "Seller (#3589)"
 * - If it's empty/null            → return the role label e.g. "Seller"
 *
 * @param {string|object} rawNameOrId
 * @param {string} role - Fallback role label: 'Seller', 'Buyer', 'Trader'
 * @returns {string}
 */
export const getSafeUserName = (rawNameOrId, role = 'User') => {
  if (!rawNameOrId) return role;
  const strVal = String(rawNameOrId).trim();
  if (!strVal || strVal === '\u2014' || strVal === '-') return role;
  if (MONGO_ID_REGEX.test(strVal)) {
    const shortToken = strVal.substring(20).toUpperCase();
    return `${role} (#${shortToken})`;
  }
  return strVal;
};

/**
 * resolveName: Resolves a seller/buyer object into a display name.
 * Handles populated objects, plain strings (IDs), and fully missing data.
 *
 * @param {object|string} userObj  - The user object or raw ID from backend
 * @param {string} itemName        - Optional pre-resolved name field (e.g. item.sellerName)
 * @param {string} role            - Fallback role label
 * @returns {string}
 */
export const resolveName = (userObj, itemName = '', role = 'User') => {
  // Priority 1: Pre-resolved name from normalizer/API (e.g. item.sellerName)
  if (itemName && !MONGO_ID_REGEX.test(String(itemName).trim())) {
    return itemName;
  }
  if (!userObj) return role;
  // Priority 2: Populated object from backend
  if (typeof userObj === 'object') {
    const shopName = userObj.shopName || userObj.shopname || '';
    const fullName = [userObj.firstName, userObj.lastName].filter(Boolean).join(' ');
    const name = userObj.name || '';
    const resolved = shopName || fullName || name;
    if (resolved && !MONGO_ID_REGEX.test(resolved)) return resolved;
    // Object has _id but no name fields → tokenize
    const id = userObj._id || userObj.id || '';
    return getSafeUserName(id, role);
  }
  // Priority 3: Raw string (could be an ID or a name)
  return getSafeUserName(String(userObj), role);
};

// ─── 2. TEXT / GENERIC VALUE GUARD ───────────────────────────────────────────
/**
 * safeText: Returns the value if meaningful, else a contextual fallback.
 * Replaces every `{value || '—'}` pattern in JSX.
 *
 * @param {any} value
 * @param {string} fallback - Human-readable fallback e.g. 'Not Set', 'N/A', 'Unknown'
 * @returns {string}
 */
export const safeText = (value, fallback = 'N/A') => {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  if (!str || str === '\u2014' || str === '-' || str === 'null' || str === 'undefined') return fallback;
  return str;
};

// ─── 3. PRICE GUARD ──────────────────────────────────────────────────────────
/**
 * safePrice: Formats a numeric price with Indian locale.
 * Returns null if price is 0, missing, or invalid — so the caller can
 * decide to show "Negotiable" or "N/A" instead.
 *
 * @param {number|string} price
 * @returns {string|null} e.g. "2,950" or null
 */
export const safePrice = (price) => {
  if (price === null || price === undefined) return null;
  const n = Number(price);
  if (isNaN(n) || n <= 0) return null;
  try {
    return n.toLocaleString('en-IN');
  } catch {
    return String(n);
  }
};

// ─── 4. LOCATION GUARD ───────────────────────────────────────────────────────
/**
 * safeLocation: Returns a location string, or a friendly fallback.
 *
 * @param {string} location
 * @param {string} fallback
 * @returns {string}
 */
export const safeLocation = (location, fallback = 'Location N/A') => {
  return safeText(location, fallback);
};

// ─── 5. QUANTITY GUARD ───────────────────────────────────────────────────────
/**
 * safeQuantity: Formats quantity + unit, returns fallback if missing.
 *
 * @param {number|string} quantity
 * @param {string} unit
 * @param {string} fallback
 * @returns {string}
 */
export const safeQuantity = (quantity, unit = '', fallback = 'Qty N/A') => {
  if (quantity === null || quantity === undefined) return fallback;
  const n = Number(quantity);
  if (isNaN(n) || n <= 0) return fallback;
  return unit ? `${n} ${unit}` : String(n);
};

// ─── 6. RATING GUARD ─────────────────────────────────────────────────────────
/**
 * safeRating: Returns the rating if valid, or null (so caller can show "New" badge).
 * Never returns '—'. Caller decides the UI treatment.
 *
 * @param {number|string} rating
 * @returns {string|null}
 */
export const safeRating = (rating) => {
  if (rating === null || rating === undefined) return null;
  const n = Number(rating);
  if (isNaN(n) || n <= 0) return null;
  return String(n);
};

// ─── 7. DATE GUARD ───────────────────────────────────────────────────────────
/**
 * safeDate: Returns a formatted date string (YYYY-MM-DD), or a fallback.
 *
 * @param {string} dateStr - ISO 8601 date string
 * @param {string} fallback
 * @returns {string}
 */
export const safeDate = (dateStr, fallback = '\u2014') => {
  if (!dateStr) return fallback;
  try {
    const d = String(dateStr).split('T')[0];
    return d || fallback;
  } catch {
    return fallback;
  }
};

// ─── 8. STATUS BADGE CONFIG ──────────────────────────────────────────────────
/**
 * getStatusBadgeConfig: Centralized status → { label, color, bg } map.
 * Covers all known statuses across offers, deals, and listings.
 * Flipkart pattern: every status has a defined color contract, never falls through.
 *
 * @param {string} status
 * @returns {{ label: string, color: string, bg: string }}
 *
 * Usage:
 *   const { label, color, bg } = getStatusBadgeConfig('rejected');
 *   <View style={{ backgroundColor: bg }}><Text style={{ color }}>{label}</Text></View>
 */
export const getStatusBadgeConfig = (status) => {
  const normalized = String(status || '').toLowerCase().trim();
  const MAP = {
    active:       { label: 'Active',      color: '#065F46', bg: '#D1FAE5' },
    pending:      { label: 'Pending',     color: '#92400E', bg: '#FEF3C7' },
    accepted:     { label: 'Accepted',    color: '#1E40AF', bg: '#DBEAFE' },
    rejected:     { label: 'Rejected',    color: '#991B1B', bg: '#FEE2E2' },
    countered:    { label: 'Countered',   color: '#5B21B6', bg: '#EDE9FE' },
    completed:    { label: 'Completed',   color: '#065F46', bg: '#D1FAE5' },
    cancelled:    { label: 'Cancelled',   color: '#6B7280', bg: '#F3F4F6' },
    expired:      { label: 'Expired',     color: '#6B7280', bg: '#F3F4F6' },
    sold:         { label: 'Sold',        color: '#1E40AF', bg: '#DBEAFE' },
    closed:       { label: 'Closed',      color: '#6B7280', bg: '#F3F4F6' },
    'in-transit': { label: 'In Transit',  color: '#92400E', bg: '#FEF3C7' },
    delivered:    { label: 'Delivered',   color: '#065F46', bg: '#D1FAE5' },
  };
  return MAP[normalized] || { label: String(status || 'Unknown').toUpperCase(), color: '#374151', bg: '#F9FAFB' };
};
