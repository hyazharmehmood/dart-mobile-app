import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

import { getTrackingPhase, trackingHeadline, trackingSubheadline } from "../utils/orderTracking";

export default function ActiveOrderChip({ order, onPress, bottomOffset = 104 }) {
  if (!order) {
    return null;
  }

  const phase = getTrackingPhase(order);
  const icon = phase === "ON_THE_WAY" ? "bicycle" : "restaurant";

  return (
    <Pressable
      onPress={onPress}
      style={{ bottom: bottomOffset }}
      className="absolute left-5 right-5 z-20 flex-row items-center rounded-full bg-primary px-4 py-3 shadow-lg active:opacity-95"
    >
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/20">
        <Ionicons name={icon} size={22} color="#FFFFFF" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-extrabold text-white" numberOfLines={1}>
          {trackingHeadline(order)}
        </Text>
        <Text className="mt-0.5 text-xs font-medium text-white/85" numberOfLines={1}>
          {trackingSubheadline(order)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
    </Pressable>
  );
}
