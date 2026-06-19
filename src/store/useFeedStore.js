import { create } from "zustand";

import {
  getFeedCuisines,
  getOrderAgain,
  getTopBrands,
  listRestaurants
} from "../services/feedService";

const useFeedStore = create((set, get) => ({
  cuisines: [],
  topBrands: [],
  orderAgain: [],
  restaurants: [],
  pagination: null,
  isLoading: false,
  error: null,
  lastAddressKey: null,
  loadHomeFeed: async ({ address, authenticated = false, force = false, q = "" } = {}) => {
    const query = q.trim();
    const addressKey = address?.latitude && address?.longitude
      ? `${address.latitude}:${address.longitude}:${query}`
      : `no-location:${query}`;

    if (!force && get().lastAddressKey === addressKey && get().restaurants.length) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const [topBrandsData, cuisinesData, restaurantsData, orderAgainData] =
        await Promise.all([
          getTopBrands({ address, limit: 8 }),
          getFeedCuisines({ address, limit: 30 }),
          listRestaurants({ address, q: query, limit: 12 }),
          authenticated
            ? getOrderAgain({ address, limit: 4 }).catch(() => ({ restaurants: [] }))
            : Promise.resolve({ restaurants: [] })
        ]);

      set({
        topBrands: topBrandsData.restaurants || [],
        cuisines: cuisinesData.cuisines || [],
        restaurants: restaurantsData.restaurants || [],
        pagination: restaurantsData.pagination || null,
        orderAgain: orderAgainData.restaurants || [],
        lastAddressKey: addressKey,
        isLoading: false
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || error?.message || "Unable to load restaurants"
      });
    }
  },
  clearFeed: () =>
    set({
      cuisines: [],
      topBrands: [],
      orderAgain: [],
      restaurants: [],
      pagination: null,
      isLoading: false,
      error: null,
      lastAddressKey: null
    })
}));

export default useFeedStore;
