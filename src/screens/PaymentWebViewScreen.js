import { useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useToast } from "../components/ui/ToastProvider";
import useCartStore from "../store/useCartStore";
import useNotificationStore from "../store/useNotificationStore";
import useOrderStore from "../store/useOrderStore";

export default function PaymentWebViewScreen({ navigation, route }) {
  const { showToast } = useToast();
  const clearCart = useCartStore((state) => state.clearCart);
  const resetLocalCartState = useCartStore((state) => state.resetLocalCartState);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const webViewRef = useRef(null);
  const handledStatusRef = useRef(false);
  const successHandledRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const url = route?.params?.url;
  const title = route?.params?.title || "Dragonpay";
  const initialOrderId = route?.params?.orderId || null;

  const inspectPaymentPageScript = `
    (function () {
      var bodyText = document.body && document.body.innerText ? document.body.innerText : "";
      window.ReactNativeWebView.postMessage(JSON.stringify({
        url: window.location.href,
        text: bodyText.slice(0, 3000)
      }));
    })();
    true;
  `;

  const closePayment = () => {
    loadOrders().catch(() => null);
    navigation.goBack();
  };

  const navigateAfterSuccess = async () => {
    let targetOrderId = initialOrderId;

    try {
      const orders = await loadOrders({ limit: 10, force: true });
      targetOrderId = targetOrderId || orders?.[0]?.id || orders?.[0]?.orderId || null;
    } catch (error) {
      targetOrderId = targetOrderId || null;
    }

    loadNotifications({ limit: 20 }).catch(() => null);

    const routes = [{ name: "Home" }];

    if (targetOrderId) {
      routes.push({ name: "OrderDetail", params: { orderId: targetOrderId } });
    } else {
      routes.push({ name: "Orders" });
    }

    navigation.reset({
      index: routes.length - 1,
      routes
    });
  };

  const finalizePaymentSuccess = () => {
    if (successHandledRef.current) {
      return;
    }

    successHandledRef.current = true;
    handledStatusRef.current = true;
    setPaymentStatus("success");
    clearCart().catch(() => resetLocalCartState());
    showToast({
      type: "success",
      title: "Payment successful",
      message: "Opening your order details."
    });
    navigateAfterSuccess();
  };

  const handlePaymentPageMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || "{}");
      const pageText = String(payload.text || "").toLowerCase();
      const pageUrl = String(payload.url || "").toLowerCase();

      const isFailure =
        pageText.includes("3ds verification is unsuccessful") ||
        pageText.includes("transaction failed") ||
        pageText.includes("payment failed") ||
        pageUrl.includes("status=f") ||
        pageUrl.includes("status=v") ||
        pageUrl.includes("failed");

      const isSuccess =
        pageText.includes("payment successful") ||
        pageText.includes("transaction successful") ||
        pageUrl.includes("status=s") ||
        pageUrl.includes("success") ||
        pageUrl.includes("paid") ||
        pageUrl.includes("completed");

      if (isFailure) {
        setPaymentStatus("failed");
        if (!handledStatusRef.current) {
          handledStatusRef.current = true;
          showToast({
            type: "error",
            title: "Card verification failed",
            message: "Dragonpay UAT rejected the 3DS verification. Try again or use Test Bank Online for UAT."
          });
        }
        return;
      }

      if (isSuccess) {
        finalizePaymentSuccess();
      }
    } catch (error) {
      // Ignore non-JSON messages from the payment page.
    }
  };

  if (!url) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FFF0E5]">
            <Ionicons name="alert-circle-outline" size={30} color="#FF6400" />
          </View>
          <Text className="mt-5 text-center text-xl font-bold text-ink">Payment link unavailable</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-muted">
            Please go back and choose a payment method again.
          </Text>
          <Pressable onPress={closePayment} className="mt-7 h-12 items-center justify-center rounded-2xl bg-primary px-8">
            <Text className="text-base font-bold text-white">Back to cart</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="border-b border-border bg-white px-4 pb-3 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={closePayment} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
            <Ionicons name="close" size={23} color="#1F2933" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
              {title}
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-muted" numberOfLines={1}>
              Secure payment inside Dart
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1">
        {isLoading ? (
          <View className="absolute inset-0 z-10 items-center justify-center bg-white">
            <ActivityIndicator color="#FF6400" size="large" />
            <Text className="mt-3 text-sm font-semibold text-muted">Opening secure payment...</Text>
          </View>
        ) : null}
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          startInLoadingState
          onLoadEnd={() => {
            setIsLoading(false);
            webViewRef.current?.injectJavaScript(inspectPaymentPageScript);
          }}
          onError={() => {
            setIsLoading(false);
            setPaymentStatus("failed");
            showToast({
              type: "error",
              title: "Payment page failed",
              message: "Please check your connection and try again."
            });
          }}
          onNavigationStateChange={(state) => {
            const nextUrl = String(state?.url || "").toLowerCase();
            if (nextUrl.includes("status=f") || nextUrl.includes("status=v") || nextUrl.includes("failed")) {
              setPaymentStatus("failed");
            }

            if (nextUrl.includes("status=s") || nextUrl.includes("success") || nextUrl.includes("paid") || nextUrl.includes("completed")) {
              finalizePaymentSuccess();
            }
          }}
          onMessage={handlePaymentPageMessage}
        />

        {paymentStatus === "failed" ? (
          <View className="absolute bottom-0 left-0 right-0 border-t border-[#F1F1F1] bg-white px-5 pb-6 pt-4">
            <View className="mb-3 flex-row items-start">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#FFF0E5]">
                <Ionicons name="alert-circle-outline" size={22} color="#FF6400" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-ink">Payment was not completed</Text>
                <Text className="mt-1 text-xs leading-5 text-muted">
                  Card 3DS can fail in Dragonpay UAT. Go back and try another method like Test Bank Online.
                </Text>
              </View>
            </View>
            <Pressable onPress={closePayment} className="h-14 items-center justify-center rounded-2xl bg-primary px-5">
              <Text className="text-base font-extrabold text-white">Back to cart</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
