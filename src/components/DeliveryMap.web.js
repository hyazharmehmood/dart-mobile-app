import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const fallbackRegion = {
  latitude: 24.8607,
  longitude: 67.0011,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};

export default function DeliveryMap({
  region = fallbackRegion,
  onMapPress,
  className = "",
  showCenterPin = true
}) {
  const handlePress = () => {
    onMapPress?.({
      nativeEvent: {
        coordinate: {
          latitude: region.latitude,
          longitude: region.longitude
        }
      }
    });
  };

  return (
    <Pressable onPress={handlePress} className={`overflow-hidden bg-[#EAF3FF] ${className}`}>
      <View className="absolute inset-0">
        <View className="absolute left-8 top-10 h-28 w-40 rounded-3xl bg-[#D7F3DF]" />
        <View className="absolute right-8 top-20 h-32 w-32 rounded-3xl bg-[#D7F3DF]" />
        <View className="absolute -left-12 top-40 h-4 w-[520px] rotate-[-35deg] rounded-full bg-white" />
        <View className="absolute -left-12 top-40 h-2 w-[520px] rotate-[-35deg] rounded-full bg-[#00A85A]" />
        <View className="absolute left-20 top-20 h-3 w-[420px] rotate-[8deg] rounded-full bg-white" />
      </View>

      {showCenterPin && (
        <View className="absolute left-1/2 top-1/2 -ml-5 -mt-10 items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Ionicons name="location" size={22} color="#FFFFFF" />
            </View>
          </View>
          <View className="-mt-1 h-5 w-1 rounded-full bg-primary" />
        </View>
      )}

      <View className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/90 px-4 py-3">
        <Text className="text-sm font-bold text-ink">Web map preview</Text>
        <Text className="mt-1 text-xs text-muted">
          Native Google Maps appears on Android/iOS. Web preview keeps address flow clickable.
        </Text>
      </View>
    </Pressable>
  );
}
