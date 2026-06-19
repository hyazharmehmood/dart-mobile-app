import api from "./api";

export async function getCustomerProfile() {
  const response = await api.get("/api/customer/profile");
  return response.data;
}

export async function updateCustomerProfile(payload) {
  const response = await api.patch("/api/customer/profile", payload);
  return response.data;
}
