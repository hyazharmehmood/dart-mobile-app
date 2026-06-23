import Constants from "expo-constants";
import { Platform } from "react-native";

import { registerMobileDevice, unregisterMobileDevice } from "./mobilePushService";
import { clearPushDevice, loadPushDevice, savePushDevice } from "./pushDeviceStorage";

let messagingModule = null;

function logPushTokenDebug(label, payload) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log(`[firebase-messaging] ${label}`, payload);
  }
}

function canUseFirebaseMessaging() {
  return Platform.OS !== "web" && Constants.appOwnership !== "expo";
}

function getMessagingModule() {
  if (!canUseFirebaseMessaging()) {
    return null;
  }

  if (!messagingModule) {
    messagingModule = require("@react-native-firebase/messaging").default;
  }

  return messagingModule;
}

function normalizeRemoteMessage(remoteMessage = {}) {
  const data = remoteMessage.data || {};

  return {
    id: data.notificationId || remoteMessage.messageId || `${Date.now()}`,
    type: data.type || null,
    title: remoteMessage.notification?.title || data.title || "Dart update",
    message: remoteMessage.notification?.body || data.body || data.message || "You have a new update.",
    orderId: data.orderId || null,
    restaurantId: data.restaurantId || null,
    driverId: data.driverId || null,
    route: data.route || null,
    category: data.category || null,
    metadata: data,
    readAt: null,
    createdAt: new Date().toISOString()
  };
}

export async function registerForPushNotifications() {
  const messaging = getMessagingModule();

  if (!messaging) {
    logPushTokenDebug("remote token unavailable", {
      appOwnership: Constants.appOwnership,
      platform: Platform.OS,
      reason: "Firebase Messaging needs a development/production build, not Expo Go/web."
    });
    return null;
  }

  const authStatus = await messaging().requestPermission();
  const authorized =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!authorized) {
    logPushTokenDebug("permission denied", { authStatus });
    return null;
  }

  if (Platform.OS === "ios") {
    await messaging().registerDeviceForRemoteMessages().catch(() => null);
  }

  const fcmToken = await messaging().getToken();
  const registration = {
    nativePushToken: fcmToken || null,
    nativePushTokenType: "fcm",
    firebaseProjectId:
      Constants.expoConfig?.extra?.firebase?.projectId ||
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
      null,
    platform: Platform.OS
  };

  logPushTokenDebug("fcm token", registration);

  return registration;
}

export async function registerAuthenticatedPushDevice() {
  const registration = await registerForPushNotifications();
  const fcmToken = registration?.nativePushToken;

  if (!fcmToken || String(fcmToken).length < 20) {
    logPushTokenDebug("native token not registered", {
      nativePushToken: fcmToken || null,
      message: "No valid FCM token returned. Use a physical device + development build."
    });
    return null;
  }

  const payload = {
    token: fcmToken,
    platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    deviceName: `${Platform.OS} device`,
    appVersion: Constants.expoConfig?.version || "1.0.0"
  };

  const data = await registerMobileDevice(payload);

  if (data?.device?.id) {
    await savePushDevice(data.device);
  }

  return data?.device || null;
}

export async function unregisterSavedPushDevice() {
  const device = await loadPushDevice();

  if (!device?.id) {
    return null;
  }

  try {
    await unregisterMobileDevice(device.id);
  } finally {
    await clearPushDevice();
  }

  return device;
}

export function addFirebaseMessageListener(onMessage) {
  const messaging = getMessagingModule();

  if (!messaging) {
    return () => {};
  }

  return messaging().onMessage((remoteMessage) => {
    onMessage?.(normalizeRemoteMessage(remoteMessage), remoteMessage);
  });
}

export function addNotificationResponseListener(listener) {
  const messaging = getMessagingModule();

  if (!messaging) {
    return {
      remove: () => {}
    };
  }

  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
    listener?.({
      notification: {
        request: {
          content: {
            data: {
              ...(remoteMessage?.data || {}),
              notificationId: remoteMessage?.data?.notificationId || remoteMessage?.messageId || null
            }
          }
        }
      }
    });
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        listener?.({
          notification: {
            request: {
              content: {
                data: {
                  ...(remoteMessage.data || {}),
                  notificationId: remoteMessage.data?.notificationId || remoteMessage.messageId || null
                }
              }
            }
          }
        });
      }
    })
    .catch(() => null);

  return {
    remove: unsubscribe
  };
}

export function addFirebaseTokenRefreshListener(onTokenRefresh) {
  const messaging = getMessagingModule();

  if (!messaging) {
    return () => {};
  }

  return messaging().onTokenRefresh(onTokenRefresh);
}
