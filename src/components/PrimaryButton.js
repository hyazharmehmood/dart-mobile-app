import { Pressable, Text } from "react-native";

export default function PrimaryButton({ title, onPress, className = "" }) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-14 items-center justify-center rounded-2xl bg-primary shadow-md active:opacity-90 ${className}`}
    >
      <Text className="text-base font-bold text-white">{title}</Text>
    </Pressable>
  );
}
