import { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, RefreshControl, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import useOrderStore from "../store/useOrderStore";
import { isActiveOrder } from "../utils/orderTracking";

const FILTERS = [
  { key: "", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "REFUNDED", label: "Refunded" }
];

function statusLabel(status) {
  return String(status || "pending").replace(/_/g, " ").toLowerCase();
}

function totalLabel(order) {
  const value = order?.labels?.total || order?.totalLabel || order?.total || order?.grandTotal;
  if (!value) {
    return "₱0.00";
  }

  return typeof value === "number" ? `₱${value.toFixed(2)}` : String(value).replace(/^Rs\.?\s*/i, "₱");
}

function OrderRow({ order, onPress }) {
  const active = isActiveOrder(order);

  return (
    <Pressable onPress={() => onPress(order)} className="mb-3 rounded-2xl border border-border bg-white px-4 py-4 active:opacity-80">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-ink" numberOfLines={1}>
            {order.restaurantName || order.restaurant?.name || "Dart Restaurant"}
          </Text>
          <Text className="mt-1 text-xs font-medium text-muted" numberOfLines={1}>
            {order.orderNumber || order.id}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${active ? "bg-primary" : "bg-[#FFF0E5]"}`}>
          <Text className={`text-xs font-bold capitalize ${active ? "text-white" : "text-primary"}`}>
            {active ? "Track live" : statusLabel(order.status)}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-sm text-muted">
          {order.createdAt ? new Date(order.createdAt).toLocaleString() : "Recent order"}
        </Text>
        <Text className="text-base font-bold text-ink">{totalLabel(order)}</Text>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen({ navigation }) {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const orders = useOrderStore((state) => state.orders);
  const isLoading = useOrderStore((state) => state.isLoading);
  const loadOrders = useOrderStore((state) => state.loadOrders);

  const refresh = () => {
    const params = { page: 1, limit: statusFilter === "ACTIVE" ? 30 : 20 };

    if (statusFilter && statusFilter !== "ACTIVE") {
      params.status = statusFilter;
    }

    loadOrders(params).catch((error) => {
      showToast({
        type: "error",
        title: "Orders unavailable",
        message: error?.response?.data?.error || error?.message || "Please try again in a moment."
      });
    });
  };

  const displayedOrders = useMemo(() => {
    if (statusFilter !== "ACTIVE") {
      return orders;
    }

    return orders.filter(isActiveOrder);
  }, [orders, statusFilter]);

  useEffect(() => {
    refresh();
  }, [statusFilter]);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Home");
  };

  const openOrder = (order) => {
    if (isActiveOrder(order)) {
      navigation.navigate("OrderTracking", { orderId: order.id, order });
      return;
    }

    navigation.navigate("OrderDetail", { orderId: order.id, order });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-5 pb-4 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={goBack} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink">Orders</Text>
            <Text className="mt-0.5 text-sm text-muted">Your recent food orders</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#F7F8FA]"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {FILTERS.map((filter) => (
            <Pressable
              key={filter.key || "all"}
              onPress={() => setStatusFilter(filter.key)}
              className={`mr-2 rounded-full px-4 py-2 ${statusFilter === filter.key ? "bg-primary" : "bg-white"}`}
            >
              <Text className={`text-sm font-bold ${statusFilter === filter.key ? "text-white" : "text-ink"}`}>{filter.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {displayedOrders.length ? (
          displayedOrders.map((order) => <OrderRow key={order.id || order.orderNumber} order={order} onPress={openOrder} />)
        ) : (
          <View className="mt-20 items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-[#FFF4ED]">
              <Ionicons name="receipt-outline" size={38} color="#FF6400" />
            </View>
            <Text className="mt-5 text-xl font-bold text-ink">No orders yet</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">When you place an order, it will show here.</Text>
            <Button title="Browse restaurants" onPress={() => navigation.navigate("Home")} className="mt-6 w-full rounded-xl" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
