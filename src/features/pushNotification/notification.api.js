import apiClient from '../../api/client';

export const notificationApi = {
  /**
   * Save the FCM registration token to the backend server.
   * Sends both token properties to maintain backwards-compatibility with backend specs.
   */
  saveFcmToken: async (token) => {
    try {
      const res = await apiClient.post('/fcm/save-token', {
        token,
        fcmToken: token,
      }, {
        _noCache: true, // Config flag to ensure we bypass caching layers
      });
      return res.data;
    } catch (error) {
      console.error('[NotificationApi] Error posting FCM token to backend:', error?.message || error);
      throw error;
    }
  },
};
