import { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, RefreshControl, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import RestaurantFeedCard from "../components/RestaurantFeedCard";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import useFavoriteStore from "../store/useFavoriteStore";

export default function FavoritesScreen({ navigation }) {
  const { showToast } = useToast();
  const favorites = useFavoriteStore((state) => state.favorites);
  const isLoading = useFavoriteStore((state) => state.isLoading);
  const loadFavorites = useFavoriteStore((state) => state.loadFavorites);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);

  const refresh = () => {
    loadFavorites().catch((error) => {
      showToast({
        type: "error",
        title: "Favorites unavailable",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const openRestaurant = (favorite) => {
    navigation.navigate("RestaurantDetail", {
      slug: favorite.slug || favorite.restaurantSlug || favorite.restaurantId || favorite.id,
      restaurant: favorite
    });
  };

  const handleFavoritePress = async (restaurant) => {
    try {
      await toggleFavorite(restaurant);
    } catch (error) {
      showToast({
        type: "error",
        title: "Could not update favorite",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border px-5 pb-4 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-xl font-extrabold text-ink">Favourites</Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        {favorites.length ? (
          favorites.map((favorite) => (
            <RestaurantFeedCard
              key={favorite.id || favorite.restaurantId || favorite.slug}
              restaurant={favorite}
              favorite
              onFavoritePress={handleFavoritePress}
              onPress={() => openRestaurant(favorite)}
            />
          ))
        ) : (
          <View className="mt-20 items-center rounded-[26px] bg-[#F7F8FA] px-6 py-8">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-[#FFF4ED]">
              <Ionicons name="heart-outline" size={38} color="#FF6400" />
            </View>
            <Text className="mt-5 text-xl font-extrabold text-ink">No favourites yet</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">
              Tap hearts on restaurants to save them here with full details.
            </Text>
            <Button title="Browse restaurants" onPress={() => navigation.navigate("Home")} className="mt-6 w-full" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
