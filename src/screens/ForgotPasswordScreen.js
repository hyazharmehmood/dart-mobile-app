import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../services/api";
import { forgotPassword, resetPassword } from "../services/authService";

export default function ForgotPasswordScreen({ navigation, route }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState(route?.params?.email || "");
  const [token, setToken] = useState(route?.params?.token || "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const normalizedEmail = email.trim();
  const normalizedToken = token.trim();

  const requestReset = async () => {
    if (!normalizedEmail) {
      showToast({ type: "error", title: "Email required", message: "Enter your email address first." });
      return;
    }

    try {
      setIsLoading(true);
      await forgotPassword({ email: normalizedEmail });
      showToast({
        type: "success",
        title: "Reset email sent",
        message: "If this account exists, check your email for a reset link or token."
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Reset unavailable",
        message: getApiErrorMessage(error, "Please try again.")
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitReset = async () => {
    if (!normalizedToken || password.length < 8) {
      showToast({
        type: "error",
        title: "Check details",
        message: "Enter the reset token from your email and a password of at least 8 characters."
      });
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword({ token: normalizedToken, password });
      showToast({ type: "success", title: "Password updated", message: "You can sign in with your new password." });
      navigation.navigate("Login");
    } catch (error) {
      showToast({
        type: "error",
        title: "Reset failed",
        message: getApiErrorMessage(error, "Please check the token and try again.")
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-5 pb-4 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink">Reset password</Text>
            <Text className="mt-0.5 text-sm text-muted">Request a reset email, then enter the token below</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 bg-[#F7F8FA]" contentContainerStyle={{ padding: 20 }}>
        <View className="rounded-[24px] bg-white px-5 py-5 shadow-sm">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button title="Send reset email" onPress={requestReset} loading={isLoading} />
        </View>

        <View className="mt-5 rounded-[24px] bg-white px-5 py-5 shadow-sm">
          <TextField
            label="Reset token"
            value={token}
            onChangeText={setToken}
            placeholder="Paste token from your email"
            autoCapitalize="none"
          />
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />
          <Button title="Update password" onPress={submitReset} loading={isLoading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
