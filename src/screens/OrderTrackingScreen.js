import { useCallback, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OrderTrackingMap from "../components/OrderTrackingMap";
import Button from "../components/ui/Button";
import { getOrderTracking } from "../services/orderService";
import { joinOrderRoom, leaveOrderRoom } from "../services/socketService";
import useAddressStore from "../store/useAddressStore";
import useOrderStore from "../store/useOrderStore";
import {
  TRACKING_STEPS,
  getTrackingPhase,
  isTerminalOrder,
  trackingHeadline,
  trackingStepIndex,
  trackingSubheadline
} from "../utils/orderTracking";

function TrackingSteps({ phase }) {
  const activeIndex = trackingStepIndex(phase);

  return (
    <View className="mt-5">
      {TRACKING_STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        const isUpcoming = index > activeIndex;

        return (
          <View key={step.key} className="mb-4 flex-row">
            <View className="mr-3 items-center">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  isDone || isActive ? "bg-primary" : "bg-[#EEF0F2]"
                }`}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <Text className={`text-xs font-bold ${isActive ? "text-white" : "text-muted"}`}>{index + 1}</Text>
                )}
              </View>
              {index < TRACKING_STEPS.length - 1 ? (
                <View className={`mt-1 h-8 w-0.5 ${isDone ? "bg-primary" : "bg-[#E5E7EB]"}`} />
              ) : null}
            </View>
            <View className="flex-1 pt-1">
              <Text className={`text-sm font-bold ${isUpcoming ? "text-muted" : "text-ink"}`}>{step.label}</Text>
              {isActive ? <Text className="mt-1 text-xs text-primary">In progress</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function TimelinePreview({ events }) {
  const latest = (events || []).slice(-3).reverse();

  if (!latest.length) {
    return (
      <View className="mt-5 rounded-2xl bg-[#F6F7F8] px-4 py-4">
        <Text className="text-sm font-semibold text-muted">Waiting for live order updates...</Text>
      </View>
    );
  }

  return (
    <View className="mt-5">
      <Text className="mb-3 text-sm font-extrabold text-ink">Live updates</Text>
      {latest.map((event) => (
        <View key={event.id || event.eventId || `${event.type}-${event.createdAt}`} className="mb-3 flex-row">
          <View className="mr-3 mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink">
              {event.message || String(event.type || "Update").replace(/_/g, " ").toLowerCase()}
            </Text>
            <Text className="mt-1 text-xs text-muted">
              {event.createdAt ? new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Just now"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function OrderTrackingScreen({ navigation, route }) {
  const orderId = route?.params?.orderId;
  const address = useAddressStore((state) => state.address);
  const orderDetails = useOrderStore((state) => state.orderDetails);
  const orderEvents = useOrderStore((state) => state.orderEvents);
  const loadOrderDetail = useOrderStore((state) => state.loadOrderDetail);
  const loadOrderEvents = useOrderStore((state) => state.loadOrderEvents);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const order = orderDetails[orderId] || route?.params?.order || null;
  const events = orderEvents[orderId] || [];
  const phase = getTrackingPhase(order);
  const delivered = isTerminalOrder(order) && phase === "DELIVERED";

  const refreshTracking = useCallback(async () => {
    if (!orderId) {
      return;
    }

    setIsRefreshing(true);

    try {
      const data = await getOrderTracking(orderId);
      const trackedOrder = data?.order || data?.tracking?.order || data;
      if (trackedOrder?.id || trackedOrder?.orderNumber) {
        useOrderStore.setState((state) => ({
          orderDetails: {
            ...state.orderDetails,
            [orderId]: {
              ...(state.orderDetails[orderId] || {}),
              ...trackedOrder,
              id: orderId
            }
          }
        }));
      }

      await Promise.allSettled([loadOrderDetail(orderId), loadOrderEvents(orderId)]);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [loadOrderDetail, loadOrderEvents, orderId]);

  useFocusEffect(
    useCallback(() => {
      if (!orderId) {
        return undefined;
      }

      setIsLoading(true);
      joinOrderRoom(orderId);
      refreshTracking();

      const interval = setInterval(() => {
        refreshTracking();
      }, 15000);

      return () => {
        clearInterval(interval);
        leaveOrderRoom(orderId);
      };
    }, [orderId, refreshTracking])
  );

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Home");
  };

  const openOrderDetail = () => {
    navigation.navigate("OrderDetail", { orderId, order });
  };

  const headline = useMemo(() => trackingHeadline(order), [order]);
  const subheadline = useMemo(() => trackingSubheadline(order), [order]);

  if (!orderId) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-bold text-ink">Order not found</Text>
          <Button title="Back to home" onPress={() => navigation.navigate("Home")} className="mt-5 w-full" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-4 pb-3 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={goBack} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
              Track order
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-muted" numberOfLines={1}>
              {order?.orderNumber || orderId}
            </Text>
          </View>
          <Pressable onPress={openOrderDetail} className="h-10 items-center justify-center rounded-full bg-[#F6F7F8] px-3">
            <Text className="text-xs font-bold text-primary">Details</Text>
          </Pressable>
        </View>
      </View>

      {isLoading && !order ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF6400" size="large" />
          <Text className="mt-3 text-sm font-semibold text-muted">Loading live tracking...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshTracking} />}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <OrderTrackingMap order={order} fallbackAddress={address} className="h-72 w-full" />

          <View className="px-5 pt-5">
            <View className="rounded-3xl bg-[#FFF8F3] px-4 py-4">
              <Text className="text-lg font-extrabold text-ink">{headline}</Text>
              <Text className="mt-1 text-sm font-medium text-muted">{subheadline}</Text>
              {order?.etaMinutes ? (
                <Text className="mt-2 text-sm font-bold text-primary">Arriving in about {order.etaMinutes} min</Text>
              ) : null}
            </View>

            <TrackingSteps phase={phase} />
            <TimelinePreview events={events} />

            {delivered ? (
              <Button title="View order details" onPress={openOrderDetail} className="mt-6 rounded-2xl" />
            ) : (
              <Pressable onPress={openOrderDetail} className="mt-6 items-center py-2">
                <Text className="text-sm font-bold text-primary">View full order details</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
