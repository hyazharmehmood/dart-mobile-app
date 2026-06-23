import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { setUnauthorizedHandler } from "../services/api";
import {
  addFirebaseMessageListener,
  addFirebaseTokenRefreshListener,
  addNotificationResponseListener,
  registerAuthenticatedPushDevice
} from "../services/pushNotificationService";
import { connectCustomerSocket, disconnectCustomerSocket } from "../services/socketService";
import HomeScreen from "../screens/HomeScreen";
import AddressScreen from "../screens/AddressScreen";
import CartScreen from "../screens/CartScreen";
import LocationAccessScreen from "../screens/LocationAccessScreen";
import LocationEnableScreen from "../screens/LocationEnableScreen";
import LoginScreen from "../screens/LoginScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import OrdersScreen from "../screens/OrdersScreen";
import PaymentWebViewScreen from "../screens/PaymentWebViewScreen";
import RestaurantDetailScreen from "../screens/RestaurantDetailScreen";
import SignupScreen from "../screens/SignupScreen";
import SplashScreen from "../screens/SplashScreen";
import useAddressStore from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";
import useNotificationStore from "../store/useNotificationStore";
import useOrderStore from "../store/useOrderStore";

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

function openNotificationTarget(data = {}) {
  if (!navigationRef.isReady()) {
    return;
  }

  const routeOrderId = String(data.route || "").match(/\/customer\/orders\/([^/?#]+)/)?.[1];
  const orderId = data.orderId || routeOrderId;

  if (orderId) {
    navigationRef.navigate("OrderDetail", { orderId });
    if (data.notificationId) {
      useNotificationStore.getState().markRead(data.notificationId).catch(() => null);
    }
    return;
  }

  navigationRef.navigate("Notifications");
  if (data.notificationId) {
    useNotificationStore.getState().markRead(data.notificationId).catch(() => null);
  }
}

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

  const handleNotificationNew = useCallback(
    (notification) => {
      receiveNotification(notification);
    },
    [receiveNotification]
  );

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
      registerAuthenticatedPushDevice().catch(() => null);
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
        onNotificationNew: handleNotificationNew,
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
    handleNotificationNew,
    isGuest,
    receiveNotificationRead,
    receiveNotificationReadAll,
    receiveOrderEvent,
    receiveOrderUpdated,
    token,
    user
  ]);

  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      openNotificationTarget(response?.notification?.request?.content?.data || {});
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!user || isGuest) {
      return undefined;
    }

    const unsubscribeMessage = addFirebaseMessageListener((notification) => {
      handleNotificationNew(notification);
      loadNotifications({ limit: 20 }).catch(() => null);
    });

    const unsubscribeToken = addFirebaseTokenRefreshListener(() => {
      registerAuthenticatedPushDevice().catch(() => null);
    });

    return () => {
      unsubscribeMessage?.();
      unsubscribeToken?.();
    };
  }, [handleNotificationNew, isGuest, loadNotifications, user]);

  if (isRestoring) {
    return (
      <View className="flex-1 items-center justify-center bg-primary">
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user || isGuest ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
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
            <Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
