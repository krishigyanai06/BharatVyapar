import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Register background event handler for Notifee interactions (taps/dismisses when app is closed/background)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[Notifee Background Event] Intercepted:', type, detail);
});

// Register background headless handler for message packets arriving when app is killed/minimized
setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  console.log('📬 [HeadlessJS - FCM Background Payload Received]:', JSON.stringify(remoteMessage, null, 2));

  const { notification, data } = remoteMessage;

  // If FCM payload already includes a 'notification' object, Android OS automatically
  // displays a system notification drawer item. We must NOT call notifee.displayNotification
  // here to prevent duplicate banners in the system tray.
  if (notification) {
    console.log('[HeadlessJS] FCM Notification payload already displayed by Android OS native drawer.');
    return;
  }

  // Handle data-only push notifications via Notifee
  await notifee.createChannel({
    id: 'transactional_deals',
    name: 'Deal & Order Updates',
    importance: AndroidImportance.HIGH,
    vibration: true,
  });

  await notifee.displayNotification({
    title: data?.title || 'New Update',
    body: data?.body || '',
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

AppRegistry.registerComponent(appName, () => App);
