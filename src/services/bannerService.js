import api from "./api";

export async function listBanners() {
  const response = await api.get("/api/customer/banners");
  return response.data;
}
