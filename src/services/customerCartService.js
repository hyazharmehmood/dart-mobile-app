import api from "./api";

export async function getCustomerCart() {
  const response = await api.get("/api/customer/cart");
  return response.data;
}

export async function addCustomerCartItem(payload) {
  const response = await api.post("/api/customer/cart/items", payload);
  return response.data;
}

export async function updateCustomerCartItem(itemId, payload) {
  const response = await api.patch(`/api/customer/cart/items/${itemId}`, payload);
  return response.data;
}

export async function removeCustomerCartItem(itemId) {
  const response = await api.delete(`/api/customer/cart/items/${itemId}`);
  return response.data;
}

export async function updateCustomerCart(payload) {
  const response = await api.patch("/api/customer/cart", payload);
  return response.data;
}

export async function clearCustomerCart() {
  const response = await api.delete("/api/customer/cart");
  return response.data;
}
