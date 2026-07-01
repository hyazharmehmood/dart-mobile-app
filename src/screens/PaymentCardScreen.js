import { useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useToast } from "../components/ui/ToastProvider";
import { getXenditPaymentStatus, getCheckoutOrigin } from "../services/paymentService";
import { getOrder } from "../services/orderService";
import useCartStore from "../store/useCartStore";
import useNotificationStore from "../store/useNotificationStore";
import useOrderStore from "../store/useOrderStore";
import { buildXenditCardCheckoutHtml } from "../utils/xenditCardCheckoutHtml";
import { completePaymentAndGoToOrders } from "../utils/paymentCompletion";

const HOSTED_PAGE_PROBE_SCRIPT = `
  (function () {
    var text = document.body && document.body.innerText ? document.body.innerText : "";
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "hosted-page-probe",
      text: text.slice(0, 2000)
    }));
  })();
  true;
`;

function isCardSessionCompleteMessage(payload = {}) {
  const type = String(payload?.type || payload?.event || "").toLowerCase();
  return type === "session-complete" || type === "xendit_session_complete";
}

function hostedPageLooksBroken(pageText = "") {
  const text = String(pageText || "").toLowerCase();
  return (
    text.includes("missing checkout token") ||
    text.includes("checkout token is missing") ||
    text.includes("invalid checkout token") ||
    text.includes("session expired") ||
    text.includes("page not found")
  );
}

