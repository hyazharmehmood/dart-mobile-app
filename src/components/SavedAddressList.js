import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { addressDisplayLine, addressLabelIcon, addressSubtitleLine } from "../utils/addressLabels";

function AddressRow({ address, active, disabled, onPress, onEdit, onDelete }) {
  const label = address?.label || "Address";

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onPress(address)}
      className={`mb-3 flex-row items-start rounded-2xl border px-4 py-4 active:opacity-85 ${
        active ? "border-primary bg-[#FFF8F3]" : "border-border bg-white"
      }`}
    >
      <View
        className={`mr-3 h-11 w-11 items-center justify-center rounded-full ${
          active ? "bg-primary" : "bg-[#F6F7F8]"
        }`}
      >
        <Ionicons name={addressLabelIcon(label)} size={20} color={active ? "#FFFFFF" : "#1F2933"} />
      </View>

      <View className="min-w-0 flex-1 pr-2">
        <View className="flex-row items-center">
          <Text className="text-sm font-extrabold text-ink">{label}</Text>
          {active ? (
            <View className="ml-2 rounded-full bg-primary px-2 py-0.5">
              <Text className="text-[10px] font-bold text-white">Active</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-1 text-sm font-semibold leading-5 text-ink" numberOfLines={2}>
          {addressDisplayLine(address)}
        </Text>
        {addressSubtitleLine(address) ? (
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {addressSubtitleLine(address)}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center">
        {onEdit ? (
          <Pressable
            disabled={disabled}
            onPress={() => onEdit(address)}
            className="mr-1 h-9 w-9 items-center justify-center rounded-full bg-[#F6F7F8]"
          >
            <Ionicons name="create-outline" size={18} color="#1F2933" />
          </Pressable>
        ) : null}
        {onDelete && address?.id ? (
          <Pressable
            disabled={disabled}
            onPress={() => onDelete(address)}
            className="h-9 w-9 items-center justify-center rounded-full bg-[#F6F7F8]"
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SavedAddressList({
  addresses = [],
  activeAddressId = null,
  isLoading = false,
  isSubmitting = false,
  emptyTitle = "No saved addresses",
  emptyMessage = "Add a delivery address to order faster next time.",
  onSelect,
  onEdit,
  onDelete
}) {
  if (isLoading) {
    return (
      <View className="items-center justify-center py-12">
        <ActivityIndicator color="#FF6400" />
        <Text className="mt-3 text-sm font-semibold text-muted">Loading addresses...</Text>
      </View>
    );
  }

  if (!addresses.length) {
    return (
      <View className="items-center rounded-2xl bg-[#F6F7F8] px-5 py-10">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
          <Ionicons name="location-outline" size={26} color="#FF6400" />
        </View>
        <Text className="mt-4 text-center text-base font-extrabold text-ink">{emptyTitle}</Text>
        <Text className="mt-1 text-center text-sm text-muted">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View>
      {addresses.map((address) => (
        <AddressRow
          key={address.id || `${address.latitude}-${address.longitude}-${address.label}`}
          address={address}
          active={Boolean(activeAddressId && address.id === activeAddressId)}
          disabled={isSubmitting}
          onPress={onSelect}
          onEdit={onEdit}
          onDelete={
            onDelete
              ? (item) => {
                  Alert.alert("Delete address", `Remove ${item.label || "this address"}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => onDelete(item) }
                  ]);
                }
              : null
          }
        />
      ))}
    </View>
  );
}
