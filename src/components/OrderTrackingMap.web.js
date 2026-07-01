import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { trackingHeadline, trackingSubheadline } from "../utils/orderTracking";

export default function OrderTrackingMap({ order, className = "" }) {
  return (
    <View className={`items-center justify-center bg-[#EAF3FF] px-6 ${className}`}>
      <View className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
        <Ionicons name="map-outline" size={30} color="#FF6400" />
      </View>
      <Text className="mt-4 text-center text-base font-bold text-ink">{trackingHeadline(order)}</Text>
      <Text className="mt-1 text-center text-sm text-muted">{trackingSubheadline(order)}</Text>
      <Text className="mt-3 text-center text-xs text-muted">Live map is available on Android and iOS builds.</Text>
    </View>
  );
}
