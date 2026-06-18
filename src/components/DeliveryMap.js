import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { StyleSheet, Text, View } from "react-native";

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
  return (
    <View className={`overflow-hidden ${className}`}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={onMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
      </MapView>
      {showCenterPin && (
        <View className="pointer-events-none absolute left-1/2 top-1/2 -ml-5 -mt-10 items-center">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary shadow-md">
            <Text className="text-lg font-bold text-white">@</Text>
          </View>
          <View className="h-4 w-1 rounded-full bg-primary" />
        </View>
      )}
    </View>
  );
}
