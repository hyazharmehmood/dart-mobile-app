import { SafeAreaView, Text, View } from "react-native";

import AppLogo from "../components/AppLogo";
import PrimaryButton from "../components/PrimaryButton";
import useAuthStore from "../store/useAuthStore";

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6">
        <View className="mb-8 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold text-ink">dart</Text>
            <Text className="mt-1 text-sm text-muted">Fresh meals, fast delivery.</Text>
          </View>
          <AppLogo size={48} />
        </View>

        <View className="rounded-3xl bg-surface p-6 shadow-sm">
          <Text className="text-sm font-bold uppercase text-primary">Welcome</Text>
          <Text className="mt-3 text-3xl font-extrabold text-ink">
            Hi, {user?.name || "Food Lover"}
          </Text>
          <Text className="mt-3 text-base leading-6 text-muted">
            Your food delivery starter app is ready. Browse restaurants, place
            orders, and track deliveries from here as the product grows.
          </Text>
        </View>

        <View className="mt-auto pb-8">
          <PrimaryButton title="Logout" onPress={logout} />
        </View>
      </View>
    </SafeAreaView>
  );
}
