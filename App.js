import "./global.css";

import { ActivityIndicator, View } from "react-native";
import { useFonts } from "expo-font";

import AppNavigator from "./src/navigation/AppNavigator";
import { ToastProvider } from "./src/components/ui/ToastProvider";
import { appFonts, applyGlobalFont } from "./src/theme/fonts";

applyGlobalFont();

export default function App() {
  const [fontsLoaded] = useFonts(appFonts);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-primary">
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  return (
    <ToastProvider>
      <AppNavigator />
    </ToastProvider>
  );
}
