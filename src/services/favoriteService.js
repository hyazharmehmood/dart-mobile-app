import api from "./api";

export async function listFavorites() {
  const response = await api.get("/api/customer/favorites");
  return response.data;
}

export async function addFavorite(restaurantId) {
  const response = await api.post("/api/customer/favorites", { restaurantId });
  return response.data;
}

export async function removeFavorite(restaurantId) {
  const response = await api.delete(`/api/customer/favorites/${restaurantId}`);
  return response.data;
}
