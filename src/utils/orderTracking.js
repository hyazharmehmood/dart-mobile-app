const TERMINAL_STATUS_MARKERS = ["DELIVERED", "CANCELLED", "REFUNDED", "COMPLETED", "FAILED"];

export function normalizedOrderStatus(order) {
  return String(order?.statusCode || order?.status || "").toUpperCase();
}

export function isTerminalOrder(order) {
  const status = normalizedOrderStatus(order);
  return TERMINAL_STATUS_MARKERS.some((marker) => status.includes(marker));
}

export function isActiveOrder(order) {
  const status = normalizedOrderStatus(order);
  if (!status) {
    return false;
  }
  return !isTerminalOrder(order);
}

export function getTrackingPhase(order) {
  const status = normalizedOrderStatus(order);

  if (status.includes("CANCEL") || status.includes("FAIL") || status.includes("REFUND")) {
    return "CANCELLED";
  }

  if (status.includes("DELIVER")) {
    return "DELIVERED";
  }

  if (status.includes("PICKED_UP") || status.includes("ON_THE_WAY") || status.includes("ON THE WAY")) {
    return "ON_THE_WAY";
  }

  if (
    status.includes("ACCEPTED") ||
    status.includes("PREPAR") ||
    status.includes("READY") ||
    status.includes("PENDING")
  ) {
    return "PREPARING";
  }

  return "PREPARING";
}

export function trackingHeadline(order) {
  const phase = getTrackingPhase(order);

  if (phase === "ON_THE_WAY") {
    return order?.driverName && order.driverName !== "Unassigned"
      ? `${order.driverName} is on the way`
      : "Rider is on the way";
  }

  if (phase === "PREPARING") {
    const status = normalizedOrderStatus(order);
    if (status.includes("READY")) {
      return "Order is ready for pickup";
    }
    if (status.includes("ACCEPTED") || status.includes("PREPAR")) {
      return "Restaurant is preparing your order";
    }
    return "Waiting for restaurant confirmation";
  }

  if (phase === "DELIVERED") {
    return "Order delivered";
  }

  return "Order update";
}

export function trackingSubheadline(order) {
  return order?.restaurantName || order?.restaurant?.name || "Dart Restaurant";
}

export function hasDriverOnMap(order) {
  const phase = getTrackingPhase(order);
  const driver = getDriverLocation(order);
  return phase === "ON_THE_WAY" && Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude);
}

function readCoordinate(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function getPickupLocation(order) {
  const restaurant = order?.restaurant || order?.branch || {};
  const pickup = order?.pickup || restaurant?.location || {};

  return {
    latitude: readCoordinate(
      pickup.latitude,
      pickup.lat,
      restaurant.latitude,
      restaurant.lat,
      order?.pickupLatitude,
      order?.restaurantLatitude
    ),
    longitude: readCoordinate(
      pickup.longitude,
      pickup.lng,
      pickup.lon,
      restaurant.longitude,
      restaurant.lng,
      restaurant.lon,
      order?.pickupLongitude,
      order?.restaurantLongitude
    ),
    title: order?.restaurantName || restaurant?.name || "Restaurant",
    address: pickup.address || restaurant?.address || order?.pickupAddress || ""
  };
}

export function getDropoffLocation(order, fallbackAddress = null) {
  const dropoff = order?.dropoff || order?.delivery || {};

  return {
    latitude: readCoordinate(
      dropoff.latitude,
      dropoff.lat,
      order?.deliveryLatitude,
      order?.deliveryLat,
      fallbackAddress?.latitude
    ),
    longitude: readCoordinate(
      dropoff.longitude,
      dropoff.lng,
      dropoff.lon,
      order?.deliveryLongitude,
      order?.deliveryLng,
      fallbackAddress?.longitude
    ),
    title: "Your location",
    address: order?.deliveryAddress || dropoff.address || fallbackAddress?.address || ""
  };
}

export function getDriverLocation(order) {
  const driver = order?.driver || {};

  return {
    latitude: readCoordinate(driver.latitude, driver.lat, order?.driverLatitude),
    longitude: readCoordinate(driver.longitude, driver.lng, driver.lon, order?.driverLongitude),
    name: driver.name || order?.driverName || "Rider",
    phone: driver.phone || order?.driverPhone || null,
    heading: readCoordinate(driver.heading, order?.driverHeading)
  };
}

export function getMapCoordinates(order, fallbackAddress = null) {
  const pickup = getPickupLocation(order);
  const dropoff = getDropoffLocation(order, fallbackAddress);
  const driver = getDriverLocation(order);
  const points = [];

  if (Number.isFinite(pickup.latitude) && Number.isFinite(pickup.longitude)) {
    points.push(pickup);
  }

  if (Number.isFinite(dropoff.latitude) && Number.isFinite(dropoff.longitude)) {
    points.push(dropoff);
  }

  if (hasDriverOnMap(order) && Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude)) {
    points.push(driver);
  }

  return { pickup, dropoff, driver, points };
}

