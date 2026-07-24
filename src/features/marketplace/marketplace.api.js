// features/marketplace/marketplace.api.js
// Merged from service/buy/buyCommodityService.js and service/sell/sellCommodity.js
import api from '../../api/client';
import { registerDealId } from '../../shared/utils/dealIdRegistry';

import {
  normalizeCommodity,
  normalizeCommodityList,
  normalizeOffer,
  normalizeOfferList
} from './marketplace.normalizer';

// ─── BUY COMMODITY OPERATIONS ───────────────────────────────────────────────
const BUY_BASE_URL = '/buy-commodity';

export const submitOffer = async (offerData) => {
  const response = await api.post(`${BUY_BASE_URL}/offers`, offerData);
  return normalizeOffer(response.data?.offer || response.data?.data || response.data);
};

export const getOffers = async (params) => {
  const response = await api.get(`${BUY_BASE_URL}/offers`, { params });
  return normalizeOfferList(response.data);
};

export const getReceivedOffers = async (commodityId) => {
  const response = await api.get(`${BUY_BASE_URL}/offers/received/${commodityId}`);
  return normalizeOfferList(response.data);
};

export const getOfferDetails = async (offerId) => {
  const response = await api.get(`${BUY_BASE_URL}/offers/${offerId}`);
  return normalizeOffer(response.data?.offer || response.data?.data || response.data);
};

// ─── COUNTER OFFER ─────────────────────────────────────────────────────────
// _offlineSync: true → idempotent bid, safe to queue in outbox when offline.
// The outbox processor in NegotiationDetailsScreen will retry this on reconnect.
// WHY this flag is HERE and NOT inside client.js:
//   client.js is generic infrastructure — it must never know about '/counter' URL.
//   This service file OWNS the business decision: "counter bids can be queued offline."
export const submitCounterOffer = async (offerId, counterData) => {
  const response = await api.post(
    `${BUY_BASE_URL}/offers/${offerId}/counter`,
    counterData,
    { _offlineSync: true }, // ← Call-site config flag (Config Flags pattern)
  );
  return normalizeOffer(response.data?.offer || response.data?.data || response.data);
};

// ─── ACCEPT / REJECT OFFER ─────────────────────────────────────────────────
// NO _offlineSync flag → these are one-time compliance events.
// Accepting/Rejecting offline is dangerous: user may change their mind, price
// may have changed, or server state may differ. These MUST be blocked offline.
// client.js interceptor will cancel these with 'NO_INTERNET_WRITE_BLOCKED'.
export const acceptOffer = async (offerId) => {
  const response = await api.post(`${BUY_BASE_URL}/offers/${offerId}/accept`);
  const rootData = response.data?.data || response.data;
  const rawOffer = rootData?.offer || rootData;
  const rawDeal  = rootData?.deal;
  const resolvedDealId = rawDeal?._id || rawDeal?.id || rawOffer?.dealId;

  // Persist offerId → dealId mapping locally so re-entry screens can recover it
  // (backend GET /offers/:id does NOT return dealId for accepted offers)
  if (resolvedDealId) registerDealId(offerId, resolvedDealId);

  return {
    ...rawOffer,
    dealId: resolvedDealId,
    deal: rawDeal,
    rawResponse: response.data,
  };
};

export const rejectOffer = async (offerId, rejectData) => {
  const response = await api.post(`${BUY_BASE_URL}/offers/${offerId}/reject`, rejectData);
  return normalizeOffer(response.data?.offer || response.data?.data || response.data);
};

export const getDealDetails = async (dealId) => {
  const response = await api.get(`${BUY_BASE_URL}/deals/${dealId}`);
  return response.data?.deal || response.data?.data || response.data;
};

export const getMyDeals = async (_params) => {
  // NOTE: /buy-commodity/deals endpoint does NOT exist on Express backend (returns 404).
  // Returning empty array directly to avoid non-existent network call errors.
  return [];
};

export const updateEscrowStatus = async (dealId, escrowStatus) => {
  const response = await api.patch(`${BUY_BASE_URL}/deals/${dealId}/escrow`, { escrowStatus });
  return response.data;
};

// ─── PURCHASE ORDER (PO) OPERATIONS ──────────────────────────────────────────

// Issue / Customize & Send Purchase Order (PO) to seller
// NOTE: Backend only supports /deals/:dealId/purchase-order.
//       /offers/:id/purchase-order does NOT exist on backend.
//       dealId must be the real Deal ID (from acceptOffer response), NOT the Offer ID.
export const createPurchaseOrder = async (dealId, poData) => {
  if (!dealId) throw new Error('Invalid deal reference for PO creation');
  const response = await api.post(`${BUY_BASE_URL}/deals/${dealId}/purchase-order`, poData);
  return response.data?.purchaseOrder || response.data?.data || response.data;
};

