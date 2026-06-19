import { useEffect, useRef } from "react";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const fallbackRegion = {
  latitude: 24.8607,
  longitude: 67.0011,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};

export default function DeliveryMap({
  region = fallbackRegion,
  onRegionChangeComplete,
  onMapPress,
  className = "",
  showCenterPin = true
}) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!region?.latitude || !region?.longitude) {
      return;
    }

    mapRef.current?.animateToRegion(region, 280);
  }, [region?.latitude, region?.longitude]);

  const handleCoordinatePress = (event) => {
    const coordinate = event?.nativeEvent?.coordinate;

    if (!coordinate) {
      return;
    }

    onMapPress?.({
      nativeEvent: {
        coordinate
      }
    });
  };

  return (
    <View className={`overflow-hidden ${className}`}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={handleCoordinatePress}
        onLongPress={handleCoordinatePress}
        onPoiClick={handleCoordinatePress}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      />
      {showCenterPin && (
        <View className="pointer-events-none absolute left-1/2 top-1/2 -ml-5 -mt-10 items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Ionicons name="location" size={22} color="#FFFFFF" />
            </View>
          </View>
          <View className="-mt-1 h-5 w-1 rounded-full bg-primary" />
        </View>
      )}
    </View>
  );
}
