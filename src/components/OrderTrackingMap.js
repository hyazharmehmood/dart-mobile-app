import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getMapCoordinates, getTrackingMapCamera, hasDriverOnMap } from "../utils/orderTracking";

function MarkerBubble({ color, icon }) {
  return (
    <View className="items-center">
      <View
        className="h-11 w-11 items-center justify-center rounded-full border-2 border-white shadow-md"
        style={{ backgroundColor: color }}
      >
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View className="-mt-1 h-3 w-1 rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
}

export default function OrderTrackingMap({ order, fallbackAddress, className = "" }) {
  const mapRef = useRef(null);
  const { pickup, dropoff, driver } = useMemo(
    () => getMapCoordinates(order, fallbackAddress),
    [order, fallbackAddress]
  );
  const camera = useMemo(() => getTrackingMapCamera(order, fallbackAddress), [order, fallbackAddress]);

  const routeCoordinates = useMemo(() => {
    if (camera.beforePickup) {
      return [];
    }

    const coords = [];

    if (Number.isFinite(pickup.latitude) && Number.isFinite(pickup.longitude)) {
      coords.push({ latitude: pickup.latitude, longitude: pickup.longitude });
    }

    if (hasDriverOnMap(order) && Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude)) {
      coords.push({ latitude: driver.latitude, longitude: driver.longitude });
    }

    if (Number.isFinite(dropoff.latitude) && Number.isFinite(dropoff.longitude)) {
      coords.push({ latitude: dropoff.latitude, longitude: dropoff.longitude });
    }

    return coords;
  }, [camera.beforePickup, order, pickup, dropoff, driver]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (camera.beforePickup) {
      mapRef.current.animateToRegion(camera.region, 280);
      return;
    }

    if (!camera.fitPoints.length) {
      mapRef.current.animateToRegion(camera.region, 280);
      return;
    }

    mapRef.current.fitToCoordinates(
      camera.fitPoints.map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
      {
        edgePadding: { top: 96, right: 96, bottom: 96, left: 96 },
        animated: true
      }
    );
  }, [camera, order?.id, order?.statusCode, driver.latitude, driver.longitude]);

  return (
    <View className={`overflow-hidden ${className}`}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={camera.region}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {camera.showPickupMarker && Number.isFinite(pickup.latitude) && Number.isFinite(pickup.longitude) ? (
          <Marker
            coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
            title={pickup.title}
            description={pickup.address}
          >
            <MarkerBubble color="#FF6400" icon="restaurant" />
          </Marker>
        ) : null}

        {camera.showDropoffMarker && Number.isFinite(dropoff.latitude) && Number.isFinite(dropoff.longitude) ? (
          <Marker
            coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
            title={dropoff.title}
            description={dropoff.address}
          >
            <MarkerBubble color="#003F2D" icon="home" />
          </Marker>
        ) : null}

        {camera.showDriverMarker && hasDriverOnMap(order) && Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude) ? (
          <Marker
            coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
            title={driver.name}
            rotation={driver.heading || 0}
          >
            <MarkerBubble color="#00A85A" icon="bicycle" />
          </Marker>
        ) : null}

        {routeCoordinates.length >= 2 ? (
          <Polyline coordinates={routeCoordinates} strokeColor="#FF6400" strokeWidth={4} />
        ) : null}
      </MapView>
    </View>
  );
}
