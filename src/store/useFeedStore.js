import { create } from "zustand";

import {
  getFeedCuisines,
  getOrderAgain,
  getTopBrands,
  listRestaurants
} from "../services/feedService";
import { listBanners } from "../services/bannerService";

const useFeedStore = create((set, get) => ({
  cuisines: [],
  topBrands: [],
  orderAgain: [],
  restaurants: [],
  banners: [],
  pagination: null,
  isLoading: false,
  error: null,
  lastLocationKey: null,
  lastRestaurantKey: null,
  loadHomeFeed: async ({ address, authenticated = false, force = false, q = "", cuisine = "" } = {}) => {
    const query = q.trim();
    const cuisineSlug = cuisine.trim();
    const locationKey =
      address?.latitude && address?.longitude
        ? `${address.latitude}:${address.longitude}`
        : "no-location";
    const restaurantKey = `${locationKey}:${query}:${cuisineSlug}`;

    const needsCatalog = force || get().lastLocationKey !== locationKey;
    const needsRestaurants = force || get().lastRestaurantKey !== restaurantKey;

    if (!needsCatalog && !needsRestaurants) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const updates = {
        isLoading: false
      };

      const requests = [];

      if (needsCatalog) {
        requests.push(
          Promise.all([
            getTopBrands({ address, limit: 8 }),
            getFeedCuisines({ address, limit: 30 }),
            listBanners().catch(() => ({ banners: [] }))
          ]).then(([topBrandsData, cuisinesData, bannersData]) => {
            updates.topBrands = topBrandsData.restaurants || [];
            updates.cuisines = cuisinesData.cuisines || [];
            updates.banners = bannersData.banners || [];
            updates.lastLocationKey = locationKey;
          })
        );
      }

      if (needsRestaurants) {
        requests.push(
          Promise.all([
            listRestaurants({ address, q: query, cuisine: cuisineSlug, limit: 12 }),
            authenticated
              ? getOrderAgain({ address, limit: 4 }).catch(() => ({ restaurants: [] }))
              : Promise.resolve({ restaurants: [] })
          ]).then(([restaurantsData, orderAgainData]) => {
            updates.restaurants = restaurantsData.restaurants || [];
            updates.pagination = restaurantsData.pagination || null;
            updates.orderAgain = orderAgainData.restaurants || [];
            updates.lastRestaurantKey = restaurantKey;
          })
        );
      }

      await Promise.all(requests);
      set(updates);
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
      banners: [],
      pagination: null,
      isLoading: false,
      error: null,
      lastLocationKey: null,
      lastRestaurantKey: null
    })
}));

export default useFeedStore;
