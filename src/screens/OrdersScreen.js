import { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, RefreshControl, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import useOrderStore from "../store/useOrderStore";

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

function OrderRow({ order }) {
  return (
    <View className="mb-3 rounded-2xl border border-border bg-white px-4 py-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-ink" numberOfLines={1}>
            {order.restaurantName || order.restaurant?.name || "Dart Restaurant"}
          </Text>
          <Text className="mt-1 text-xs font-medium text-muted" numberOfLines={1}>
            {order.orderNumber || order.id}
          </Text>
        </View>
        <View className="rounded-full bg-[#FFF0E5] px-3 py-1">
          <Text className="text-xs font-bold capitalize text-primary">{statusLabel(order.status)}</Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-sm text-muted">
          {order.createdAt ? new Date(order.createdAt).toLocaleString() : "Recent order"}
        </Text>
        <Text className="text-base font-bold text-ink">{totalLabel(order)}</Text>
      </View>
    </View>
  );
}

export default function OrdersScreen({ navigation }) {
  const { showToast } = useToast();
  const orders = useOrderStore((state) => state.orders);
  const isLoading = useOrderStore((state) => state.isLoading);
  const loadOrders = useOrderStore((state) => state.loadOrders);

  const refresh = () => {
    loadOrders().catch((error) => {
      showToast({
        type: "error",
        title: "Orders unavailable",
        message: error?.response?.data?.error || error?.message || "Please try again in a moment."
      });
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-5 pb-4 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
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
        {orders.length ? (
          orders.map((order) => <OrderRow key={order.id || order.orderNumber} order={order} />)
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
