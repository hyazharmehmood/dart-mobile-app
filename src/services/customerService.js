import api, { API_BASE_URL } from "./api";

export function signupCustomer(payload) {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in your .env file.");
  }

  return api.post("/api/customer/signup", payload);
}
