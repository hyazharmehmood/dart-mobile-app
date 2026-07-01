import api from "./api";

export async function quoteOrder(payload) {
  const response = await api.post("/api/customer/orders/quote", payload);
  return response.data;
}

export async function createOrder(payload) {
  const response = await api.post("/api/customer/orders", payload);
  return response.data;
}

export async function listOrders(params = {}) {
  const response = await api.get("/api/customer/orders", { params });
  return response.data;
}

export async function getOrder(orderId) {
  const response = await api.get(`/api/customer/orders/${orderId}`);
  return response.data;
}

export async function getOrderTracking(orderId) {
  try {
    const response = await api.get(`/api/customer/orders/${orderId}/tracking`);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      const detail = await getOrder(orderId);
      return {
        order: detail?.order || detail,
        tracking: null,
        source: "order-detail-fallback"
      };
    }

    throw error;
  }
}

export async function getOrderEvents(orderId) {
  const response = await api.get(`/api/orders/${orderId}/events`);
  return response.data;
}
