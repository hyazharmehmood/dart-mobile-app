import { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import useNotificationStore from "../store/useNotificationStore";

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function notificationIcon(notification) {
  const type = String(notification?.type || notification?.category || "").toLowerCase();

  if (type.includes("order")) {
    return "receipt-outline";
  }

  if (type.includes("promo") || type.includes("offer")) {
    return "pricetag-outline";
  }

  if (type.includes("payment")) {
    return "card-outline";
  }

  return "notifications-outline";
}

function notificationOrderId(notification) {
  return notification?.orderId || notification?.metadata?.orderId || notification?.data?.orderId || null;
}

function NotificationRow({ notification, onPress }) {
  const isUnread = !notification.readAt;
  const icon = notificationIcon(notification);

  return (
    <Pressable
      onPress={() => onPress(notification)}
      className={`mb-3 overflow-hidden rounded-[22px] border bg-white active:opacity-85 ${
        isUnread ? "border-[#FFD8C5]" : "border-[#EEF0F2]"
      }`}
    >
      <View className="flex-row px-4 py-4">
        <View className={`mr-3 h-12 w-12 items-center justify-center rounded-full ${isUnread ? "bg-primary" : "bg-[#FFF4ED]"}`}>
          <Ionicons name={icon} size={22} color={isUnread ? "#FFFFFF" : "#FF6400"} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-start">
            <Text className="flex-1 pr-3 text-base font-extrabold text-ink" numberOfLines={2}>
              {notification.title || "Dart update"}
            </Text>
            {isUnread ? <View className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
          </View>

          <Text className="mt-1 text-sm leading-5 text-muted" numberOfLines={3}>
            {notification.message || notification.body || "You have a new update."}
          </Text>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text className="ml-1 text-xs font-medium text-muted">{formatTime(notification.createdAt)}</Text>
            </View>
            {notificationOrderId(notification) ? (
              <View className="rounded-full bg-[#FFF0E5] px-3 py-1">
                <Text className="text-xs font-extrabold text-primary">View order</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen({ navigation }) {
  const { showToast } = useToast();
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  const refresh = () => {
    loadNotifications().catch((error) => {
      showToast({
        type: "error",
        title: "Notifications unavailable",
        message: error?.response?.data?.error || error?.message || "Please try again in a moment."
      });
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Home");
  };

  const openNotification = (notification) => {
    if (!notification) {
      return;
    }

    if (!notification.readAt) {
      markRead(notification.id).catch(() => null);
    }

    const orderId = notificationOrderId(notification);

    if (orderId) {
      navigation.navigate("OrderDetail", { orderId });
    }
  };

  const readAll = () => {
    markAllRead().catch((error) => {
      showToast({
        type: "error",
        title: "Could not mark read",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <View className="bg-primary px-5 pb-6 pt-2">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={goBack} className="h-11 w-11 items-center justify-center rounded-full bg-white/20">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-base font-extrabold text-white">Notifications</Text>
          <Pressable onPress={refresh} className="h-11 w-11 items-center justify-center rounded-full bg-white/20">
            {isLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="refresh" size={22} color="#FFFFFF" />}
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-center justify-between rounded-[26px] bg-white/15 px-4 py-4">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wide text-white/80">Inbox</Text>
            <Text className="mt-1 text-2xl font-extrabold text-white">{unreadCount} unread</Text>
            <Text className="mt-1 text-sm font-medium text-white/85">Orders, promos and payment updates</Text>
          </View>
          {unreadCount ? (
            <Pressable onPress={readAll} className="rounded-full bg-white px-4 py-2.5">
              <Text className="text-xs font-extrabold text-primary">Read all</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 rounded-t-[30px] bg-[#F7F8FA]"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#FF6400" />}
      >
        {notifications.length ? (
          notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} onPress={openNotification} />
          ))
        ) : (
          <View className="mt-20 items-center rounded-[26px] bg-white px-6 py-8 shadow-sm">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-[#FFF4ED]">
              <Ionicons name="notifications-off-outline" size={38} color="#FF6400" />
            </View>
            <Text className="mt-5 text-xl font-extrabold text-ink">No notifications yet</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">Order updates, offers and payment alerts will appear here.</Text>
            <Button title="Refresh" onPress={refresh} loading={isLoading} className="mt-6 w-full" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
