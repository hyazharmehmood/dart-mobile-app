import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View
} from "react-native";
import * as Location from "expo-location";

import DeliveryMap from "../components/DeliveryMap";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import {
  getPlaceDetails,
  mapPlaceToDeliveryAddress,
  reverseGeocodeCoordinate,
  searchPlaces
} from "../services/googlePlacesService";
import useAddressStore, { defaultDeliveryAddress } from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";

function formatAddressSubtitle(address) {
  return [address?.city, address?.state, address?.country].filter(Boolean).join(", ");
}

function coordinateFallbackAddress({ latitude, longitude }) {
  return {
    ...defaultDeliveryAddress,
    address: "Selected map location",
    addressLine1: "Selected map location",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    latitude,
    longitude
  };
}

function regionFromAddress(address) {
  return {
    latitude: Number(address?.latitude) || defaultDeliveryAddress.latitude,
    longitude: Number(address?.longitude) || defaultDeliveryAddress.longitude,
    latitudeDelta: 0.018,
    longitudeDelta: 0.018
  };
}

export default function AddressScreen({ navigation, route }) {
  const currentAddress = useAddressStore((state) => state.address);
  const activeAddress = useAddressStore((state) => state.activeAddress);
  const hasUnsyncedAddress = useAddressStore((state) => state.hasUnsyncedAddress);
  const isChangingAddress = Boolean(route?.params?.returnToHome);
  const initialAddressText = currentAddress?.address || currentAddress?.addressLine1 || "";
  const hasSavedAddress = Boolean(
    (isChangingAddress || activeAddress || hasUnsyncedAddress) &&
      currentAddress?.latitude &&
      currentAddress?.longitude
  );
  const [address, setAddress] = useState(isChangingAddress ? initialAddressText : "");
  const [selectedAddress, setSelectedAddress] = useState(hasSavedAddress ? initialAddressText : "");
  const [selectedAddressDetails, setSelectedAddressDetails] = useState(hasSavedAddress ? currentAddress : null);
  const [suggestions, setSuggestions] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingMap, setIsResolvingMap] = useState(false);
  const [shouldOpenFeed, setShouldOpenFeed] = useState(false);
  const [region, setRegion] = useState(regionFromAddress(currentAddress));
  const { showToast } = useToast();
  const saveAddress = useAddressStore((state) => state.setAddress);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const isGuest = useAuthStore((state) => state.isGuest);
  const hasSelection = Boolean(selectedAddress);
  const showResults = isInputFocused && address.trim().length > 2 && !hasSelection;
  const canFindRestaurants = Boolean(selectedAddressDetails?.latitude && selectedAddressDetails?.longitude);

  const resetToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }]
    });
  };

  const finishAddressSelection = () => {
    if (isChangingAddress) {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }

      navigation.navigate("Home");
      return;
    }

    continueAsGuest();
    setShouldOpenFeed(true);
  };

  useEffect(() => {
    if (shouldOpenFeed && isGuest) {
      resetToHome();
    }
  }, [isGuest, shouldOpenFeed]);

  useEffect(() => {
    const loadLocation = async () => {
      if (hasSavedAddress) {
        setRegion(regionFromAddress(currentAddress));
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showToast({
          type: "error",
          title: "Location permission needed",
          message: "Allow location access or search your address manually."
        });
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      setRegion({
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      });
    };

    loadLocation();
  }, [currentAddress, hasSavedAddress, showToast]);

  useEffect(() => {
    if (!showResults || hasSelection) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchPlaces(address);
        setSuggestions(results);
      } catch (error) {
        setSuggestions([]);
        showToast({
          type: "error",
          title: "Address search failed",
          message: "Please try again in a moment."
        });
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [address, hasSelection, showResults, showToast]);

  const chooseManualAddress = async ({ shouldFinish = false } = {}) => {
    Keyboard.dismiss();
    setIsInputFocused(false);

    if (selectedAddressDetails) {
      if (shouldFinish) {
        finishAddressSelection();
      }
      return;
    }

    const manualAddress = {
      ...defaultDeliveryAddress,
      address,
      addressLine1: address,
      city: "",
      state: "",
      postalCode: "",
      country: "",
      latitude: region.latitude,
      longitude: region.longitude
    };

    await saveMapLocation({
      latitude: region.latitude,
      longitude: region.longitude
    }, manualAddress.address);

    if (shouldFinish) {
      finishAddressSelection();
    }
  };

  const useCurrentLocation = async () => {
    setIsResolvingMap(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showToast({
          type: "error",
          title: "Location permission needed",
          message: "Allow location access or select from the map."
        });
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      await saveMapLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      });
    } finally {
      setIsResolvingMap(false);
    }
  };

  const clearSearch = () => {
    setAddress("");
    setSelectedAddress("");
    setSelectedAddressDetails(null);
    setSuggestions([]);
  };

  const saveMapLocation = async (coordinate, fallbackLabel = "") => {
    const nextRegion = {
      ...region,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude
    };

    setRegion(nextRegion);
    setIsResolvingMap(true);

    try {
      const place = await reverseGeocodeCoordinate(coordinate);
      const deliveryAddress = place ? mapPlaceToDeliveryAddress(place) : {
        ...coordinateFallbackAddress(coordinate),
        address: fallbackLabel || "Selected map location",
        addressLine1: fallbackLabel || "Selected map location"
      };

      setAddress(deliveryAddress.address || deliveryAddress.addressLine1);
      setSelectedAddress(deliveryAddress.address || deliveryAddress.addressLine1);
      setSelectedAddressDetails(deliveryAddress);
      setSuggestions([]);
      saveAddress(deliveryAddress);
    } catch (error) {
      const fallbackAddress = coordinateFallbackAddress(coordinate);

      const fallbackLabelAddress = {
        ...fallbackAddress,
        address: fallbackLabel || fallbackAddress.address,
        addressLine1: fallbackLabel || fallbackAddress.addressLine1
      };

      setAddress(fallbackLabelAddress.address);
      setSelectedAddress(fallbackLabelAddress.address);
      setSelectedAddressDetails(fallbackLabelAddress);
      saveAddress(fallbackLabelAddress);
    } finally {
      setIsResolvingMap(false);
    }
  };

  const selectMapCenter = () => {
    saveMapLocation({
      latitude: region.latitude,
      longitude: region.longitude
    });
  };

  const handleMapPress = (event) => {
    const coordinate = event?.nativeEvent?.coordinate;

    if (!coordinate) {
      return;
    }

    saveMapLocation(coordinate);
  };

  const chooseGoogleAddress = async (prediction) => {
    Keyboard.dismiss();
    setIsInputFocused(false);

    try {
      const place = await getPlaceDetails(prediction.place_id);
      const deliveryAddress = mapPlaceToDeliveryAddress(place);

      setAddress(deliveryAddress.address || prediction.description);
      setSelectedAddress(deliveryAddress.address || prediction.description);
      setSelectedAddressDetails(deliveryAddress);
      setSuggestions([]);
      setRegion((currentRegion) => ({
        ...currentRegion,
        latitude: deliveryAddress.latitude,
        longitude: deliveryAddress.longitude
      }));
      saveAddress(deliveryAddress);
    } catch (error) {
      setAddress(prediction.description);
      setSelectedAddress(prediction.description);
      const fallbackAddress = {
        ...defaultDeliveryAddress,
        address: prediction.description,
        addressLine1: prediction.description,
        city: "",
        state: "",
        postalCode: "",
        country: "",
        latitude: region.latitude,
        longitude: region.longitude
      };
      setSelectedAddressDetails(fallbackAddress);
      saveAddress(fallbackAddress);
      showToast({
        type: "error",
        title: "Using selected address",
        message: "Google details were unavailable, so coordinates were kept from the map."
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <View className="flex-1">
        <DeliveryMap
          region={region}
          onRegionChangeComplete={setRegion}
          onMapPress={handleMapPress}
          className="flex-1"
        />
        <View
          className={`rounded-t-[28px] bg-white px-5 pb-5 pt-5 ${
            isInputFocused && !hasSelection ? "min-h-[800px]" : ""
          }`}
        >
            <Text className="mb-4 text-xl font-extrabold text-ink">What is your address</Text>
            {!hasSelection ? (
              <>
                <View className="h-12 flex-row items-center rounded-xl bg-[#F4F4F4] px-4">
                  <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 12 }} />
                    <TextInput
                      value={address}
                      onChangeText={(value) => {
                        setAddress(value);
                        setSelectedAddress("");
                        setSelectedAddressDetails(null);
                      }}
                      className="flex-1 text-base text-ink"
                      placeholder="Enter your address"
                      placeholderTextColor="#9CA3AF"
                    returnKeyType="search"
                    blurOnSubmit
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onSubmitEditing={() => {
                      if (address.trim()) {
                        chooseManualAddress();
                      }
                    }}
                  />
                  {address ? (
                    <Pressable onPress={clearSearch} className="ml-3 h-8 w-8 items-center justify-center rounded-full bg-white">
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable onPress={useCurrentLocation} className="mt-4 flex-row items-center">
                  <Ionicons name="locate-outline" size={20} color="#00A85A" style={{ marginRight: 12 }} />
                  <Text className="text-base font-semibold text-[#00A85A]">Use my current location</Text>
                  {isResolvingMap ? <ActivityIndicator className="ml-2" size="small" color="#00A85A" /> : null}
                </Pressable>
                {!isInputFocused && (
                  <>
                    <Pressable onPress={selectMapCenter} className="mt-4 flex-row items-center">
                      <Ionicons name="location-outline" size={20} color="#FF6400" style={{ marginRight: 12 }} />
                      <Text className="text-base font-semibold text-primary">
                        Select pinned location on map
                      </Text>
                    </Pressable>
                    {isResolvingMap && (
                      <Text className="mt-3 text-xs text-muted">Getting address from map...</Text>
                    )}
                    <Button
                      title="Find Restaurants"
                      disabled={!canFindRestaurants}
                      onPress={() => chooseManualAddress({ shouldFinish: true })}
                      className="mt-5"
                    />
                  </>
                )}
                {isInputFocused && (
                  <ScrollView
                    className="mt-5 flex-1"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {isSearching && (
                      <Text className="mb-5 text-sm text-muted">Searching Google addresses...</Text>
                    )}
                    {!isSearching && !suggestions.length && address.trim().length > 2 ? (
                      <Text className="mb-5 text-sm text-muted">No addresses found. Try a more complete address.</Text>
                    ) : null}
                    {suggestions.map((item) => (
                      <Pressable
                        key={item.place_id}
                        onPress={() => chooseGoogleAddress(item)}
                        className="mb-5 flex-row items-start rounded-2xl bg-white"
                      >
                        <View className="mr-4 h-7 w-7 items-center justify-center">
                          <Ionicons name="business-outline" size={22} color="#9E9E9E" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base leading-6 text-[#444444]" numberOfLines={2}>
                            {item.structured_formatting?.main_text || item.description}
                          </Text>
                          {item.structured_formatting?.secondary_text ? (
                            <Text className="mt-1 text-sm text-muted" numberOfLines={1}>
                              {item.structured_formatting.secondary_text}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View className="rounded-2xl bg-[#FFF0E5] px-4 py-4">
                  <View className="flex-row items-start">
                    <View className="flex-1 flex-row items-start pr-3">
                      <Ionicons name="location-outline" size={20} color="#1F2933" style={{ marginRight: 12 }} />
                      <View className="flex-1">
                        <Text className="text-base font-bold leading-5 text-ink" numberOfLines={2}>
                          {selectedAddress}
                        </Text>
                        {formatAddressSubtitle(selectedAddressDetails) ? (
                          <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
                            {formatAddressSubtitle(selectedAddressDetails)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Pressable
	                    onPress={() => {
	                        setSelectedAddress("");
	                        setSelectedAddressDetails(null);
	                        setIsInputFocused(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={22} color="#1F2933" />
                    </Pressable>
                  </View>
                </View>
                <View className="mt-3 rounded-xl bg-[#EAF3FF] px-4 py-3">
                  <Text className="text-xs leading-5 text-[#2F6BFF]">
                    your rider will deliver to the pinned location..
                  </Text>
                  <Text className="text-xs leading-5 text-[#2F6BFF]">
                    you can edit your written address on the settings
                  </Text>
                </View>
                <Button
                  title="Find Restaurant"
                  disabled={!canFindRestaurants}
                  onPress={finishAddressSelection}
                  className="mt-5"
                />
              </>
            )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
