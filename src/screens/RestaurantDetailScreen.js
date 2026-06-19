import { useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { getRestaurantMenu } from "../services/restaurantService";
import useCartStore from "../store/useCartStore";

const STICKY_MENU_SCROLL_OFFSET = 132;

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

function RestaurantHeaderSkeleton() {
  return (
    <View>
      <SkeletonBlock className="h-56 w-full" />
      <View className="px-5 pb-4 pt-5">
        <SkeletonBlock className="-mt-12 mb-4 h-16 w-16 rounded-2xl bg-white" />
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-5">
            <SkeletonBlock className="h-6 w-4/5 rounded-full" />
            <SkeletonBlock className="mt-3 h-4 w-2/3 rounded-full" />
          </View>
          <SkeletonBlock className="h-4 w-16 rounded-full" />
        </View>
        <View className="mt-5 flex-row">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="mr-3 h-9 w-24 rounded-lg" />
          ))}
        </View>
        <MenuSkeletonGrid />
      </View>
    </View>
  );
}

function EmptyMenu({ message = "No menu items available right now." }) {
  return (
    <View className="mt-8 rounded-2xl bg-[#F6F7F8] px-4 py-6">
      <Text className="text-center text-base font-semibold text-muted">{message}</Text>
    </View>
  );
}

