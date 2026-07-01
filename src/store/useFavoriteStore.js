import { create } from "zustand";

import { addFavorite, listFavorites, removeFavorite } from "../services/favoriteService";
import { getRestaurantMenu } from "../services/restaurantService";
import useFeedStore from "./useFeedStore";
import {
  favoriteKey,
  getRestaurantImageUrl,
  mergeRestaurantRecords,
  normalizeRestaurantRecord
} from "../utils/restaurantDisplay";

function restaurantIdFrom(restaurant) {
  return restaurant?.restaurantId || restaurant?.id || null;
}

function catalogRestaurants() {
  const feed = useFeedStore.getState();

  return [...feed.restaurants, ...feed.topBrands, ...feed.orderAgain];
}

function findCatalogMatch(favorite, catalog) {
  const key = favoriteKey(favorite);
  const slug = favorite?.slug;

  return catalog.find(
    (restaurant) =>
      restaurant.id === key ||
      restaurant.restaurantId === key ||
      (slug && restaurant.slug === slug)
  );
}

function enrichFavorite(favorite, { previous = [], catalog = [] } = {}) {
  const normalized = normalizeRestaurantRecord(favorite);
  const previousMatch = previous.find((item) => favoriteKey(item) === favoriteKey(normalized));
  const catalogMatch = findCatalogMatch(normalized, catalog);

  return mergeRestaurantRecords(
    mergeRestaurantRecords(normalized, previousMatch),
    catalogMatch
  );
}

function enrichFavorites(favorites, previous = []) {
  const catalog = catalogRestaurants();

  return favorites.map((favorite) => enrichFavorite(favorite, { previous, catalog }));
}

async function enrichFavoritesFromApi(favorites) {
  return Promise.all(
    favorites.map(async (favorite) => {
      if (getRestaurantImageUrl(favorite)) {
        return favorite;
      }

      const slug = favorite?.slug;

      if (!slug) {
        return favorite;
      }

      try {
        const data = await getRestaurantMenu(slug);
        return mergeRestaurantRecords(favorite, data?.restaurant || data);
      } catch (error) {
        return favorite;
      }
    })
  );
}

const useFavoriteStore = create((set, get) => ({
  favorites: [],
  isLoading: false,
  error: null,
  loadFavorites: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await listFavorites();
      const rawFavorites = data?.favorites || data?.restaurants || [];
      const mergedFavorites = enrichFavorites(rawFavorites, get().favorites);
      const favorites = await enrichFavoritesFromApi(mergedFavorites);
      set({ favorites, isLoading: false });
      return favorites;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || error?.message || "Unable to load favorites"
      });
      throw error;
    }
  },
  isFavorite: (restaurant) => {
    const id = restaurantIdFrom(restaurant);
    const slug = restaurant?.slug;

    return get().favorites.some(
      (favorite) => favorite.restaurantId === id || favorite.id === id || (slug && favorite.slug === slug)
    );
  },
  toggleFavorite: async (restaurant) => {
    const restaurantId = restaurantIdFrom(restaurant);

    if (!restaurantId) {
      throw new Error("Restaurant id missing.");
    }

    const isFavorite = get().isFavorite(restaurant);

    if (isFavorite) {
      await removeFavorite(restaurantId);
      set({
        favorites: get().favorites.filter(
          (favorite) => favorite.restaurantId !== restaurantId && favorite.id !== restaurantId
        )
      });
      return false;
    }

    const data = await addFavorite(restaurantId);
    const favorite = enrichFavorite(data?.favorite || data?.restaurant || restaurant, {
      previous: get().favorites,
      catalog: catalogRestaurants()
    });

    set({ favorites: [favorite, ...get().favorites.filter((item) => favoriteKey(item) !== favoriteKey(favorite))] });
    return true;
  },
  resetFavorites: () => set({ favorites: [], isLoading: false, error: null })
}));

export default useFavoriteStore;