export default function PaymentCardScreen({ navigation, route }) {
  const { showToast } = useToast();
  const hydrateServerCart = useCartStore((state) => state.hydrateServerCart);
  const finalizeAfterCheckout = useCartStore((state) => state.finalizeAfterCheckout);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const handledStatusRef = useRef(false);
  const fallbackAttemptedRef = useRef(false);
  const webViewRef = useRef(null);
  const initialCheckoutUrl = route?.params?.url || route?.params?.cardCheckoutUrl || null;
  const componentsSdkKey = route?.params?.componentsSdkKey;
  const paymentId = route?.params?.paymentId;
  const orderId = route?.params?.orderId;
  const providerReference = route?.params?.providerReference;
  const title = route?.params?.title || "Card payment";
  const pendingMessage =
    route?.params?.pendingMessage ||
    "We will update your orders as soon as Dart confirms the payment.";

  const [checkoutMode, setCheckoutMode] = useState(() => {
    if (initialCheckoutUrl) {
      return "url";
    }

    return componentsSdkKey ? "components" : null;
  });
  const [checkoutUrl, setCheckoutUrl] = useState(initialCheckoutUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompletingCheckout, setIsCompletingCheckout] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const checkoutHtml = useMemo(
    () => (checkoutMode === "components" && componentsSdkKey ? buildXenditCardCheckoutHtml(componentsSdkKey) : null),
    [checkoutMode, componentsSdkKey]
  );

  const usesHostedCheckout = checkoutMode === "url" && Boolean(checkoutUrl);

  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[payment-card]", {
        checkoutMode,
        checkoutUrl,
        hasComponentsSdkKey: Boolean(componentsSdkKey),
        paymentId
      });
    }
  }, [checkoutMode, checkoutUrl, componentsSdkKey, paymentId]);

  const switchToComponentsFallback = (reason) => {
    if (fallbackAttemptedRef.current || !componentsSdkKey || checkoutMode === "components") {
      return false;
    }

    fallbackAttemptedRef.current = true;
    setCheckoutUrl(null);
    setCheckoutMode("components");
    setPaymentStatus(null);
    setIsLoading(true);

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[payment-card] falling back to embedded components:", reason);
    }

    return true;
  };

  const syncAfterPayment = () => {
    loadOrders({ limit: 10 }).catch(() => null);
    loadNotifications({ limit: 20 }).catch(() => null);
    hydrateServerCart().catch(() => null);
  };

  const closePayment = () => {
    syncAfterPayment();
    navigation.goBack();
  };

  const handleHostedLoadFailure = (reason, { showToastOnFailure = true } = {}) => {
    if (switchToComponentsFallback(reason)) {
      return;
    }

    setIsLoading(false);
    setPaymentStatus("failed");

    if (showToastOnFailure) {
      showToast({
        type: "error",
        title: "Card checkout failed to load",
        message: reason || "Please check your connection and try again."
      });
    }
  };

  const handlePaymentSuccess = () => {
    if (handledStatusRef.current) {
      return;
    }

    handledStatusRef.current = true;
    setIsCompletingCheckout(true);
    completePaymentAndGoToOrders({
      navigation,
      loadOrders,
      loadNotifications,
      finalizeAfterCheckout,
      hydrateServerCart,
      getPaymentStatus: paymentId ? getXenditPaymentStatus : null,
      getOrder,
      paymentId,
      providerReference,
      orderId,
      showToast,
      message: pendingMessage,
      onConfirming: () => setIsCompletingCheckout(true)
    })
      .catch((error) => {
        setIsCompletingCheckout(false);
        handledStatusRef.current = false;
        setPaymentStatus("failed");
        showToast({
          type: "error",
          title: "Payment not confirmed",
          message: error?.message || "Please try card payment again."
        });
      })
      .finally(() => {
        setIsCompletingCheckout(false);
      });
  };

  const handleWebViewMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || "{}");

      if (payload.type === "hosted-page-probe") {
        if (hostedPageLooksBroken(payload.text)) {
          handleHostedLoadFailure("Hosted card checkout is missing a valid session token.");
        } else {
          setIsLoading(false);
        }
        return;
      }

      if (isCardSessionCompleteMessage(payload)) {
        setIsLoading(false);
        handlePaymentSuccess();
        return;
      }

      switch (payload.type) {
        case "ready":
          setIsLoading(false);
          break;
        case "submission-begin":
          setIsLoading(true);
          break;
        case "submission-end":
          setIsLoading(false);
          if (payload.userErrorMessage?.length) {
            showToast({
              type: "error",
              title: "Card payment failed",
              message: payload.userErrorMessage.join(" ")
            });
          }
          break;
        case "session-expired":
          setIsLoading(false);
          setPaymentStatus("failed");
          showToast({
            type: "error",
            title: "Payment session expired",
            message: "Please start checkout again from your cart."
          });
          break;
        case "fatal-error":
          setIsLoading(false);
          if (switchToComponentsFallback(payload.message || "hosted fatal error")) {
            return;
          }
          setPaymentStatus("failed");
          if (!handledStatusRef.current) {
            showToast({
              type: "error",
              title: "Card payment unavailable",
              message: payload.message || "Please try another payment method."
            });
          }
          break;
        default:
          break;
      }
    } catch (error) {
      const rawMessage = String(event.nativeEvent.data || "");
      if (rawMessage.toLowerCase().includes("xendit_session_complete")) {
        handlePaymentSuccess();
      }
    }
  };

  if (!checkoutUrl && !checkoutHtml) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FFF0E5]">
            <Ionicons name="alert-circle-outline" size={30} color="#FF6400" />
          </View>
          <Text className="mt-5 text-center text-xl font-bold text-ink">Card checkout unavailable</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-muted">
            The server did not return a usable card checkout URL or session key.
          </Text>
          <Pressable onPress={closePayment} className="mt-7 h-12 items-center justify-center rounded-2xl bg-primary px-8">
            <Text className="text-base font-bold text-white">Back to cart</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const webViewSource = usesHostedCheckout
    ? { uri: checkoutUrl }
    : { html: checkoutHtml, baseUrl: getCheckoutOrigin() };

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
              Secure card entry with Xendit
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1">
        {isLoading ? (
          <View className="absolute inset-0 z-10 items-center justify-center bg-white/90">
            <ActivityIndicator color="#FF6400" size="large" />
            <Text className="mt-3 text-sm font-semibold text-muted">
              {usesHostedCheckout ? "Opening secure card checkout..." : "Preparing secure card form..."}
            </Text>
          </View>
        ) : null}

        <WebView
          key={checkoutMode === "components" ? "components" : checkoutUrl}
          ref={webViewRef}
          originWhitelist={["*"]}
          source={webViewSource}
          startInLoadingState
          onLoadEnd={() => {
            if (usesHostedCheckout) {
              webViewRef.current?.injectJavaScript(HOSTED_PAGE_PROBE_SCRIPT);
              return;
            }

            setIsLoading(false);
          }}
          onError={(event) => {
            handleHostedLoadFailure(
              event?.nativeEvent?.description || "Unable to open the hosted card checkout page."
            );
          }}
          onHttpError={(event) => {
            const statusCode = event?.nativeEvent?.statusCode;
            handleHostedLoadFailure(
              statusCode
                ? `Hosted card checkout returned HTTP ${statusCode}.`
                : "Hosted card checkout returned an error response."
            );
          }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          scalesPageToFit={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScript={
            usesHostedCheckout
              ? `
            (function () {
              window.addEventListener("message", function (event) {
                try {
                  var data = event.data;
                  if (!data) {
                    return;
                  }
                  if (typeof data === "string") {
                    if (data.toLowerCase().indexOf("xendit_session_complete") !== -1) {
                      window.ReactNativeWebView.postMessage(data);
                    }
                    return;
                  }
                  if (data.type === "xendit_session_complete" || data.event === "xendit_session_complete") {
                    window.ReactNativeWebView.postMessage(JSON.stringify(data));
                  }
                } catch (error) {}
              });
            })();
            true;
          `
              : `
            (function () {
              var meta = document.querySelector('meta[name=viewport]');
              if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'viewport';
                document.head.appendChild(meta);
              }
              meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
            })();
            true;
          `
          }
        />

        {isCompletingCheckout ? (
          <View className="absolute inset-0 z-20 items-center justify-center bg-white/95 px-6">
            <ActivityIndicator color="#FF6400" size="large" />
            <Text className="mt-3 text-center text-sm font-semibold text-ink">Confirming payment...</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-muted">
              Waiting for Dart to create your order and clear the cart.
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
