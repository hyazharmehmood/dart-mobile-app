import api from "./api";

export async function loginCustomer(payload) {
  const response = await api.post("/api/customer/login", payload);
  return response.data;
}

export async function signupCustomer(payload) {
  const response = await api.post("/api/customer/signup", payload);
  return response.data;
}

export async function forgotPassword(payload) {
  const response = await api.post("/api/auth/forgot-password", payload);
  return response.data;
}

export async function resetPassword(payload) {
  const response = await api.post("/api/auth/reset-password", payload);
  return response.data;
}

export async function sendVerificationCode(payload) {
  const response = await api.post("/api/auth/send-verification-code", payload);
  return response.data;
}

export async function verifyEmailCode(payload) {
  const response = await api.post("/api/auth/verify-email-code", payload);
  return response.data;
}
