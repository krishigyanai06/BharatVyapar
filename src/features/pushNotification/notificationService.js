import {
  getMessaging,
  requestPermission,
  getToken,
  onTokenRefresh,
  onMessage,
  getInitialNotification as getFcmInitialNotification,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { navigate } from '../../navigation/navigationService';
import store from '../../store';
import { selectIsAuthenticated, selectIsAuthChecked } from '../../store/authSelectors';
import { setPendingNotificationRoute } from '../../store/authSlice';
import { notificationApi } from './notification.api';

// Aliases Mapper to bridge backend event variations (case-insensitive)
const EVENT_TYPE_ALIASES = {
  'NEW_LISTING': 'MARKETPLACE_LISTING',
  'COMMODITY_LISTED': 'MARKETPLACE_LISTING',
  'SELL_COMMODITY': 'MARKETPLACE_LISTING',
  'NEW_REQUIREMENT': 'BUYER_REQUIREMENT',
  'REQUIREMENT_POSTED': 'BUYER_REQUIREMENT',
  'COUNTER_OFFER': 'BIDDING_OFFER',
  'OFFER_RECEIVED': 'BIDDING_OFFER',
  'NEW_BID': 'BIDDING_OFFER',
  'DEAL_CONFIRMED': 'DEAL_DONE',
  'ORDER_COMPLETED': 'DEAL_DONE',
  'PURCHASE_ORDER_SENT': 'PO_SENT',
  'PO_ISSUED': 'PO_SENT',
  'PO_CREATED': 'PO_SENT',
  'NEW_PO': 'PO_SENT',
  'PO_STATUS_CHANGE': 'PO_STATUS_UPDATED',
  'PO_ACKNOWLEDGED': 'PO_STATUS_UPDATED',
  'PO_REJECTED': 'PO_STATUS_UPDATED',
  'OFFER_DECLINED': 'OFFER_REJECTED',
  'REJECTED_OFFER': 'OFFER_REJECTED',
  'QUOTE_REJECTED': 'QUOTATION_REJECTED',
  'QUOTATION_DECLINED': 'QUOTATION_REJECTED',
  'DECLINED_QUOTE': 'QUOTATION_REJECTED',
  'DISPATCHED': 'GOODS_DISPATCHED',
  'DELIVERED': 'GOODS_DELIVERED',
  'ESCROW_UPDATED': 'ESCROW_STATUS_UPDATED',
};

// Routing Map: Translates platform-agnostic business event types to mobile routes and parameter shapes
const NOTIFICATION_ROUTING_MAP = {
  MARKETPLACE_LISTING: {
    screen: 'CommodityDetails',
    paramMapper: (data) => ({
      item: {
        id: data.commodityId || data.id || data.entityId || data._id,
      },
    }),
  },
  BUYER_REQUIREMENT: {
    screen: 'MyRequirements',
    paramMapper: (data) => ({
      requirementId: data.requirementId || data.id || data.entityId || data._id,
    }),
  },
  NEW_QUOTATION: {
    screen: 'BuyerQuoteDashboard',
    paramMapper: (data) => ({
      requirement: { id: data.requirementId || data.id || data._id },
      quotationId: data.quotationId,
    }),
  },
  BIDDING_OFFER: {
    screen: 'NegotiationDetails',
    paramMapper: (data) => ({
      offerId: data.offerId || data.id || data._id,
      commodityId: data.commodityId,
    }),
  },
  DEAL_DONE: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data._id,
      offerId: data.offerId,
    }),
  },
  PO_SENT: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data.entityId || data._id,
      poId: data.poId,
      offerId: data.offerId,
    }),
  },
  PO_STATUS_UPDATED: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data.entityId || data._id,
      poId: data.poId,
      status: data.status,
      offerId: data.offerId,
    }),
  },
  GOODS_DISPATCHED: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data.entityId || data._id,
      dispatchId: data.dispatchId,
    }),
  },
  GOODS_DELIVERED: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data.entityId || data._id,
      dispatchId: data.dispatchId,
    }),
  },
  OFFER_REJECTED: {
    screen: 'NegotiationDetails',
    paramMapper: (data) => ({
      offerId: data.offerId || data.id || data.entityId || data._id,
      commodityId: data.commodityId,
      status: 'REJECTED',
    }),
  },
  QUOTATION_REJECTED: {
    screen: 'MyRequirements',
    paramMapper: (data) => ({
      requirementId: data.requirementId || data.id || data.entityId || data._id,
      offerId: data.offerId,
      status: 'REJECTED',
    }),
  },
  ESCROW_STATUS_UPDATED: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data.entityId || data._id,
      status: data.status,
    }),
  },
};

/**
 * Smart Notification Content Resolver:
 * Ensures data-only payloads (e.g. OFFER_REJECTED with missing body) generate
 * meaningful titles and non-empty body strings so Notifee OS banners draw reliably.
 */
