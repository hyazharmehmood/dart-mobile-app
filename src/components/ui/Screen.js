import { StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen({
  children,
  className = "bg-white",
  statusBarStyle = "dark-content",
  statusBarColor = "#FFFFFF",
  edges = ["top", "left", "right", "bottom"]
}) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 ${className}`}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarColor} />
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
