import { useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import useAddressStore from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";
import useFeedStore from "../store/useFeedStore";
import useNotificationStore from "../store/useNotificationStore";

const DARK_GREEN = "#003F2D";

function getImageUrl(item) {
  return (
    item?.coverImageUrl ||
    item?.logoUrl ||
    item?.imageUrl ||
    item?.photoUrls?.[0] ||
    null
  );
}

function getName(item, fallback = "Restaurant") {
  if (typeof item === "string") {
    return item;
  }

  return item?.name || item?.label || item?.title || fallback;
}

function CuisinePill({ cuisine, index }) {
  const label = typeof cuisine === "string" ? cuisine : cuisine?.label || cuisine?.name || "Food";
  const imageUrl = cuisine?.imageUrl || cuisine?.iconUrl || null;

  return (
    <Pressable className="mr-4 w-16 items-center">
      <View className="h-14 w-14 overflow-hidden rounded-full bg-[#F6F6F6] shadow-sm">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center bg-[#F1F2F4]">
            <Text className="text-lg font-extrabold text-primary">{label.slice(0, 1)}</Text>
          </View>
        )}
      </View>
      <Text className="mt-2 text-center text-xs text-ink" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function SkeletonBlock({ className = "" }) {
  return <View className={`bg-[#EEF0F2] ${className}`} />;
}

function CuisineSkeletonRow() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <View key={item} className="mr-4 w-16 items-center">
          <SkeletonBlock className="h-14 w-14 rounded-full" />
          <SkeletonBlock className="mt-2 h-3 w-12 rounded-full" />
        </View>
      ))}
    </ScrollView>
  );
}

function RestaurantCardSkeleton({ compact = false }) {
  return (
    <View className={`${compact ? "mr-4 w-80" : "mb-5 w-full"}`}>
      <SkeletonBlock className={`${compact ? "h-36" : "h-44"} rounded-2xl`} />
      <SkeletonBlock className="mt-3 h-4 w-3/4 rounded-full" />
      <SkeletonBlock className="mt-2 h-3 w-1/2 rounded-full" />
      <SkeletonBlock className="mt-2 h-3 w-1/3 rounded-full" />
    </View>
  );
}

function BrandSkeletonRow() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 24 }}>
      {[0, 1, 2, 3, 4].map((item) => (
        <View key={item} className="mr-5 w-16 items-center">
          <SkeletonBlock className="h-14 w-14 rounded-full" />
          <SkeletonBlock className="mt-2 h-3 w-12 rounded-full" />
        </View>
      ))}
    </ScrollView>
  );
}

function EmptySection({ message }) {
  return (
    <View className="rounded-2xl bg-[#F6F7F8] px-4 py-5">
      <Text className="text-sm font-semibold text-muted">{message}</Text>
    </View>
  );
}

function RestaurantCard({ restaurant, compact = false, onPress }) {
  const imageUrl = getImageUrl(restaurant);

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
        <View className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
          <Ionicons name="heart-outline" size={21} color="#1F2933" />
        </View>
      </View>
      <View className="pt-3">
        <View className="flex-row items-start justify-between">
          <Text className="mr-3 flex-1 text-base font-bold text-ink" numberOfLines={1}>
            {getName(restaurant)}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#F5B400" />
            <Text className="ml-1 text-xs text-ink">
              {restaurant?.rating || "New"} {restaurant?.reviewCount ? `(${restaurant.reviewCount})` : ""}
            </Text>
          </View>
        </View>
        <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
          {restaurant?.deliveryEta || "Delivery"} · ₱₱ · {restaurant?.cuisine || restaurant?.cuisines?.join(", ") || "Restaurant"}
        </Text>
        {restaurant?.deliveryFee ? (
          <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
            from ₱{restaurant.deliveryFee} with saver
          </Text>
        ) : null}
        <View className="mt-2 self-start rounded-full bg-[#FFE8E8] px-2 py-1">
          <Text className="text-xs font-semibold text-[#E52626]">20% Off</Text>
        </View>
      </View>
    </Pressable>
  );
}

