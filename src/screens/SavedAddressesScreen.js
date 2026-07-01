import { useCallback, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SavedAddressList from "../components/SavedAddressList";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import useAddressStore from "../store/useAddressStore";

export default function SavedAddressesScreen({ navigation }) {
  const { showToast } = useToast();
  const savedAddresses = useAddressStore((state) => state.savedAddresses);
  const activeAddress = useAddressStore((state) => state.activeAddress);
  const isLoading = useAddressStore((state) => state.isLoading);
  const loadAddresses = useAddressStore((state) => state.loadAddresses);
  const activateAddress = useAddressStore((state) => state.activateAddress);
  const deleteAddress = useAddressStore((state) => state.deleteAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAddresses().catch(() => null);
    }, [loadAddresses])
  );

  const handleSelect = async (address) => {
    if (address.id === activeAddress?.id) {
      return;
    }

    try {
      setIsSubmitting(true);
      await activateAddress(address);
      showToast({ type: "success", title: "Address updated", message: "Your delivery location was changed." });
    } catch (error) {
      showToast({
        type: "error",
        title: "Could not switch address",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (address) => {
    try {
      setIsSubmitting(true);
      await deleteAddress(address.id);
      showToast({ type: "success", title: "Address deleted", message: "The address was removed." });
    } catch (error) {
      showToast({
        type: "error",
        title: "Delete failed",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <Text className="text-xl font-bold text-ink">Saved addresses</Text>
            <Text className="mt-0.5 text-sm text-muted">Manage your delivery locations</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 bg-[#F7F8FA]" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <SavedAddressList
          addresses={savedAddresses}
          activeAddressId={activeAddress?.id}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          onSelect={handleSelect}
          onEdit={(address) =>
            navigation.navigate("Address", {
              mode: "edit",
              addressId: address.id,
              returnToHome: true
            })
          }
          onDelete={handleDelete}
        />

        <Button
          title="Add new address"
          onPress={() => navigation.navigate("Address", { mode: "add", returnToHome: true })}
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
