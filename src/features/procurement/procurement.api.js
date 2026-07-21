/**
 * procurement.api.js — Consolidated Network API Layer for Procurement & Requirements
 *
 * 10x MNC RULE:
 * 1. ONLY network calls (apiClient.get/post/patch) — zero mapping, zero try/catch swallowing
 * 2. All response.data returned RAW to the caller (hook/screen owns extraction & mapping)
 * 3. Reads generic config flags only
 */

import apiClient from '../../api/client';
import { mapRequirementPayload, mapQuotePayload } from './procurement.mapper';

// ─── DEALS API ────────────────────────────────────────────────────────────────

export const dealService = {
  updateDealStatus: async (dealId, status) => {
    const response = await apiClient.patch(`/buy-commodity/deals/${dealId}/status`, { status });
    return response.data;
  },

  uploadDealDocument: async (dealId, docType, file) => {
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('document', {
      uri:  file.uri,
      name: file.name || 'document.pdf',
      type: file.type || 'application/pdf',
    });
    const response = await apiClient.post(`/buy-commodity/deals/${dealId}/document`, formData);
    return response.data;
  },

  confirmDispatch: async (dealId) => {
    const response = await apiClient.post(`/buy-commodity/deals/${dealId}/dispatch`);
    return response.data;
  },

  submitDebitNote: async (dealId, payload) => {
    const response = await apiClient.post(`/buy-commodity/deals/${dealId}/debit-note`, {
      adjustedAmount: payload.adjustedAmount,
      reason:         payload.reason,
    });
    return response.data;
  },
};

// ─── QUOTES & REQUIREMENTS API ───────────────────────────────────────────────

export const submitQuoteAgainstRequirement = async (requirementId, payload) => {
  const apiPayload = mapQuotePayload(requirementId, payload);
  const response = await apiClient.post('/buy-commodity/offers', apiPayload);
  return response.data;
};

export const getRequirementQuotes = async (requirementId) => {
  const response = await apiClient.get(`/buy-commodity/offers/requirement/${requirementId}`);
  return response.data;
};

export const getMySubmittedQuotes = async (params = {}) => {
  const response = await apiClient.get('/buy-commodity/offers', { params });
  return response.data;
};

export const acceptRequirementQuote = async (quoteId) => {
  const response = await apiClient.post(`/buy-commodity/offers/${quoteId}/accept`);
  return response.data;
};

export const rejectRequirementQuote = async (quoteId) => {
  const response = await apiClient.post(`/buy-commodity/offers/${quoteId}/reject`);
  return response.data;
};

export const getSellerPurchaseOrders = async () => {
  const response = await apiClient.get('/purchase-orders/seller');
  return response.data;
};

export const getBuyerPurchaseOrders = async () => {
  const response = await apiClient.get('/purchase-orders/buyer');
  return response.data;
};

export const updatePurchaseOrderStatus = async (orderId, status) => {
  const response = await apiClient.patch(`/purchase-orders/${orderId}/status`, { status });
  return response.data;
};

export const requirementService = {
  getMyRequirements: async (options = {}) => {
    const response = await apiClient.get('/buyer-requirement/my', {
      params: {
        status: options.status,
        page:   options.page  || 1,
        limit:  options.limit || 20,
      },
    });
    return response.data;
  },

  getMarketplaceRequirements: async (options = {}) => {
    const response = await apiClient.get('/buyer-requirement', {
      params: {
        commodityName: options.commodityName,
        page:          options.page  || 1,
        limit:         options.limit || 10,
      },
    });
    return response.data;
  },

  submitRequirement: async (payload) => {
    const apiPayload = mapRequirementPayload(payload);
    const response = await apiClient.post('/buyer-requirement', apiPayload);
    return response.data;
  },
};
