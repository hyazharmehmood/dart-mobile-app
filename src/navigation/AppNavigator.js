import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import AccountSettingsScreen from "../screens/AccountSettingsScreen";
import { useToast } from "../components/ui/ToastProvider";
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
import DisputeDetailScreen from "../screens/DisputeDetailScreen";
import DisputesScreen from "../screens/DisputesScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import LocationAccessScreen from "../screens/LocationAccessScreen";
import LocationEnableScreen from "../screens/LocationEnableScreen";
import LoginScreen from "../screens/LoginScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import OrderTrackingScreen from "../screens/OrderTrackingScreen";
import OrdersScreen from "../screens/OrdersScreen";
import PaymentCardScreen from "../screens/PaymentCardScreen";
import PaymentWebViewScreen from "../screens/PaymentWebViewScreen";
import RestaurantDetailScreen from "../screens/RestaurantDetailScreen";
import SavedAddressesScreen from "../screens/SavedAddressesScreen";
import SignupScreen from "../screens/SignupScreen";
import SplashScreen from "../screens/SplashScreen";
import useAddressStore from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";
import useFavoriteStore from "../store/useFavoriteStore";
import useNotificationStore from "../store/useNotificationStore";
import useOrderStore from "../store/useOrderStore";

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

function openNotificationTarget(data = {}) {
  if (!navigationRef.isReady()) {
    return;
  }

  const routeOrderId = String(data.route || "").match(/\/customer\/orders\/([^/?#]+)/)?.[1];
  const routeDisputeId = String(data.route || "").match(/\/disputes\/([^/?#]+)/)?.[1];
  const orderId = data.orderId || routeOrderId;
  const disputeId = data.disputeId || routeDisputeId;

  if (disputeId) {
    navigationRef.navigate("DisputeDetail", { disputeId });
    if (data.notificationId) {
      useNotificationStore.getState().markRead(data.notificationId).catch(() => null);
    }
    return;
  }

  if (orderId) {
    navigationRef.navigate("OrderTracking", { orderId });
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

function notificationToastType(notification) {
  const type = String(notification?.type || "").toUpperCase();

  if (type.includes("FAIL") || type.includes("CANCEL")) {
    return "error";
  }

  if (type.includes("DELIVER") || type.includes("SUCCESS")) {
    return "success";
  }

  return "info";
}

export default function AppNavigator() {
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isGuest = useAuthStore((state) => state.isGuest);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const finishRestore = useAuthStore((state) => state.finishRestore);
  const logout = useAuthStore((state) => state.logout);
  const loadPersistedAddress = useAddressStore((state) => state.loadPersistedAddress);
  const loadAddresses = useAddressStore((state) => state.loadAddresses);
  const setFromProfile = useAddressStore((state) => state.setFromProfile);
  const hydrateServerCart = useCartStore((state) => state.hydrateServerCart);
  const resetLocalCartState = useCartStore((state) => state.resetLocalCartState);
  const loadFavorites = useFavoriteStore((state) => state.loadFavorites);
  const resetFavorites = useFavoriteStore((state) => state.resetFavorites);
  const receiveNotification = useNotificationStore((state) => state.receiveNotification);
  const receiveNotificationRead = useNotificationStore((state) => state.receiveRead);
  const receiveNotificationReadAll = useNotificationStore((state) => state.receiveReadAll);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const resetNotifications = useNotificationStore((state) => state.resetNotifications);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const receiveOrderEvent = useOrderStore((state) => state.receiveOrderEvent);
  const receiveOrderUpdated = useOrderStore((state) => state.receiveOrderUpdated);
  const receiveDriverLocation = useOrderStore((state) => state.receiveDriverLocation);
  const resetOrders = useOrderStore((state) => state.resetOrders);

  const handleNotificationNew = useCallback(
    (notification, { showInAppToast = true } = {}) => {
      receiveNotification(notification);

      if (showInAppToast && notification?.title) {
        showToast({
          type: notificationToastType(notification),
          title: notification.title,
          message: notification.message || "You have a new update."
        });
      }
    },
    [receiveNotification, showToast]
  );

  const handleOrderEvent = useCallback(
    (event) => {
      receiveOrderEvent(event);

      const orderId = event?.orderId;
      if (!orderId) {
        return;
      }

      useOrderStore.getState().loadOrderEvents(orderId).catch(() => null);

      if (event?.nextStatus || event?.type) {
        useOrderStore.getState().loadOrderDetail(orderId).catch(() => null);
        loadOrders({ limit: 15 }).catch(() => null);
      }
    },
    [loadOrders, receiveOrderEvent]
  );

  const handleOrderUpdated = useCallback(
    (order) => {
      receiveOrderUpdated(order);
      const orderId = order?.orderId || order?.id;

      if (orderId) {
        useOrderStore.getState().loadOrderDetail(orderId).catch(() => null);
        useOrderStore.getState().loadOrderEvents(orderId).catch(() => null);
      }
    },
    [receiveOrderUpdated]
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
      loadFavorites().catch(() => {});
      loadAddresses().catch(() => {});
      registerAuthenticatedPushDevice().catch(() => null);
      return;
    }

    resetLocalCartState();
    resetFavorites();
    resetNotifications();
    resetOrders();
  }, [
    hydrateServerCart,
    isGuest,
    loadAddresses,
    loadFavorites,
    loadNotifications,
    loadOrders,
    resetFavorites,
    resetLocalCartState,
    resetNotifications,
    resetOrders,
    user
  ]);

  useEffect(() => {
    if (user && token && !isGuest) {
      connectCustomerSocket({
        token,
        onNotificationNew: handleNotificationNew,
        onNotificationRead: receiveNotificationRead,
        onNotificationReadAll: receiveNotificationReadAll,
        onOrderEvent: handleOrderEvent,
        onOrderUpdated: handleOrderUpdated,
        onDriverLocation: receiveDriverLocation
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
    handleOrderEvent,
    receiveDriverLocation,
    handleOrderUpdated,
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
      handleNotificationNew(notification, { showInAppToast: true });
      loadNotifications({ limit: 20 }).catch(() => null);

      if (notification.orderId) {
        useOrderStore.getState().loadOrderDetail(notification.orderId).catch(() => null);
        useOrderStore.getState().loadOrderEvents(notification.orderId).catch(() => null);
        loadOrders({ limit: 15 }).catch(() => null);
      }
    });

    const unsubscribeToken = addFirebaseTokenRefreshListener(() => {
      registerAuthenticatedPushDevice().catch(() => null);
    });

    return () => {
      unsubscribeMessage?.();
      unsubscribeToken?.();
    };
  }, [handleNotificationNew, isGuest, loadNotifications, loadOrders, user]);

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
            <Stack.Screen name="PaymentCard" component={PaymentCardScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="Disputes" component={DisputesScreen} />
            <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} />
            <Stack.Screen name="Address" component={AddressScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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
            <Stack.Screen name="PaymentCard" component={PaymentCardScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="Disputes" component={DisputesScreen} />
            <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
