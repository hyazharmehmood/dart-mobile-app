import { useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";

import DeliveryMap from "../components/DeliveryMap";
import GoogleAddressSearch from "../components/GoogleAddressSearch";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useToast } from "../components/ui/ToastProvider";
import { getCustomerAddress } from "../services/addressService";
import {
  getPlaceDetails,
  mapPlaceToDeliveryAddress,
  reverseGeocodeCoordinate,
  searchPlaces
} from "../services/googlePlacesService";
import useAddressStore, { defaultDeliveryAddress } from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";
import { ADDRESS_LABEL_OPTIONS } from "../utils/addressLabels";

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
  const { height } = useWindowDimensions();
  const screenMode = route?.params?.mode || null;
  const editingAddressId = route?.params?.addressId || null;
  const currentAddress = useAddressStore((state) => state.address);
  const activeAddress = useAddressStore((state) => state.activeAddress);
  const hasUnsyncedAddress = useAddressStore((state) => state.hasUnsyncedAddress);
  const isChangingAddress = Boolean(route?.params?.returnToHome);
  const isGuest = useAuthStore((state) => state.isGuest);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = Boolean(user && !isGuest);
  const shouldPersistAddress = isAuthenticated && (screenMode === "add" || screenMode === "edit");
  const initialAddressText = currentAddress?.address || currentAddress?.addressLine1 || "";
  const hasSavedAddress = Boolean(
    (isChangingAddress || activeAddress || hasUnsyncedAddress || screenMode === "edit") &&
      currentAddress?.latitude &&
      currentAddress?.longitude
  );
  const [address, setAddress] = useState(isChangingAddress || screenMode === "edit" ? initialAddressText : "");
  const [selectedAddress, setSelectedAddress] = useState(hasSavedAddress ? initialAddressText : "");
  const [selectedAddressDetails, setSelectedAddressDetails] = useState(
    screenMode === "edit" ? null : hasSavedAddress ? currentAddress : null
  );
  const [addressLabel, setAddressLabel] = useState(currentAddress?.label || "Home");
  const [customLabel, setCustomLabel] = useState("");
  const [isLoadingEditAddress, setIsLoadingEditAddress] = useState(screenMode === "edit");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [hasSearchedAddress, setHasSearchedAddress] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingMap, setIsResolvingMap] = useState(false);
  const [shouldOpenFeed, setShouldOpenFeed] = useState(false);
  const [region, setRegion] = useState(regionFromAddress(currentAddress));
  const addressInputRef = useRef(null);
  const { showToast } = useToast();
  const saveAddress = useAddressStore((state) => state.setAddress);
  const createSavedAddress = useAddressStore((state) => state.createSavedAddress);
  const updateSavedAddress = useAddressStore((state) => state.updateSavedAddress);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const hasSelection = Boolean(selectedAddress);
  const showResults = isInputFocused && address.trim().length > 2 && !hasSelection;
  const canFindRestaurants = Boolean(selectedAddressDetails?.latitude && selectedAddressDetails?.longitude);
  const isSearchPanelOpen = isInputFocused && !hasSelection;
  const focusedSheetHeight = Math.min(Math.max(height * 0.72, 470), height - 86);
  const suggestionListMaxHeight = Math.max(focusedSheetHeight - 165, 260);
  const resolvedLabel =
    addressLabel === "Other" ? customLabel.trim() || "Other" : addressLabel;
  const screenTitle =
    screenMode === "edit" ? "Edit address" : screenMode === "add" ? "Add new address" : "What is your address";
  const confirmButtonTitle =
    screenMode === "edit"
      ? "Save address"
      : screenMode === "add"
        ? "Save address"
        : isChangingAddress
          ? "Use this address"
          : "Find Restaurant";

  const resetToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }]
    });
  };

  const finishAddressSelection = async () => {
    if (shouldPersistAddress && selectedAddressDetails) {
      try {
        setIsSavingAddress(true);
        const payload = {
          ...selectedAddressDetails,
          label: resolvedLabel
        };

        if (screenMode === "edit" && editingAddressId) {
          await updateSavedAddress(editingAddressId, payload, { label: resolvedLabel });
        } else {
          await createSavedAddress(payload, { label: resolvedLabel, makeActive: true });
        }

        showToast({
          type: "success",
          title: screenMode === "edit" ? "Address updated" : "Address saved",
          message: "Your delivery location is ready."
        });
      } catch (error) {
        showToast({
          type: "error",
          title: "Address not saved",
          message: error?.response?.data?.error || error?.message || "Please try again."
        });
        return;
      } finally {
        setIsSavingAddress(false);
      }
    } else if (selectedAddressDetails) {
      saveAddress(selectedAddressDetails);
    }

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
    if (screenMode !== "edit" || !editingAddressId) {
      return;
    }

    let active = true;

    const loadEditingAddress = async () => {
      try {
        setIsLoadingEditAddress(true);
        const data = await getCustomerAddress(editingAddressId);
        const loadedAddress = data?.address || data;
        if (!active || !loadedAddress) {
          return;
        }

        const normalized = {
          ...loadedAddress,
          address: loadedAddress.address || loadedAddress.addressLine1
        };

        setAddress(normalized.address || normalized.addressLine1 || "");
        setSelectedAddress(normalized.address || normalized.addressLine1 || "");
        setSelectedAddressDetails(normalized);
        setAddressLabel(normalized.label || "Home");
        setCustomLabel(
          ADDRESS_LABEL_OPTIONS.includes(normalized.label) ? "" : normalized.label || ""
        );
        setRegion(regionFromAddress(normalized));
        saveAddress(normalized, { unsynced: false });
      } catch (error) {
        showToast({
          type: "error",
          title: "Address unavailable",
          message: error?.response?.data?.error || error?.message || "Could not load this address."
        });
        navigation.goBack();
      } finally {
        if (active) {
          setIsLoadingEditAddress(false);
        }
      }
    };

    loadEditingAddress();

    return () => {
      active = false;
    };
  }, [editingAddressId, navigation, saveAddress, screenMode, showToast]);

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

      try {
        const current = await Location.getCurrentPositionAsync({});
        setRegion({
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
          latitude: current.coords.latitude,
          longitude: current.coords.longitude
        });
      } catch (error) {
        showToast({
          type: "error",
          title: "Location unavailable",
          message: "Search your address manually or choose a pin on the map."
        });
      }
    };

    loadLocation();
  }, [currentAddress, hasSavedAddress, showToast]);

  useEffect(() => {
    if (!showResults || hasSelection) {
      setSuggestions([]);
      setHasSearchedAddress(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setHasSearchedAddress(false);

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(address);
        setSuggestions(results);
        setHasSearchedAddress(true);
      } catch (error) {
        setSuggestions([]);
        setHasSearchedAddress(true);
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
        await finishAddressSelection();
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
      await finishAddressSelection();
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
    } catch (error) {
      showToast({
        type: "error",
        title: "Location unavailable",
        message: "We could not get your current location. Try search or select on the map."
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
    setHasSearchedAddress(false);
  };

  const mergeEditingAddress = (nextAddress) => {
    if (screenMode !== "edit" || !editingAddressId) {
      return nextAddress;
    }

    return {
      ...nextAddress,
      id: editingAddressId,
      label: resolvedLabel
    };
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
      const deliveryAddress = mergeEditingAddress(
        place ? mapPlaceToDeliveryAddress(place) : {
          ...coordinateFallbackAddress(coordinate),
          address: fallbackLabel || "Selected map location",
          addressLine1: fallbackLabel || "Selected map location"
        }
      );

      setAddress(deliveryAddress.address || deliveryAddress.addressLine1);
      setSelectedAddress(deliveryAddress.address || deliveryAddress.addressLine1);
      setSelectedAddressDetails(deliveryAddress);
      setSuggestions([]);
      setHasSearchedAddress(false);
      saveAddress(deliveryAddress);
    } catch (error) {
      const fallbackAddress = coordinateFallbackAddress(coordinate);

      const fallbackLabelAddress = mergeEditingAddress({
        ...fallbackAddress,
        address: fallbackLabel || fallbackAddress.address,
        addressLine1: fallbackLabel || fallbackAddress.addressLine1
      });

      setAddress(fallbackLabelAddress.address);
      setSelectedAddress(fallbackLabelAddress.address);
      setSelectedAddressDetails(fallbackLabelAddress);
      setSuggestions([]);
      setHasSearchedAddress(false);
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

  const editSelectedAddress = () => {
    setSelectedAddress("");
    setSelectedAddressDetails(null);
    setSuggestions([]);
    setHasSearchedAddress(false);
    setIsInputFocused(true);
    requestAnimationFrame(() => {
      addressInputRef.current?.focus();
    });
  };

  const chooseGoogleAddress = async (prediction) => {
    Keyboard.dismiss();
    setIsInputFocused(false);

    try {
      const place = await getPlaceDetails(prediction.place_id);
      const deliveryAddress = mergeEditingAddress(mapPlaceToDeliveryAddress(place));

      setAddress(deliveryAddress.address || prediction.description);
      setSelectedAddress(deliveryAddress.address || prediction.description);
      setSelectedAddressDetails(deliveryAddress);
      setSuggestions([]);
      setHasSearchedAddress(false);
      setRegion((currentRegion) => ({
        ...currentRegion,
        latitude: deliveryAddress.latitude,
        longitude: deliveryAddress.longitude
      }));
      saveAddress(deliveryAddress);
    } catch (error) {
      setAddress(prediction.description);
      setSelectedAddress(prediction.description);
      const fallbackAddress = mergeEditingAddress({
        ...defaultDeliveryAddress,
        address: prediction.description,
        addressLine1: prediction.description,
        city: "",
        state: "",
        postalCode: "",
        country: "",
        latitude: region.latitude,
        longitude: region.longitude
      });
      setSelectedAddressDetails(fallbackAddress);
      setSuggestions([]);
      setHasSearchedAddress(false);
      saveAddress(fallbackAddress);
      showToast({
        type: "error",
        title: "Using selected address",
        message: "Google details were unavailable, so coordinates were kept from the map."
      });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <SafeAreaView className="flex-1 bg-primary" edges={["top"]}>
        <View className="flex-1 bg-white">
        {isLoadingEditAddress ? (
          <View className="flex-1 items-center justify-center bg-white">
            <ActivityIndicator color="#FF6400" size="large" />
            <Text className="mt-3 text-sm font-semibold text-muted">Loading address...</Text>
          </View>
        ) : (
          <>
        <DeliveryMap
          region={region}
          onRegionChangeComplete={setRegion}
          onMapPress={handleMapPress}
          className="flex-1"
        />
        <View
          className="rounded-t-[28px] bg-white px-5 pb-5 pt-5"
          style={isSearchPanelOpen ? { height: focusedSheetHeight } : undefined}
        >
            <Text className="mb-4 text-[20px] font-extrabold text-ink">{screenTitle}</Text>
            {!hasSelection ? (
              <>
                <GoogleAddressSearch
                  ref={addressInputRef}
                  value={address}
                  suggestions={suggestions}
                  isFocused={isInputFocused}
                  hasSearched={hasSearchedAddress}
                  isSearching={isSearching}
                  isResolvingLocation={isResolvingMap}
                  maxResultsHeight={suggestionListMaxHeight}
                  onChangeText={(value) => {
                    setAddress(value);
                    setSelectedAddress("");
                    setSelectedAddressDetails(null);
                    setHasSearchedAddress(false);
                  }}
                  onClear={clearSearch}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    setTimeout(() => setIsInputFocused(false), 120);
                  }}
                  onSubmit={() => chooseManualAddress()}
                  onUseCurrentLocation={useCurrentLocation}
                  onSelectMapCenter={selectMapCenter}
                  onSelectSuggestion={chooseGoogleAddress}
                />
                {!isInputFocused && (
                  <>
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
                    <Pressable onPress={editSelectedAddress} className="h-9 w-9 items-center justify-center rounded-full bg-white/70">
                      <Ionicons name="create-outline" size={22} color="#1F2933" />
                    </Pressable>
                  </View>
                </View>
                {shouldPersistAddress ? (
                  <View className="mt-4">
                    <Text className="mb-2 text-sm font-bold text-ink">Save as</Text>
                    <View className="flex-row flex-wrap">
                      {ADDRESS_LABEL_OPTIONS.map((label) => {
                        const active = addressLabel === label;

                        return (
                          <Pressable
                            key={label}
                            onPress={() => setAddressLabel(label)}
                            className={`mb-2 mr-2 rounded-full border px-4 py-2 ${
                              active ? "border-primary bg-[#FFF8F3]" : "border-border bg-white"
                            }`}
                          >
                            <Text className={`text-sm font-bold ${active ? "text-primary" : "text-ink"}`}>{label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {addressLabel === "Other" ? (
                      <TextField
                        label="Custom label"
                        value={customLabel}
                        onChangeText={setCustomLabel}
                        placeholder="e.g. Parents, Gym"
                        autoCapitalize="words"
                        className="mb-0 mt-2"
                      />
                    ) : null}
                  </View>
                ) : null}
                <View className="mt-3 rounded-xl bg-[#EAF3FF] px-4 py-3">
                  <Text className="text-xs leading-5 text-[#2F6BFF]">
                    Your rider will deliver to the pinned location.
                  </Text>
                  {shouldPersistAddress ? (
                    <Text className="text-xs leading-5 text-[#2F6BFF]">
                      You can manage all saved addresses from your account.
                    </Text>
                  ) : (
                    <Text className="text-xs leading-5 text-[#2F6BFF]">
                      Sign in to save multiple delivery addresses.
                    </Text>
                  )}
                </View>
                <Button
                  title={confirmButtonTitle}
                  disabled={!canFindRestaurants}
                  loading={isSavingAddress}
                  onPress={finishAddressSelection}
                  className="mt-5"
                />
              </>
            )}
        </View>
          </>
        )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
