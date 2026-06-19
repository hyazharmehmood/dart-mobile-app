import axios from "axios";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://app.dart.com.ph";

let accessToken = null;
let unauthorizedHandler = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

export function setApiAccessToken(token) {
  accessToken = token || null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default api;
