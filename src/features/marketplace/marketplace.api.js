// features/marketplace/marketplace.api.js
// Merged from service/buy/buyCommodityService.js and service/sell/sellCommodity.js
import api from '../../api/client';

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

export const submitCounterOffer = async (offerId, counterData) => {
  const response = await api.post(`${BUY_BASE_URL}/offers/${offerId}/counter`, counterData);
  return normalizeOffer(response.data?.offer || response.data?.data || response.data);
};

export const acceptOffer = async (offerId) => {
  const response = await api.post(`${BUY_BASE_URL}/offers/${offerId}/accept`);
  return normalizeOffer(response.data?.offer || response.data?.data || response.data);
};

export const rejectOffer = async (offerId, rejectData) => {
  const response = await api.post(`${BUY_BASE_URL}/offers/${offerId}/reject`, rejectData);
  return normalizeOffer(response.data?.offer || response.data?.data || response.data);
};

export const getDealDetails = async (dealId) => {
  const response = await api.get(`${BUY_BASE_URL}/deals/${dealId}`);
  return response.data?.deal || response.data?.data || response.data;
};

export const updateEscrowStatus = async (dealId, escrowStatus) => {
  const response = await api.patch(`${BUY_BASE_URL}/deals/${dealId}/escrow`, { escrowStatus });
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