function BrandBubble({ brand, index }) {
  const brandName = getName(brand, "Brand");

  return (
    <Pressable className="mr-5 w-16 items-center">
      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
        {brand?.logoUrl || brand?.imageUrl ? (
          <Image source={{ uri: brand.logoUrl || brand.imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <Text className="text-xl font-extrabold text-primary">{brandName.slice(0, 1)}</Text>
        )}
      </View>
      <Text className="mt-2 text-center text-xs text-ink" numberOfLines={1}>
        {brandName}
      </Text>
    </Pressable>
  );
}

function BottomNav({ activeTab, onTabPress }) {
  const items = [
    { key: "food", label: "Food", icon: "restaurant-outline" },
    { key: "search", label: "Search", icon: "search-outline" },
    { key: "cart", label: "Carts", icon: "basket-outline" },
    { key: "account", label: "Account", icon: "person-outline" }
  ];

  return (
    <View className="absolute bottom-5 left-5 right-5 flex-row items-center justify-between rounded-full bg-white px-4 py-3 shadow-lg">
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onTabPress(item.key)}
          className={`min-w-[64px] items-center rounded-full px-3 py-2 ${activeTab === item.key ? "bg-[#FFE5D6]" : ""}`}
        >
          <Ionicons name={item.icon} size={22} color={activeTab === item.key ? "#FF6400" : "#9E9E9E"} />
          <Text className={`mt-1 text-xs ${activeTab === item.key ? "font-semibold text-primary" : "text-[#9E9E9E]"}`}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AccountRow({ icon, iconColor = "#6B7280", title, badge, onPress }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center border-b border-border py-5 active:opacity-80">
      <View className="mr-5 h-9 w-9 items-center justify-center rounded-full bg-surface">
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text className="flex-1 text-base font-semibold text-ink">{title}</Text>
      {badge ? (
        <View className="mr-2 min-w-[24px] items-center rounded-full bg-primary px-2 py-1">
          <Text className="text-xs font-bold text-white">{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={22} color="#6B7280" />
    </Pressable>
  );
}

function GuestAccountView({ onLoginPress }) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-6 pb-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[22px] font-extrabold text-ink">Account</Text>
          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-surface">
            <Ionicons name="settings-outline" size={25} color="#FF6400" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 118 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-8">
          <Text className="text-[18px] font-semibold leading text-ink">
            Here's 50% off & free delivery on your first order!
          </Text>
          <Button
            title="Sign up or Log in"
            onPress={onLoginPress}
            className="mt-8 h-16 rounded-2xl"
            textClassName="text-lg font-extrabold"
          />

          <Text className="mt-8 text-[18px] font-semibold text-ink">Perks for you</Text>
          <View className="mt-2">
            <AccountRow icon="diamond" iconColor="#FF6400" title="Become a pro" />
          </View>

          <Text className="mt-6 text-[18px] font-semibold text-ink">General</Text>
          <View className="mt-2">
            <AccountRow icon="help-circle-outline" title="Help center" />
            <AccountRow icon="business-outline" title="foodpanda for business" />
            <AccountRow icon="document-text-outline" title="Terms & policies" />
          </View>

          <Text className="mt-7 text-center text-base font-medium text-muted">
            Version 26.23.1
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomerAccountView({ profile, user, unreadCount, onLogout, onNotificationsPress, onOrdersPress }) {
  const displayName =
    profile?.name ||
    user?.name ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    "Dart customer";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-6 pb-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[22px] font-extrabold text-ink">Account</Text>
          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-surface">
            <Ionicons name="settings-outline" size={25} color="#FF6400" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 118 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8">
          <View className="rounded-2xl bg-[#FFF0E5] px-5 py-5">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
              <Ionicons name="person" size={28} color="#FFFFFF" />
            </View>
            <Text className="mt-4 text-xl font-bold text-ink">{displayName}</Text>
            <Text className="mt-1 text-sm text-muted">{user?.email || profile?.email || "Customer account"}</Text>
          </View>

          <Text className="mt-8 text-[18px] font-semibold text-ink">General</Text>
          <View className="mt-2">
            <AccountRow icon="receipt-outline" title="Orders" onPress={onOrdersPress} />
            <AccountRow
              icon="notifications-outline"
              title="Notifications"
              badge={unreadCount || null}
              onPress={onNotificationsPress}
            />
            <AccountRow icon="help-circle-outline" title="Help center" />
            <AccountRow icon="document-text-outline" title="Terms & policies" />
          </View>

          <Pressable onPress={onLogout} className="mt-8 h-14 items-center justify-center rounded-2xl bg-primary">
            <Text className="text-base font-bold text-white">Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeedView({
  cuisineItems,
  error,
  isLoading,
  locationLabel,
  nearbyItems,
  orderItems,
  brandItems,
  refreshFeed,
  searchInputRef,
  searchQuery,
  onSearchChange,
  onLocationPress,
  onRestaurantPress
}) {
  const isSearchMode = searchQuery.trim().length > 0;
  const showSearchSkeleton = isSearchMode && isLoading;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={DARK_GREEN} />
      <View className="px-6 pb-10 pt-3" style={{ backgroundColor: DARK_GREEN }}>
        <View className="mb-6 flex-row items-center justify-between">
          <Pressable onPress={onLocationPress} className="mr-4 flex-1 flex-row items-center rounded-full active:opacity-80">
            <Ionicons name="location-outline" size={18} color="#FFFFFF" />
            <Text className="ml-2 flex-1 text-base font-semibold text-white" numberOfLines={1}>
              {locationLabel}
            </Text>
          </Pressable>
          <Pressable className="h-10 w-10 items-center justify-center rounded-full">
            <Ionicons name="heart-outline" size={29} color="#FFFFFF" />
          </Pressable>
        </View>
        <Pressable
          onPress={() => searchInputRef.current?.focus()}
          className="h-14 flex-row items-center rounded-full bg-white px-5"
        >
          <Ionicons name="search-outline" size={23} color="#8B8B8B" />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search for restaurants"
            placeholderTextColor="#777777"
            returnKeyType="search"
            className="ml-3 flex-1 text-lg text-ink"
          />
          {searchQuery ? (
            <Pressable onPress={() => onSearchChange("")} className="h-8 w-8 items-center justify-center">
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        className="-mt-5 flex-1 rounded-t-[28px] bg-white"
        contentContainerStyle={{ paddingBottom: 118 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshFeed} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-5">
          {isLoading && !cuisineItems.length ? (
            <CuisineSkeletonRow />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
              {cuisineItems.map((cuisine, index) => (
                <CuisinePill
                  key={`${cuisine?.id || cuisine?.slug || cuisine?.name || cuisine}-${index}`}
                  cuisine={cuisine}
                  index={index}
                />
              ))}
            </ScrollView>
          )}

          {error ? (
            <View className="mt-6 rounded-2xl bg-red-50 px-4 py-3">
              <Text className="text-sm font-semibold text-red-600">{error}</Text>
            </View>
          ) : null}

          {!isSearchMode ? <Text className="mt-6 text-xl font-semibold text-black">Order again</Text> : null}
          {!isSearchMode && isLoading && !orderItems.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 24 }}>
              {[0, 1].map((item) => (
                <RestaurantCardSkeleton key={item} compact />
              ))}
            </ScrollView>
          ) : !isSearchMode && orderItems.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {orderItems.map((restaurant, index) => (
                <RestaurantCard
                  key={restaurant.id || restaurant.slug || restaurant.name || index}
                  restaurant={restaurant}
                  compact
                  onPress={() => onRestaurantPress(restaurant)}
                />
              ))}
            </ScrollView>
          ) : !isSearchMode ? (
            <View className="mt-3">
              <EmptySection message="No previous orders yet." />
            </View>
          ) : null}

          {!isSearchMode ? <Text className="mt-7 text-xl font-semibold text-black">Brand</Text> : null}
          {!isSearchMode && isLoading && !brandItems.length ? (
            <BrandSkeletonRow />
          ) : !isSearchMode && brandItems.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 24 }}>
              {brandItems.map((brand, index) => (
                <BrandBubble key={`${brand?.id || brand?.slug || brand?.name || brand}-${index}`} brand={brand} index={index} />
              ))}
            </ScrollView>
          ) : !isSearchMode ? (
            <View className="mt-3">
              <EmptySection message="No brands available near this location." />
            </View>
          ) : null}

          <Text className="mt-7 text-xl font-semibold text-black">
            {isSearchMode ? "Search results" : "Explore restaurants nearby"}
          </Text>
          <View className="mt-3">
            {showSearchSkeleton || (isLoading && !nearbyItems.length) ? (
              [0, 1, 2].map((item) => <RestaurantCardSkeleton key={item} />)
            ) : nearbyItems.length ? (
              nearbyItems.map((restaurant, index) => (
                <RestaurantCard
                  key={restaurant.id || restaurant.slug || restaurant.name || index}
                  restaurant={restaurant}
                  onPress={() => onRestaurantPress(restaurant)}
                />
              ))
            ) : (
              <EmptySection message="No restaurants found for this address." />
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("food");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isGuest = useAuthStore((state) => state.isGuest);
  const logout = useAuthStore((state) => state.logout);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const address = useAddressStore((state) => state.address);
  const cuisines = useFeedStore((state) => state.cuisines);
  const topBrands = useFeedStore((state) => state.topBrands);
  const orderAgain = useFeedStore((state) => state.orderAgain);
  const restaurants = useFeedStore((state) => state.restaurants);
  const isLoading = useFeedStore((state) => state.isLoading);
  const error = useFeedStore((state) => state.error);
  const loadHomeFeed = useFeedStore((state) => state.loadHomeFeed);

  const cuisineItems = cuisines;
  const brandItems = topBrands.length ? topBrands : restaurants.slice(0, 6);
  const orderItems = orderAgain;
  const nearbyItems = searchQuery.trim() ? restaurants : restaurants.length ? restaurants : topBrands;
  const locationLabel = address?.addressLine1 || address?.address || "75 Ayer Raja Crescent";

  const openRestaurant = (restaurant) => {
    navigation.navigate("RestaurantDetail", {
      slug: restaurant?.slug || restaurant?.id,
      restaurant
    });
  };

  const refreshFeed = () => {
    loadHomeFeed({
      address,
      authenticated: Boolean(user && !isGuest),
      q: searchQuery,
      force: true
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHomeFeed({
        address,
        authenticated: Boolean(user && !isGuest),
        q: searchQuery
      });
    }, searchQuery.trim() ? 350 : 0);

    return () => clearTimeout(timer);
  }, [address?.latitude, address?.longitude, isGuest, loadHomeFeed, searchQuery, user]);

  const handleTabPress = (tab) => {
    if (tab === "search") {
      setActiveTab("search");
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return;
    }

    if (tab === "cart") {
      navigation.navigate("Cart");
      return;
    }

    setActiveTab(tab);
  };

  const handleLogout = async () => {
    await logout({ asGuest: true });
  };

  return (
    <View className="flex-1 bg-white">
      {activeTab === "account" ? (
        user ? (
          <CustomerAccountView
            profile={profile}
            user={user}
            unreadCount={unreadCount}
            onLogout={handleLogout}
            onNotificationsPress={() => navigation.navigate("Notifications")}
            onOrdersPress={() => navigation.navigate("Orders")}
          />
        ) : (
          <GuestAccountView onLoginPress={() => navigation.navigate("Login")} />
        )
      ) : (
        <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: DARK_GREEN }}>
          <View className="flex-1 bg-white">
            <FeedView
              cuisineItems={cuisineItems}
              error={error}
              isLoading={isLoading}
              locationLabel={locationLabel}
              nearbyItems={nearbyItems}
              orderItems={orderItems}
              brandItems={brandItems}
              refreshFeed={refreshFeed}
              searchInputRef={searchInputRef}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onLocationPress={() => navigation.navigate("Address", { returnToHome: true })}
              onRestaurantPress={openRestaurant}
            />
          </View>
        </SafeAreaView>
      )}

      <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
