import { Formik } from "formik";
import Ionicons from "@expo/vector-icons/Ionicons";
import { KeyboardAvoidingView, Platform, Pressable, StatusBar, Text, View } from "react-native";
import * as Yup from "yup";

import AppLogo from "../components/AppLogo";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useToast } from "../components/ui/ToastProvider";
import useAddressStore from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";

const loginSchema = Yup.object().shape({
  email: Yup.string().email("Enter a valid email").required("Email is required"),
  password: Yup.string().min(8, "Password must be at least 8 characters").required("Password is required")
});

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
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const isLoading = useAuthStore((state) => state.isLoading);
  const syncSelectedAddress = useAddressStore((state) => state.syncSelectedAddress);
  const loadAddresses = useAddressStore((state) => state.loadAddresses);
  const hasUnsyncedAddress = useAddressStore((state) => state.hasUnsyncedAddress);
  const setFromProfile = useAddressStore((state) => state.setFromProfile);
  const { showToast } = useToast();

  const continueToGuestHome = () => {
    continueAsGuest();
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }]
    });
  };

  const handleLogin = async (values) => {
    try {
      const session = await login({
        email: values.email.trim(),
        password: values.password
      });

      setFromProfile(session.profile || session.user);

      if (hasUnsyncedAddress) {
        await syncSelectedAddress().catch(() => null);
      } else {
        await loadAddresses().catch(() => null);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }]
      });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Invalid email or password.";

      showToast({ type: "error", title: "Login failed", message });
    }
  };

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="px-6 pb-6 pt-16">
          <View className="mb-8 flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              testID="login-back-button"
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Address")}
              className="h-12 w-12 items-center justify-center rounded-full bg-white/15"
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="login-skip-button"
              onPress={continueToGuestHome}
              className="px-1 py-2"
            >
              <Text className="text-base font-bold text-white">Skip</Text>
            </Pressable>
          </View>
          <AppLogo size={56} />
          <Text className="mt-5 text-[24px] font-extrabold text-white">Welcome Back</Text>
          <Text className="mt-1 text-base text-white">
            slect your preferred methode to continue
          </Text>
        </View>

        <Formik
          initialValues={{ email: "", password: "", remember: false }}
          validationSchema={loginSchema}
          onSubmit={handleLogin}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
            <View className="flex-1 rounded-t-[28px] bg-white px-6 pt-5">
              <TextField
                label="Email"
                value={values.email}
                onChangeText={handleChange("email")}
                onBlur={handleBlur("email")}
                error={errors.email}
                touched={touched.email}
                placeholder="Enter your email"
                keyboardType="email-address"
              />
              <TextField
                label="Password"
                value={values.password}
                onChangeText={handleChange("password")}
                onBlur={handleBlur("password")}
                error={errors.password}
                touched={touched.password}
                placeholder="password"
                secureTextEntry
              />

              <View className="mb-5 flex-row items-center justify-between">
                <Pressable
                  onPress={() => setFieldValue("remember", !values.remember)}
                  className="flex-row items-center"
                >
                  <View
                    className={`mr-2 h-5 w-5 rounded border ${
                      values.remember ? "border-primary bg-primary" : "border-[#CFCFCF] bg-white"
                    }`}
                  />
                  <Text className="text-sm text-[#4B4B4B]">Remember for 30 days</Text>
                </Pressable>
                <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
                  <Text className="text-sm font-bold text-primary">Forgot password</Text>
                </Pressable>
              </View>

              <Button title="Sign in" onPress={handleSubmit} loading={isLoading} />
              <SocialButton title="Continue with google" />
              <SocialButton title="Continue with Phone" />

              <View className="mt-auto mb-5 flex-row justify-center">
                <Text className="text-sm text-muted">Don't have an account? </Text>
                <Pressable onPress={() => navigation.navigate("Signup")}>
                  <Text className="text-sm font-bold text-primary">Sign up</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Formik>
      </KeyboardAvoidingView>
    </View>
  );
}
