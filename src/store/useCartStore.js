import { create } from "zustand";

import { quoteOrder } from "../services/orderService";

function itemKey(item) {
  return JSON.stringify({
    menuItemId: item.menuItemId,
    modifierSelections: item.modifierSelections || [],
    specialInstructions: item.specialInstructions || "",
    unavailablePreference: item.unavailablePreference || "REMOVE_ITEM"
  });
}

function quoteItem(item) {
  return {
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    modifierSelections: item.modifierSelections || [],
    specialInstructions: item.specialInstructions || "",
    unavailablePreference: item.unavailablePreference || "REMOVE_ITEM"
  };
}

const useCartStore = create((set, get) => ({
  restaurantSlug: null,
  restaurant: null,
  items: [],
  quote: null,
  isQuoting: false,
  error: null,
  setRestaurant: (restaurant) => {
    const nextSlug = restaurant?.slug || restaurant?.id || null;
    const currentSlug = get().restaurantSlug;

    set({
      restaurant,
      restaurantSlug: nextSlug,
      items: currentSlug && currentSlug !== nextSlug ? [] : get().items,
      quote: currentSlug && currentSlug !== nextSlug ? null : get().quote,
      error: null
    });
  },
  addItem: (item) => {
    const nextKey = itemKey(item);
    const items = [...get().items];
    const existingIndex = items.findIndex((cartItem) => itemKey(cartItem) === nextKey);

    if (existingIndex >= 0) {
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + (item.quantity || 1)
      };
    } else {
      items.push({
        ...item,
        quantity: item.quantity || 1,
        unavailablePreference: item.unavailablePreference || "REMOVE_ITEM"
      });
    }

    set({ items });
  },
  updateQuantity: (index, quantity) => {
    const items = get().items
      .map((item, itemIndex) => (itemIndex === index ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);

    set({ items });
  },
  clearCart: () =>
    set({
      restaurantSlug: null,
      restaurant: null,
      items: [],
      quote: null,
      isQuoting: false,
      error: null
    }),
  loadQuote: async () => {
    const { restaurantSlug, items } = get();

    if (!restaurantSlug || !items.length) {
      set({ quote: null });
      return null;
    }

    set({ isQuoting: true, error: null });

    try {
      const data = await quoteOrder({ restaurantSlug, items: items.map(quoteItem) });
      set({ quote: data.quote, isQuoting: false });
      return data.quote;
    } catch (error) {
      set({
        isQuoting: false,
        error: error?.response?.data?.error || error?.message || "Unable to quote cart"
      });
      throw error;
    }
  }
}));

export default useCartStore;
