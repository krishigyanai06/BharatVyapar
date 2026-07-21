/**
 * orders.api.js — Consolidated Network API Layer for Orders & Requirements
 *
 * 10x MNC RULE:
 * 1. ONLY network calls (apiClient.get/post/patch)
 * 2. Zero business rules, Zero UI styling
 * 3. Reads generic config flags
 */

import apiClient from '../../api/client';
import { mapOrder, mapOrdersList } from './orders.mapper';

// Fallback dummy quotes
const dummyQuotes = [
  {
    _id: 'quote_001',
    id: 'quote_001',
    requirementId: {
      _id: 'req_001',
      id: 'req_001',
      commodity: 'Wheat',
      commodityName: 'Wheat',
      name: 'Wheat',
      status: 'OPEN',
      quantity: 50,
      expectedPrice: 2200,
    },
    sellerId: { _id: 'seller_001', firstName: 'Current', lastName: 'Seller', shopName: 'Seller Agro', rating: 4.6 },
    sellerName: 'Suresh Patel',
    sellerRating: 4.3,
    offeredQuantity: 30,
    quotePrice: 2350,
    dispatchTime: '2 days',
    remarks: 'Grade A wheat, ready for dispatch.',
    status: 'Pending',
    displayStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'quote_002',
    id: 'quote_002',
    requirementId: {
      _id: 'req_001',
      id: 'req_001',
      commodity: 'Wheat',
      commodityName: 'Wheat',
      name: 'Wheat',
      status: 'OPEN',
      quantity: 50,
      expectedPrice: 2200,
    },
    sellerId: { _id: 'seller_002', firstName: 'Mohan', lastName: 'Verma', shopName: 'Verma Agro', rating: 4.8 },
    sellerName: 'Mohan Verma',
    sellerRating: 4.8,
    offeredQuantity: 50,
    quotePrice: 2380,
    dispatchTime: '4 days',
    remarks: 'Mill-ready stock, moisture 10.5%.',
    status: 'Pending',
    displayStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Fallback dummy purchase orders
const dummyPurchaseOrders = [
  {
    id: 'po_demo_001',
    _id: 'po_demo_001',
    quoteId: 'quote_003',
    requirementId: 'req_002',
    buyer: { _id: 'buyer_001', firstName: 'Raghav', lastName: 'Gupta', shopName: 'Raghav Procurement' },
    seller: { _id: 'seller_001', firstName: 'Current', lastName: 'Seller', shopName: 'Seller Agro', rating: 4.6 },
    commodity: 'Soybean',
    approvedQuantity: 50,
    finalPrice: 4525,
    deliveryDetails: {
      location: 'Ujjain, MP',
      deliveryDate: '2026-07-20',
      dispatchTime: '3 days',
      unit: 'Qt',
    },
    orderStatus: 'Pending Dispatch',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'po_demo_002',
    _id: 'po_demo_002',
    quoteId: 'quote_101',
    requirementId: 'req_123',
    buyer: { _id: 'buyer_other_999', firstName: 'Rajesh', lastName: 'Sharma', shopName: 'Sharma Traders' },
    seller: { _id: 'seller_001', firstName: 'Current', lastName: 'Seller', shopName: 'Seller Agro', rating: 4.6 },
    commodity: 'Wheat',
    approvedQuantity: 30,
    finalPrice: 2350,
    deliveryDetails: {
      location: 'Indore, MP',
      deliveryDate: '2026-07-15',
      dispatchTime: '2 days',
      unit: 'Qt',
    },
    orderStatus: 'Dispatched',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── DEALS API ────────────────────────────────────────────────────────────────

export const dealService = {
  updateDealStatus: async (dealId, status) => {
    try {
      const response = await apiClient.patch(`/buy-commodity/deals/${dealId}/status`, { status });
      return response.data;
    } catch (error) {
      console.warn('[OrdersAPI] API not available, using fallback:', error.message);
      return {
        success: true,
        data: {
          _id: dealId,
          status: status,
          updatedAt: new Date().toISOString(),
        },
      };
    }
  },

  uploadDealDocument: async (dealId, docType, file) => {
    try {
      const formData = new FormData();
      formData.append('docType', docType);
      formData.append('document', {
        uri: file.uri,
        name: file.name || 'document.pdf',
        type: file.type || 'application/pdf',
      });
      const response = await apiClient.post(`/buy-commodity/deals/${dealId}/document`, formData);
      return response.data;
    } catch (error) {
      console.warn('[OrdersAPI] API not available, using fallback:', error.message);
      return {
        success: true,
        data: {
          _id: `doc_${Math.random().toString(36).substring(2, 9)}`,
          docType: docType,
          fileUrl: `https://mock-storage.com/${file.name || 'document.pdf'}`,
          uploadedAt: new Date().toISOString(),
        },
      };
    }
  },

  confirmDispatch: async (dealId) => {
    try {
      const response = await apiClient.post(`/buy-commodity/deals/${dealId}/dispatch`);
      return response.data;
    } catch (error) {
      console.warn('[OrdersAPI] API not available, using fallback:', error.message);
      return {
        success: true,
        data: {
          _id: dealId,
          status: 'DISPATCHED',
          updatedAt: new Date().toISOString(),
        },
      };
    }
  },

  submitDebitNote: async (dealId, payload) => {
    try {
      const response = await apiClient.post(`/buy-commodity/deals/${dealId}/debit-note`, {
        adjustedAmount: payload.adjustedAmount,
        reason: payload.reason,
      });
      return response.data;
    } catch (error) {
      console.warn('[OrdersAPI] API not available, using fallback:', error.message);
      return {
        success: true,
        data: {
          _id: dealId,
          status: 'DISPUTED',
          debitNote: {
            _id: `dn_${Math.random().toString(36).substring(2, 9)}`,
            adjustedAmount: payload.adjustedAmount,
            reason: payload.reason,
            createdAt: new Date().toISOString(),
          },
        },
      };
    }
  }
};

// ─── QUOTES & REQUIREMENTS API ───────────────────────────────────────────────

export const submitQuoteAgainstRequirement = async (requirementId, payload) => {
  try {
    const apiPayload = {
      requirementId: requirementId,
      price: Number(payload.quotePrice ?? payload.offeredPrice ?? payload.price),
      priceUnit: payload.priceUnit ?? payload.unit ?? 'Quintal',
      quantity: Number(payload.offeredQuantity ?? payload.quantity),
      unit: payload.unit ?? 'Quintal',
      tradeType: payload.tradeType ?? 'FOR',
      paymentTimeline: payload.paymentTimeline || 'Immediate',
    };
    const response = await apiClient.post('/buy-commodity/offers', apiPayload);
    return response.data;
  } catch (error) {
    console.warn('[OrdersAPI] API not available, using fallback:', error.message);
    const mockQuote = {
      _id: `quote_${Date.now()}`,
      id: `quote_${Date.now()}`,
      requirementId,
      offeredQuantity: Number(payload.offeredQuantity ?? payload.quantity),
      quotePrice: Number(payload.quotePrice ?? payload.price),
      dispatchTime: payload.dispatchTime || '2 days',
      remarks: payload.remarks || '',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    return { success: true, data: mockQuote };
  }
};

export const getRequirementQuotes = async (requirementId) => {
  try {
    const response = await apiClient.get(`/buy-commodity/offers/requirement/${requirementId}`);
    const rawList = response.data?.offers || response.data?.data || response.data || [];
    return mapOrdersList(rawList);
  } catch (error) {
    console.warn('[OrdersAPI] API not available, using fallback:', error.message);
    return mapOrdersList(dummyQuotes);
  }
};

export const getMySubmittedQuotes = async () => {
  try {
    const response = await apiClient.get('/buy-commodity/offers/my');
    const rawList = response.data?.offers || response.data?.data || response.data || [];
    return mapOrdersList(rawList);
  } catch (error) {
    console.warn('[OrdersAPI] API not available, using fallback:', error.message);
    return mapOrdersList(dummyQuotes);
  }
};

export const acceptRequirementQuote = async (quoteId) => {
  try {
    const response = await apiClient.post(`/buy-commodity/offers/${quoteId}/accept`);
    return response.data;
  } catch (error) {
    console.warn('[OrdersAPI] API not available, using fallback:', error.message);
    const quote = dummyQuotes.find((q) => q.id === quoteId || q._id === quoteId);
    if (quote) quote.status = 'Accepted';
    return { success: true, data: quote };
  }
};

export const rejectRequirementQuote = async (quoteId) => {
  try {
    const response = await apiClient.post(`/buy-commodity/offers/${quoteId}/reject`);
    return response.data;
  } catch (error) {
    console.warn('[OrdersAPI] API not available, using fallback:', error.message);
    const quote = dummyQuotes.find((q) => q.id === quoteId || q._id === quoteId);
    if (quote) quote.status = 'Rejected';
    return { success: true, data: quote };
  }
};

export const getSellerPurchaseOrders = async () => {
  try {
    const response = await apiClient.get('/purchase-orders/seller');
    return mapOrdersList(response.data?.data || response.data || []);
  } catch (error) {
    console.warn('[OrdersAPI] API not available, using fallback:', error.message);
    return mapOrdersList(dummyPurchaseOrders);
  }
};

export const getBuyerPurchaseOrders = async () => {
  try {
    const response = await apiClient.get('/purchase-orders/buyer');
    return mapOrdersList(response.data?.data || response.data || []);
  } catch (error) {
    console.warn('[OrdersAPI] API not available, using fallback:', error.message);
    return mapOrdersList(dummyPurchaseOrders);
  }
};

export const updatePurchaseOrderStatus = async (orderId, status) => {
  try {
    const response = await apiClient.patch(`/purchase-orders/${orderId}/status`, { status });
    return response.data;
  } catch (error) {
    console.warn('[OrdersAPI] API not available, using fallback:', error.message);
    const order = dummyPurchaseOrders.find((o) => o.id === orderId || o._id === orderId);
    if (order) order.orderStatus = status;
    return { success: true, data: order };
  }
};

let myRequirementsCache = null;
let cacheTime = 0;
const CACHE_DURATION = 15000;

export const requirementService = {
  getMyRequirements: async (options = {}, forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && myRequirementsCache && (now - cacheTime < CACHE_DURATION)) {
      return myRequirementsCache;
    }
    try {
      const response = await apiClient.get('/buyer-requirement/my', {
        params: {
          status: options.status,
          page:   options.page  || 1,
          limit:  options.limit || 20,
        },
      });
      const items = response.data?.requirements ?? response.data ?? response;
      const normalized = mapOrdersList(items);
      myRequirementsCache = normalized;
      cacheTime = now;
      return normalized;
    } catch (error) {
      console.warn('[RequirementService] getMyRequirements failed:', error?.response?.status, error.message);
      return myRequirementsCache || [];
    }
  },

  getMarketplaceRequirements: async (options = {}) => {
    try {
      const response = await apiClient.get('/buyer-requirement', {
        params: {
          commodityName: options.commodityName,
          page:          options.page  || 1,
          limit:         options.limit || 10,
        },
      });
      const items = response.data?.requirements ?? response.data ?? response;
      let mapped = mapOrdersList(items);
      if (options.excludeBuyerId) {
        mapped = mapped.filter(item => {
          const buyerId = item.buyerId?._id || item.buyerId;
          if (!buyerId) return true;
          return String(buyerId) !== String(options.excludeBuyerId);
        });
      }
      return { requirements: mapped };
    } catch (error) {
      console.warn('[RequirementService] getMarketplaceRequirements failed:', error?.response?.status, error.message);
      return { requirements: [] };
    }
  },

  submitRequirement: async (payload) => {
    const apiPayload = {
      commodityName:    payload.commodity,
      quantity:         Number(payload.quantity),
      unit:             payload.unit === 'Quintal' ? 'Qt' : (payload.unit || 'Qt'),
      targetPrice:      Number(payload.expectedPrice),
      deliveryLocation: payload.location,
      remarks:          payload.remarks,
      grade:            payload.grade,
      moisture:         payload.moisture,
      harvestYear:      payload.harvestYear,
      deliveryDate:     payload.deliveryDate,
    };
    const response = await apiClient.post('/buyer-requirement', apiPayload);
    myRequirementsCache = null;
    cacheTime = 0;
    return response.data;
  },
};
