import { useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useToast } from "../components/ui/ToastProvider";
import { getXenditPaymentStatus } from "../services/paymentService";
import { getOrder } from "../services/orderService";
import useCartStore from "../store/useCartStore";
import useNotificationStore from "../store/useNotificationStore";
import useOrderStore from "../store/useOrderStore";
import { completePaymentAndGoToOrders } from "../utils/paymentCompletion";
import {
  extractPaymentParamsFromUrl,
  isExplicitPaymentFailure,
  shouldStartPaymentConfirmation
} from "../utils/paymentConfirmation";

export default function PaymentWebViewScreen({ navigation, route }) {
  const { showToast } = useToast();
  const hydrateServerCart = useCartStore((state) => state.hydrateServerCart);
  const finalizeAfterCheckout = useCartStore((state) => state.finalizeAfterCheckout);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const webViewRef = useRef(null);
  const handledStatusRef = useRef(false);
  const pendingHandledRef = useRef(false);
  const resolvedPaymentIdRef = useRef(route?.params?.paymentId || null);
  const resolvedProviderReferenceRef = useRef(route?.params?.providerReference || null);
  const resolvedOrderIdRef = useRef(route?.params?.orderId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompletingCheckout, setIsCompletingCheckout] = useState(false);
  const [hideWebView, setHideWebView] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const url = route?.params?.url;
  const title = route?.params?.title || "Xendit checkout";
  const pendingMessage =
    route?.params?.pendingMessage ||
    "We will update your orders as soon as Dart confirms the payment.";

  const inspectPaymentPageScript = `
    (function () {
      var bodyText = document.body && document.body.innerText ? document.body.innerText : "";
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "payment-page-inspect",
        url: window.location.href,
        text: bodyText.slice(0, 4000)
      }));
    })();
    true;
  `;

  const syncAfterPayment = () => {
    loadOrders({ limit: 10 }).catch(() => null);
    loadNotifications({ limit: 20 }).catch(() => null);
    hydrateServerCart().catch(() => null);
  };

  const closePayment = () => {
    syncAfterPayment();
    navigation.goBack();
  };

  const mergeUrlParams = (pageUrl) => {
    const params = extractPaymentParamsFromUrl(pageUrl);

    if (params.paymentId) {
      resolvedPaymentIdRef.current = params.paymentId;
    }

    if (params.providerReference) {
      resolvedProviderReferenceRef.current = params.providerReference;
    }

    if (params.orderId) {
      resolvedOrderIdRef.current = params.orderId;
    }
  };

  const handlePaymentSuccess = (pageUrl = "") => {
    if (pendingHandledRef.current) {
      return;
    }

    mergeUrlParams(pageUrl);
    pendingHandledRef.current = true;
    handledStatusRef.current = true;
    setHideWebView(true);
    setIsCompletingCheckout(true);

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[payment-webview] confirming", {
        pageUrl,
        paymentId: resolvedPaymentIdRef.current,
        providerReference: resolvedProviderReferenceRef.current,
        orderId: resolvedOrderIdRef.current
      });
    }

    completePaymentAndGoToOrders({
      navigation,
      loadOrders,
      loadNotifications,
      finalizeAfterCheckout,
      hydrateServerCart,
      getPaymentStatus: resolvedPaymentIdRef.current ? getXenditPaymentStatus : null,
      getOrder,
      paymentId: resolvedPaymentIdRef.current,
      providerReference: resolvedProviderReferenceRef.current,
      orderId: resolvedOrderIdRef.current,
      showToast,
      message: pendingMessage,
      onConfirming: () => {
        setHideWebView(true);
        setIsCompletingCheckout(true);
      }
    })
      .catch((error) => {
        setIsCompletingCheckout(false);
        setHideWebView(false);
        pendingHandledRef.current = false;
        handledStatusRef.current = false;
        setPaymentStatus("failed");
        showToast({
          type: "error",
          title: "Payment not confirmed",
          message: error?.message || "Please complete payment in the browser or try again."
        });
      })
      .finally(() => {
        setIsCompletingCheckout(false);
      });
  };

  const evaluatePaymentPage = (pageText, pageUrl) => {
    if (typeof __DEV__ !== "undefined" && __DEV__ && pageUrl) {
      console.log("[payment-webview] page", pageUrl.slice(0, 180));
    }

    mergeUrlParams(pageUrl);

    if (isExplicitPaymentFailure({ pageText, pageUrl })) {
      setPaymentStatus("failed");
      if (!handledStatusRef.current) {
        handledStatusRef.current = true;
        showToast({
          type: "error",
          title: "Payment was not completed",
          message: "Please try another Xendit payment channel or start checkout again."
        });
      }
      return;
    }

    if (shouldStartPaymentConfirmation({ pageText, pageUrl })) {
      handlePaymentSuccess(pageUrl);
    }
  };

  const handlePaymentPageMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || "{}");

      if (payload.type === "payment-page-inspect" || payload.url || payload.text) {
        evaluatePaymentPage(payload.text || "", payload.url || "");
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
        {!hideWebView ? (
          <>
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
                const nextUrl = String(state?.url || "");
                evaluatePaymentPage("", nextUrl);
                webViewRef.current?.injectJavaScript(inspectPaymentPageScript);
              }}
              onMessage={handlePaymentPageMessage}
            />
          </>
        ) : null}

        {isCompletingCheckout ? (
          <View className="absolute inset-0 z-20 items-center justify-center bg-white px-6">
            <ActivityIndicator color="#FF6400" size="large" />
            <Text className="mt-3 text-center text-sm font-semibold text-ink">Confirming payment...</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-muted">
              Creating your order in Dart. You will be redirected to order tracking shortly.
            </Text>
          </View>
        ) : null}

        {paymentStatus === "failed" ? (
          <View className="absolute bottom-0 left-0 right-0 border-t border-[#F1F1F1] bg-white px-5 pb-6 pt-4">
            <View className="mb-3 flex-row items-start">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#FFF0E5]">
                <Ionicons name="alert-circle-outline" size={22} color="#FF6400" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-ink">Payment was not completed</Text>
                <Text className="mt-1 text-xs leading-5 text-muted">
                  Go back and try another Xendit payment channel.
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