// Retrieve Purchase Order details for a deal
// NOTE: If PO has not been created yet for a new deal, backend returns 404 ("Purchase Order not found for this deal").
// We validate status (status < 500) so this expected business 404 returns null quietly without triggering Axios error logs.
export const getPurchaseOrderDetails = async (dealId) => {
  if (!dealId) return null;
  try {
    const response = await api.get(`${BUY_BASE_URL}/deals/${dealId}/purchase-order`, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    });
    if (response.status === 404 || response.data?.success === false) {
      return null;
    }
    return response.data?.purchaseOrder || response.data?.data || response.data;
  } catch {
    return null;
  }
};

// Update Purchase Order status (Acknowledge / Reject / Cancel)
export const updatePOStatus = async (poId, statusData) => {
  const payload = typeof statusData === 'string' ? { status: statusData } : statusData;
  const response = await api.patch(`${BUY_BASE_URL}/purchase-orders/${poId}/status`, payload);
  return response.data?.purchaseOrder || response.data?.data || response.data;
};

// List all Purchase Orders sent by current buyer
export const getSentPurchaseOrders = async (params) => {
  const response = await api.get(`${BUY_BASE_URL}/purchase-orders/sent`, { params });
  return response.data?.purchaseOrders || response.data?.data || response.data;
};

// List all Purchase Orders received by current seller
export const getReceivedPurchaseOrders = async (params) => {
  const response = await api.get(`${BUY_BASE_URL}/purchase-orders/received`, { params });
  return response.data?.purchaseOrders || response.data?.data || response.data;
};

// ─── DISPATCH & GOODS RECEIPT OPERATIONS ────────────────────────────────────

// Seller dispatches goods for a deal (supports JSON or FormData with taxInvoiceDoc)
export const dispatchGoods = async (dealId, dispatchData, config = {}) => {
  const response = await api.post(`${BUY_BASE_URL}/deals/${dealId}/dispatch`, dispatchData, config);
  return response.data?.dispatch || response.data?.data || response.data;
};

// Retrieve dispatch details for a deal
export const getDispatchDetails = async (dealId) => {
  if (!dealId) return null;
  try {
    const response = await api.get(`${BUY_BASE_URL}/deals/${dealId}/dispatch`, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    });
    if (response.status === 404 || response.data?.success === false) {
      return null;
    }
    return response.data?.dispatch || response.data?.data || response.data;
  } catch {
    return null;
  }
};

// Confirm receipt/delivery of goods by the buyer
export const confirmGoodsReceipt = async (dealId, receiptData) => {
  const response = await api.post(`${BUY_BASE_URL}/deals/${dealId}/goods-receipt`, receiptData);
  return response.data;
};

// ─── SELL COMMODITY OPERATIONS ──────────────────────────────────────────────
const SELL_BASE_URL = '/sell-commodity';

export const createSellCommodity = async (data, options = {}, config = {}) => {
  const params = {};
  if (typeof options.isNegotiable === 'boolean') {
    params.isNegotiable = options.isNegotiable;
  }
  const response = await api.post(`${SELL_BASE_URL}/create`, data, { params, ...config });
  return normalizeCommodity(response.data?.commodity || response.data?.data || response.data);
};

export const getSellCommodities = async (params, config = {}) => {
  const response = await api.get(`${SELL_BASE_URL}/`, { params, ...config });
  return normalizeCommodityList(response.data);
};

export const getSellCommodityById = async (id) => {
  const response = await api.get(`${SELL_BASE_URL}/${id}`);
  return normalizeCommodity(response.data?.commodity || response.data?.data || response.data);
};

export const updateSellCommodity = async (id, data, options = {}, config = {}) => {
  const params = {};
  if (typeof options.isNegotiable === 'boolean') {
    params.isNegotiable = options.isNegotiable;
  }
  const response = await api.patch(`${SELL_BASE_URL}/${id}`, data, { params, ...config });
  return normalizeCommodity(response.data?.commodity || response.data?.data || response.data);
};

export const deleteSellCommodity = async (id) => {
  const response = await api.delete(`${SELL_BASE_URL}/${id}`);
  return response.data;
};

export const uploadDealDocument = async (dealId, docType, file, config = {}) => {
  const formData = new FormData();
  formData.append('docType', docType);
  formData.append('document', {
    uri: file.uri,
    name: file.name || 'document.pdf',
    type: file.type || 'application/pdf',
  });
  const response = await api.post(`${BUY_BASE_URL}/deals/${dealId}/document`, formData, {
    ...config,
    headers: {
      ...config.headers,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
