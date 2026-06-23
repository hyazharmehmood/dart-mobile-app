import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, StatusBar, Text, View } from "react-native";

import BrandMark from "../components/BrandMark";
import Button from "../components/ui/Button";

export default function LocationEnableScreen({ navigation }) {
  const openLocationSettings = async () => {
    if (typeof Linking.openSettings === "function") {
      await Linking.openSettings().catch(() => null);
    }

    navigation.navigate("Address");
  };

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <View className="mt-24 flex-1 rounded-t-[28px] bg-white px-6 pt-5">
        <View className="mb-16 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            testID="location-enable-close-button"
            onPress={() => navigation.replace("Login")}
            className="h-12 w-12 items-center justify-center rounded-full bg-[#FFF0E5]"
          >
            <Ionicons name="close" size={26} color="#FF6400" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID="location-enable-skip-button"
            onPress={() => navigation.replace("Login")}
            className="px-1 py-2"
          >
            <Text className="text-base font-bold text-ink">Skip</Text>
          </Pressable>
        </View>

        <BrandMark compact />

        <View className="mt-12">
          <Text className="text-[25px] font-bold leading-8 text-ink">
            Share your location to order with easy
          </Text>

          <View className="mt-8 flex-row">
            <Ionicons name="location" size={22} color="#FF6400" style={{ marginRight: 16 }} />
            <Text className="flex-1 text-base leading-6 text-ink">
              Turn on Location services in setting.
            </Text>
          </View>

          <View className="mt-5 flex-row">
            <Ionicons name="map-outline" size={22} color="#2F6BFF" style={{ marginRight: 16 }} />
            <Text className="flex-1 text-base leading-6 text-ink">
              Or enter your address manually to find the best restaurant and deal near you
            </Text>
          </View>
        </View>

        <View className="mt-auto mb-5">
          <Button title="Go to Settings" onPress={openLocationSettings} />
          <Pressable onPress={() => navigation.navigate("Address")} className="mt-4 items-center">
            <Text className="text-base font-bold text-ink">Enter address manually</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
