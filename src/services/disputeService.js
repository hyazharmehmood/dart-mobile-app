import api from "./api";

export async function getOrderDisputeState(orderId) {
  const response = await api.get(`/api/customer/orders/${orderId}/disputes`);
  return response.data;
}

export async function openDispute(orderId, payload) {
  const response = await api.post(`/api/customer/orders/${orderId}/disputes`, payload);
  return response.data;
}

export async function listDisputes(params = {}) {
  const response = await api.get("/api/customer/disputes", { params });
  return response.data;
}

export async function getDispute(disputeId) {
  const response = await api.get(`/api/customer/disputes/${disputeId}`);
  return response.data;
}

export async function postDisputeMessage(disputeId, payload) {
  const response = await api.post(`/api/customer/disputes/${disputeId}/messages`, payload);
  return response.data;
}

export async function getDisputeEvidenceUrl(disputeId, evidenceId) {
  const response = await api.get(`/api/disputes/${disputeId}/evidence/${evidenceId}`);
  return response.data;
}
