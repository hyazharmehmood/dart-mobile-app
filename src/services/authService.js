import api from "./api";

export async function loginCustomer(payload) {
  const response = await api.post("/api/customer/login", payload);
  return response.data;
}

export async function signupCustomer(payload) {
  const response = await api.post("/api/customer/signup", payload);
  return response.data;
}
