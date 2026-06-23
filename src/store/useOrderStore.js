import { create } from "zustand";

import { getOrder, getOrderEvents, listOrders } from "../services/orderService";

const useOrderStore = create((set, get) => ({
  orders: [],
  orderDetails: {},
  orderEvents: {},
  isLoading: false,
  error: null,
  loadOrders: async (params = {}) => {
    set({ isLoading: true, error: null });

    try {
      const data = await listOrders({ page: 1, limit: 10, ...params });
      const orders = data?.orders || data?.items || [];

      set({ orders, isLoading: false });
      return orders;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || error?.message || "Unable to load orders"
      });
      throw error;
    }
  },
  loadOrderDetail: async (orderId) => {
    if (!orderId) {
      return null;
    }

    const data = await getOrder(orderId);
    const order = data?.order || data;

    set({
      orderDetails: {
        ...get().orderDetails,
        [orderId]: order
      }
    });

    return order;
  },
  loadOrderEvents: async (orderId) => {
    if (!orderId) {
      return [];
    }

    const data = await getOrderEvents(orderId);
    const events = data?.events || [];

    set({
      orderEvents: {
        ...get().orderEvents,
        [orderId]: events
      }
    });

    return events;
  },
  receiveOrderEvent: (event) => {
    if (!event?.orderId) {
      return;
    }

    const currentEvents = get().orderEvents[event.orderId] || [];
    const exists = currentEvents.some((item) => item.id === event.id || item.eventId === event.eventId);

    set({
      orderEvents: {
        ...get().orderEvents,
        [event.orderId]: exists ? currentEvents : [...currentEvents, event]
      }
    });
  },
  receiveOrderUpdated: (payload) => {
    if (!payload?.orderId) {
      return;
    }

    const orderId = payload.orderId;

    set({
      orders: get().orders.map((order) =>
        order.id === orderId ? { ...order, ...payload, id: order.id } : order
      ),
      orderDetails: {
        ...get().orderDetails,
        [orderId]: {
          ...(get().orderDetails[orderId] || {}),
          ...payload,
          id: orderId
        }
      }
    });
  },
  resetOrders: () =>
    set({
      orders: [],
      orderDetails: {},
      orderEvents: {},
      isLoading: false,
      error: null
    })
}));

export default useOrderStore;
