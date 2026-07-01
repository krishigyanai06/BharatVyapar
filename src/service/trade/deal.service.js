import { USE_DUMMY_API } from '../../config';
import { rfqWorkflowService } from './rfqWorkflow.service';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const dealService = {
  /**
   * Update the status of a deal
   * @param {string} dealId 
   * @param {string} status 
   */
  updateDealStatus: async (dealId, status) => {
    if (USE_DUMMY_API) {
      await delay(800);
      return {
        success: true,
        data: {
          _id: dealId,
          status: status, // e.g. 'DISPATCH_PENDING', 'PO_UPLOADED'
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // TODO: replace with real API — axios.patch(`/api/v1/deals/${dealId}/status`, { status })
  },

  /**
   * Upload a single document for a deal (e.g. PO, E-Invoice, etc.)
   * @param {string} dealId 
   * @param {string} docType 
   * @param {Object} file 
   */
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
    // TODO: replace with real API — Form data upload to axios.post(`/api/v1/deals/${dealId}/documents`, formData)
  },

  /**
   * Confirm all dispatch documents are uploaded
   * @param {string} dealId 
   */
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
    // TODO: replace with real API — axios.post(`/api/v1/deals/${dealId}/dispatch-confirm`)
  },

  /**
   * Submit a debit note for a delivered deal
   * @param {string} dealId 
   * @param {Object} payload 
   */
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
    // TODO: replace with real API — axios.post(`/api/v1/deals/${dealId}/debit-note`, payload)
  }
};

// Simulate submitting a quote (bid) against a buyer's requirement
export const submitQuoteAgainstRequirement = async (requirementId, payload) => {
  return rfqWorkflowService.submitOrUpdateQuote(requirementId, payload);
};

// Simulate getting submitted quotes (for the seller)
export const getMySubmittedQuotes = async (sellerId) => {
  return rfqWorkflowService.getSubmittedQuotes(sellerId);
};

// Simulate getting received quotes (for the buyer)
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
