import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SavedAddressList from "./SavedAddressList";

export default function AddressPickerSheet({
  visible,
  addresses = [],
  activeAddressId = null,
  isLoading = false,
  isSubmitting = false,
  onClose,
  onSelect,
  onEdit,
  onDelete,
  onAddNew
}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="max-h-[82%] w-full overflow-hidden rounded-t-[30px] bg-white pt-4"
          style={{ paddingBottom: bottomPadding }}
        >
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
          </View>

          <View className="mb-4 flex-row items-center justify-between px-5">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-xl font-extrabold text-ink">Delivery address</Text>
              <Text className="mt-1 text-sm font-medium text-muted">Choose where your order should go</Text>
            </View>
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
              <Ionicons name="close" size={22} color="#1F2933" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <SavedAddressList
              addresses={addresses}
              activeAddressId={activeAddressId}
              isLoading={isLoading}
              isSubmitting={isSubmitting}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </ScrollView>

          <View className="border-t border-[#F1F2F4] px-5 pt-4">
            <Pressable
              disabled={isSubmitting}
              onPress={onAddNew}
              className="h-14 flex-row items-center justify-center rounded-2xl bg-primary active:opacity-90"
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
              <Text className="ml-2 text-base font-extrabold text-white">Add new address</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
