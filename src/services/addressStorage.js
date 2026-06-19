import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ADDRESS_KEY = "dart_selected_delivery_address";

function getWebStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

export async function saveStoredAddress(address) {
  if (!address) {
    return;
  }

  const value = JSON.stringify(address);

  if (Platform.OS === "web") {
    getWebStorage()?.setItem(ADDRESS_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(ADDRESS_KEY, value);
}

export async function loadStoredAddress() {
  const value =
    Platform.OS === "web"
      ? getWebStorage()?.getItem(ADDRESS_KEY)
      : await SecureStore.getItemAsync(ADDRESS_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    await clearStoredAddress();
    return null;
  }
}

export async function clearStoredAddress() {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(ADDRESS_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(ADDRESS_KEY);
}
