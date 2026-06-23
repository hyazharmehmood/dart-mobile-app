import { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, RefreshControl, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import useNotificationStore from "../store/useNotificationStore";

function NotificationRow({ notification, onRead }) {
  const isUnread = !notification.readAt;

  return (
    <Pressable
      onPress={() => isUnread && onRead(notification.id)}
      className={`mb-3 rounded-2xl border px-4 py-4 ${isUnread ? "border-[#FFD5BF] bg-[#FFF5EF]" : "border-border bg-white"}`}
    >
      <View className="flex-row items-start">
        <View className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${isUnread ? "bg-primary" : "bg-[#F6F7F8]"}`}>
          <Ionicons name="notifications-outline" size={20} color={isUnread ? "#FFFFFF" : "#6B7280"} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink" numberOfLines={2}>{notification.title || "Notification"}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted" numberOfLines={3}>
            {notification.message || "You have a new update."}
          </Text>
          <Text className="mt-2 text-xs font-medium text-muted">
            {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}
          </Text>
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

  const readOne = (notificationId) => {
    markRead(notificationId).catch(() => null);
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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-5 pb-4 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink">Notifications</Text>
            <Text className="mt-0.5 text-sm text-muted">{unreadCount} unread</Text>
          </View>
          {unreadCount ? (
            <Pressable onPress={readAll} className="rounded-full bg-[#FFF0E5] px-3 py-2">
              <Text className="text-xs font-bold text-primary">Read all</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#F7F8FA]"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
      >
        {notifications.length ? (
          notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} onRead={readOne} />
          ))
        ) : (
          <View className="mt-20 items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-[#FFF4ED]">
              <Ionicons name="notifications-off-outline" size={36} color="#FF6400" />
            </View>
            <Text className="mt-5 text-xl font-bold text-ink">No notifications yet</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">Order updates and promos will appear here.</Text>
            <Button title="Refresh" onPress={refresh} loading={isLoading} className="mt-6 w-full rounded-xl" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
