import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, RefreshControl, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { listDisputes } from "../services/disputeService";

export default function DisputesScreen({ navigation }) {
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = () => {
    setIsLoading(true);
    listDisputes()
      .then((data) => {
        setDisputes(data?.disputes || data?.items || []);
      })
      .catch((error) => {
        showToast({
          type: "error",
          title: "Disputes unavailable",
          message: error?.response?.data?.error || error?.message || "Please try again."
        });
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-5 pb-4 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink">Disputes</Text>
            <Text className="mt-0.5 text-sm text-muted">Support conversations for your orders</Text>
          </View>
        </View>
      </View>
      <ScrollView
        className="flex-1 bg-[#F7F8FA]"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
      >
        {disputes.length ? (
          disputes.map((dispute) => (
            <Pressable
              key={dispute.id}
              onPress={() => navigation.navigate("DisputeDetail", { disputeId: dispute.id, dispute })}
              className="mb-3 rounded-2xl border border-border bg-white px-4 py-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
                    {String(dispute.type || "Dispute").replace(/_/g, " ")}
                  </Text>
                  <Text className="mt-1 text-sm text-muted" numberOfLines={2}>
                    {dispute.summary || dispute.orderNumber || "Order issue"}
                  </Text>
                </View>
                <View className="rounded-full bg-[#FFF0E5] px-3 py-1">
                  <Text className="text-xs font-bold text-primary">{dispute.status || "OPEN"}</Text>
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <View className="mt-20 items-center rounded-[26px] bg-white px-6 py-8 shadow-sm">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-[#FFF4ED]">
              <Ionicons name="chatbubbles-outline" size={38} color="#FF6400" />
            </View>
            <Text className="mt-5 text-xl font-extrabold text-ink">No disputes</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">Eligible delivered orders can open a dispute from order details.</Text>
            <Button title="View orders" onPress={() => navigation.navigate("Orders")} className="mt-6 w-full" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
