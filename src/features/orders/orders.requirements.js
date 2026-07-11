// features/orders/orders.requirements.js
import apiClient from '../../api/client';

export const REQUIREMENT_STATUS = {
  OPEN: 'OPEN',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  FILLED: 'FILLED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

// Fallback dummy requirements
const dummyRequirements = [
  {
    _id: 'req_001',
    id: 'req_001',
    commodity: 'Wheat',
    quantity: 50,
    remainingQuantity: 50,
    unit: 'Qt',
    expectedPrice: 2400,
    location: 'Indore, MP',
    grade: 'A',
    moisture: '11%',
    harvestYear: '2026',
    deliveryDate: '2026-07-15',
    remarks: 'Need clean, mill-ready stock.',
    buyerId: { _id: 'buyer_001', firstName: 'Raghav', lastName: 'Gupta', shopName: 'Raghav Procurement' },
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'req_002',
    id: 'req_002',
    commodity: 'Soybean',
    quantity: 120,
    remainingQuantity: 70,
    unit: 'Qt',
    expectedPrice: 4550,
    location: 'Ujjain, MP',
    grade: 'FAQ',
    moisture: '10%',
    harvestYear: '2025',
    deliveryDate: '2026-07-20',
    remarks: 'Partial supply accepted.',
    buyerId: { _id: 'buyer_001', firstName: 'Raghav', lastName: 'Gupta', shopName: 'Raghav Procurement' },
    status: 'PARTIALLY_FILLED',
    createdAt: new Date().toISOString(),
  },
];

export const requirementService = {
  getAllRequirements: async (options = {}) => {
    try {
      const response = await apiClient.get('/requirements');
      return response.data?.requirements || response.data || dummyRequirements;
    } catch (error) {
      console.warn('[OrdersRequirements] API not available, using fallback:', error.message);
      return dummyRequirements;
    }
  },

  getMarketplaceRequirements: async ({ excludeBuyerId = null } = {}) => {
    try {
      const response = await apiClient.get('/requirements', {
        params: { status: 'OPEN,PARTIALLY_FILLED' }
      });
      let reqs = response.data?.requirements || response.data || dummyRequirements;
      if (excludeBuyerId) {
        reqs = reqs.filter((item) => {
          const buyerId = item.buyerId?._id || item.buyerId;
          return String(buyerId) !== String(excludeBuyerId);
        });
      }
      return { requirements: reqs };
    } catch (error) {
      console.warn('[OrdersRequirements] API not available, using fallback:', error.message);
      let reqs = dummyRequirements;
      if (excludeBuyerId) {
        reqs = reqs.filter((item) => {
          const buyerId = item.buyerId?._id || item.buyerId;
          return String(buyerId) !== String(excludeBuyerId);
        });
      }
      return { requirements: reqs };
    }
  },

  submitRequirement: async (payload) => {
    try {
      const response = await apiClient.post('/requirements', {
        ...payload,
        remainingQuantity: payload.quantity,
        status: 'OPEN',
      });
      return response.data;
    } catch (error) {
      console.warn('[OrdersRequirements] API not available, using fallback:', error.message);
      const newReq = {
        ...payload,
        _id: `req_${Math.random().toString(36).slice(2, 9)}`,
        id: `req_${Math.random().toString(36).slice(2, 9)}`,
        remainingQuantity: payload.quantity,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
      dummyRequirements.unshift(newReq);
      return { success: true, data: newReq };
    }
  },
};
