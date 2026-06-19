import { useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { getRestaurantMenu } from "../services/restaurantService";
import useCartStore from "../store/useCartStore";

function money(value = 0) {
  const amount = Number(value) || 0;
  return `₱${amount.toFixed(amount % 1 ? 2 : 0)}`;
}

function currencyLabel(label, fallbackValue = 0) {
  if (!label) {
    return money(fallbackValue);
  }

  return String(label).replace(/^Rs\.?\s*/i, "₱").replace(/^\$\s*/, "₱");
}

function getRestaurantImage(restaurant) {
  return restaurant?.coverImageUrl || restaurant?.photoUrls?.[0] || null;
}

function getItemImage(item) {
  return item?.imageUrl || item?.photoUrls?.[0] || null;
}

function normalizeCategories(restaurant) {
  const categories = restaurant?.menu?.categories || [];

  if (categories.length) {
    return categories.map((category, index) => ({
      id: category.id || category.slug || category.name || `category-${index}`,
      name: category.name || category.title || "Popular",
      items: category.items || []
    }));
  }

  const featuredItems = restaurant?.featuredItems || restaurant?.menu?.featuredItems || [];

  return featuredItems.length
    ? [
        {
          id: "featured",
          name: "Featured",
          items: featuredItems
        }
      ]
    : [];
}

function SkeletonBlock({ className = "" }) {
  return <View className={`bg-[#EEF0F2] ${className}`} />;
}

function MenuSkeletonGrid() {
  return (
    <View className="mt-6">
      <SkeletonBlock className="mb-4 h-6 w-32 rounded-full" />
      <View className="flex-row flex-wrap justify-between">
        {[0, 1, 2, 3].map((item) => (
          <View key={item} className="mb-5 w-[48%]">
            <SkeletonBlock className="h-40 rounded-2xl" />
            <SkeletonBlock className="mt-2 h-4 w-4/5 rounded-full" />
            <SkeletonBlock className="mt-2 h-3 w-1/2 rounded-full" />
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyMenu() {
  return (
    <View className="mt-8 rounded-2xl bg-[#F6F7F8] px-4 py-6">
      <Text className="text-center text-base font-semibold text-muted">No menu items available right now.</Text>
    </View>
  );
}

function requiredGroups(item) {
  return (item?.modifierGroups || []).filter((group) => group.isRequired || group.minSelections > 0);
}

function hasModifiers(item) {
  return (item?.modifierGroups || []).length > 0;
}

function MenuItemCard({ item, cartSummary, isExpanded, isAdding, onAdd, onCountPress, onQuantityChange }) {
  const cartQuantity = cartSummary?.quantity || 0;
  const hasCartQuantity = cartQuantity > 0;
  const itemHasModifiers = hasModifiers(item);

  return (
    <View className="mb-5 w-[48%]">
      <View className="overflow-hidden rounded-2xl bg-[#F7F7F7]">
        {getItemImage(item) ? (
          <Image source={{ uri: getItemImage(item) }} className="h-40 w-full" resizeMode="cover" />
        ) : (
          <View className="h-40 w-full items-center justify-center bg-[#EEF0F2]">
            <Ionicons name="fast-food-outline" size={30} color="#9CA3AF" />
          </View>
        )}
        {hasCartQuantity && !isExpanded ? (
          <Pressable
            onPress={() => onCountPress(item)}
            className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-ink shadow-md"
          >
            <Text className="text-base font-extrabold text-white">{cartQuantity}</Text>
          </Pressable>
        ) : null}

        {hasCartQuantity && isExpanded && !itemHasModifiers ? (
          <View className="absolute bottom-3 right-3 h-10 flex-row items-center rounded-full border border-[#E5E7EB] bg-white shadow-md">
            <Pressable
              onPress={() => onQuantityChange(cartSummary.index, cartQuantity - 1)}
              className="h-10 w-10 items-center justify-center"
            >
              <Ionicons name={cartQuantity <= 1 ? "trash-outline" : "remove"} size={19} color="#1F2933" />
            </Pressable>
            <View className="h-6 min-w-[28px] items-center justify-center rounded-full bg-[#FFF0E5] px-2">
              <Text className="text-sm font-extrabold text-primary">{cartQuantity}</Text>
            </View>
            <Pressable
              onPress={() => onQuantityChange(cartSummary.index, cartQuantity + 1)}
              className="h-10 w-10 items-center justify-center"
            >
              <Ionicons name="add" size={21} color="#FF6400" />
            </Pressable>
          </View>
        ) : null}

        {!hasCartQuantity ? (
          <Pressable
            disabled={isAdding}
            onPress={() => onAdd(item)}
            className={`absolute bottom-3 right-3 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ${
              isAdding ? "opacity-50" : ""
            }`}
          >
            <Ionicons name="add" size={24} color="#1F2933" />
          </Pressable>
        ) : null}
      </View>
      <Text className="mt-2 text-base font-bold text-black" numberOfLines={1}>
        {item.name}
      </Text>
      <Text className="text-sm text-muted" numberOfLines={1}>
        from {money(item.price)}
      </Text>
    </View>
  );
}

function SelectionCircle({ selected }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-full border ${
        selected ? "border-primary" : "border-[#D1D5DB]"
      }`}
    >
      {selected ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
    </View>
  );
}

function ItemVariationModal({ item, visible, onClose, onConfirm, isSubmitting }) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState({});

  useEffect(() => {
    if (visible) {
      setQuantity(1);
      setSelections({});
    }
  }, [visible, item?.id]);

  if (!item) {
    return null;
  }

  const groups = item.modifierGroups || [];
  const selectedOptionIds = Object.values(selections).flat();
  const selectedOptions = groups
    .flatMap((group) => group.options || [])
    .filter((option) => selectedOptionIds.includes(option.id));
  const modifierTotal = selectedOptions.reduce((sum, option) => sum + (Number(option.priceDelta) || 0), 0);
  const unitPrice = (Number(item.price) || 0) + modifierTotal;
  const isReady = requiredGroups(item).every((group) => (selections[group.id] || []).length >= (group.minSelections || 1));

  const toggleOption = (group, option) => {
    setSelections((current) => {
      const currentIds = current[group.id] || [];
      const isSingle = (group.maxSelections || 1) === 1 || group.type === "single";

      if (isSingle) {
        return { ...current, [group.id]: [option.id] };
      }

      const exists = currentIds.includes(option.id);
      const nextIds = exists
        ? currentIds.filter((id) => id !== option.id)
        : [...currentIds, option.id].slice(0, group.maxSelections || 99);

      return { ...current, [group.id]: nextIds };
    });
  };

  const confirm = () => {
    onConfirm({
      item,
      quantity,
      modifierSelections: groups
        .map((group) => ({
          groupId: group.id,
          optionIds: selections[group.id] || []
        }))
        .filter((selection) => selection.optionIds.length)
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="#111111" />
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 116 }}>
          <View>
            {getItemImage(item) ? (
              <Image source={{ uri: getItemImage(item) }} className="h-64 w-full" resizeMode="cover" />
            ) : (
              <View className="h-64 w-full items-center justify-center bg-[#EEF0F2]">
                <Ionicons name="fast-food-outline" size={38} color="#9CA3AF" />
              </View>
            )}
            <Pressable
              onPress={onClose}
              className="absolute left-5 top-5 h-10 w-10 items-center justify-center rounded-full bg-white"
            >
              <Ionicons name="arrow-back" size={24} color="#1F2933" />
            </Pressable>
          </View>

          <View className="border-b border-border px-5 py-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xl font-extrabold text-black">{item.name}</Text>
                <Text className="mt-2 text-sm leading-5 text-muted" numberOfLines={2}>
                  {item.description || "Freshly prepared with quality ingredients."}
                </Text>
              </View>
              <Text className="text-lg font-extrabold text-black">{money(unitPrice)}</Text>
            </View>
          </View>

          {groups.map((group) => (
            <View key={group.id} className="border-b border-border px-5 py-5">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-extrabold text-black">{group.name}</Text>
                {group.isRequired || group.minSelections > 0 ? (
                  <View className="rounded-full bg-[#FFF0E5] px-3 py-1">
                    <Text className="text-xs font-bold text-primary">Required</Text>
                  </View>
                ) : null}
              </View>
              {(group.options || []).map((option) => {
                const selected = (selections[group.id] || []).includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggleOption(group, option)}
                    className="mb-4 flex-row items-center"
                  >
                    <Text className="flex-1 text-base text-black">
                      {option.name}{" "}
                      {Number(option.priceDelta) ? (
                        <Text className="text-muted">{money(option.priceDelta)}</Text>
                      ) : null}
                    </Text>
                    <SelectionCircle selected={selected} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 flex-row items-center border-t border-border bg-white px-5 pb-6 pt-4">
          <View className="mr-3 h-12 flex-row items-center rounded-2xl border border-border bg-[#FAFAFA]">
            <Pressable
              onPress={() => setQuantity((value) => Math.max(1, value - 1))}
              className="h-12 w-11 items-center justify-center"
            >
              <Ionicons name="remove" size={20} color="#9CA3AF" />
            </Pressable>
            <View className="h-8 min-w-[34px] items-center justify-center rounded-full bg-white px-2">
              <Text className="text-base font-extrabold text-ink">{quantity}</Text>
            </View>
            <Pressable
              onPress={() => setQuantity((value) => value + 1)}
              className="h-12 w-11 items-center justify-center"
            >
              <Ionicons name="add" size={22} color="#FF6400" />
            </Pressable>
          </View>
          <Button
            title={`Add to cart ${money(unitPrice * quantity)}`}
            onPress={confirm}
            loading={isSubmitting}
            disabled={!isReady || isSubmitting}
            className="flex-1 rounded-2xl"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function RestaurantDetailScreen({ navigation, route }) {
  const initialRestaurant = route.params?.restaurant;
  const slug = route.params?.slug || initialRestaurant?.slug || initialRestaurant?.id;
  const [restaurant, setRestaurant] = useState(initialRestaurant || null);
  const [isLoading, setIsLoading] = useState(Boolean(slug));
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeQuantityItemId, setActiveQuantityItemId] = useState(null);
  const [addingItemId, setAddingItemId] = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const scrollRef = useRef(null);
  const sectionOffsetsRef = useRef({});
  const addLockRef = useRef(false);
  const { showToast } = useToast();
  const setCartRestaurant = useCartStore((state) => state.setRestaurant);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const loadQuote = useCartStore((state) => state.loadQuote);
  const cartItems = useCartStore((state) => state.items);
  const quote = useCartStore((state) => state.quote);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await getRestaurantMenu(slug);
        if (active) {
          setRestaurant(data.restaurant || initialRestaurant);
        }
      } catch (error) {
        if (active) {
          showToast({
            type: "error",
            title: "Menu unavailable",
            message: "Showing a sample menu while the restaurant API is unavailable."
          });
          setRestaurant(initialRestaurant);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [initialRestaurant, showToast, slug]);

  useEffect(() => {
    if (restaurant) {
      setCartRestaurant(restaurant);
    }
  }, [restaurant, setCartRestaurant]);

  useEffect(() => {
    if (!activeQuantityItemId) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setActiveQuantityItemId(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [activeQuantityItemId, cartItems]);

  const categories = useMemo(() => normalizeCategories(restaurant), [restaurant]);
  const allItems = categories.flatMap((category) => category.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSummaryByMenuItem = useMemo(() => {
    return cartItems.reduce((summary, cartItem, index) => {
      const current = summary[cartItem.menuItemId] || { quantity: 0, index };

      summary[cartItem.menuItemId] = {
        quantity: current.quantity + cartItem.quantity,
        index: current.index
      };

      return summary;
    }, {});
  }, [cartItems]);

  useEffect(() => {
    const firstCategoryId = categories[0]?.id || null;
    setActiveCategoryId((currentId) => {
      if (!firstCategoryId) {
        return null;
      }

      return categories.some((category) => category.id === currentId) ? currentId : firstCategoryId;
    });
  }, [categories]);

  const handleCategoryPress = (categoryId) => {
    setActiveCategoryId(categoryId);

    const y = sectionOffsetsRef.current[categoryId];

    if (typeof y === "number") {
      scrollRef.current?.scrollTo({
        y: Math.max(y - 12, 0),
        animated: true
      });
    }
  };

  const addConfiguredItem = async ({ item, quantity = 1, modifierSelections = [] }) => {
    if (addLockRef.current) {
      return;
    }

    addLockRef.current = true;
    setAddingItemId(item.id);

    try {
      addItem({
        menuItemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        basePrice: item.price,
        quantity,
        modifierSelections
      });

      setSelectedItem(null);
      setActiveQuantityItemId(null);
      await loadQuote();
    } catch (error) {
      showToast({
        type: "error",
        title: "Cart total unavailable",
        message: "Item was added, but totals could not be refreshed."
      });
    } finally {
      setTimeout(() => {
        addLockRef.current = false;
        setAddingItemId(null);
      }, 650);
    }
  };

  const handleAddPress = (item) => {
    setActiveQuantityItemId(null);

    if (hasModifiers(item)) {
      setSelectedItem(item);
      return;
    }

    addConfiguredItem({ item });
  };

  const handleCountPress = (item) => {
    if (hasModifiers(item)) {
      setSelectedItem(item);
      return;
    }

    setActiveQuantityItemId((currentId) => (currentId === item.id ? null : item.id));
  };

  const handleQuantityChange = async (index, quantity) => {
    updateQuantity(index, quantity);

    if (quantity <= 0) {
      setActiveQuantityItemId(null);
    }

    try {
      await loadQuote();
    } catch (error) {
      showToast({
        type: "error",
        title: "Cart total unavailable",
        message: "Quantity changed, but totals could not be refreshed."
      });
    }
  };

  const displayRestaurant = restaurant || initialRestaurant || {
    name: "Restaurant",
    rating: null,
    reviewCount: null,
    deliveryEta: null
  };
  const restaurantImage = getRestaurantImage(displayRestaurant);

  return (
    <SafeAreaView className="flex-1 bg-[#2F2F2F]">
      <StatusBar barStyle="light-content" backgroundColor="#2F2F2F" />
      <View className="mx-4 flex-1 overflow-hidden rounded-b-2xl bg-white">
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: cartCount ? 124 : 28 }}
        >
          <View>
            {restaurantImage ? (
              <Image source={{ uri: restaurantImage }} className="h-48 w-full" resizeMode="cover" />
            ) : (
              <View className="h-48 w-full items-center justify-center bg-[#EEF0F2]">
                <Ionicons name="restaurant-outline" size={38} color="#9CA3AF" />
              </View>
            )}
            <View className="absolute left-5 right-5 top-5 flex-row items-center justify-between">
              <Pressable
                onPress={() => navigation.goBack()}
                className="h-9 w-9 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="arrow-back" size={22} color="#111111" />
              </Pressable>
              <View className="flex-row">
                <Pressable className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Ionicons name="heart-outline" size={22} color="#111111" />
                </Pressable>
                <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Ionicons name="share-social-outline" size={21} color="#111111" />
                </Pressable>
              </View>
            </View>
          </View>

          <View className="px-5 pb-4 pt-5">
            <View className="-mt-12 mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
              {displayRestaurant.logoUrl ? (
                <Image source={{ uri: displayRestaurant.logoUrl }} className="h-12 w-12 rounded-xl" resizeMode="cover" />
              ) : (
                <Text className="text-2xl font-black text-primary">{displayRestaurant.name?.slice(0, 1) || "D"}</Text>
              )}
            </View>

            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-extrabold text-black" numberOfLines={2}>
                  {displayRestaurant.name}
                </Text>
                {displayRestaurant.deliveryEta ? (
                  <Text className="mt-1 text-sm text-muted">
                    ⏱ Delivery {displayRestaurant.deliveryEta}
                  </Text>
                ) : null}
              </View>
              {displayRestaurant.rating ? (
                <Text className="text-sm text-black">
                  ⭐ {displayRestaurant.rating} {displayRestaurant.reviewCount ? `(${displayRestaurant.reviewCount})` : ""}
                </Text>
              ) : null}
            </View>

            {isLoading && !categories.length ? (
              <View className="mt-5 flex-row">
                {[0, 1, 2, 3].map((item) => (
                  <SkeletonBlock key={item} className="mr-3 h-9 w-24 rounded-lg" />
                ))}
              </View>
            ) : categories.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5">
	              {categories.map((category, index) => (
	                <Pressable
	                  key={category.id}
	                  onPress={() => handleCategoryPress(category.id)}
	                  className={`mr-3 rounded-lg px-3 py-2 ${
	                    activeCategoryId === category.id ? "bg-primary" : "bg-white"
	                  }`}
	                >
	                  <Text
	                    className={`text-sm font-semibold ${
	                      activeCategoryId === category.id ? "text-white" : "text-muted"
	                    }`}
	                  >
	                    {category.name}
	                  </Text>
	                </Pressable>
	              ))}
              </ScrollView>
            ) : null}

            {isLoading && !categories.length ? <MenuSkeletonGrid /> : null}

            {!isLoading && !categories.length ? <EmptyMenu /> : null}

            {categories.map((category) => (
	              <View
	                key={category.id}
	                className="mt-6"
	                onLayout={(event) => {
	                  sectionOffsetsRef.current[category.id] = event.nativeEvent.layout.y + 260;
	                }}
	              >
                <Text className="mb-4 text-xl font-extrabold text-black">{category.name}</Text>
                <View className="flex-row flex-wrap justify-between">
                  {(category.items || allItems).map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      cartSummary={cartSummaryByMenuItem[item.id]}
                      isExpanded={activeQuantityItemId === item.id}
                      isAdding={addingItemId === item.id}
                      onAdd={handleAddPress}
                      onCountPress={handleCountPress}
                      onQuantityChange={handleQuantityChange}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {cartCount ? (
          <Pressable
            onPress={() => navigation.navigate("Cart")}
            className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-5 pb-6 pt-3"
          >
            <View className="mb-3 flex-row items-center">
              <View className="mr-2 h-6 w-6 items-center justify-center rounded-full bg-[#2D8C6C]">
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text className="text-sm font-bold text-[#2D8C6C]">You've got items in your cart!</Text>
            </View>
            <Button
              title={`${cartCount}  View your cart    ${currencyLabel(quote?.labels?.total, cartItems.reduce((sum, item) => sum + (item.basePrice || 0) * item.quantity, 0))}`}
              onPress={() => navigation.navigate("Cart")}
              className="rounded-xl"
            />
          </Pressable>
        ) : null}
      </View>

      <ItemVariationModal
        item={selectedItem}
        visible={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        onConfirm={addConfiguredItem}
        isSubmitting={Boolean(addingItemId)}
      />
    </SafeAreaView>
  );
}
