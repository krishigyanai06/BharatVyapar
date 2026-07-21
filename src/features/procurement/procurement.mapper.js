/**
 * orders.mapper.js — 10x MNC Production-Grade DTO Mapper & Data Guard for Orders & Bids
 *
 * SAFETIES & GUARDS:
 * 1. Defensive Type Converters: toSafeNumber, toSafeString, toSafeArray, toSafeStatus
 * 2. Unifies Mongo `_id` vs SQL `id`
 * 3. Backward Compatible Aliases (commodity / cropName, quantity / quantityKg, price / pricePerKg)
 * 4. Zero NaN, Null, or Undefined leaks to Redux/UI
 */

import { safeText, resolveName } from '../../shared/utils/formatters';

// Standardized Order / Requirement Statuses
export const VALID_ORDER_STATUSES = [
  'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'EXPIRED', 'CANCELLED',
  'PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN',
  'PENDING_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED'
];

/**
 * Defensive Helper: Number Converter
 * Guarantees a valid number (no NaN, null, undefined)
 */
export const toSafeNumber = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
};

/**
 * Defensive Helper: String Converter
 * Guarantees a valid non-null string
 */
export const toSafeString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  if (str === 'null' || str === 'undefined' || str === '') return fallback;
  return str;
};

/**
 * Defensive Helper: Array Converter
 * Guarantees an array (never null/undefined/object)
 */
export const toSafeArray = (arr) => (Array.isArray(arr) ? arr : []);

/**
 * Defensive Helper: Status Normalizer
 */
export const toSafeStatus = (rawStatus, fallback = 'PENDING') => {
  if (!rawStatus) return fallback;
  const upper = String(rawStatus).trim().toUpperCase().replace(/\s+/g, '_');
  return VALID_ORDER_STATUSES.includes(upper) ? upper : fallback;
};

/**
 * Defensive Helper: ISO Date Converter
 */
export const toSafeDateIso = (rawDate) => {
  if (!rawDate) return new Date().toISOString();
  try {
    const d = new Date(typeof rawDate === 'number' && rawDate < 1e11 ? rawDate * 1000 : rawDate);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

/**
 * mapOrder / mapRequirement: Primary DTO Mapper
 * Transforms raw API DTO into a safe, normalized domain model.
 */
export const mapOrder = (raw) => {
  if (!raw || typeof raw !== 'object') {
    if (__DEV__) {
      console.warn('⚠️ [orders.mapper] Null or non-object raw payload received');
    }
    return null;
  }

  const id = toSafeString(raw._id ?? raw.id, 'UNKNOWN_ID');
  
  // Extract Crop / Commodity Name with multi-field fallback
  const cropName = safeText(
    raw.cropName ?? raw.commodityName ?? raw.commodity ?? raw.name ?? raw.crop_name,
    'Commodity'
  );

  // Extract Numeric Quantities
  const quantityKg = toSafeNumber(
    raw.quantityKg ?? raw.offeredQuantity ?? raw.quantity ?? raw.qty_in_kg
  );

  // Extract Numeric Price
  const pricePerKg = toSafeNumber(
    raw.pricePerKg ?? raw.quotePrice ?? raw.expectedPrice ?? raw.price ?? raw.unit_price
  );

  // Calculated Total Amount
  const totalAmount = toSafeNumber(
    raw.totalAmount ?? raw.total_amount ?? raw.amount,
    pricePerKg * quantityKg
  );

  // Resolve Seller / Buyer Display Names safely
  const sellerName = resolveName(raw.sellerId ?? raw.seller, raw.sellerName, 'Seller');
  const buyerName = resolveName(raw.buyerId ?? raw.buyer, raw.buyerName, 'Buyer');

  return {
    id,
    _id: id, // Backward compatibility for legacy _id checks
    cropName,
    commodity: cropName, // Alias for legacy code
    commodityName: cropName, // Alias for legacy code
    quantityKg,
    quantity: quantityKg, // Alias for legacy code
    offeredQuantity: quantityKg, // Alias for legacy code
    pricePerKg,
    price: pricePerKg, // Alias for legacy code
    quotePrice: pricePerKg, // Alias for legacy code
    expectedPrice: pricePerKg, // Alias for legacy code
    totalAmount,
    amount: totalAmount, // Alias for legacy code
    status: toSafeStatus(raw.status ?? raw.displayStatus),
    rawStatus: toSafeString(raw.status, 'PENDING'),
    sellerName,
    buyerName,
    sellerRating: toSafeNumber(raw.sellerRating ?? raw.sellerId?.rating, 4.5),
    dispatchTime: toSafeString(raw.dispatchTime ?? raw.dispatch_time, '1-2 Days'),
    remarks: toSafeString(raw.remarks, ''),
    createdAt: toSafeDateIso(raw.createdAt ?? raw.created_at),
    updatedAt: toSafeDateIso(raw.updatedAt ?? raw.updated_at),
  };
};

/**
 * mapOrdersList: Transforms array of API objects safely
 */
export const mapOrdersList = (rawArray) => {
  return toSafeArray(rawArray).map(mapOrder).filter(Boolean);
};
