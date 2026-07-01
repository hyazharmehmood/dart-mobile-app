import api from "./api";

export async function listCustomerAddresses() {
  const response = await api.get("/api/customer/addresses");
  return response.data;
}

export async function getCustomerAddress(addressId) {
  const response = await api.get(`/api/customer/addresses/${addressId}`);
  return response.data;
}

export async function createCustomerAddress(payload) {
  const response = await api.post("/api/customer/addresses", payload);
  return response.data;
}

export async function updateCustomerAddress(addressId, payload) {
  const response = await api.patch(`/api/customer/addresses/${addressId}`, payload);
  return response.data;
}

export async function deleteCustomerAddress(addressId) {
  const response = await api.delete(`/api/customer/addresses/${addressId}`);
  return response.data;
}
