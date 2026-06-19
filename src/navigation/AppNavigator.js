import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { setUnauthorizedHandler } from "../services/api";
import HomeScreen from "../screens/HomeScreen";
import AddressScreen from "../screens/AddressScreen";
import CartScreen from "../screens/CartScreen";
import LocationAccessScreen from "../screens/LocationAccessScreen";
import LocationEnableScreen from "../screens/LocationEnableScreen";
import LoginScreen from "../screens/LoginScreen";
import RestaurantDetailScreen from "../screens/RestaurantDetailScreen";
import SignupScreen from "../screens/SignupScreen";
import SplashScreen from "../screens/SplashScreen";
import useAddressStore from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const user = useAuthStore((state) => state.user);
  const isGuest = useAuthStore((state) => state.isGuest);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const finishRestore = useAuthStore((state) => state.finishRestore);
  const logout = useAuthStore((state) => state.logout);
  const setFromProfile = useAddressStore((state) => state.setFromProfile);
  const hydrateServerCart = useCartStore((state) => state.hydrateServerCart);
  const resetLocalCartState = useCartStore((state) => state.resetLocalCartState);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (active) {
        finishRestore();
      }
    }, 4000);

    const restore = async () => {
      const session = await restoreSession();

      if (active && session?.profile) {
        setFromProfile(session.profile);
      }

      clearTimeout(timeout);
    };

    restore();

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [finishRestore, restoreSession, setFromProfile]);

  useEffect(() => {
    if (user && !isGuest) {
      hydrateServerCart().catch(() => {});
      return;
    }

    resetLocalCartState();
  }, [hydrateServerCart, isGuest, resetLocalCartState, user]);

  if (isRestoring) {
    return (
      <View className="flex-1 items-center justify-center bg-primary">
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user || isGuest ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Address" component={AddressScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="LocationAccess" component={LocationAccessScreen} />
            <Stack.Screen name="LocationEnable" component={LocationEnableScreen} />
            <Stack.Screen name="Address" component={AddressScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
