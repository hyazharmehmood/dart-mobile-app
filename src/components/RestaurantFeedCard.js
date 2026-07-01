import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, Text, View } from "react-native";

import { getRestaurantImageUrl, getRestaurantName, normalizeRestaurantRecord } from "../utils/restaurantDisplay";

export { getRestaurantImageUrl, getRestaurantName } from "../utils/restaurantDisplay";

function formatReviewCount(count) {
  if (!count) {
    return "";
  }

  if (count >= 1000) {
    const value = count / 1000;
    return `(${Number.isInteger(value) ? value : value.toFixed(1).replace(".0", "")}k+)`;
  }

  return `(${count})`;
}

function cuisineLine(restaurant) {
  if (Array.isArray(restaurant?.cuisines) && restaurant.cuisines.length) {
    return restaurant.cuisines.join(", ");
  }

  return restaurant?.cuisine || "Restaurant";
}

function priceLevelLabel(restaurant) {
  return restaurant?.priceLevel || restaurant?.priceRange || "₱₱";
}

function promoLabel(restaurant) {
  return (
    restaurant?.promoLabel ||
    restaurant?.promotion?.label ||
    restaurant?.discountLabel ||
    restaurant?.offerLabel ||
    null
  );
}

function deliveryFeeLine(restaurant) {
  if (restaurant?.deliveryFeeLabel) {
    return restaurant.deliveryFeeLabel;
  }

  if (restaurant?.deliveryFee !== undefined && restaurant?.deliveryFee !== null) {
    const fee =
      typeof restaurant.deliveryFee === "number"
        ? restaurant.deliveryFee.toFixed(2)
        : String(restaurant.deliveryFee).replace(/^₱\s*/i, "");

    return `from ₱${fee} with saver`;
  }

  return null;
}

export default function RestaurantFeedCard({
  restaurant,
  compact = false,
  favorite = false,
  onFavoritePress,
  onPress
}) {
  const displayRestaurant = normalizeRestaurantRecord(restaurant);
  const imageUrl = getRestaurantImageUrl(displayRestaurant);
  const name = getRestaurantName(displayRestaurant);
  const rating = displayRestaurant?.rating;
  const reviewSuffix = formatReviewCount(displayRestaurant?.reviewCount);
  const promo = promoLabel(displayRestaurant);
  const feeLine = deliveryFeeLine(displayRestaurant);

  return (
    <Pressable
      onPress={onPress}
      className={`${compact ? "mr-4 w-80" : "mb-5 w-full"} overflow-hidden rounded-2xl bg-white`}
    >
      <View className={`${compact ? "h-36" : "h-44"} overflow-hidden rounded-2xl bg-[#F6F6F6]`}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center bg-[#EEF0F2]">
            <Ionicons name="restaurant-outline" size={34} color="#9CA3AF" />
          </View>
        )}
        <Pressable
          onPress={(event) => {
            event?.stopPropagation?.();
            onFavoritePress?.(restaurant);
          }}
          className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <Ionicons name={favorite ? "heart" : "heart-outline"} size={22} color={favorite ? "#FF6400" : "#1F2933"} />
        </Pressable>
      </View>

      <View className="pt-3">
        <View className="flex-row items-start justify-between">
          <Text className="mr-3 flex-1 text-base font-extrabold text-ink" numberOfLines={2}>
            {name}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#F5B400" />
            <Text className="ml-1 text-xs font-semibold text-ink">
              {rating || "New"}
              {reviewSuffix ? ` ${reviewSuffix}` : ""}
            </Text>
          </View>
        </View>

        <Text className="mt-1.5 text-xs text-muted" numberOfLines={1}>
          {displayRestaurant?.deliveryEta || "20-35 min"} · {priceLevelLabel(displayRestaurant)} · {cuisineLine(displayRestaurant)}
        </Text>

        {feeLine ? (
          <View className="mt-1 flex-row items-center">
            <Ionicons name="bicycle-outline" size={13} color="#6B7280" />
            <Text className="ml-1 text-xs text-muted" numberOfLines={1}>
              {feeLine}
            </Text>
          </View>
        ) : null}

        {promo ? (
          <View className="mt-2.5 flex-row items-center self-start rounded-md bg-[#FFE8E8] px-2.5 py-1">
            <Ionicons name="pricetag-outline" size={12} color="#E52626" />
            <Text className="ml-1 text-xs font-semibold text-[#E52626]">{promo}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
