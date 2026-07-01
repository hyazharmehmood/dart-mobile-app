import { io } from "socket.io-client";

import { API_BASE_URL } from "./api";

let socket = null;
const joinedOrderRooms = new Set();
let activeHandlers = null;

function flushJoinedOrderRooms() {
  if (!socket?.connected) {
    return;
  }

  joinedOrderRooms.forEach((orderId) => {
    socket.emit("order:join", orderId);
  });
}

function attachSocketListeners(handlers) {
  if (!socket) {
    return;
  }

  socket.off("connect");
  socket.off("notification:new");
  socket.off("notification:read");
  socket.off("notification:read-all");
  socket.off("order:event");
  socket.off("order:updated");
  socket.off("driver:location");

  socket.on("connect", () => {
    flushJoinedOrderRooms();
  });

  socket.on("notification:new", (notification) => {
    handlers.onNotificationNew?.(notification);
  });

  socket.on("notification:read", (payload) => {
    handlers.onNotificationRead?.(payload);
  });

  socket.on("notification:read-all", (payload) => {
    handlers.onNotificationReadAll?.(payload);
  });

  socket.on("order:event", (event) => {
    handlers.onOrderEvent?.(event);
  });

  socket.on("order:updated", (order) => {
    handlers.onOrderUpdated?.(order);
  });

  socket.on("driver:location", (payload) => {
    handlers.onDriverLocation?.(payload);
  });

  if (socket.connected) {
    flushJoinedOrderRooms();
  }
}

export function connectCustomerSocket({
  token,
  onNotificationNew,
  onNotificationRead,
  onNotificationReadAll,
  onOrderEvent,
  onOrderUpdated,
  onDriverLocation
}) {
  const handlers = {
    onNotificationNew,
    onNotificationRead,
    onNotificationReadAll,
    onOrderEvent,
    onOrderUpdated,
    onDriverLocation
  };

  activeHandlers = handlers;

  if (!token) {
    disconnectCustomerSocket();
    return null;
  }

  if (socket?.connected && socket.auth?.token === token) {
    attachSocketListeners(handlers);
    return socket;
  }

  if (socket) {
    socket.auth = { token };
    attachSocketListeners(handlers);
    socket.connect();
    return socket;
  }

  socket = io(API_BASE_URL, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    auth: { token },
    extraHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  attachSocketListeners(handlers);
  return socket;
}

export function disconnectCustomerSocket() {
  joinedOrderRooms.clear();
  activeHandlers = null;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function isSocketConnected() {
  return Boolean(socket?.connected);
}

export function joinOrderRoom(orderId) {
  if (!orderId) {
    return;
  }

  const normalizedOrderId = String(orderId);
  joinedOrderRooms.add(normalizedOrderId);

  if (socket?.connected) {
    socket.emit("order:join", normalizedOrderId);
  }
}

export function leaveOrderRoom(orderId) {
  if (!orderId) {
    return;
  }

  const normalizedOrderId = String(orderId);
  joinedOrderRooms.delete(normalizedOrderId);

  if (socket?.connected) {
    socket.emit("order:leave", normalizedOrderId);
  }
}
