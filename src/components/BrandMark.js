import { Text, View } from "react-native";

import AppLogo from "./AppLogo";

export default function BrandMark({ compact = false }) {
  return (
    <View className="flex-row items-center justify-center">
      <AppLogo size={compact ? 44 : 56} />
      <Text className="ml-1 text-4xl font-extrabold text-primary">dart</Text>
    </View>
  );
}
