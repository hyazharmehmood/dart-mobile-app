import api from "./api";

function locationParams(address) {
  if (!address?.latitude || !address?.longitude) {
    return {};
  }

  return {
    lat: address.latitude,
    lng: address.longitude
  };
}

export async function getTopBrands({ address, limit = 8 } = {}) {
  const response = await api.get("/api/customer/feed/top-brands", {
    params: {
      ...locationParams(address),
      limit
    }
  });
  return response.data;
}

export async function getFeedCuisines({ address, limit = 30 } = {}) {
  const response = await api.get("/api/customer/feed/cuisines", {
    params: {
      ...locationParams(address),
      limit
    }
  });
  return response.data;
}

export async function getOrderAgain({ address, limit = 4 } = {}) {
  const response = await api.get("/api/customer/feed/order-again", {
    params: {
      ...locationParams(address),
      limit
    }
  });
  return response.data;
}

export async function listRestaurants({ address, q = "", cuisine = "", page = 1, limit = 12 } = {}) {
  const response = await api.get("/api/customer/restaurants", {
    params: {
      ...locationParams(address),
      q,
      cuisine,
      sort: address?.latitude && address?.longitude ? "distance" : "recommended",
      page,
      limit
    }
  });
  return response.data;
}
