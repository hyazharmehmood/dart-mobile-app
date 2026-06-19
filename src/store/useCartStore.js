import { create } from "zustand";

import {
  addCustomerCartItem,
  clearCustomerCart,
  getCustomerCart,
  updateCustomerCart,
  updateCustomerCartItem
} from "../services/customerCartService";
import { quoteOrder } from "../services/orderService";
import useAuthStore from "./useAuthStore";

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

function isAuthenticated() {
  const authState = useAuthStore.getState();
  return Boolean(authState.token && authState.isAuthenticated && !authState.isGuest);
}

function restaurantSlugFrom(restaurant) {
  return restaurant?.slug || restaurant?.restaurantSlug || null;
}

function restaurantIdFrom(restaurant) {
  return restaurant?.id || restaurant?.restaurantId || null;
}

function branchIdFrom(restaurant, fallbackBranchId = null) {
  return (
    restaurant?.branchId ||
    restaurant?.activeBranchId ||
    restaurant?.defaultBranchId ||
    restaurant?.branches?.[0]?.id ||
    fallbackBranchId ||
    null
  );
}

function restaurantIdentityFrom(restaurant) {
  const restaurantSlug = restaurantSlugFrom(restaurant);
  const restaurantId = restaurantIdFrom(restaurant);

  return {
    restaurantSlug,
    restaurantId: restaurantSlug ? null : restaurantId
  };
}

function restaurantFromCart(cart, currentRestaurant = null) {
  const restaurant = cart?.restaurant || cart?.store || currentRestaurant || null;

  if (restaurant) {
    return restaurant;
  }

  if (cart?.restaurantId || cart?.restaurantSlug || cart?.restaurantName) {
    return {
      id: cart.restaurantId || null,
      slug: cart.restaurantSlug || null,
      name: cart.restaurantName || "Dart Restaurant",
      branchId: cart.branchId || null,
      branchName: cart.branchName || null
    };
  }

  return null;
}

function normalizeServerItem(line) {
  const menuItem = line?.menuItem || line?.item || {};
  const customizations = line?.customizations || {};
  const selections = customizations.selections || line?.modifierSelections || line?.selectedOptions || [];
  const unitPrice =
    Number(line?.unitPriceSnapshot ?? line?.unitPrice ?? line?.price ?? line?.basePrice ?? menuItem.price) || 0;

  return {
    id: line?.id || line?.cartItemId || line?.lineId || null,
    cartItemId: line?.id || line?.cartItemId || line?.lineId || null,
    menuItemId: line?.menuItemId || line?.itemId || menuItem.id,
    name: line?.name || menuItem.name || line?.displayName || "Menu item",
    imageUrl: line?.imageUrl || menuItem.imageUrl || menuItem.photoUrls?.[0] || "",
    basePrice: unitPrice,
    quantity: Number(line?.quantity) || 1,
    modifierSelections: selections,
    specialInstructions: line?.specialInstructions || "",
    unavailablePreference: line?.unavailablePreference || "REMOVE_ITEM",
    configurationKey: line?.configurationKey || line?.lineId || null
  };
}

function normalizeServerCart(data, currentRestaurant = null) {
  const cart = data?.cart || data?.customerCart || data || null;

  if (!cart || Array.isArray(cart)) {
    return {
      restaurant: currentRestaurant,
      restaurantSlug: restaurantSlugFrom(currentRestaurant),
      restaurantId: restaurantIdFrom(currentRestaurant),
      branchId: branchIdFrom(currentRestaurant),
      items: []
    };
  }

  const restaurant = restaurantFromCart(cart, currentRestaurant);
  const items = (cart.lines || cart.items || cart.lineItems || cart.cartItems || []).map(normalizeServerItem);

  return {
    id: cart.id || null,
    restaurant,
    restaurantSlug: cart.restaurantSlug || restaurantSlugFrom(restaurant),
    restaurantId: cart.restaurantId || restaurantIdFrom(restaurant),
    branchId: cart.branchId || branchIdFrom(restaurant),
    items
  };
}

