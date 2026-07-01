import { rfqWorkflowService } from './rfqWorkflow.service';

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
