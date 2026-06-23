import api from "./api";

export async function registerMobileDevice(payload) {
  const response = await api.post("/api/mobile/devices", payload);
  return response.data;
}

export async function listMobileDevices() {
  const response = await api.get("/api/mobile/devices");
  return response.data;
}

export async function unregisterMobileDevice(deviceId) {
  const response = await api.delete(`/api/mobile/devices/${deviceId}`);
  return response.data;
}

export async function getNotificationPreferences() {
  const response = await api.get("/api/mobile/notification-preferences");
  return response.data;
}

export async function updateNotificationPreferences(payload) {
  const response = await api.patch("/api/mobile/notification-preferences", payload);
  return response.data;
}
