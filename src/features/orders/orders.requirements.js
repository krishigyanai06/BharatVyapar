// features/orders/orders.requirements.js
// Migrated from: service/trade/requirement.service.js
import { rfqWorkflowService } from './orders.workflow';

export const requirementService = {
  getAllRequirements: async (options = {}) => {
    return rfqWorkflowService.getRequirements(options);
  },

  getMarketplaceRequirements: async ({ excludeBuyerId = null } = {}) => {
    return rfqWorkflowService.getRequirements({ marketplaceOnly: true, excludeBuyerId });
  },

  submitRequirement: async (payload) => {
    return rfqWorkflowService.createRequirement(payload);
  },
};
