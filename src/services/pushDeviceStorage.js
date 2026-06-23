import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PUSH_DEVICE_KEY = "dart_customer_push_device";

function getWebStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

export async function savePushDevice(device) {
  if (!device?.id) {
    return;
  }

  const value = JSON.stringify(device);

  if (Platform.OS === "web") {
    getWebStorage()?.setItem(PUSH_DEVICE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(PUSH_DEVICE_KEY, value);
}

export async function loadPushDevice() {
  const value =
    Platform.OS === "web"
      ? getWebStorage()?.getItem(PUSH_DEVICE_KEY)
      : await SecureStore.getItemAsync(PUSH_DEVICE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    await clearPushDevice();
    return null;
  }
}

export async function clearPushDevice() {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(PUSH_DEVICE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(PUSH_DEVICE_KEY);
}
