import { Pressable, StatusBar, Text, View } from "react-native";

import BrandMark from "../components/BrandMark";
import PrimaryButton from "../components/PrimaryButton";

export default function LocationEnableScreen({ navigation }) {
  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <View className="mt-40 flex-1 rounded-t-[28px] bg-white px-6 pt-5">
        <View className="mb-10 flex-row items-center justify-between">
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text className="text-2xl text-ink">x</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text className="text-xs font-medium text-ink">Skip</Text>
          </Pressable>
        </View>

        <BrandMark compact />

        <View className="mt-14">
          <Text className="text-[28px] font-bold leading-9 text-ink">
            Share your location to order with easy
          </Text>

          <View className="mt-8 flex-row">
            <Text className="mr-4 text-xl text-primary">@</Text>
            <Text className="flex-1 text-base leading-6 text-ink">
              Turn on Location services in setting.
            </Text>
          </View>

          <View className="mt-5 flex-row">
            <Text className="mr-4 text-xl text-[#2F6BFF]">#</Text>
            <Text className="flex-1 text-base leading-6 text-ink">
              Or enter your address manually to find the best restaurant and deal near you
            </Text>
          </View>
        </View>

        <View className="mt-auto mb-5">
          <PrimaryButton title="Go to Settings" onPress={() => navigation.navigate("Address")} />
          <Pressable onPress={() => navigation.navigate("Address")} className="mt-4 items-center">
            <Text className="text-base font-bold text-ink">Enter address manually</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
