import { io } from "socket.io-client";

import { API_BASE_URL } from "./api";

let socket = null;

export function connectCustomerSocket({ token, onNotificationNew, onNotificationRead, onNotificationReadAll, onOrderEvent, onOrderUpdated }) {
  if (!token) {
    disconnectCustomerSocket();
    return null;
  }

  if (socket?.connected && socket.auth?.token === token) {
    return socket;
  }

  disconnectCustomerSocket();

  socket = io(API_BASE_URL, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: { token },
    extraHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  socket.on("notification:new", (notification) => {
    onNotificationNew?.(notification);
  });

  socket.on("notification:read", (payload) => {
    onNotificationRead?.(payload);
  });

  socket.on("notification:read-all", (payload) => {
    onNotificationReadAll?.(payload);
  });

  socket.on("order:event", (event) => {
    onOrderEvent?.(event);
  });

  socket.on("order:updated", (order) => {
    onOrderUpdated?.(order);
  });

  return socket;
}

export function disconnectCustomerSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function joinOrderRoom(orderId) {
  if (socket?.connected && orderId) {
    socket.emit("order:join", orderId);
  }
}

export function leaveOrderRoom(orderId) {
  if (socket?.connected && orderId) {
    socket.emit("order:leave", orderId);
  }
}
