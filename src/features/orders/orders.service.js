// features/orders/orders.service.js
import apiClient from '../../api/client';

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

// Fallback dummy quotes
const dummyQuotes = [
  {
    _id: 'quote_001',
    id: 'quote_001',
    requirementId: 'req_001',
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
    requirementId: 'req_001',
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

export const dealService = {
  updateDealStatus: async (dealId, status) => {
    try {
      const response = await apiClient.patch(`/buy-commodity/deals/${dealId}/status`, { status });
      return response.data;
    } catch (error) {
      console.warn('[OrdersService] API not available, using fallback:', error.message);
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
      console.warn('[OrdersService] API not available, using fallback:', error.message);
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
      console.warn('[OrdersService] API not available, using fallback:', error.message);
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
      console.warn('[OrdersService] API not available, using fallback:', error.message);
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

export const submitQuoteAgainstRequirement = async (requirementId, payload) => {
  try {
    const response = await apiClient.post(`/requirements/${requirementId}/quotes`, payload);
    return response.data;
  } catch (error) {
    console.warn('[OrdersService] API not available, using fallback:', error.message);
    const newQuote = {
      _id: `quote_${Math.random().toString(36).slice(2, 9)}`,
      id: `quote_${Math.random().toString(36).slice(2, 9)}`,
      requirementId,
      offeredQuantity: Number(payload.offeredQuantity),
      quotePrice: Number(payload.quotePrice ?? payload.offeredPrice),
      remarks: payload.remarks,
      status: 'Pending',
      displayStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    dummyQuotes.unshift(newQuote);
    return { success: true, data: newQuote };
  }
};

export const getMySubmittedQuotes = async (_sellerId = null) => {
  try {
    const response = await apiClient.get('/quotes/my-submitted');
    return response.data?.data || response.data || [];
  } catch (error) {
    console.warn('[OrdersService] API not available, using fallback:', error.message);
    return dummyQuotes;
  }
};

export const getReceivedQuotesOnRequirements = async (_buyerId = null, options = {}) => {
  try {
    const params = options.requirementId ? { requirementId: options.requirementId } : undefined;
    const response = await apiClient.get('/quotes/received', { params });
    return response.data?.data || response.data || [];
  } catch (error) {
    console.warn('[OrdersService] API not available, using fallback:', error.message);
    return dummyQuotes.filter((q) => !options.requirementId || q.requirementId === options.requirementId);
  }
};

export const acceptRequirementQuote = async (quoteId) => {
  try {
    const response = await apiClient.post(`/quotes/${quoteId}/accept`);
    return response.data;
  } catch (error) {
    console.warn('[OrdersService] API not available, using fallback:', error.message);
    const quote = dummyQuotes.find((q) => q.id === quoteId || q._id === quoteId);
    if (quote) quote.status = 'Accepted';
    return { success: true, data: { quote } };
  }
};

export const rejectRequirementQuote = async (quoteId) => {
  try {
    const response = await apiClient.post(`/quotes/${quoteId}/reject`);
    return response.data;
  } catch (error) {
    console.warn('[OrdersService] API not available, using fallback:', error.message);
    const quote = dummyQuotes.find((q) => q.id === quoteId || q._id === quoteId);
    if (quote) quote.status = 'Rejected';
    return { success: true, data: quote };
  }
};

export const getSellerPurchaseOrders = async () => {
  try {
    const response = await apiClient.get('/purchase-orders/seller');
    return response.data?.data || response.data || [];
  } catch (error) {
    console.warn('[OrdersService] API not available, using fallback:', error.message);
    return dummyPurchaseOrders;
  }
};

export const getBuyerPurchaseOrders = async () => {
  try {
    const response = await apiClient.get('/purchase-orders/buyer');
    return response.data?.data || response.data || [];
  } catch (error) {
    console.warn('[OrdersService] API not available, using fallback:', error.message);
    return dummyPurchaseOrders;
  }
};

export const updatePurchaseOrderStatus = async (orderId, status) => {
  try {
    const response = await apiClient.patch(`/purchase-orders/${orderId}/status`, { status });
    return response.data;
  } catch (error) {
    console.warn('[OrdersService] API not available, using fallback:', error.message);
    const order = dummyPurchaseOrders.find((o) => o.id === orderId || o._id === orderId);
    if (order) order.orderStatus = status;
    return { success: true, data: order };
  }
};
