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

  // Ensure price change is not greater than 5%
  if (current > 0) {
    const diff = Math.abs(next - current);
    const pct = (diff / current) * 100;
    if (pct > 5) {
      return { isValid: false, message: 'Price must be within 5% of the last proposed price.' };
    }
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

// ─── STATUS CONFIGS & FILTERS ────────────────────────────────────────────────
export const OFFER_STATUS_CONFIG = {
  pending:        { label: 'Awaiting Response',  color: '#718096', bg: '#EDF2F7',  icon: 'clock-outline' },
  in_negotiation: { label: 'In Negotiation',     color: '#6B46C1', bg: '#FAF5FF',  icon: 'swap-horizontal' },
  negotiating:    { label: 'In Negotiation',     color: '#6B46C1', bg: '#FAF5FF',  icon: 'swap-horizontal' },
  countered:      { label: 'Counter Received',   color: '#3182CE', bg: '#EBF8FF',  icon: 'swap-horizontal' },
  accepted:       { label: 'Deal Closed',        color: '#38A169', bg: '#F0FFF4',  icon: 'check-decagram' },
  rejected:       { label: 'Rejected',           color: '#E53E3E', bg: '#FFF5F5',  icon: 'close-circle' },
  expired:        { label: 'Expired',            color: '#718096', bg: '#EDF2F7',  icon: 'timer-off' },
  cancelled:      { label: 'Cancelled',          color: '#718096', bg: '#EDF2F7',  icon: 'close-circle' },
};

export const ESCROW_STATUS_CONFIG = {
  pending_payment: { label: 'Payment Pending', color: '#3182CE', bg: '#EBF8FF',  icon: 'cash-clock',     progress: 0.1 },
  funded:          { label: 'Funded',          color: '#DD6B20', bg: '#FFFAF0',  icon: 'bank-check',     progress: 0.4 },
  dispatched:      { label: 'In Transit',      color: '#D69E2E', bg: '#FFFFF0',  icon: 'truck-delivery', progress: 0.6 },
  delivered:       { label: 'Delivered',       color: '#38A169', bg: '#F0FFF4',  icon: 'package-check',  progress: 0.8 },
  released:        { label: 'Completed ✓',     color: '#38A169', bg: '#F0FFF4',  icon: 'check-decagram', progress: 1.0 },
  cancelled:       { label: 'Cancelled',       color: '#E53E3E', bg: '#FFF5F5',  icon: 'close-circle',   progress: 0.0 },
};

export const LISTING_STATUS_CONFIG = {
  active:    { label: 'ACTIVE',    color: '#38A169', bg: '#F0FFF4', icon: 'store' },
  sold:      { label: 'SOLD',      color: '#6B46C1', bg: '#FAF5FF', icon: 'check-decagram' },
  expired:   { label: 'EXPIRED',   color: '#718096', bg: '#EDF2F7', icon: 'timer-off' },
  cancelled: { label: 'CANCELLED', color: '#E53E3E', bg: '#FFF5F5', icon: 'close-circle' },
};

export const BUY_SECTION_CONFIGS = [
  { key: 'your_turn', label: 'Your Turn to Respond', icon: 'flash',                urgent: true,  accentColor: null },
  { key: 'waiting',   label: 'Awaiting Response',    icon: 'timer-sand',            urgent: false, accentColor: '#64748B' },
  { key: 'accepted',  label: 'Deals Accepted',        icon: 'check-decagram',        urgent: false, accentColor: '#38A169' },
  { key: 'closed',    label: 'Inactive Offers',       icon: 'archive-outline',       urgent: false, accentColor: '#94A3B8' },
  { key: 'deleted',   label: 'Listing Removed',       icon: 'alert-circle-outline',  urgent: false, accentColor: '#E53E3E' },
];

export const SELL_SECTION_CONFIGS = [
  { key: 'active', label: 'Active Listings',     icon: 'storefront-outline',   urgent: false, accentColor: '#38A169' },
  { key: 'sold',   label: 'Sold — Deals Closed', icon: 'check-decagram',       urgent: false, accentColor: null },
  { key: 'closed', label: 'Inactive Listings',   icon: 'archive-outline',      urgent: false, accentColor: '#94A3B8' },
];

export const BUY_TAB_FILTERS  = ['All', 'Active', 'In Negotiation', 'Accepted', 'Closed'];
export const SELL_TAB_FILTERS = ['All', 'Active', 'In Negotiation', 'Sold', 'Closed'];

// ─── UTILITIES & CLASSIFIERS ──────────────────────────────────────────────────

export const normalizeStatus = (st) => {
  if (!st || typeof st !== 'string') return 'pending';
  return st.toLowerCase().replace(/\s+/g, '_');
};

export const classifyBuyOffer = (offer, userRole) => {
  const st = normalizeStatus(offer.displayStatus || offer.status);
  const isTerminal = ['accepted', 'rejected', 'expired', 'cancelled'].includes(st);

  const reqObj = (offer.requirementId && typeof offer.requirementId === 'object') ? offer.requirementId : null;
  const commodity = offer.commodity || 
                    (typeof offer.commodityId === 'object' ? offer.commodityId : null) || 
                    reqObj || 
                    {};

  const isDeleted = !commodity.commodityName && !commodity.name && !commodity.commodity;
  if (isDeleted) return 'deleted';
  if (st === 'accepted') return 'accepted';
  if (isTerminal) return 'closed';

  const isBuyerRole = userRole === 'FPO';
  const myTurnValue = isBuyerRole ? 'buyer' : 'seller';

  if (offer.currentTurn === myTurnValue) return 'your_turn';
  return 'waiting';
};

export const classifySellListing = (listing) => {
  const st = (listing.status || 'active').toLowerCase();
  if (st === 'sold') return 'sold';
  if (['expired', 'cancelled'].includes(st)) return 'closed';
  return 'active';
};

export const formatRelative = (dateStr, t) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h_ = Math.floor(diff / 3600000);
  if (h_ < 1) return t ? t('Just now') : 'Just now';
  if (h_ < 24) return t ? t('{hours}h ago').replace('{hours}', String(h_)) : `${h_}h ago`;
  const d = Math.floor(h_ / 24);
  return t ? t('{days}d ago').replace('{days}', String(d)) : `${d}d ago`;
};

export const formatExpiry = (expiresAt, t) => {
  if (!expiresAt) return null;
  const diff = Math.max(0, new Date(expiresAt) - Date.now());
  if (diff === 0) return t ? t('Expired') : 'Expired';
  const h_ = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h_ > 0) return t ? t('Expires in {hours}h {mins}m').replace('{hours}', String(h_)).replace('{mins}', String(m)) : `Expires in ${h_}h ${m}m`;
  return t ? t('Expires in {mins}m').replace('{mins}', String(m)) : `Expires in ${m}m`;
};
