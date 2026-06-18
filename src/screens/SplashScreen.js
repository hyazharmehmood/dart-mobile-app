import { useEffect } from "react";
import { StatusBar, Text, View } from "react-native";

import AppLogo from "../components/AppLogo";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("LocationAccess");
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <View className="flex-1 items-center justify-center">
        <AppLogo size={92} />
        <Text className="mt-5 text-2xl font-extrabold text-white">dart</Text>
      </View>
    </View>
  );
}
