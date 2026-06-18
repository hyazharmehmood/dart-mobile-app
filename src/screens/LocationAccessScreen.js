import { Pressable, StatusBar, Text, View } from "react-native";

import AppLogo from "../components/AppLogo";
import PrimaryButton from "../components/PrimaryButton";

export default function LocationAccessScreen({ navigation }) {
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

        <View className="items-center">
          <AppLogo size={64} />
        </View>

        <View className="mt-14">
          <Text className="text-[28px] font-bold leading-9 text-ink">
            Allow Location access on the next screen for:
          </Text>

          <View className="mt-8 flex-row">
            <Text className="mr-4 text-xl text-primary">+</Text>
            <Text className="flex-1 text-base leading-6 text-ink">
              Search the best best restaurants and shop near you
            </Text>
          </View>

          <View className="mt-5 flex-row">
            <Text className="mr-4 text-xl text-[#2F6BFF]">#</Text>
            <Text className="flex-1 text-base leading-6 text-ink">
              Receiving moren accurate and faster delivery
            </Text>
          </View>
        </View>

        <PrimaryButton
          title="Continue"
          onPress={() => navigation.navigate("LocationEnable")}
          className="mt-auto mb-5"
        />
      </View>
    </View>
  );
}
