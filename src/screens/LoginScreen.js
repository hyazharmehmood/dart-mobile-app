import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View
} from "react-native";

import AppLogo from "../components/AppLogo";
import PrimaryButton from "../components/PrimaryButton";
import useAuthStore from "../store/useAuthStore";

function Field({ label, value, onChangeText, placeholder, secureTextEntry }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-ink">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#A3A3A3"
        className="h-12 rounded-2xl border border-[#D9D9D9] px-4 text-base text-ink"
        keyboardType={label === "Email" ? "email-address" : "default"}
        autoCapitalize="none"
      />
    </View>
  );
}

function SocialButton({ title }) {
  return (
    <Pressable className="mt-3 h-12 flex-row items-center justify-center rounded-xl border border-[#D9D9D9] bg-white">
      <Text className="mr-3 text-xl font-extrabold text-primary">G</Text>
      <Text className="text-base font-bold text-[#4B4B4B]">{title}</Text>
    </Pressable>
  );
}

export default function LoginScreen({ navigation }) {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleLogin = () => {
    login({ email: email.trim() || "guest@foodapp.com" });
  };

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="px-6 pb-5 pt-10">
          <View className="mb-5 flex-row items-start justify-between">
            <View>
              <Text className="text-2xl text-white">x</Text>
              <AppLogo size={48} className="mt-5" />
              <Text className="mt-2 text-[22px] font-extrabold text-white">Welcome Back</Text>
              <Text className="mt-1 text-sm text-white">
                slect your preferred methode to continue
              </Text>
            </View>
            <Pressable onPress={handleLogin}>
              <Text className="text-xs text-white">Skip</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-1 rounded-t-[28px] bg-white px-6 pt-5">
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            secureTextEntry
          />

          <View className="mb-5 flex-row items-center justify-between">
            <Pressable onPress={() => setRemember(!remember)} className="flex-row items-center">
              <View
                className={`mr-2 h-5 w-5 rounded border ${
                  remember ? "border-primary bg-primary" : "border-[#CFCFCF] bg-white"
                }`}
              />
              <Text className="text-sm text-[#4B4B4B]">Remember for 30 days</Text>
            </Pressable>
            <Pressable>
              <Text className="text-sm font-bold text-primary">Forgot password</Text>
            </Pressable>
          </View>

          <PrimaryButton title="Sing in" onPress={handleLogin} />
          <SocialButton title="Continue with google" />
          <SocialButton title="Continue with Phone" />

          <View className="mt-auto mb-5 flex-row justify-center">
            <Text className="text-sm text-muted">Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Signup")}>
              <Text className="text-sm font-bold text-primary">Sign up</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
