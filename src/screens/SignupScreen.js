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

const signupSchema = Yup.object().shape({
  firstName: Yup.string().min(2, "Minimum 2 characters").required("First name is required"),
  lastName: Yup.string().min(2, "Minimum 2 characters").required("Last name is required"),
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

export default function SignupScreen({ navigation }) {
  const signup = useAuthStore((state) => state.signup);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const isLoading = useAuthStore((state) => state.isLoading);
  const deliveryAddress = useAddressStore((state) => state.address);
  const hasUnsyncedAddress = useAddressStore((state) => state.hasUnsyncedAddress);
  const setFromProfile = useAddressStore((state) => state.setFromProfile);
  const { showToast } = useToast();

  const handleSignup = async (values) => {
    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      password: values.password
    };

    if (hasUnsyncedAddress && deliveryAddress) {
      payload.address = deliveryAddress;
    }

    try {
      const session = await signup(payload);
      setFromProfile(session.profile || session.user);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Signup failed. Please check your details and try again.";

      showToast({ type: "error", title: "Signup failed", message });
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
              testID="signup-back-button"
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login")}
              className="h-12 w-12 items-center justify-center rounded-full bg-white/15"
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="signup-skip-button"
              onPress={continueAsGuest}
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
          initialValues={{ firstName: "", lastName: "", email: "", password: "" }}
          validationSchema={signupSchema}
          onSubmit={handleSignup}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View className="flex-1 rounded-t-[28px] bg-white px-6 pt-5">
              <View className="flex-row gap-4">
                <TextField
                  label="First Name"
                  value={values.firstName}
                  onChangeText={handleChange("firstName")}
                  onBlur={handleBlur("firstName")}
                  error={errors.firstName}
                  touched={touched.firstName}
                  placeholder="first name"
                  autoCapitalize="words"
                  className="flex-1"
                />
                <TextField
                  label="Last Name"
                  value={values.lastName}
                  onChangeText={handleChange("lastName")}
                  onBlur={handleBlur("lastName")}
                  error={errors.lastName}
                  touched={touched.lastName}
                  placeholder="Last name"
                  autoCapitalize="words"
                  className="flex-1"
                />
              </View>

              <TextField
                label="Email"
                value={values.email}
                onChangeText={handleChange("email")}
                onBlur={handleBlur("email")}
                error={errors.email}
                touched={touched.email}
                placeholder="email address"
                keyboardType="email-address"
              />
              <TextField
                label="Password"
                value={values.password}
                onChangeText={handleChange("password")}
                onBlur={handleBlur("password")}
                error={errors.password}
                touched={touched.password}
                placeholder="enter your password"
                secureTextEntry
              />

              <Button title="Sign up" onPress={handleSubmit} loading={isLoading} className="mt-1" />
              <SocialButton title="Continue with google" />
              <SocialButton title="Continue with Phone" />

              <View className="mt-auto mb-5 flex-row justify-center">
                <Text className="text-sm text-muted">Don't have an account? </Text>
                <Pressable onPress={() => navigation.navigate("Login")}>
                  <Text className="text-sm font-bold text-primary">Login</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Formik>
      </KeyboardAvoidingView>
    </View>
  );
}