function resolveNotificationContent(notification, data) {
  const rawType = (data?.type || data?.eventType || '').toString().toUpperCase().trim();
  const eventType = EVENT_TYPE_ALIASES[rawType] || rawType;

  let title = notification?.title || data?.title;
  let body = notification?.body || data?.body;

  if (!title || !body) {
    switch (eventType) {
      case 'PO_SENT':
        title = title || 'Purchase Order Received';
        body = body || 'You received a new Purchase Order for your confirmed deal.';
        break;
      case 'PO_STATUS_UPDATED':
        title = title || 'PO Status Updated';
        body = body || `Purchase order status updated to ${data?.status || 'updated'}.`;
        break;
      case 'OFFER_REJECTED':
        title = title || 'Offer Declined';
        body = body || 'An offer for your commodity negotiation was declined.';
        break;
      case 'QUOTATION_REJECTED':
        title = title || 'Quotation Declined';
        body = body || 'A submitted quote for your requirement was declined.';
        break;
      case 'GOODS_DISPATCHED':
        title = title || 'Goods Dispatched';
        body = body || 'Goods for your deal have been dispatched.';
        break;
      case 'GOODS_DELIVERED':
        title = title || 'Goods Delivered';
        body = body || 'Goods for your deal have been delivered successfully.';
        break;
      case 'ESCROW_STATUS_UPDATED':
        title = title || 'Escrow Status Updated';
        body = body || `Escrow status updated to ${data?.status || 'updated'}.`;
        break;
      default:
        title = title || 'Trade Update';
        body = body || 'You have a new update in your trade workflow.';
        break;
    }
  }

  return { title, body };
}

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
    this.messaging = getMessaging(); // Modular Firebase SDK instance
    this.pendingRouteQueue = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
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
    } catch (error) {
      console.error('[NotificationService] Initialization failed:', error);
    }
  }

  async requestPermissions() {
    const authStatus = await requestPermission(this.messaging);
    // 1 = AUTHORIZED, 2 = PROVISIONAL
    const isGranted = authStatus === 1 || authStatus === 2;

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

      // Save token to server if user is logged in
      const state = store.getState();
      const isAuthenticated = selectIsAuthenticated(state);
      if (isAuthenticated) {
        await notificationApi.saveFcmToken(this.fcmToken);
      }

      // Keep token updated when FCM issues a fresh identifier token
      onTokenRefresh(this.messaging, async (newToken) => {
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

  async displayLocalNotification({ title, body, data = {}, type = 'TRANSACTIONAL' }) {
    try {
      await notifee.displayNotification({
        title: title || 'Trade Notification',
        body: body || 'Update in your trade workflow',
        data: { ...data, type },
        android: {
          channelId: 'transactional_deals',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (err) {
      console.warn('[NotificationService] Error displaying local notification:', err);
    }
  }

  setupForegroundListener() {
    onMessage(this.messaging, async (remoteMessage) => {
      const { notification, data } = remoteMessage;
      const { title, body } = resolveNotificationContent(notification, data);

      // When the app is in the foreground, FCM doesn't draw banners. We trigger Notifee to draw it.
      await notifee.displayNotification({
        title: title,
        body: body,
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
        this.resolveNavigationRoute(detail.notification);
      }
    });

    // 1. Check Notifee initial notification (for custom Notifee taps or data-only payloads)
    notifee.getInitialNotification().then((payload) => {
      if (payload?.notification) {
        console.log('[NotificationService] App launched from Notifee notification click in killed state.');
        setTimeout(() => {
          this.resolveNavigationRoute(payload.notification);
        }, 800);
      }
    });

    // 2. Check Native FCM initial notification (for Android OS system drawer taps in killed state)
    getFcmInitialNotification(this.messaging).then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[NotificationService] App launched from FCM Native notification click in killed state.');
        setTimeout(() => {
          this.resolveNavigationRoute(remoteMessage);
        }, 800);
      }
    }).catch((err) => {
      console.warn('[NotificationService] Error checking FCM native initial notification:', err);
    });
  }

  resolveNavigationRoute(notificationOrMessage) {
    // Support both Notifee shape (notification.data) and FCM RemoteMessage shape (data)
    const data = notificationOrMessage?.data || notificationOrMessage?.notification?.data;
    console.log('📬 [NotificationService Resolving Route For Payload Data]:', JSON.stringify(data, null, 2));

    if (!data) {
      console.log('[NotificationService] Notification clicked, but no payload data found.');
      return;
    }

    const rawType = (data.type || data.eventType || '').toString().toUpperCase().trim();
    const eventType = EVENT_TYPE_ALIASES[rawType] || rawType;

    const routeConfig = NOTIFICATION_ROUTING_MAP[eventType];
    if (!routeConfig) {
      console.warn(`[NotificationService] Event type "${rawType}" (mapped: "${eventType}") is not mapped to any screen route.`);
      return;
    }

    const targetScreen = routeConfig.screen;
    const parsedParams = routeConfig.paramMapper(data);

    // AUTH GUARD BUFFER SYSTEM:
    const state = store.getState();
    const isAuthenticated = selectIsAuthenticated(state);
    const isAuthChecked = selectIsAuthChecked(state);

    if (!isAuthChecked || !isAuthenticated) {
      console.log(`[NotificationService] User not authenticated or auth check in progress. Buffering route: ${targetScreen}`);
      store.dispatch(setPendingNotificationRoute({ screen: targetScreen, params: parsedParams }));
      return;
    }

    console.log(`[NotificationService] Resolving dynamic route for event: ${eventType} -> Screen: ${targetScreen}`, parsedParams);
    navigate(targetScreen, parsedParams);
  }
}

export const notificationService = new NotificationService();


