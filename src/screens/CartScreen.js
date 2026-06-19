import { useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import useCartStore from "../store/useCartStore";

function money(value = 0) {
  const amount = Number(value) || 0;
  return `₱${amount.toFixed(2)}`;
}

function currencyLabel(label, fallbackValue = 0) {
  if (!label) {
    return money(fallbackValue);
  }

  return String(label).replace(/^Rs\.?\s*/i, "₱").replace(/^\$\s*/, "₱");
}

function itemImage(item) {
  return item?.imageUrl || item?.photoUrls?.[0] || null;
}

function restaurantName(restaurant) {
  return restaurant?.name || "Dart Restaurant";
}

function flattenMenuItems(restaurant) {
  return (restaurant?.menu?.categories || []).flatMap((category) => category.items || []);
}

function localSubtotal(items) {
  return items.reduce((sum, item) => sum + (Number(item.basePrice) || 0) * item.quantity, 0);
}

function Step({ number, label, active }) {
  return (
    <View className="z-10 flex-1 items-center">
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${
          active ? "bg-primary" : "border-2 border-border bg-white"
        }`}
      >
        <Text className={`text-sm font-extrabold ${active ? "text-white" : "text-muted"}`}>{number}</Text>
      </View>
      <Text className={`mt-2 text-xs font-bold ${active ? "text-ink" : "text-muted"}`}>{label}</Text>
    </View>
  );
}

function CartStepper() {
  return (
    <View className="px-5 pb-7 pt-4">
      <View className="relative flex-row items-start">
        <View className="absolute left-10 right-10 top-5 h-1 rounded-full bg-border" />
        <View className="absolute left-10 right-1/2 top-5 h-1 rounded-full bg-primary" />
        <Step number="1" label="Menu" active />
        <Step number="2" label="Cart" active />
        <Step number="3" label="Checkout" />
      </View>
    </View>
  );
}

function QuantityControl({ quantity, onMinus, onPlus }) {
  return (
    <View className="h-11 flex-row items-center rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-1">
      <Pressable onPress={onMinus} className="h-9 w-10 items-center justify-center rounded-full bg-white">
        <Ionicons
          name={quantity <= 1 ? "trash-outline" : "remove"}
          size={18}
          color={quantity <= 1 ? "#DC2626" : "#1F2933"}
        />
      </Pressable>
      <View className="mx-1 h-9 min-w-[36px] items-center justify-center rounded-full bg-[#FFF0E5] px-2">
        <Text className="text-base font-extrabold text-primary">{quantity}</Text>
      </View>
      <Pressable onPress={onPlus} className="h-9 w-10 items-center justify-center rounded-full bg-white">
        <Ionicons name="add" size={21} color="#FF6400" />
      </Pressable>
    </View>
  );
}

function CartItemRow({ item, index, quoteItem, onQuantity }) {
  const lineTotal = currencyLabel(
    quoteItem?.labels?.total || quoteItem?.totalLabel,
    (item.basePrice || 0) * item.quantity
  );

  return (
    <View className="flex-row border-b border-border px-5 py-5">
      {itemImage(item) ? (
        <Image source={{ uri: itemImage(item) }} className="mr-4 h-16 w-16 rounded-2xl" resizeMode="cover" />
      ) : (
        <View className="mr-4 h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF0F2]">
          <Ionicons name="fast-food-outline" size={22} color="#9CA3AF" />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-base font-extrabold text-ink" numberOfLines={2}>
          {item.name}
        </Text>
        <View className="mt-4 self-start">
          <QuantityControl
            quantity={item.quantity}
            onMinus={() => onQuantity(index, item.quantity - 1)}
            onPlus={() => onQuantity(index, item.quantity + 1)}
          />
        </View>
      </View>
      <View className="ml-3 items-end justify-center">
        <Text className="text-base font-extrabold text-primary">{lineTotal}</Text>
        {Number(item.basePrice) ? (
          <Text className="mt-1 text-xs text-muted line-through">{money(item.basePrice * item.quantity * 1.2)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function RecommendationCard({ item, isAdding, onAdd }) {
  const imageUrl = itemImage(item);

  return (
    <View className="mr-4 w-36">
      <View className="overflow-hidden rounded-2xl bg-[#F4F5F7]">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-32 w-full" resizeMode="cover" />
        ) : (
          <View className="h-32 w-full items-center justify-center bg-[#EEF0F2]">
            <Ionicons name="fast-food-outline" size={26} color="#9CA3AF" />
          </View>
        )}
        <Pressable
          disabled={isAdding}
          onPress={() => onAdd(item)}
          className={`absolute bottom-2 right-2 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ${
            isAdding ? "opacity-50" : ""
          }`}
        >
          <Ionicons name="add" size={24} color="#1F2933" />
        </Pressable>
      </View>
      <Text className="mt-3 text-sm font-extrabold text-ink" numberOfLines={1}>
        {money(item.price || item.basePrice)}
      </Text>
      <Text className="mt-1 text-sm text-muted" numberOfLines={2}>
        {item.name}
      </Text>
    </View>
  );
}

function EmptyRecommendations() {
  return (
    <View className="mt-5 rounded-2xl bg-[#F6F7F8] px-4 py-5">
      <Text className="text-sm font-semibold text-muted">No recommendations available right now.</Text>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const { showToast } = useToast();
  const addLockRef = useRef(false);
  const [addingRecommendationId, setAddingRecommendationId] = useState(null);
  const restaurant = useCartStore((state) => state.restaurant);
  const items = useCartStore((state) => state.items);
  const quote = useCartStore((state) => state.quote);
  const isQuoting = useCartStore((state) => state.isQuoting);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const addItem = useCartStore((state) => state.addItem);
  const loadQuote = useCartStore((state) => state.loadQuote);

  const subtotal = useMemo(() => localSubtotal(items), [items]);
  const quoteItems = quote?.items || [];
  const recommendations = useMemo(() => {
    const cartIds = new Set(items.map((item) => item.menuItemId));
    const menuItems = flattenMenuItems(restaurant).filter((item) => !cartIds.has(item.id));

    return menuItems.slice(0, 8);
  }, [items, restaurant]);

  const refreshQuote = async () => {
    try {
      await loadQuote();
    } catch (error) {
      showToast({
        type: "error",
        title: "Cart total unavailable",
        message: "We updated the cart, but the live total could not be refreshed."
      });
    }
  };

  const handleQuantity = async (index, quantity) => {
    updateQuantity(index, quantity);
    await refreshQuote();
  };

  const handleRecommendationAdd = async (item) => {
    if (addLockRef.current) {
      return;
    }

    addLockRef.current = true;
    setAddingRecommendationId(item.id);

    try {
      addItem({
        menuItemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        basePrice: item.price || item.basePrice || 0,
        quantity: 1,
        modifierSelections: []
      });
      await refreshQuote();
    } finally {
      setTimeout(() => {
        addLockRef.current = false;
        setAddingRecommendationId(null);
      }, 650);
    }
  };

  const goBackToMenu = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Home");
  };

  if (!items.length) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View className="border-b border-border bg-white px-5 pb-4 pt-2">
          <View className="flex-row items-center">
            <Pressable onPress={goBackToMenu} className="mr-4 h-11 w-11 items-center justify-center rounded-full bg-[#FFF0E5]">
              <Ionicons name="close" size={26} color="#FF6400" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-ink">Cart</Text>
              <Text className="mt-0.5 text-sm font-medium text-muted">Ready when you are</Text>
            </View>
          </View>
        </View>

        <View className="flex-1 px-6">
          <View className="flex-1 items-center justify-center">
            <View className="h-32 w-32 items-center justify-center rounded-full bg-[#FFF4ED]">
              <View className="h-24 w-24 items-center justify-center rounded-full bg-white shadow-md">
                <Ionicons name="cart-outline" size={44} color="#FF6400" />
              </View>
            </View>

            <Text className="mt-8 text-center text-[26px] font-extrabold text-ink">Your cart is empty</Text>
            <Text className="mt-3 max-w-[280px] text-center text-base leading-6 text-muted">
              Choose a restaurant and add your favorite meals here.
            </Text>

            <View className="mt-8 w-full rounded-2xl bg-[#F6F7F8] px-4 py-4">
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                  <Ionicons name="restaurant-outline" size={20} color="#FF6400" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-ink">Start with a restaurant</Text>
                  <Text className="mt-1 text-xs leading-5 text-muted">
                    Browse nearby stores and your cart will update instantly.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="pb-6">
            <Button
              title="Browse restaurants"
              onPress={() => navigation.navigate("Home")}
              className="rounded-xl"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border bg-white px-5 pb-4 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={goBackToMenu} className="mr-4 h-11 w-11 items-center justify-center">
            <Ionicons name="close" size={30} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-extrabold text-ink">Cart</Text>
            <Text className="mt-0.5 text-base text-ink" numberOfLines={1}>
              {restaurantName(restaurant)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 124 }}>
        <CartStepper />

        <View className="mx-5 mb-5 rounded-full bg-[#EEF0F2] p-1">
          <View className="flex-row">
            <View className="h-12 flex-1 flex-row items-center justify-center rounded-full bg-white shadow-sm">
              <Ionicons name="bicycle" size={22} color="#1F2933" />
              <Text className="ml-2 text-base font-extrabold text-ink">Delivery</Text>
            </View>
            <View className="h-12 flex-1 flex-row items-center justify-center rounded-full">
              <Ionicons name="walk" size={22} color="#1F2933" />
              <Text className="ml-2 text-base font-extrabold text-ink">Pick-up</Text>
              <Text className="ml-2 text-xs font-extrabold text-primary">30% off</Text>
            </View>
          </View>
        </View>

        <View className="mb-4 flex-row items-center justify-between px-5">
          <Text className="text-lg text-ink">
            Delivery: <Text className="font-extrabold">15 - 30 min</Text>
          </Text>
          <Pressable>
            <Text className="text-base font-bold text-ink underline">Change</Text>
          </Pressable>
        </View>

        <View className="h-3 bg-[#F5F6F6]" />

        {items.map((item, index) => (
          <CartItemRow
            key={`${item.menuItemId}-${index}`}
            item={item}
            index={index}
            quoteItem={quoteItems[index]}
            onQuantity={handleQuantity}
          />
        ))}

        <Pressable onPress={goBackToMenu} className="flex-row items-center px-5 py-5">
          <Ionicons name="add" size={26} color="#1F2933" />
          <Text className="ml-2 text-lg font-extrabold text-ink">Add more items</Text>
        </Pressable>

        <View className="h-3 bg-[#F5F6F6]" />

        <View className="px-5 py-6">
          <Text className="text-2xl font-extrabold text-ink">Popular with your order</Text>
          <Text className="mt-1 text-lg text-muted">Other customers also bought these</Text>
          {recommendations.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5">
              {recommendations.map((item) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  isAdding={addingRecommendationId === item.id}
                  onAdd={handleRecommendationAdd}
                />
              ))}
            </ScrollView>
          ) : (
            <EmptyRecommendations />
          )}
        </View>

        <View className="h-3 bg-[#F5F6F6]" />

        <View className="px-5 py-6">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-extrabold text-ink">Subtotal</Text>
            <Text className="text-lg font-extrabold text-ink">{currencyLabel(quote?.labels?.subtotal, subtotal)}</Text>
          </View>
          <View className="rounded-2xl border border-border bg-white p-5">
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-xl font-extrabold text-ink">
                  Total <Text className="text-sm text-muted">(incl. fees and tax)</Text>
                </Text>
                <Text className="mt-1 text-base font-bold text-ink">See summary</Text>
              </View>
              <View className="items-end">
                <Text className="text-xl font-extrabold text-primary">{currencyLabel(quote?.labels?.total, subtotal)}</Text>
                <Text className="mt-1 text-sm text-muted line-through">{money(subtotal * 1.2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-5 pb-6 pt-4">
        <Button
          title="Confirm payment and address"
          loading={isQuoting}
          onPress={() =>
            showToast({
              type: "info",
              title: "Checkout coming next",
              message: "Payment and address confirmation will be connected in the checkout phase."
            })
          }
          className="rounded-xl"
        />
      </View>
    </SafeAreaView>
  );
}
