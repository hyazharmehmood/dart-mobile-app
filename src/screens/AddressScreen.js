import { useEffect, useState } from "react";
import { Pressable, ScrollView, StatusBar, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";

import DeliveryMap from "../components/DeliveryMap";
import PrimaryButton from "../components/PrimaryButton";
import {
  getPlaceDetails,
  mapPlaceToDeliveryAddress,
  reverseGeocodeCoordinate,
  searchPlaces
} from "../services/googlePlacesService";
import useAddressStore, { defaultDeliveryAddress } from "../store/useAddressStore";

export default function AddressScreen({ navigation }) {
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingMap, setIsResolvingMap] = useState(false);
  const [region, setRegion] = useState({
    latitude: defaultDeliveryAddress.latitude,
    longitude: defaultDeliveryAddress.longitude,
    latitudeDelta: 0.018,
    longitudeDelta: 0.018
  });
  const saveAddress = useAddressStore((state) => state.setAddress);
  const hasSelection = Boolean(selectedAddress);
  const showResults = address.trim().length > 2;

  useEffect(() => {
    const loadLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      setRegion((currentRegion) => ({
        ...currentRegion,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      }));
    };

    loadLocation();
  }, []);

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
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [address, hasSelection, showResults]);

  const chooseManualAddress = () => {
    const manualAddress = {
      ...defaultDeliveryAddress,
      addressLine1: address,
      latitude: region.latitude,
      longitude: region.longitude
    };

    setSelectedAddress(manualAddress.addressLine1);
    saveAddress(manualAddress);
  };

  const useCurrentLocation = async () => {
    setIsResolvingMap(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
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

  const cancelSearch = () => {
    setAddress("");
    setSelectedAddress("");
    setSuggestions([]);
  };

  const saveMapLocation = async (coordinate) => {
    const nextRegion = {
      ...region,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude
    };

    setRegion(nextRegion);
    setIsResolvingMap(true);

    try {
      const place = await reverseGeocodeCoordinate(coordinate);
      const deliveryAddress = place
        ? mapPlaceToDeliveryAddress(place)
        : {
            ...defaultDeliveryAddress,
            addressLine1: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude
          };

      setAddress(deliveryAddress.addressLine1);
      setSelectedAddress(deliveryAddress.addressLine1);
      setSuggestions([]);
      saveAddress(deliveryAddress);
    } catch (error) {
      const fallbackAddress = {
        ...defaultDeliveryAddress,
        addressLine1: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude
      };

      setAddress(fallbackAddress.addressLine1);
      setSelectedAddress(fallbackAddress.addressLine1);
      saveAddress(fallbackAddress);
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
    saveMapLocation(event.nativeEvent.coordinate);
  };

  const chooseGoogleAddress = async (prediction) => {
    try {
      const place = await getPlaceDetails(prediction.place_id);
      const deliveryAddress = mapPlaceToDeliveryAddress(place);

      setAddress(deliveryAddress.addressLine1);
      setSelectedAddress(deliveryAddress.addressLine1);
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
      saveAddress({
        ...defaultDeliveryAddress,
        addressLine1: prediction.description,
        latitude: region.latitude,
        longitude: region.longitude
      });
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <View className="h-10 bg-primary" />

      {showResults && !hasSelection ? (
        <View className="flex-1 bg-white">
          <View className="px-5 pt-4">
            <View className="flex-row items-center">
              <View className="h-14 flex-1 flex-row items-center rounded-full border border-[#00A85A] bg-white px-4">
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  className="flex-1 text-base text-ink"
                  placeholder="Enter your addresss"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
              </View>
              <Pressable onPress={cancelSearch} className="ml-4">
                <Text className="text-base font-medium text-ink">Cancel</Text>
              </Pressable>
            </View>

            <Pressable onPress={useCurrentLocation} className="mt-7 flex-row items-center">
              <Text className="mr-4 text-2xl text-[#00A85A]">@</Text>
              <Text className="text-lg font-medium text-[#00A85A]">Use my current location</Text>
            </Pressable>

            <Pressable onPress={selectMapCenter} className="mt-4 flex-row items-center">
              <Text className="mr-3 text-lg text-primary">@</Text>
              <Text className="text-base font-semibold text-primary">
                Select pinned location on map
              </Text>
            </Pressable>

            {isResolvingMap && (
              <Text className="mt-3 text-xs text-muted">Getting address from map...</Text>
            )}

            {isSearching && (
              <Text className="mt-6 text-sm text-muted">Searching Google addresses...</Text>
            )}

            {!isSearching && suggestions.length === 0 && (
              <Text className="mt-6 text-sm text-muted">
                No Google address found. Try a more complete address.
              </Text>
            )}

            <ScrollView className="mt-6" keyboardShouldPersistTaps="handled">
              {suggestions.map((item) => (
                <Pressable
                  key={item.place_id}
                  onPress={() => chooseGoogleAddress(item)}
                  className="mb-7 flex-row items-start bg-white"
                >
                  <View className="mr-4 h-7 w-7 items-center justify-center">
                    <Text className="text-2xl text-[#9E9E9E]">⌂</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg leading-7 text-[#444444]" numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <DeliveryMap
            region={region}
            onRegionChangeComplete={setRegion}
            onMapPress={handleMapPress}
            className="flex-1"
          />
          <View className="rounded-t-[28px] bg-white px-5 pb-5 pt-5">
            <Text className="mb-4 text-xl font-extrabold text-ink">What is your address</Text>
            {!hasSelection ? (
              <>
                <View className="h-12 flex-row items-center rounded-xl bg-[#F4F4F4] px-4">
                  <Text className="mr-3 text-lg text-muted">Q</Text>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    className="flex-1 text-base text-ink"
                    placeholder="Enter your addresss"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <Pressable onPress={useCurrentLocation} className="mt-4 flex-row items-center">
                  <Text className="mr-3 text-lg text-ink">@</Text>
                  <Text className="text-base text-ink">Used my current location</Text>
                </Pressable>
                <Pressable onPress={selectMapCenter} className="mt-4 flex-row items-center">
                  <Text className="mr-3 text-lg text-primary">@</Text>
                  <Text className="text-base font-semibold text-primary">
                    Select pinned location on map
                  </Text>
                </Pressable>
                {isResolvingMap && (
                  <Text className="mt-3 text-xs text-muted">Getting address from map...</Text>
                )}
                <Pressable
                  disabled={!address.trim()}
                  onPress={chooseManualAddress}
                  className={`mt-5 h-14 items-center justify-center rounded-2xl ${
                    address.trim() ? "bg-primary" : "bg-[#E5E5E5]"
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      address.trim() ? "text-white" : "text-[#A8A8A8]"
                    }`}
                  >
                    Find Restaurants
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View className="rounded-2xl bg-[#FFF0E5] px-4 py-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-start">
                      <Text className="mr-3 text-lg text-ink">@</Text>
                      <View>
                        <Text className="text-base font-bold text-ink">{selectedAddress}</Text>
                        <Text className="text-xs text-muted">Singapore</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => setSelectedAddress("")}>
                      <Text className="text-xl text-ink">/</Text>
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
                <PrimaryButton
                  title="Find Restaurant"
                  onPress={() => navigation.navigate("Login")}
                  className="mt-5"
                />
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
