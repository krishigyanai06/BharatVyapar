// Service layer: user-specific API operations.
// Migrated to features/profile/profile.api.js
import apiClient from '../../api/client';


const profileApi = {
  updateProfile: async (formData, type, signal) => {
    const url = type
      ? `/user/update-profile?type=${type}`
      : '/user/update-profile';
    const res = await apiClient.patch(url, formData, { signal });
    return res.data;
  },

  deleteAccount: async () => {
    const res = await apiClient.delete('/user/delete-account');
    return res.data;
  },

  getUserDetails: async () => {
    const res = await apiClient.get('/user/getUserDetails');
    return res.data;
  },

  getAllUsers: async () => {
    const res = await apiClient.get('/user/getAllUsers');
    return res.data;
  },

  getPrivateFile: async ({ type, index } = {}) => {
    const params = { type };
    if (index !== undefined) params.index = index;
    const res = await apiClient.get('/user/files/private', { params });
    return res.data;
  },

  logout: async (config = {}) => {
    const res = await apiClient.post('/user/logout', {}, config);
    return res.data;
  },

  verifyPan: async ({ pan, name }) => {
    const res = await apiClient.post('user/kyc/verify-pan', { pan, name });
    console.log('Kyc Status', res.data);
    return res.data;
  },
};

export default profileApi;
