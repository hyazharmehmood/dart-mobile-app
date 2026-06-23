import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { setUnauthorizedHandler } from "../services/api";
import { connectCustomerSocket, disconnectCustomerSocket } from "../services/socketService";
import HomeScreen from "../screens/HomeScreen";
import AddressScreen from "../screens/AddressScreen";
import CartScreen from "../screens/CartScreen";
import LocationAccessScreen from "../screens/LocationAccessScreen";
import LocationEnableScreen from "../screens/LocationEnableScreen";
import LoginScreen from "../screens/LoginScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import OrdersScreen from "../screens/OrdersScreen";
import RestaurantDetailScreen from "../screens/RestaurantDetailScreen";
import SignupScreen from "../screens/SignupScreen";
import SplashScreen from "../screens/SplashScreen";
import useAddressStore from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";
import useNotificationStore from "../store/useNotificationStore";
import useOrderStore from "../store/useOrderStore";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isGuest = useAuthStore((state) => state.isGuest);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const finishRestore = useAuthStore((state) => state.finishRestore);
  const logout = useAuthStore((state) => state.logout);
  const loadPersistedAddress = useAddressStore((state) => state.loadPersistedAddress);
  const setFromProfile = useAddressStore((state) => state.setFromProfile);
  const hydrateServerCart = useCartStore((state) => state.hydrateServerCart);
  const resetLocalCartState = useCartStore((state) => state.resetLocalCartState);
  const receiveNotification = useNotificationStore((state) => state.receiveNotification);
  const receiveNotificationRead = useNotificationStore((state) => state.receiveRead);
  const receiveNotificationReadAll = useNotificationStore((state) => state.receiveReadAll);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const resetNotifications = useNotificationStore((state) => state.resetNotifications);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const receiveOrderEvent = useOrderStore((state) => state.receiveOrderEvent);
  const receiveOrderUpdated = useOrderStore((state) => state.receiveOrderUpdated);
  const resetOrders = useOrderStore((state) => state.resetOrders);

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
      if (active) {
        await loadPersistedAddress().catch(() => null);
      }

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
  }, [finishRestore, loadPersistedAddress, restoreSession, setFromProfile]);

  useEffect(() => {
    if (user && !isGuest) {
      hydrateServerCart().catch(() => {});
      loadNotifications({ limit: 20 }).catch(() => {});
      loadOrders({ limit: 10 }).catch(() => {});
      return;
    }

    resetLocalCartState();
    resetNotifications();
    resetOrders();
  }, [hydrateServerCart, isGuest, loadNotifications, loadOrders, resetLocalCartState, resetNotifications, resetOrders, user]);

  useEffect(() => {
    if (user && token && !isGuest) {
      connectCustomerSocket({
        token,
        onNotificationNew: receiveNotification,
        onNotificationRead: receiveNotificationRead,
        onNotificationReadAll: receiveNotificationReadAll,
        onOrderEvent: receiveOrderEvent,
        onOrderUpdated: receiveOrderUpdated
      });

      return () => {
        disconnectCustomerSocket();
      };
    }

    disconnectCustomerSocket();
    return undefined;
  }, [
    isGuest,
    receiveNotification,
    receiveNotificationRead,
    receiveNotificationReadAll,
    receiveOrderEvent,
    receiveOrderUpdated,
    token,
    user
  ]);

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
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
