import api from "./api";

export async function listNotifications(params = {}) {
  const response = await api.get("/api/notifications", { params });
  return response.data;
}

export async function markNotificationRead(notificationId) {
  const response = await api.patch(`/api/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.post("/api/notifications/read-all");
  return response.data;
}
