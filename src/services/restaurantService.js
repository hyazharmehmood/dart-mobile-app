import api from "./api";

export async function getRestaurantMenu(slug) {
  const response = await api.get(`/api/customer/restaurants/${slug}`);
  return response.data;
}
