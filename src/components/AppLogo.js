import { Image, View } from "react-native";

export default function AppLogo({ size = 64, className = "" }) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-3xl ${className}`}
      style={{ height: size, width: size }}
    >
      <Image
        source={require("../../assets/logo.png")}
        className="h-full w-full"
        resizeMode="contain"
      />
    </View>
  );
}