const WIDE_MAP_DELTA = 0.14;

export function isBeforeDriverPickup(order) {
  return getTrackingPhase(order) !== "ON_THE_WAY";
}

export function getTrackingMapCamera(order, fallbackAddress = null) {
  const { pickup, dropoff, driver } = getMapCoordinates(order, fallbackAddress);
  const beforePickup = isBeforeDriverPickup(order);
  const driverActive = hasDriverOnMap(order);

  if (!beforePickup || driverActive) {
    const fitPoints = [];

    if (Number.isFinite(pickup.latitude) && Number.isFinite(pickup.longitude)) {
      fitPoints.push(pickup);
    }

    if (driverActive && Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude)) {
      fitPoints.push(driver);
    }

    if (Number.isFinite(dropoff.latitude) && Number.isFinite(dropoff.longitude)) {
      fitPoints.push(dropoff);
    }

    return {
      beforePickup: false,
      showPickupMarker: true,
      showDropoffMarker: true,
      showDriverMarker: driverActive,
      fitPoints,
      region: getMapRegion(fitPoints, 2.6)
    };
  }

  if (Number.isFinite(pickup.latitude) && Number.isFinite(pickup.longitude)) {
    return {
      beforePickup: true,
      showPickupMarker: true,
      showDropoffMarker: false,
      showDriverMarker: false,
      fitPoints: [pickup],
      region: {
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        latitudeDelta: WIDE_MAP_DELTA,
        longitudeDelta: WIDE_MAP_DELTA
      }
    };
  }

  return {
    beforePickup: true,
    showPickupMarker: false,
    showDropoffMarker: false,
    showDriverMarker: false,
    fitPoints: [],
    region: {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.35,
      longitudeDelta: 0.35
    }
  };
}

export function getMapRegion(points, paddingFactor = 2.4) {
  const valid = (points || []).filter(
    (point) => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)
  );

  if (!valid.length) {
    return {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12
    };
  }

  if (valid.length === 1) {
    return {
      latitude: valid[0].latitude,
      longitude: valid[0].longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05
    };
  }

  const latitudes = valid.map((point) => point.latitude);
  const longitudes = valid.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latitudeDelta = Math.max((maxLat - minLat) * paddingFactor, 0.035);
  const longitudeDelta = Math.max((maxLng - minLng) * paddingFactor, 0.035);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta
  };
}

export const TRACKING_STEPS = [
  { key: "PLACED", label: "Order placed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "ON_THE_WAY", label: "On the way" },
  { key: "DELIVERED", label: "Delivered" }
];

export function trackingStepIndex(phase) {
  if (phase === "DELIVERED") {
    return 3;
  }
  if (phase === "ON_THE_WAY") {
    return 2;
  }
  if (phase === "PREPARING") {
    return 1;
  }
  return 0;
}
