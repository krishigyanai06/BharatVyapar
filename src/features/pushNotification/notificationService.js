import {
  getMessaging,
  requestPermission,
  getToken,
  onTokenRefresh,
  onMessage,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { navigate } from '../../navigation/navigationService';
import store from '../../store';
import { selectIsAuthenticated, selectIsAuthChecked } from '../../store/authSelectors';
import { setPendingNotificationRoute } from '../../store/authSlice';
import { notificationApi } from './notification.api';

// Routing Map: Translates platform-agnostic business event types to mobile routes and parameter shapes
const NOTIFICATION_ROUTING_MAP = {
  MARKETPLACE_LISTING: {
    screen: 'CommodityDetails',
    paramMapper: (data) => ({
      item: { id: data.commodityId },
    }),
  },
  BUYER_REQUIREMENT: {
    screen: 'MyRequirements',
    paramMapper: (data) => ({
      requirementId: data.requirementId,
    }),
  },
  NEW_QUOTATION: {
    screen: 'BuyerQuoteDashboard',
    paramMapper: (data) => ({
      requirement: { id: data.requirementId },
      quotationId: data.quotationId,
    }),
  },
  BIDDING_OFFER: {
    screen: 'NegotiationDetails',
    paramMapper: (data) => ({
      offerId: data.offerId,
      commodityId: data.commodityId,
    }),
  },
  DEAL_DONE: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId,
      offerId: data.offerId,
    }),
  },
};

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
    this.messaging = getMessaging(); // Modular Firebase SDK instance
    this.pendingRouteQueue = [];
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('[NotificationService] Already initialized. Skipping duplicate registrations.');
      return;
    }

    try {
      console.log('[NotificationService] Running Post-Auth Push Notifications Setup...');

      // 1. Request OS permissions for notifications (required on Android 13+ and iOS)
      await this.requestPermissions();

      // 2. Setup standard high importance Android channels
      await this.createAndroidChannels();

      // 3. Retrieve and register the device's FCM Token
      await this.syncFcmToken();

      // 4. Setup foreground notification listener
      this.setupForegroundListener();

      // 5. Setup dynamic tap-interaction observers
      this.setupInteractionObserver();

      this.isInitialized = true;
      console.log('[NotificationService] Push notifications pipeline successfully loaded.');
    } catch (error) {
      console.error('[NotificationService] Initialization failed:', error);
    }
  }

  async requestPermissions() {
    const authStatus = await requestPermission(this.messaging);
    // 1 = AUTHORIZED, 2 = PROVISIONAL
    const isGranted = authStatus === 1 || authStatus === 2;

    console.log('[NotificationService] FCM Authorization Status:', authStatus);

    if (isGranted) {
      await notifee.requestPermission();
    }
  }

  async createAndroidChannels() {
    // Create dedicated notification channels for transactional order updates
    await notifee.createChannel({
      id: 'transactional_deals',
      name: 'Deal & Order Updates',
      importance: AndroidImportance.HIGH,
      vibration: true,
      sound: 'default',
    });
  }

  async syncFcmToken() {
    try {
      this.fcmToken = await getToken(this.messaging);
      console.log('[NotificationService] Device FCM Token:', this.fcmToken);

      // Save token to server if user is logged in
      const state = store.getState();
      const isAuthenticated = selectIsAuthenticated(state);
      if (isAuthenticated) {
        await notificationApi.saveFcmToken(this.fcmToken);
      }

      // Keep token updated when FCM issues a fresh identifier token
      onTokenRefresh(this.messaging, async (newToken) => {
        console.log('[NotificationService] Token refreshed by FCM SDK:', newToken);
        this.fcmToken = newToken;
        const currentState = store.getState();
        if (selectIsAuthenticated(currentState)) {
          await notificationApi.saveFcmToken(newToken).catch(() => {});
        }
      });
    } catch (error) {
      console.error('[NotificationService] Error getting/syncing token:', error);
    }
  }

  setupForegroundListener() {
    onMessage(this.messaging, async (remoteMessage) => {
      console.log('[NotificationService] Foreground message intercepted:', remoteMessage);
      const { notification, data } = remoteMessage;

      // When the app is in the foreground, FCM doesn't draw banners. We trigger Notifee to draw it.
      await notifee.displayNotification({
        title: notification?.title || data?.title || 'New Update',
        body: notification?.body || data?.body || '',
        data: data || {},
        android: {
          channelId: 'transactional_deals',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
      });
    });
  }

  setupInteractionObserver() {
    // Listener for taps in foreground / background (active states)
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification) {
        console.log('[NotificationService] User tapped notification in active state.');
        this.resolveNavigationRoute(detail.notification);
      }
    });

    // Listener for taps when app is launched from terminated/killed state
    notifee.getInitialNotification().then((payload) => {
      if (payload?.notification) {
        console.log('[NotificationService] App launched from notification click in killed state.');
        // Brief timeout ensures React Native UI renders the splash/navigator structure first
        setTimeout(() => {
          this.resolveNavigationRoute(payload.notification);
        }, 800);
      }
    });
  }

  resolveNavigationRoute(notification) {
    const data = notification?.data;
    if (!data || !data.type) {
      console.log('[NotificationService] Notification clicked, but no payload event type found.');
      return;
    }

    const routeConfig = NOTIFICATION_ROUTING_MAP[data.type];
    if (!routeConfig) {
      console.warn(`[NotificationService] Event type "${data.type}" is not mapped to any screen route.`);
      return;
    }

    const targetScreen = routeConfig.screen;
    const parsedParams = routeConfig.paramMapper(data);

    // AUTH GUARD BUFFER SYSTEM:
    const state = store.getState();
    const isAuthenticated = selectIsAuthenticated(state);
    const isAuthChecked = selectIsAuthChecked(state);

    if (!isAuthChecked || !isAuthenticated) {
      console.log(`[NotificationService] User not authenticated. Buffering route: ${targetScreen}`);
      store.dispatch(setPendingNotificationRoute({ screen: targetScreen, params: parsedParams }));
      return;
    }

    console.log(`[NotificationService] Resolving dynamic route for event: ${data.type} -> Screen: ${targetScreen}`);
    navigate(targetScreen, parsedParams);
  }
}

export const notificationService = new NotificationService();
