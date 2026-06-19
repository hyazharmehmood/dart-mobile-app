import { Text, TextInput, View } from "react-native";

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
  const showError = Boolean(touched && error);

  return (
    <View className={`mb-4 ${className}`}>
      {label && <Text className="mb-2 text-sm font-medium text-ink">{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        blurOnSubmit={false}
        placeholderTextColor="#A3A3A3"
        className={`h-14 rounded-2xl border bg-white px-4 text-base text-ink ${
          showError ? "border-red-500" : "border-[#D9D9D9]"
        } ${inputClassName}`}
      />
      {showError && <Text className="mt-1 text-xs text-red-600">{error}</Text>}
    </View>
  );
}
