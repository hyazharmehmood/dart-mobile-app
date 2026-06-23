import { useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { createDragonpayPayment, listDragonpayProcessors } from "../services/paymentService";
import useAddressStore from "../store/useAddressStore";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";
import useOrderStore from "../store/useOrderStore";

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

function numericMoney(value, fallback = 0) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function processorName(processor) {
  return processor?.name || processor?.longName || processor?.shortName || processor?.procId || "Payment method";
}

function Step({ number, label, active }) {
  return (
    <View className="z-10 flex-1 items-center">
      <View
        className={`h-8 w-8 items-center justify-center rounded-full ${
          active ? "bg-primary" : "border border-border bg-white"
        }`}
      >
        <Text className={`text-xs font-bold ${active ? "text-white" : "text-muted"}`}>{number}</Text>
      </View>
      <Text className={`mt-2 text-xs font-medium ${active ? "text-ink" : "text-muted"}`}>{label}</Text>
    </View>
  );
}

function CartStepper() {
  return (
    <View className=" pb-5 pt-4">
      <View className="relative flex-row items-start rounded-2xl bg-[#F8F8F8] px-2 py-4">
        <View className="absolute left-0 right-0 top-8 h-1 rounded-full bg-border" />
        <View className="absolute left-0 right-1/2 top-8 h-1 rounded-full bg-primary" />
        <Step number="1" label="Menu" active />
        <Step number="2" label="Cart" active />
        <Step number="3" label="Checkout" />
      </View>
    </View>
  );
}

function CheckoutGradientButton({ disabled, itemCount, loading, onPress, totalLabel }) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      className={`overflow-hidden rounded-2xl shadow-lg ${disabled || loading ? "opacity-70" : ""}`}
    >
      <LinearGradient
        colors={["#FF7A1A", "#FF6400", "#EF4B00"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: 68,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12
        }}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/20">
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-base font-extrabold text-white">{itemCount}</Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-white">
            {loading ? "Preparing payment..." : "Confirm payment and address"}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-white/85" numberOfLines={1}>
            Secure Dragonpay checkout inside Dart
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-lg font-extrabold text-white">{totalLabel}</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function QuantityControl({ quantity, onMinus, onPlus }) {
  return (
    <View className="h-10 flex-row items-center rounded-full border border-[#E5E7EB] bg-white px-1 shadow-sm">
      <Pressable onPress={onMinus} className="h-8 w-9 items-center justify-center rounded-full">
        <Ionicons
          name={quantity <= 1 ? "trash-outline" : "remove"}
          size={18}
          color={quantity <= 1 ? "#DC2626" : "#1F2933"}
        />
      </Pressable>
      <View className="mx-1 h-8 min-w-[34px] items-center justify-center rounded-full bg-[#FFF0E5] px-2">
        <Text className="text-sm font-bold text-primary">{quantity}</Text>
      </View>
      <Pressable onPress={onPlus} className="h-8 w-9 items-center justify-center rounded-full">
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
    <View className="mx-5 mb-3 flex-row rounded-2xl bg-white p-3 shadow-sm">
      {itemImage(item) ? (
        <Image source={{ uri: itemImage(item) }} className="mr-3 h-20 w-20 rounded-2xl" resizeMode="cover" />
      ) : (
        <View className="mr-3 h-20 w-20 items-center justify-center rounded-2xl bg-[#EEF0F2]">
          <Ionicons name="fast-food-outline" size={22} color="#9CA3AF" />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-base font-bold leading-5 text-ink" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
          {money(item.basePrice || 0)} each
        </Text>
        <View className="mt-3 self-start">
          <QuantityControl
            quantity={item.quantity}
            onMinus={() => onQuantity(index, item.quantity - 1)}
            onPlus={() => onQuantity(index, item.quantity + 1)}
          />
        </View>
      </View>
      <View className="ml-2 items-end justify-center">
        <Text className="text-base font-bold text-primary">{lineTotal}</Text>
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
      <View className="overflow-hidden rounded-2xl bg-[#F4F5F7] shadow-sm">
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
      <Text className="mt-3 text-sm font-bold text-primary" numberOfLines={1}>
        {money(item.price || item.basePrice)}
      </Text>
      <Text className="mt-1 text-sm font-medium text-ink" numberOfLines={2}>
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

function PaymentMethodSheet({
  amountLabel,
  isLoading,
  isSubmitting,
  processors,
  visible,
  onClose,
  onSelect
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[72%] rounded-t-[28px] bg-white px-5 pb-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-ink">Choose payment</Text>
              <Text className="mt-1 text-sm text-muted">Total {amountLabel}</Text>
            </View>
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
              <Ionicons name="close" size={22} color="#1F2933" />
            </Pressable>
          </View>

          {isLoading ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator color="#FF6400" />
              <Text className="mt-3 text-sm font-semibold text-muted">Loading payment methods</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                disabled={isSubmitting}
                onPress={() => onSelect({ procId: "", name: "Show all payment methods on Dragonpay" })}
                className="mb-3 flex-row items-center rounded-2xl border border-border bg-white px-4 py-4"
              >
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#FFF0E5]">
                  <Ionicons name="card-outline" size={22} color="#FF6400" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-ink">Show all payment methods</Text>
                  <Text className="mt-1 text-xs text-muted">Open Dragonpay hosted method selector</Text>
                </View>
                {isSubmitting ? <ActivityIndicator color="#FF6400" /> : <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
              </Pressable>

              {processors.map((processor) => (
                <Pressable
                  key={processor.procId || processor.name}
                  disabled={isSubmitting}
                  onPress={() => onSelect(processor)}
                  className="mb-3 flex-row items-center rounded-2xl border border-border bg-white px-4 py-4"
                >
                  <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#F6F7F8]">
                    <Ionicons name="wallet-outline" size={22} color="#1F2933" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-ink">{processorName(processor)}</Text>
                    <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
                      {processor.description || processor.type || processor.procId}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function CartScreen({ navigation }) {
  const { showToast } = useToast();
  const addLockRef = useRef(false);
  const [addingRecommendationId, setAddingRecommendationId] = useState(null);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [paymentProcessors, setPaymentProcessors] = useState([]);
  const [isLoadingProcessors, setIsLoadingProcessors] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isGuest = useAuthStore((state) => state.isGuest);
  const address = useAddressStore((state) => state.address);
  const restaurant = useCartStore((state) => state.restaurant);
  const branchId = useCartStore((state) => state.branchId);
  const items = useCartStore((state) => state.items);
  const quote = useCartStore((state) => state.quote);
  const isQuoting = useCartStore((state) => state.isQuoting);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const addItem = useCartStore((state) => state.addItem);
  const loadQuote = useCartStore((state) => state.loadQuote);
  const loadOrders = useOrderStore((state) => state.loadOrders);

  const subtotal = useMemo(() => localSubtotal(items), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalAmount = numericMoney(quote?.total ?? quote?.totals?.total ?? quote?.labels?.total, subtotal);
  const totalLabel = currencyLabel(quote?.labels?.total, subtotal);
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
    try {
      await updateQuantity(index, quantity);
      await refreshQuote();
    } catch (error) {
      showToast({
        type: "error",
        title: "Cart update failed",
        message: "Please try again in a moment."
      });
    }
  };

  const handleRecommendationAdd = async (item) => {
    if (addLockRef.current) {
      return;
    }

    addLockRef.current = true;
    setAddingRecommendationId(item.id);

    try {
      await addItem({
        menuItemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        basePrice: item.price || item.basePrice || 0,
        quantity: 1,
        modifierSelections: []
      });
      await refreshQuote();
    } catch (error) {
      showToast({
        type: "error",
        title: "Add to cart failed",
        message: error?.response?.data?.error || error?.message || "Please try again in a moment."
      });
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

  const openCheckout = async () => {
    if (!user || isGuest) {
      showToast({
        type: "info",
        title: "Login required",
        message: "Please sign in before checkout."
      });
      navigation.navigate("Login");
      return;
    }

    if (!address?.address && !address?.addressLine1) {
      showToast({
        type: "error",
        title: "Delivery address required",
        message: "Please select your delivery location before payment."
      });
      navigation.navigate("Address", { returnToHome: true });
      return;
    }

    try {
      setIsLoadingProcessors(true);
      setPaymentSheetVisible(true);
      const freshQuote = await loadQuote();
      const freshTotal = numericMoney(freshQuote?.total ?? freshQuote?.totals?.total ?? freshQuote?.labels?.total, totalAmount);
      const data = await listDragonpayProcessors(freshTotal);
      setPaymentProcessors(data?.processors || []);
    } catch (error) {
      showToast({
        type: "error",
        title: "Payment methods unavailable",
        message: error?.response?.data?.error || error?.message || "Please try again in a moment."
      });
    } finally {
      setIsLoadingProcessors(false);
    }
  };

  const createPayment = async (processor) => {
    try {
      setIsCreatingPayment(true);
      const deliveryAddress = address?.address || address?.addressLine1;
      const payload = {
        useCart: true,
        branchId: branchId || restaurant?.branchId || restaurant?.activeBranchId || restaurant?.defaultBranchId || restaurant?.branches?.[0]?.id,
        deliveryAddress,
        procId: processor?.procId || ""
      };

      const data = await createDragonpayPayment(payload);
      const redirectUrl = data?.payment?.redirectUrl;

      if (!redirectUrl) {
        throw new Error("Payment redirect URL missing.");
      }

      setPaymentSheetVisible(false);
      navigation.navigate("PaymentWebView", {
        url: redirectUrl,
        title: processorName(processor)
      });
      loadOrders().catch(() => null);
      showToast({
        type: "success",
        title: "Payment ready",
        message: "Complete the Dragonpay payment inside Dart."
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Payment failed",
        message: error?.response?.data?.error || error?.message || "Unable to start payment."
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (!items.length) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View className="border-b border-border bg-white px-5 pb-4 pt-2">
          <View className="flex-row items-center">
            <Pressable onPress={goBackToMenu} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#FFF0E5]">
              <Ionicons name="close" size={24} color="#FF6400" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-bold text-ink">Cart</Text>
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

            <Text className="mt-8 text-center text-2xl font-bold text-ink">Your cart is empty</Text>
            <Text className="mt-3 max-w-[280px] text-center text-base leading-6 text-muted">
              Choose a restaurant and add your favorite meals here.
            </Text>

            <View className="mt-8 w-full rounded-2xl bg-[#F6F7F8] px-4 py-4">
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                  <Ionicons name="restaurant-outline" size={20} color="#FF6400" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink">Start with a restaurant</Text>
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
          <Pressable onPress={goBackToMenu} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="close" size={24} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink">Cart</Text>
            <Text className="mt-0.5 text-sm font-medium text-muted" numberOfLines={1}>
              {restaurantName(restaurant)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 bg-[#F7F8FA]" contentContainerStyle={{ paddingBottom: 132 }}>
        <CartStepper />

        <View className="mx-5 mb-4 rounded-full bg-[#EEF0F2] p-1">
          <View className="flex-row">
            <View className="h-12 flex-1 flex-row items-center justify-center rounded-full bg-white shadow-sm">
              <Ionicons name="bicycle" size={22} color="#1F2933" />
              <Text className="ml-2 text-base font-bold text-ink">Delivery</Text>
            </View>
            <View className="h-12 flex-1 flex-row items-center justify-center rounded-full">
              <Ionicons name="walk" size={22} color="#1F2933" />
              <Text className="ml-2 text-base font-bold text-ink">Pick-up</Text>
              <Text className="ml-2 text-xs font-bold text-primary">30% off</Text>
            </View>
          </View>
        </View>

        <View className="mx-5 mb-4 flex-row items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm">
          <Text className="text-base text-ink">
            Delivery: <Text className="font-bold">15 - 30 min</Text>
          </Text>
          <Pressable>
            <Text className="text-sm font-bold text-primary">Change</Text>
          </Pressable>
        </View>

        {items.map((item, index) => (
          <CartItemRow
            key={`${item.menuItemId}-${index}`}
            item={item}
            index={index}
            quoteItem={quoteItems[index]}
            onQuantity={handleQuantity}
          />
        ))}

        <Pressable onPress={goBackToMenu} className="mx-5 mb-4 flex-row items-center rounded-2xl bg-white px-4 py-4 shadow-sm">
          <Ionicons name="add" size={24} color="#FF6400" />
          <Text className="ml-2 text-base font-bold text-ink">Add more items</Text>
        </Pressable>

        <View className="mb-4 bg-white px-5 py-5">
          <Text className="text-xl font-bold text-ink">Popular with your order</Text>
          <Text className="mt-1 text-sm text-muted">Other customers also bought these</Text>
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

        <View className="px-5 pb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink">Subtotal</Text>
            <Text className="text-lg font-bold text-ink">{currencyLabel(quote?.labels?.subtotal, subtotal)}</Text>
          </View>
          <View className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-lg font-bold text-ink">
                  Total <Text className="text-sm text-muted">(incl. fees and tax)</Text>
                </Text>
                <Text className="mt-1 text-sm font-semibold text-primary">See summary</Text>
              </View>
              <View className="items-end">
                <Text className="text-xl font-bold text-primary">{totalLabel}</Text>
                <Text className="mt-1 text-sm text-muted line-through">{money(subtotal * 1.2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[#F1F1F1] bg-white px-5 pb-6 pt-4 shadow-lg">
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[0.5px] text-muted">Cart total</Text>
            <Text className="mt-0.5 text-xl font-extrabold text-ink">{totalLabel}</Text>
          </View>
          <View className="rounded-full bg-[#FFF0E5] px-3 py-1.5">
            <Text className="text-xs font-extrabold text-primary">{itemCount} item{itemCount === 1 ? "" : "s"}</Text>
          </View>
        </View>
        <CheckoutGradientButton
          disabled={isQuoting || isLoadingProcessors}
          itemCount={itemCount}
          loading={isQuoting || isLoadingProcessors}
          onPress={openCheckout}
          totalLabel={totalLabel}
        />
      </View>
      <PaymentMethodSheet
        amountLabel={totalLabel}
        isLoading={isLoadingProcessors}
        isSubmitting={isCreatingPayment}
        processors={paymentProcessors}
        visible={paymentSheetVisible}
        onClose={() => setPaymentSheetVisible(false)}
        onSelect={createPayment}
      />
    </SafeAreaView>
  );
}
