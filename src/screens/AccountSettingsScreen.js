import { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Pressable, ScrollView, StatusBar, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../services/api";
import { getNotificationPreferences, updateNotificationPreferences } from "../services/mobilePushService";
import { updateCustomerProfile } from "../services/profileService";
import { uploadCustomerImage } from "../services/uploadService";
import useAuthStore from "../store/useAuthStore";
import { profileFirstName, profileImageUrl, profileLastName } from "../utils/profileDisplay";

const PREFERENCE_ROWS = [
  { key: "pushEnabled", label: "Push notifications" },
  { key: "ordersEnabled", label: "Order updates" },
  { key: "deliveryEnabled", label: "Delivery updates" },
  { key: "paymentsEnabled", label: "Payment updates" },
  { key: "accountEnabled", label: "Account updates" }
];

const DEFAULT_PREFERENCES = {
  pushEnabled: true,
  ordersEnabled: true,
  deliveryEnabled: true,
  paymentsEnabled: true,
  accountEnabled: true
};

function profileNameParts(profile, user) {
  return {
    firstName: profileFirstName(profile, user),
    lastName: profileLastName(profile, user)
  };
}

export default function AccountSettingsScreen({ navigation }) {
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const nameParts = useMemo(() => profileNameParts(profile, user), [profile, user]);
  const [firstName, setFirstName] = useState(nameParts.firstName);
  const [lastName, setLastName] = useState(nameParts.lastName);
  const [phone, setPhone] = useState(profile?.phone || user?.phone || "");
  const [imageUrl, setImageUrl] = useState(() => profileImageUrl(profile, user));
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    setFirstName(nameParts.firstName);
    setLastName(nameParts.lastName);
    setPhone(profile?.phone || user?.phone || "");
    setImageUrl(profileImageUrl(profile, user));
  }, [nameParts.firstName, nameParts.lastName, profile, user]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoadingPreferences(true);
        const data = await getNotificationPreferences();
        const next = data?.preferences || data || {};
        if (active) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...next });
        }
      } catch (error) {
        if (active) {
          showToast({
            type: "error",
            title: "Preferences unavailable",
            message: error?.response?.data?.error || error?.message || "Please try again later."
          });
        }
      } finally {
        if (active) {
          setIsLoadingPreferences(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [showToast]);

  const saveProfile = async () => {
    try {
      setIsSavingProfile(true);
      await updateCustomerProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        imageUrl: imageUrl || undefined
      });
      await refreshProfile().catch(() => null);
      showToast({ type: "success", title: "Profile updated", message: "Your account details were saved." });
    } catch (error) {
      showToast({
        type: "error",
        title: "Profile update failed",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showToast({ type: "error", title: "Permission required", message: "Allow photo access to upload a profile image." });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      ...(ImagePicker.UIImagePickerPreferredAssetRepresentationMode
        ? {
            preferredAssetRepresentationMode:
              ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible
          }
        : {})
    });

    const asset = result?.assets?.[0];

    if (result.canceled || !asset?.uri) {
      return;
    }

    try {
      setIsUploadingImage(true);
      const upload = await uploadCustomerImage({
        uri: asset.uri,
        name: asset.fileName,
        type: asset.mimeType
      });
      const nextUrl = upload.url;

      setImageUrl(nextUrl);
      await updateCustomerProfile({ imageUrl: nextUrl, image: nextUrl });
      await refreshProfile().catch(() => null);
      showToast({ type: "success", title: "Image uploaded", message: "Your profile image was updated." });
    } catch (error) {
      showToast({
        type: "error",
        title: "Upload failed",
        message: getApiErrorMessage(error, "Please try another image.")
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const togglePreference = async (key) => {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(nextPreferences);

    try {
      const data = await updateNotificationPreferences(nextPreferences);
      setPreferences({ ...nextPreferences, ...(data?.preferences || data || {}) });
    } catch (error) {
      setPreferences(preferences);
      showToast({
        type: "error",
        title: "Preference not saved",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
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
            <Text className="text-xl font-bold text-ink">Account settings</Text>
            <Text className="mt-0.5 text-sm text-muted">Profile and notification preferences</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 bg-[#F7F8FA]" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="rounded-[24px] bg-white px-5 py-5 shadow-sm">
          <Pressable
            onPress={pickProfileImage}
            disabled={isUploadingImage}
            className="items-center active:opacity-85"
          >
            <View className="relative h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#FFF0E5]">
              {imageUrl ? (
                <Image key={imageUrl} source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={42} color="#FF6400" />
              )}
              {isUploadingImage ? (
                <View className="absolute inset-0 items-center justify-center bg-black/30">
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <Text className="mt-3 text-sm font-bold text-primary">Change photo</Text>
          </Pressable>

          <View className="mt-5 flex-row gap-4">
            <TextField label="First name" value={firstName} onChangeText={setFirstName} className="flex-1" autoCapitalize="words" />
            <TextField label="Last name" value={lastName} onChangeText={setLastName} className="flex-1" autoCapitalize="words" />
          </View>
          <TextField label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          <Button title="Save profile" onPress={saveProfile} loading={isSavingProfile} />
        </View>

        <View className="mt-5 rounded-[24px] bg-white px-5 py-5 shadow-sm">
          <Text className="mb-3 text-lg font-extrabold text-ink">Delivery</Text>
          <Pressable
            onPress={() => navigation.navigate("SavedAddresses")}
            className="flex-row items-center justify-between rounded-2xl border border-[#EEF0F2] px-4 py-4 active:opacity-85"
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#FFF0E5]">
                <Ionicons name="location-outline" size={20} color="#FF6400" />
              </View>
              <View>
                <Text className="text-base font-bold text-ink">Saved addresses</Text>
                <Text className="mt-0.5 text-sm text-muted">Add, edit, or switch delivery locations</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>
        </View>

        <View className="mt-5 rounded-[24px] bg-white px-5 py-5 shadow-sm">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-ink">Notifications</Text>
            {isLoadingPreferences ? <ActivityIndicator color="#FF6400" /> : null}
          </View>
          {PREFERENCE_ROWS.map((row) => (
            <View key={row.key} className="flex-row items-center justify-between border-b border-[#F1F2F4] py-3 last:border-b-0">
              <Text className="text-base font-semibold text-ink">{row.label}</Text>
              <Switch
                value={Boolean(preferences[row.key])}
                onValueChange={() => togglePreference(row.key)}
                trackColor={{ false: "#E5E7EB", true: "#FFD8C5" }}
                thumbColor={preferences[row.key] ? "#FF6400" : "#FFFFFF"}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
