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
  console.log('[HeadlessJS] Background message intercepted:', remoteMessage);

  const { notification, data } = remoteMessage;

  // Make sure we create the default transactional channel for background triggers
  await notifee.createChannel({
    id: 'transactional_deals',
    name: 'Deal & Order Updates',
    importance: AndroidImportance.HIGH,
    vibration: true,
  });

  // Display OS-level drawer notification
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

AppRegistry.registerComponent(appName, () => App);
