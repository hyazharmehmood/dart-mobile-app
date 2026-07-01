import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Pressable, ScrollView, StatusBar, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { getDispute, postDisputeMessage } from "../services/disputeService";
import { uploadDisputeEvidence } from "../services/uploadService";

export default function DisputeDetailScreen({ navigation, route }) {
  const { showToast } = useToast();
  const disputeId = route?.params?.disputeId || route?.params?.dispute?.id;
  const [dispute, setDispute] = useState(route?.params?.dispute || null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(disputeId));
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const refresh = () => {
    if (!disputeId) {
      return;
    }

    setIsLoading(true);
    getDispute(disputeId)
      .then((data) => setDispute(data?.dispute || data))
      .catch((error) => {
        showToast({
          type: "error",
          title: "Dispute unavailable",
          message: error?.response?.data?.error || error?.message || "Please try again."
        });
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [disputeId]);

  const sendMessage = async () => {
    if (!message.trim()) {
      return;
    }

    try {
      setIsSending(true);
      await postDisputeMessage(disputeId, { body: message.trim() });
      setMessage("");
      refresh();
    } catch (error) {
      showToast({
        type: "error",
        title: "Message failed",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    } finally {
      setIsSending(false);
    }
  };

  const uploadEvidence = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showToast({ type: "error", title: "Permission required", message: "Allow photo access to upload evidence." });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8
    });
    const asset = result?.assets?.[0];

    if (result.canceled || !asset?.uri) {
      return;
    }

    try {
      setIsUploading(true);
      await uploadDisputeEvidence(disputeId, {
        uri: asset.uri,
        name: asset.fileName || "evidence.jpg",
        type: asset.mimeType || "image/jpeg",
        body: message.trim() || "Attached evidence"
      });
      setMessage("");
      refresh();
    } catch (error) {
      showToast({
        type: "error",
        title: "Evidence upload failed",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const messages = dispute?.messages || dispute?.thread || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-5 pb-4 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink">Dispute detail</Text>
            <Text className="mt-0.5 text-sm text-muted">{dispute?.status || "Support thread"}</Text>
          </View>
          {isLoading ? <ActivityIndicator color="#FF6400" /> : null}
        </View>
      </View>

      <ScrollView className="flex-1 bg-[#F7F8FA]" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View className="rounded-[24px] bg-white px-5 py-5 shadow-sm">
          <Text className="text-base font-extrabold text-ink">{String(dispute?.type || "Dispute").replace(/_/g, " ")}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{dispute?.summary || "Order issue under review."}</Text>
        </View>

        <Text className="mb-3 mt-5 text-lg font-extrabold text-ink">Messages</Text>
        {messages.length ? (
          messages.map((item, index) => (
            <View key={item.id || index} className="mb-3 rounded-2xl bg-white px-4 py-4 shadow-sm">
              <Text className="text-xs font-bold uppercase text-primary">{item.actorRole || item.senderRole || "Support"}</Text>
              <Text className="mt-2 text-sm leading-5 text-ink">{item.body || item.message || item.text}</Text>
            </View>
          ))
        ) : (
          <View className="rounded-2xl bg-white px-4 py-5">
            <Text className="text-sm font-semibold text-muted">No messages yet.</Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-5 pb-6 pt-4">
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Write a message"
          placeholderTextColor="#9CA3AF"
          className="mb-3 min-h-[48px] rounded-2xl border border-border px-4 py-3 text-base text-ink"
        />
        <View className="flex-row gap-3">
          <Pressable
            disabled={isUploading}
            onPress={uploadEvidence}
            className="h-14 w-14 items-center justify-center rounded-2xl border border-border"
          >
            {isUploading ? <ActivityIndicator color="#FF6400" /> : <Ionicons name="attach-outline" size={24} color="#FF6400" />}
          </Pressable>
          <Button title="Send message" onPress={sendMessage} loading={isSending} disabled={!message.trim()} className="flex-1" />
        </View>
      </View>
    </SafeAreaView>
  );
}
