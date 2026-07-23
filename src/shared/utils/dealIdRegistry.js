// shared/utils/dealIdRegistry.js
// Local offerId → dealId persistence registry.
// WHY: Backend's GET /offers/:id response does NOT include dealId for accepted offers.
//      dealId is only available in the acceptOffer() response (deal._id).
//      This registry persists that mapping so DealDetailsScreen can recover it
//      on re-entry from TradesScreen (where route.params.dealId is null).
//
// HOW: Uses storage.js (memory-first + AsyncStorage background persist).
//      Reads are synchronous (O(1) memory lookup). Writes are fire-and-forget.
//
// LIFECYCLE:
//   Boot    → initDealIdRegistry() hydrates memory cache from AsyncStorage
//   Accept  → registerDealId(offerId, dealId) writes mapping
//   Render  → lookupDealId(offerId) returns dealId synchronously

import { storage } from './storage';

const STORAGE_KEY = 'bharat_vyapar_deal_id_map';
let cache = {};

/**
 * Boot-time hydration. Call after initStorage() in app bootstrap.
 */
export function initDealIdRegistry() {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[DealIdRegistry] Failed to hydrate from storage:', e);
    cache = {};
  }
}

/**
 * Persist offerId → dealId mapping.
 * Called from acceptOffer() in marketplace.api.js on success.
 */
export function registerDealId(offerId, dealId) {
  if (!offerId || !dealId) return;
  const key = String(offerId);
  const val = String(dealId);
  if (cache[key] === val) return; // No-op if already stored
  cache[key] = val;
  storage.set(STORAGE_KEY, JSON.stringify(cache));
}

/**
 * Synchronous lookup: offerId → dealId.
 * Returns null if no mapping exists.
 */
export function lookupDealId(offerId) {
  if (!offerId) return null;
  return cache[String(offerId)] || null;
}
