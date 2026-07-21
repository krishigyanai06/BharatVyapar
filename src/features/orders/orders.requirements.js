// features/orders/orders.requirements.js
import apiClient from '../../api/client';

export const REQUIREMENT_STATUS = {
  OPEN: 'OPEN',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  FILLED: 'FILLED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

// Map backend lowercase status → display label
const STATUS_MAP = {
  active:           'OPEN',
  open:             'OPEN',
  fulfilled:        'FILLED',
  filled:           'FILLED',
  partially_filled: 'PARTIALLY FILLED',
  expired:          'EXPIRED',
  cancelled:        'CANCELLED',
};

function normalizeStatus(status) {
  if (!status) return 'OPEN';
  return STATUS_MAP[String(status).toLowerCase()] || String(status).toUpperCase();
}

/**
 * Safely extract an array of requirement items from any API response shape:
 *   - plain array
 *   - { requirements: [...] }
 *   - { data: [...] }
 *   - { data: { requirements: [...] } }
 *   - { docs: [...] }
 */
function extractItems(response) {
  if (Array.isArray(response)) return response;
  if (!response) return [];
  const d = response.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.requirements)) return d.requirements;
  if (Array.isArray(response.requirements)) return response.requirements;
  if (Array.isArray(response.docs)) return response.docs;
  return [];
}

export const normalizeRequirement = (req) => {
  if (!req) return null;
  const commodity = req.commodityName || req.commodity || '';
  return {
    _id:               req._id,
    id:                req._id,
    commodity:         commodity,
    quantity:          req.quantity || 0,
    remainingQuantity: req.remainingQuantity ?? req.quantity ?? 0,
    unit:              req.unit === 'Qt' ? 'Quintal' : (req.unit || 'Quintal'),
    expectedPrice:     req.targetPrice || req.expectedPrice || 0,
    location:          req.deliveryLocation || req.location || '',
    grade:             req.grade || '',
    moisture:          req.moisture || '',
    harvestYear:       req.harvestYear || '',
    deliveryDate:      req.deliveryDate || '',
    remarks:           req.remarks || '',
    status:            normalizeStatus(req.status),
    createdAt:         req.createdAt || new Date().toISOString(),
    buyerId:           req.buyerId || null,
  };
};

let myRequirementsCache = null;
let cacheTime = 0;
const CACHE_DURATION = 15000; // 15 seconds caching to prevent double-fetches on focus changes

export const requirementService = {
  getMyRequirements: async (options = {}, forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && myRequirementsCache && (now - cacheTime < CACHE_DURATION)) {
      console.log('[RequirementService] getMyRequirements → returning cached items');
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
      const items = extractItems(response.data ?? response);
      console.log('[RequirementService] getMyRequirements → raw items count:', items.length);
      const normalized = items.map(normalizeRequirement).filter(Boolean);
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
      const items = extractItems(response.data ?? response);
      console.log('[RequirementService] getMarketplaceRequirements → raw items count:', items.length);
      let mapped = items.map(normalizeRequirement).filter(Boolean);
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
    // Invalidate the cache upon successful submission
    myRequirementsCache = null;
    cacheTime = 0;
    return response.data;
  },
};



