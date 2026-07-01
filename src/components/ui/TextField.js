import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, TextInput, View } from "react-native";

export default function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  touched,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  className = "",
  inputClassName = "",
  returnKeyType = "done"
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showError = Boolean(touched && error);
  const isPasswordField = Boolean(secureTextEntry);

  return (
    <View className={`mb-4 ${className}`}>
      {label && <Text className="mb-2 text-sm font-medium text-ink">{label}</Text>}
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          secureTextEntry={isPasswordField && !passwordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          blurOnSubmit={false}
          placeholderTextColor="#A3A3A3"
          className={`h-14 rounded-2xl border bg-white px-4 text-base text-ink ${
            isPasswordField ? "pr-12" : ""
          } ${showError ? "border-red-500" : "border-[#D9D9D9]"} ${inputClassName}`}
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
      {showError && <Text className="mt-1 text-xs text-red-600">{error}</Text>}
    </View>
  );
}
