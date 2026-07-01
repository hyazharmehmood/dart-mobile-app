import api from "./api";

export async function getReviewEligibility(orderId) {
  const response = await api.get(`/api/customer/orders/${orderId}/review-eligibility`);
  return response.data;
}

export async function createReview(orderId, payload) {
  const response = await api.post(`/api/customer/orders/${orderId}/review`, payload);
  return response.data;
}

export async function getReview(reviewId) {
  const response = await api.get(`/api/customer/reviews/${reviewId}`);
  return response.data;
}

export async function updateReview(reviewId, payload) {
  const response = await api.patch(`/api/customer/reviews/${reviewId}`, payload);
  return response.data;
}

export async function listBranchReviews(branchId, params = {}) {
  const response = await api.get(`/api/customer/branches/${branchId}/reviews`, { params });
  return response.data;
}
