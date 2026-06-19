import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "dart_customer_session";

function getWebStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

export async function saveSession(session) {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(SESSION_KEY, JSON.stringify(session));
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession() {
  const value =
    Platform.OS === "web"
      ? getWebStorage()?.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}
