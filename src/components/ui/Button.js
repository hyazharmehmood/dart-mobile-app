import { ActivityIndicator, Pressable, Text } from "react-native";

const variantClasses = {
  primary: "bg-primary",
  secondary: "bg-white border border-[#E5E7EB]",
  ghost: "bg-transparent",
  disabled: "bg-[#E5E5E5]"
};

const textClasses = {
  primary: "text-white",
  secondary: "text-ink",
  ghost: "text-primary",
  disabled: "text-[#A8A8A8]"
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  className = "",
  textClassName = ""
}) {
  const currentVariant = disabled || loading ? "disabled" : variant;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      className={`h-14 flex-row items-center justify-center rounded-2xl active:opacity-90 ${variantClasses[currentVariant]} ${className}`}
    >
      {loading && <ActivityIndicator color="#FFFFFF" size="small" />}
      <Text
        className={`text-base font-bold ${loading ? "ml-2" : ""} ${textClasses[currentVariant]} ${textClassName}`}
      >
        {title}
      </Text>
    </Pressable>
  );
}
