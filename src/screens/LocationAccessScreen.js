import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StatusBar, Text, View } from "react-native";

import AppLogo from "../components/AppLogo";
import Button from "../components/ui/Button";

export default function LocationAccessScreen({ navigation }) {
  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <View className="mt-24 flex-1 rounded-t-[28px] bg-white px-6 pt-5">
        <View className="mb-16 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            testID="location-access-close-button"
            onPress={() => navigation.replace("Login")}
            className="h-12 w-12 items-center justify-center rounded-full bg-[#FFF0E5]"
          >
            <Ionicons name="close" size={26} color="#FF6400" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID="location-access-skip-button"
            onPress={() => navigation.replace("Login")}
            className="px-1 py-2"
          >
            <Text className="text-base font-bold text-ink">Skip</Text>
          </Pressable>
        </View>

        <View className="items-center">
          <AppLogo size={64} />
        </View>

        <View className="mt-12">
          <Text className="text-[25px] font-bold leading-8 text-ink">
            Allow Location access on the next screen for:
          </Text>

          <View className="mt-8 flex-row">
            <Ionicons name="restaurant-outline" size={22} color="#FF6400" style={{ marginRight: 16 }} />
            <Text className="flex-1 text-base leading-6 text-ink">
              Search the best best restaurants and shop near you
            </Text>
          </View>

          <View className="mt-5 flex-row">
            <Ionicons name="cube-outline" size={22} color="#2F6BFF" style={{ marginRight: 16 }} />
            <Text className="flex-1 text-base leading-6 text-ink">
              Receiving moren accurate and faster delivery
            </Text>
          </View>
        </View>

        <Button
          title="Continue"
          onPress={() => navigation.replace("LocationEnable")}
          className="mt-auto mb-5"
        />
      </View>
    </View>
  );
}
