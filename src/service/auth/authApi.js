// Service layer: auth-specific API operations.
import apiClient from '../api';

const normalizeRole = role => {
  if (typeof role !== 'string') {
    return role;
  }

  const trimmedRole = role.trim();

  if (!trimmedRole) {
    return trimmedRole;
  }

  if (trimmedRole.toLowerCase() === 'fpo') {
    return 'FPO';
  }

  return (
    trimmedRole.charAt(0).toUpperCase() + trimmedRole.slice(1).toLowerCase()
  );
};

const buildAuthPayload = payload => ({
  ...payload,
  role: normalizeRole(payload?.role),
});

const authApi = {
  sendOtp: async payload => {
    const res = await apiClient.post('/otp/send-otp', buildAuthPayload(payload));
    return res.data;
  },

  verifyOtp: async payload => {
    const res = await apiClient.post('/otp/verify-otp', buildAuthPayload(payload));
    return res.data;
  },
};

export default authApi;
