import { Text, TextInput } from "react-native";

export const appFonts = {
  "Satoshi-Light": require("../../assets/fonts/Satoshi-Light.ttf"),
  "Satoshi-Regular": require("../../assets/fonts/Satoshi-Regular.ttf"),
  "Satoshi-Medium": require("../../assets/fonts/Satoshi-Medium.ttf"),
  "Satoshi-Bold": require("../../assets/fonts/Satoshi-Bold.ttf"),
  "Satoshi-Black": require("../../assets/fonts/Satoshi-Black.ttf")
};

function mergeDefaultStyle(Component, style) {
  Component.defaultProps = Component.defaultProps || {};
  const currentStyle = Component.defaultProps.style;
  Component.defaultProps.style = currentStyle ? [style, currentStyle] : style;
}

export function applyGlobalFont() {
  const baseStyle = { fontFamily: "Satoshi-Regular" };

  mergeDefaultStyle(Text, baseStyle);
  mergeDefaultStyle(TextInput, baseStyle);
}