function hasCartShape(data) {
  const cart = data?.cart || data?.customerCart || data;
  return Boolean(cart && !Array.isArray(cart) && (cart.lines || cart.items || cart.lineItems || cart.cartItems));
}

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && typeof value !== "undefined" && value !== "")
  );
}

function cartPayload(item, restaurant, currentBranchId, replaceCart = false) {
  const identity = restaurantIdentityFrom(restaurant);

  return compactPayload({
    restaurantSlug: item.restaurantSlug || identity.restaurantSlug,
    restaurantId: item.restaurantId || identity.restaurantId,
    branchId: item.branchId || branchIdFrom(restaurant, currentBranchId),
    menuItemId: item.menuItemId,
    quantity: item.quantity || 1,
    modifierSelections: item.modifierSelections || [],
    specialInstructions: item.specialInstructions || "",
    unavailablePreference: item.unavailablePreference || "REMOVE_ITEM",
    replaceCart
  });
}

function quotePayload({ restaurantSlug, restaurantId, branchId, items }) {
  if (isAuthenticated()) {
    return compactPayload({
      useCart: true,
      branchId,
      restaurantSlug,
      restaurantId
    });
  }

  return compactPayload({
    restaurantSlug,
    restaurantId,
    items: items.map(quoteItem)
  });
}

