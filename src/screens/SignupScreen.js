import { useState } from "react";
import {
  Alert,
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
import { signupCustomer } from "../services/customerService";
import useAddressStore from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";

function Field({ label, value, onChangeText, placeholder, secureTextEntry, className = "" }) {
  return (
    <View className={`mb-4 ${className}`}>
      <Text className="mb-2 text-sm font-medium text-ink">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#A3A3A3"
        className="h-12 rounded-2xl border border-[#D9D9D9] px-4 text-base text-ink"
        keyboardType={label === "Email" ? "email-address" : "default"}
        autoCapitalize={label.includes("Name") ? "words" : "none"}
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

export default function SignupScreen({ navigation }) {
  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const deliveryAddress = useAddressStore((state) => state.address);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const payload = {
      firstName: firstName.trim() || "Azhar",
      lastName: lastName.trim() || "Mehmood",
      email: email.trim() || "hyazharmehmood@gmail.com",
      password: password || "Azhar123@",
      address: deliveryAddress
    };

    try {
      setLoading(true);
      setError(null);
      await signupCustomer(payload);
      signup(payload);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Signup failed. Please check your details and try again.";

      setError(message);
      Alert.alert("Signup failed", message);
    } finally {
      setLoading(false);
    }
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
            <Pressable onPress={handleSignup}>
              <Text className="text-xs text-white">Skip</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-1 rounded-t-[28px] bg-white px-6 pt-5">
          <View className="flex-row gap-4">
            <Field
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="first name"
              className="flex-1"
            />
            <Field
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              className="flex-1"
            />
          </View>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="email address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="enter your password"
            secureTextEntry
          />

          <PrimaryButton
            title={isLoading ? "Signing up..." : "Sign up"}
            onPress={handleSignup}
            className="mt-1"
          />
          <SocialButton title="Continue with google" />
          <SocialButton title="Continue with Phone" />

          <View className="mt-auto mb-5 flex-row justify-center">
            <Text className="text-sm text-muted">Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text className="text-sm font-bold text-primary">Login</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
