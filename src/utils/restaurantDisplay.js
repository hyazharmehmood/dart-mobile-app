export function normalizeRestaurantRecord(record) {
  if (!record || typeof record !== "object") {
    return record;
  }

  const nested = record.restaurant || record.branch || {};
  const restaurantId =
    record.restaurantId || nested.id || record.id || nested.restaurantId || null;

  return {
    ...nested,
    ...record,
    restaurantId,
    id: restaurantId || record.id || nested.id,
    slug: record.slug || nested.slug || record.restaurantSlug || nested.restaurantSlug || null,
    name: record.name || nested.name || record.restaurantName || nested.restaurantName || null,
    logoUrl: record.logoUrl || nested.logoUrl || record.logo || nested.logo || null,
    coverImageUrl:
      record.coverImageUrl ||
      nested.coverImageUrl ||
      record.coverImage ||
      nested.coverImage ||
      null,
    imageUrl: record.imageUrl || nested.imageUrl || record.image || nested.image || null,
    photoUrls: record.photoUrls || nested.photoUrls || record.photos || nested.photos || [],
    rating: record.rating ?? nested.rating,
    reviewCount: record.reviewCount ?? nested.reviewCount,
    deliveryEta: record.deliveryEta || nested.deliveryEta,
    deliveryFee: record.deliveryFee ?? nested.deliveryFee,
    deliveryFeeLabel: record.deliveryFeeLabel || nested.deliveryFeeLabel,
    priceLevel: record.priceLevel || nested.priceLevel || record.priceRange || nested.priceRange,
    cuisine: record.cuisine || nested.cuisine,
    cuisines: record.cuisines || nested.cuisines,
    promoLabel: record.promoLabel || nested.promoLabel,
    promotion: record.promotion || nested.promotion,
    discountLabel: record.discountLabel || nested.discountLabel
  };
}

export function getRestaurantImageUrl(restaurant) {
  const normalized = normalizeRestaurantRecord(restaurant);

  return (
    normalized?.coverImageUrl ||
    normalized?.logoUrl ||
    normalized?.imageUrl ||
    normalized?.thumbnailUrl ||
    normalized?.photoUrls?.[0] ||
    normalized?.photos?.[0] ||
    null
  );
}

export function getRestaurantName(restaurant, fallback = "Restaurant") {
  if (typeof restaurant === "string") {
    return restaurant;
  }

  const normalized = normalizeRestaurantRecord(restaurant);

  return normalized?.name || normalized?.label || normalized?.title || fallback;
}

export function favoriteKey(favorite) {
  return favorite?.restaurantId || favorite?.id || favorite?.slug || null;
}

export function mergeRestaurantRecords(primary, fallback) {
  if (!fallback) {
    return normalizeRestaurantRecord(primary);
  }

  const normalizedPrimary = normalizeRestaurantRecord(primary);
  const normalizedFallback = normalizeRestaurantRecord(fallback);

  return normalizeRestaurantRecord({
    ...normalizedFallback,
    ...normalizedPrimary,
    logoUrl: normalizedPrimary.logoUrl || normalizedFallback.logoUrl,
    coverImageUrl: normalizedPrimary.coverImageUrl || normalizedFallback.coverImageUrl,
    imageUrl: normalizedPrimary.imageUrl || normalizedFallback.imageUrl,
    photoUrls: normalizedPrimary.photoUrls?.length
      ? normalizedPrimary.photoUrls
      : normalizedFallback.photoUrls,
    rating: normalizedPrimary.rating ?? normalizedFallback.rating,
    reviewCount: normalizedPrimary.reviewCount ?? normalizedFallback.reviewCount,
    deliveryEta: normalizedPrimary.deliveryEta || normalizedFallback.deliveryEta,
    deliveryFee: normalizedPrimary.deliveryFee ?? normalizedFallback.deliveryFee,
    deliveryFeeLabel: normalizedPrimary.deliveryFeeLabel || normalizedFallback.deliveryFeeLabel,
    priceLevel: normalizedPrimary.priceLevel || normalizedFallback.priceLevel,
    cuisine: normalizedPrimary.cuisine || normalizedFallback.cuisine,
    cuisines: normalizedPrimary.cuisines || normalizedFallback.cuisines,
    promoLabel: normalizedPrimary.promoLabel || normalizedFallback.promoLabel,
    promotion: normalizedPrimary.promotion || normalizedFallback.promotion,
    discountLabel: normalizedPrimary.discountLabel || normalizedFallback.discountLabel
  });
}