const useCartStore = create((set, get) => ({
  id: null,
  restaurantSlug: null,
  restaurantId: null,
  branchId: null,
  restaurant: null,
  pendingReplaceCart: false,
  items: [],
  quote: null,
  isQuoting: false,
  isHydrating: false,
  isMutating: false,
  error: null,
  setRestaurant: (restaurant) => {
    const nextSlug = restaurantSlugFrom(restaurant);
    const nextRestaurantId = restaurantIdFrom(restaurant);
    const currentSlug = get().restaurantSlug;
    const currentRestaurantId = get().restaurantId;
    const nextBranchId = branchIdFrom(restaurant, get().branchId);
    const shouldReplaceCart = Boolean(
      (currentSlug && nextSlug && currentSlug !== nextSlug) ||
      (!currentSlug && !nextSlug && currentRestaurantId && nextRestaurantId && currentRestaurantId !== nextRestaurantId) ||
      (currentSlug && nextRestaurantId && !nextSlug) ||
      (currentRestaurantId && nextSlug && !currentSlug)
    );

    set({
      restaurant,
      restaurantSlug: nextSlug,
      restaurantId: nextRestaurantId,
      branchId: nextBranchId,
      pendingReplaceCart: shouldReplaceCart || get().pendingReplaceCart,
      items: shouldReplaceCart ? [] : get().items,
      quote: shouldReplaceCart ? null : get().quote,
      error: null
    });
  },
  hydrateServerCart: async () => {
    if (!isAuthenticated()) {
      return null;
    }

    set({ isHydrating: true, error: null });

    try {
      const data = await getCustomerCart();
      const nextCart = normalizeServerCart(data, get().restaurant);

      set({
        id: nextCart.id,
        restaurant: nextCart.restaurant,
        restaurantSlug: nextCart.restaurantSlug,
        restaurantId: nextCart.restaurantId,
        branchId: nextCart.branchId,
        pendingReplaceCart: false,
        items: nextCart.items,
        quote: null,
        isHydrating: false
      });

      return nextCart;
    } catch (error) {
      set({
        isHydrating: false,
        error: error?.response?.data?.error || error?.message || "Unable to load cart"
      });
      throw error;
    }
  },
  syncFromServerCart: (data) => {
    const nextCart = normalizeServerCart(data, get().restaurant);

    set({
      id: nextCart.id,
      restaurant: nextCart.restaurant || get().restaurant,
      restaurantSlug: nextCart.restaurantSlug || get().restaurantSlug,
      restaurantId: nextCart.restaurantId || get().restaurantId,
      branchId: nextCart.branchId || get().branchId,
      pendingReplaceCart: false,
      items: nextCart.items,
      quote: null,
      error: null
    });

    return nextCart;
  },
  refreshServerCart: async (fallbackData = null) => {
    if (hasCartShape(fallbackData)) {
      return get().syncFromServerCart(fallbackData);
    }

    const data = await getCustomerCart();
    return get().syncFromServerCart(data);
  },
  addItem: async (item) => {
    if (isAuthenticated()) {
      const currentSlug = get().restaurantSlug;
      const currentRestaurantId = get().restaurantId;
      const nextSlug = item.restaurantSlug || restaurantSlugFrom(get().restaurant);
      const nextRestaurantId = item.restaurantId || restaurantIdFrom(get().restaurant);
      const replaceCart =
        get().pendingReplaceCart ||
        Boolean(
          (currentSlug && nextSlug && currentSlug !== nextSlug) ||
          (!currentSlug && !nextSlug && currentRestaurantId && nextRestaurantId && currentRestaurantId !== nextRestaurantId) ||
          (currentSlug && nextRestaurantId && !nextSlug) ||
          (currentRestaurantId && nextSlug && !currentSlug)
        );

      set({ isMutating: true, error: null });

      try {
        const data = await addCustomerCartItem(
          cartPayload(item, get().restaurant, get().branchId, replaceCart)
        );
        const nextCart = await get().refreshServerCart(data);
        set({ isMutating: false });
        return nextCart;
      } catch (error) {
        set({
          isMutating: false,
          error: error?.response?.data?.error || error?.message || "Unable to update cart"
        });
        throw error;
      }
    }

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
    return items;
  },
  updateQuantity: async (index, quantity) => {
    const item = get().items[index];

    if (isAuthenticated() && item?.cartItemId) {
      set({ isMutating: true, error: null });

      try {
        const data = await updateCustomerCartItem(item.cartItemId, { quantity: Math.max(0, quantity) });
        const nextCart = await get().refreshServerCart(data);
        set({ isMutating: false });
        return nextCart;
      } catch (error) {
        set({
          isMutating: false,
          error: error?.response?.data?.error || error?.message || "Unable to update quantity"
        });
        throw error;
      }
    }

    const items = get().items
      .map((item, itemIndex) => (itemIndex === index ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);

    set({ items });
    return items;
  },
  setBranch: async (branchId) => {
    if (isAuthenticated()) {
      const data = await updateCustomerCart({
        branchId,
        restaurantSlug: get().restaurantSlug,
        restaurantId: get().restaurantId
      });
      return get().refreshServerCart(data);
    }

    set({ branchId });
    return null;
  },
  clearCart: async () => {
    if (isAuthenticated()) {
      try {
        await clearCustomerCart();
      } catch (error) {
        set({ error: error?.response?.data?.error || error?.message || "Unable to clear cart" });
        throw error;
      }
    }

    set({
      id: null,
      restaurantSlug: null,
      restaurantId: null,
      branchId: null,
      restaurant: null,
      pendingReplaceCart: false,
      items: [],
      quote: null,
      isQuoting: false,
      isMutating: false,
      error: null
    });
  },
  resetLocalCartState: () =>
    set({
      id: null,
      restaurantSlug: null,
      restaurantId: null,
      branchId: null,
      restaurant: null,
      pendingReplaceCart: false,
      items: [],
      quote: null,
      isQuoting: false,
      isHydrating: false,
      isMutating: false,
      error: null
    }),
  loadQuote: async () => {
    const { restaurantSlug, restaurantId, branchId, items } = get();

    if ((!restaurantSlug && !restaurantId && !isAuthenticated()) || !items.length) {
      set({ quote: null });
      return null;
    }

    set({ isQuoting: true, error: null });

    try {
      const data = await quoteOrder(quotePayload({ restaurantSlug, restaurantId, branchId, items }));
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
