import axios from "axios";

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const placesClient = axios.create({
  baseURL: "https://maps.googleapis.com/maps/api/place",
  timeout: 10000
});

export async function searchPlaces(input) {
  if (!googleMapsApiKey || input.trim().length < 3) {
    return [];
  }

  const response = await placesClient.get("/autocomplete/json", {
    params: {
      input,
      key: googleMapsApiKey,
      components: "country:pk",
      types: "address"
    }
  });

  return response.data.predictions || [];
}

export async function getPlaceDetails(placeId) {
  if (!googleMapsApiKey || !placeId) {
    return null;
  }

  const response = await placesClient.get("/details/json", {
    params: {
      place_id: placeId,
      key: googleMapsApiKey,
      fields: "formatted_address,address_components,geometry"
    }
  });

  return response.data.result || null;
}

export async function reverseGeocodeCoordinate({ latitude, longitude }) {
  if (!googleMapsApiKey) {
    return null;
  }

  const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
    timeout: 10000,
    params: {
      latlng: `${latitude},${longitude}`,
      key: googleMapsApiKey
    }
  });

  return response.data.results?.[0] || null;
}

export function mapPlaceToDeliveryAddress(place) {
  const components = place?.address_components || [];
  const findComponent = (type) =>
    components.find((component) => component.types.includes(type))?.long_name || "";

  return {
    addressLine1: place?.formatted_address || "",
    addressLine2: "",
    city:
      findComponent("locality") ||
      findComponent("administrative_area_level_2") ||
      "Karachi",
    state: findComponent("administrative_area_level_1") || "Sindh",
    postalCode: findComponent("postal_code") || "74000",
    country: findComponent("country") || "PK",
    latitude: place?.geometry?.location?.lat || 24.8607,
    longitude: place?.geometry?.location?.lng || 67.0011,
    deliveryRadiusKm: 5
  };
}
