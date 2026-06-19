import api from "./api";

export async function listDragonpayProcessors(amount) {
  const response = await api.get("/api/dragonpay/payments/processors", {
    params: amount ? { amount } : {}
  });
  return response.data;
}

export async function createDragonpayPayment(payload) {
  const response = await api.post("/api/customer/payments/dragonpay/create", payload);
  return response.data;
}
