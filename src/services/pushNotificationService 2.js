import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { registerMobileDevice, unregisterMobileDevice } from "./mobilePushService";
import { clearPushDevice, loadPushDevice, savePushDevice } from "./pushDeviceStorage";

let notificationsModule = null;
let notificationHandlerReady = false;

function canUseExpoNotifications() {
  return Platform.OS !== "web" && Constants.appOwnership !== "expo";
}

function logPushTokenDebug(label, payload) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log(`[push-notifications] ${label}`, payload);
  }
}

function getNotificationsModule() {
  if (!canUseExpoNotifications()) {
    return null;
  }

  if (!notificationsModule) {
    notificationsModule = require("expo-notifications");
  }

  if (!notificationHandlerReady) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });
    notificationHandlerReady = true;
  }

  return notificationsModule;
}

export async function registerForPushNotifications() {
  const Notifications = getNotificationsModule();

  if (!Notifications || !Device.isDevice) {
    logPushTokenDebug("remote token unavailable", {
      appOwnership: Constants.appOwnership,
      isDevice: Device.isDevice,
      platform: Platform.OS,
      reason: !Notifications ? "expo-notifications disabled in Expo Go/web" : "not a physical device"
    });
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    logPushTokenDebug("permission denied", { status });
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6400"
    });
  }

  const configuredProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.firebase?.projectId ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

  const expoToken = await Notifications.getExpoPushTokenAsync(
    configuredProjectId ? { projectId: configuredProjectId } : undefined
  ).catch(() => null);

  const deviceToken = await Notifications.getDevicePushTokenAsync().catch(() => null);

  const registration = {
    expoPushToken: expoToken?.data || null,
    nativePushToken: deviceToken?.data || null,
    nativePushTokenType: deviceToken?.type || null,
    firebaseProjectId: configuredProjectId || null,
    platform: Platform.OS
  };

  logPushTokenDebug("device tokens", registration);

  return registration;
}

export async function registerAuthenticatedPushDevice() {
  const registration = await registerForPushNotifications();
  const fcmToken = registration?.nativePushToken;

  if (!fcmToken || String(fcmToken).length < 20) {
    logPushTokenDebug("native token not registered", {
      nativePushToken: fcmToken || null,
      message: "No valid FCM/APNs token returned. Use a physical device + development build."
    });
    return null;
  }

  const payload = {
    token: fcmToken,
    platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
    deviceName: Device.deviceName || Device.modelName || Device.osName || "Dart mobile device",
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

export async function showLocalNotification(notification) {
  const Notifications = getNotificationsModule();

  if (!Notifications || !notification?.title) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.message || "You have a new Dart update.",
      data: {
        orderId: notification.orderId || notification.metadata?.orderId || null,
        notificationId: notification.id || null,
        type: notification.type || null,
        category: notification.category || notification.metadata?.category || null,
        route: notification.route || notification.metadata?.route || null
      },
      sound: true
    },
    trigger: null
  }).catch(() => null);
}

export function addNotificationResponseListener(listener) {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return {
      remove: () => {}
    };
  }

  return Notifications.addNotificationResponseReceivedListener(listener);
}
