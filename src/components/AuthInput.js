import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, TextInput, View } from "react-native";

export default function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none"
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPasswordField = Boolean(secureTextEntry);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-ink">{label}</Text>
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={isPasswordField && !passwordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholderTextColor="#9CA3AF"
          className={`h-14 rounded-2xl border border-orange-100 bg-white px-4 text-base text-ink shadow-sm ${
            isPasswordField ? "pr-12" : ""
          }`}
        />
        {isPasswordField ? (
          <Pressable
            onPress={() => setPasswordVisible((current) => !current)}
            className="absolute bottom-0 right-0 top-0 w-12 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
          >
            <Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={22} color="#6B7280" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
