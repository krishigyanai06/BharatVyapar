// features/orders/orders.service.js
// Migrated from: service/trade/deal.service.js
import { USE_DUMMY_API } from '../../config';
import { rfqWorkflowService } from './orders.workflow';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const dealService = {
  updateDealStatus: async (dealId, status) => {
    if (USE_DUMMY_API) {
      await delay(800);
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
    if (USE_DUMMY_API) {
      await delay(1200);
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
    if (USE_DUMMY_API) {
      await delay(800);
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
    if (USE_DUMMY_API) {
      await delay(1000);
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
  return rfqWorkflowService.submitOrUpdateQuote(requirementId, payload);
};

export const getMySubmittedQuotes = async (sellerId) => {
  return rfqWorkflowService.getSubmittedQuotes(sellerId);
};

export const getReceivedQuotesOnRequirements = async (_buyerId = null, options = {}) => {
  return rfqWorkflowService.getReceivedQuotes({
    requirementId: options.requirementId || null,
  });
};

export const acceptRequirementQuote = async (quoteId) => {
  return rfqWorkflowService.acceptQuote(quoteId);
};

export const rejectRequirementQuote = async (quoteId) => {
  return rfqWorkflowService.rejectQuote(quoteId);
};

export const getSellerPurchaseOrders = async () => {
  return rfqWorkflowService.getSellerOrders();
};

export const getBuyerPurchaseOrders = async () => {
  return rfqWorkflowService.getBuyerOrders();
};

export const updatePurchaseOrderStatus = async (orderId, status) => {
  return rfqWorkflowService.updateOrderStatus(orderId, status);
};