function StickyMenuHeader({
  activeCategoryId,
  categories,
  onBack,
  onCategoryPress,
  isPinned,
  onLayout,
  onSearchPress,
  restaurantName,
  safeTop = 0,
  searchQuery
}) {
  const placeholder = isPinned && restaurantName ? `Search ${restaurantName}` : "Search menu";
  const tabScrollRef = useRef(null);

  useEffect(() => {
    const activeIndex = categories.findIndex((category) => category.id === activeCategoryId);

    if (activeIndex >= 0) {
      tabScrollRef.current?.scrollTo({
        x: Math.max(activeIndex * 112 - 24, 0),
        animated: true
      });
    }
  }, [activeCategoryId, categories]);

  return (
    <View
      className={`${isPinned ? "" : "rounded-t-3xl"} border-b border-border bg-white px-5 pb-2`}
      onLayout={onLayout}
      style={{ paddingTop: isPinned ? safeTop + 12 : 22 }}
    >
      <View className="flex-row items-center">
        {isPinned ? (
          <Pressable onPress={onBack} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
            <Ionicons name="arrow-back" size={25} color="#1F2933" />
          </Pressable>
        ) : null}

        <Pressable
          onPress={onSearchPress}
          className={`h-12 flex-row items-center rounded-full bg-[#F6F7F8] px-4 ${isPinned ? "flex-1" : "w-full"}`}
        >
          <Ionicons name="search-outline" size={22} color="#6B7280" />
          <Text className={`ml-2 flex-1 text-base font-medium ${searchQuery ? "text-ink" : "text-muted"}`} numberOfLines={1}>
            {searchQuery || placeholder}
          </Text>
          {searchQuery ? (
            <View className="h-8 w-8 items-center justify-center">
              <Ionicons name="close-circle" size={19} color="#9CA3AF" />
            </View>
          ) : null}
        </Pressable>

        {isPinned ? (
          <Pressable className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-white">
            <Ionicons name="ellipsis-vertical" size={23} color="#1F2933" />
          </Pressable>
        ) : null}
      </View>

      {categories.length ? (
        <ScrollView ref={tabScrollRef} horizontal showsHorizontalScrollIndicator={false} className="mt-5">
          {categories.map((category, index) => {
            const isActive = activeCategoryId === category.id;

            return (
              <Pressable
                key={category.id}
                onPress={() => onCategoryPress(category.id)}
                className="mr-8 pb-2"
              >
                <View className="flex-row items-center">
                  {index === 0 ? (
                    <Ionicons
                      name="flame"
                      size={17}
                      color={isActive ? "#FF6400" : "#6B7280"}
                      style={{ marginRight: 6 }}
                    />
                  ) : null}
                  <Text className={`text-base font-bold ${isActive ? "text-primary" : "text-muted"}`}>
                    {category.name}
                  </Text>
                </View>
                <View className={`mt-2 h-1 rounded-full ${isActive ? "bg-primary" : "bg-transparent"}`} />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function MenuSearchOverlay({ onClose, onSearchChange, searchQuery, visible }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/55">
        <SafeAreaView className="bg-white px-5 pb-6 pt-4" style={{ borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View className="flex-row items-center">
            <Pressable onPress={onClose} className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white">
              <Ionicons name="arrow-back" size={26} color="#FF6400" />
            </Pressable>
            <View className="h-12 flex-1 flex-row items-center rounded-2xl bg-[#F6F7F8] px-4">
              <TextInput
                ref={inputRef}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search menu"
                placeholderTextColor="#8A8F98"
                returnKeyType="search"
                autoCorrect={false}
                className="flex-1 text-lg font-medium text-ink"
              />
              {searchQuery ? (
                <Pressable onPress={() => onSearchChange("")} className="h-8 w-8 items-center justify-center">
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>
          </View>
        </SafeAreaView>

        <Pressable className="flex-1" onPress={onClose} />
      </View>
    </Modal>
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
  const description = item.description || item.shortDescription || "";

  return (
    <Pressable onPress={() => (hasCartQuantity ? onCountPress(item) : onAdd(item))} className="mb-6 w-[48%] active:opacity-90">
      <View className="overflow-hidden rounded-2xl bg-[#F7F7F7] shadow-sm">
        {getItemImage(item) ? (
          <Image source={{ uri: getItemImage(item) }} className="h-40 w-full" resizeMode="cover" />
        ) : (
          <View className="h-40 w-full items-center justify-center bg-[#EEF0F2]">
            <Ionicons name="fast-food-outline" size={30} color="#9CA3AF" />
          </View>
        )}
        <View className="absolute inset-x-0 bottom-0 h-14 bg-black/5" />
        {hasCartQuantity && !isExpanded ? (
          <Pressable
            onPress={() => onCountPress(item)}
            className="absolute bottom-3 right-3 h-11 w-11 items-center justify-center rounded-full bg-ink shadow-md"
          >
            <Text className="text-base font-bold text-white">{cartQuantity}</Text>
          </Pressable>
        ) : null}

        {hasCartQuantity && isExpanded && !itemHasModifiers ? (
          <View className="absolute bottom-3 right-3 h-10 flex-row items-center rounded-full border border-[#E5E7EB] bg-white shadow-lg">
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
            className={`absolute bottom-3 right-3 h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ${
              isAdding ? "opacity-50" : ""
            }`}
          >
            <Ionicons name="add" size={26} color="#1F2933" />
          </Pressable>
        ) : null}
      </View>
      <Text className="mt-2 text-base font-bold leading-5 text-ink" numberOfLines={2}>
        {item.name}
      </Text>
      {description ? (
        <Text className="mt-1 text-xs leading-4 text-muted" numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View className="mt-1 flex-row items-center">
        <Text className="text-sm font-semibold text-primary">from {money(item.price)}</Text>
        {item.compareAtPrice || item.originalPrice ? (
          <Text className="ml-1 text-xs text-muted line-through">
            {money(item.compareAtPrice || item.originalPrice)}
          </Text>
        ) : null}
      </View>
      {item.isVegetarian || item.isSpicy ? (
        <View className="mt-2 flex-row">
          {item.isVegetarian ? (
            <View className="mr-2 h-6 w-6 items-center justify-center rounded-full bg-[#DCF7EF]">
              <Ionicons name="leaf" size={13} color="#2D8C6C" />
            </View>
          ) : null}
          {item.isSpicy ? (
            <View className="h-6 w-6 items-center justify-center rounded-full bg-[#FFF0E5]">
              <Ionicons name="flame" size={13} color="#FF6400" />
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
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
  const insets = useSafeAreaInsets();
  const initialRestaurant = route.params?.restaurant;
  const slug = route.params?.slug || initialRestaurant?.slug || initialRestaurant?.id;
  const [restaurant, setRestaurant] = useState(initialRestaurant || null);
  const [isLoading, setIsLoading] = useState(Boolean(slug));
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeQuantityItemId, setActiveQuantityItemId] = useState(null);
  const [addingItemId, setAddingItemId] = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuPinned, setIsMenuPinned] = useState(false);
  const scrollRef = useRef(null);
  const sectionOffsetsRef = useRef({});
  const stickyHeaderYRef = useRef(0);
  const addLockRef = useRef(false);
  const { showToast } = useToast();
  const setCartRestaurant = useCartStore((state) => state.setRestaurant);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const loadQuote = useCartStore((state) => state.loadQuote);
  const cartItems = useCartStore((state) => state.items);
  const quote = useCartStore((state) => state.quote);
  const stickyMenuOffset = STICKY_MENU_SCROLL_OFFSET + insets.top;

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

  const baseCategories = useMemo(() => normalizeCategories(restaurant), [restaurant]);
  const categories = useMemo(() => {
    const query = menuSearchQuery.trim().toLowerCase();

    if (!query) {
      return baseCategories;
    }

    return baseCategories
      .map((category) => ({
        ...category,
        items: (category.items || []).filter((item) =>
          [item.name, item.description, item.categoryName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      }))
      .filter((category) => category.items.length);
  }, [baseCategories, menuSearchQuery]);
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
    sectionOffsetsRef.current = {};

    const firstCategoryId = categories[0]?.id || null;
    setActiveCategoryId(firstCategoryId);
  }, [categories]);

  const handleMenuScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const pinned = stickyHeaderYRef.current > 0 && scrollY >= stickyHeaderYRef.current - insets.top;

    setIsMenuPinned((current) => (current === pinned ? current : pinned));

    const activationY = scrollY + stickyMenuOffset + 56;
    const orderedSections = categories
      .map((category) => [category.id, sectionOffsetsRef.current[category.id]])
      .filter(([, offset]) => typeof offset === "number")
      .sort((a, b) => a[1] - b[1]);

    let nextCategoryId = orderedSections[0]?.[0] || activeCategoryId;

    for (const [categoryId, offset] of orderedSections) {
      if (activationY >= offset) {
        nextCategoryId = categoryId;
      } else {
        break;
      }
    }

    if (nextCategoryId && nextCategoryId !== activeCategoryId) {
      setActiveCategoryId(nextCategoryId);
    }
  };

  const handleCategoryPress = (categoryId) => {
    setActiveCategoryId(categoryId);

    const y = sectionOffsetsRef.current[categoryId];

    if (typeof y === "number") {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(y - stickyMenuOffset, 0),
          animated: true
        });
      });
      return;
    }

    const index = categories.findIndex((category) => category.id === categoryId);

    if (index >= 0) {
      scrollRef.current?.scrollTo({
        y: Math.max(stickyHeaderYRef.current + index * 360, 0),
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
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <StatusBar
        barStyle={isMenuPinned ? "dark-content" : "light-content"}
        translucent
        backgroundColor={isMenuPinned ? "#FFFFFF" : "transparent"}
      />
      <View className="flex-1 bg-white">
        {isMenuPinned ? (
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 top-0 z-50 bg-white"
            style={{ height: insets.top }}
          />
        ) : null}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: cartCount ? 124 : 28 }}
          stickyHeaderIndices={isLoading && !restaurant ? [] : [2]}
          scrollEventThrottle={16}
          onScroll={handleMenuScroll}
        >
          {isLoading && !restaurant ? <RestaurantHeaderSkeleton /> : null}

          {isLoading && !restaurant ? null : (
              <View>
                {restaurantImage ? (
                  <Image source={{ uri: restaurantImage }} className="h-72 w-full" resizeMode="cover" />
                ) : (
                  <View className="h-72 w-full items-center justify-center bg-[#EEF0F2]">
                    <Ionicons name="restaurant-outline" size={38} color="#9CA3AF" />
                  </View>
                )}
                <View className="absolute left-5 right-5 top-12 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => navigation.goBack()}
                    className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md"
                  >
                    <Ionicons name="arrow-back" size={27} color="#1F2933" />
                  </Pressable>
                  <View className="flex-row items-center">
                    <Pressable className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
                      <Ionicons name="information-circle-outline" size={25} color="#1F2933" />
                    </Pressable>
                    <Pressable className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
                      <Ionicons name="share-social-outline" size={24} color="#1F2933" />
                    </Pressable>
                    {/* <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
                      <Ionicons name="person-add-outline" size={24} color="#1F2933" />
                    </Pressable> */}
                  </View>
                </View>
              </View>
          )}

          {isLoading && !restaurant ? null : (
              <View className="items-center bg-white px-5 pb-5">
                <View className="-mt-12 mb-3 h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg">
                  {displayRestaurant.logoUrl ? (
                    <Image source={{ uri: displayRestaurant.logoUrl }} className="h-14 w-14 rounded-xl" resizeMode="cover" />
                  ) : (
                    <Text className="text-2xl font-bold text-primary">{displayRestaurant.name?.slice(0, 1) || "D"}</Text>
                  )}
                </View>

                <View className="w-full items-center">
                  <Text className="text-center text-xl font-bold text-ink" numberOfLines={2}>
                    {displayRestaurant.name}
                  </Text>
                  {displayRestaurant.rating ? (
                    <View className="mt-2 flex-row items-center">
                      <Text className="mr-1 text-base text-primary">★</Text>
                      <Text className="text-sm font-medium text-ink">
                        {displayRestaurant.rating} {displayRestaurant.reviewCount ? `(${displayRestaurant.reviewCount} ratings)` : ""}
                      </Text>
                    </View>
                  ) : null}

                  <View className="mt-6 w-full rounded-2xl border border-border bg-white px-4 py-3">
                    <View className="flex-row items-center">
                      <View className="mr-3 flex-row rounded-full bg-[#F6F7F8] p-1">
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                          <Ionicons name="bicycle" size={21} color="#1F2933" />
                        </View>
                        <View className="h-9 w-9 items-center justify-center rounded-full">
                          <Ionicons name="walk" size={21} color="#6B7280" />
                        </View>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-ink">
                          Delivery {displayRestaurant.deliveryEta || "35-55 min"}
                        </Text>
                        <Text className="mt-1 text-sm font-medium text-primary" numberOfLines={1}>
                          Free delivery for first order <Text className="text-muted">• Min. order ₱299.00</Text>
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-muted">Change</Text>
                    </View>
                  </View>

                  <View className="mt-3 w-full flex-row">
                    <View className="mr-2 flex-1 rounded-2xl border border-[#F7CDD9] bg-[#FFF0F3] px-4 py-4">
                      <Text className="text-base font-bold text-primary">20% off</Text>
                      <Text className="mt-1 text-xs leading-4 text-muted" numberOfLines={2}>
                        No min. order Valid for selected items. Auto-applied.
                      </Text>
                    </View>
                    <View className="ml-2 flex-1 rounded-2xl border border-border bg-white px-4 py-4">
                      <Text className="text-base font-bold text-ink">50% off</Text>
                      <Text className="font-bold text-ink">(PEHLAORDER)</Text>
                      <Text className="mt-1 text-xs leading-4 text-muted" numberOfLines={1}>
                        Min. order ₱499 Valid for all item...
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
          )}

          {isLoading && !restaurant ? null : (
              <StickyMenuHeader
                activeCategoryId={activeCategoryId}
                categories={categories}
                isPinned={isMenuPinned}
                onBack={() => navigation.goBack()}
                onCategoryPress={handleCategoryPress}
                onLayout={(event) => {
                  stickyHeaderYRef.current = event.nativeEvent.layout.y;
                }}
                onSearchPress={() => setIsSearchOpen(true)}
                restaurantName={displayRestaurant.name}
                safeTop={insets.top}
                searchQuery={menuSearchQuery}
              />
          )}

          {isLoading && !restaurant ? null : isLoading && !categories.length ? (
            <View className="px-5">
              <MenuSkeletonGrid />
            </View>
          ) : null}

          {isLoading && !restaurant ? null : !isLoading && !categories.length ? (
            <View className="px-5">
              <EmptyMenu
                message={
                  menuSearchQuery.trim()
                    ? "No menu items match your search."
                    : "No menu items available right now."
                }
              />
            </View>
          ) : null}

          {isLoading && !restaurant
            ? null
            : categories.map((category) => (
                <View
                  key={category.id}
                  className="mt-6 px-5"
                  onLayout={(event) => {
                    sectionOffsetsRef.current[category.id] = event.nativeEvent.layout.y;
                  }}
                >
                  <Text className="mb-1 text-xl font-bold text-ink">{category.name}</Text>
                  {category.id === categories[0]?.id ? (
                    <Text className="mb-5 text-base text-muted">Most ordered right now.</Text>
                  ) : (
                    <View className="mb-5" />
                  )}
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
      <MenuSearchOverlay
        visible={isSearchOpen}
        searchQuery={menuSearchQuery}
        onSearchChange={setMenuSearchQuery}
        onClose={() => setIsSearchOpen(false)}
      />
    </SafeAreaView>
  );
}
