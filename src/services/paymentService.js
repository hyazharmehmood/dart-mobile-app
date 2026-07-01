import api, { API_BASE_URL } from "./api";

export function getCheckoutOrigin(baseUrl = API_BASE_URL) {
  const configuredOrigin =
    process.env.EXPO_PUBLIC_CHECKOUT_ORIGIN ||
    process.env.EXPO_PUBLIC_APP_URL ||
    baseUrl;

  const normalized = String(configuredOrigin || "")
    .trim()
    .replace(/\/$/, "");

  if (!normalized) {
    return "https://app.dart.com.ph";
  }

  if (/^https:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^http:\/\//i.test(normalized)) {
    return normalized.replace(/^http:\/\//i, "https://");
  }

  return `https://${normalized.replace(/^\/+/, "")}`;
}

export function buildComponentsOrigins(origin = getCheckoutOrigin()) {
  return [origin];
}

export function channelCode(channel) {
  return channel?.code || channel?.paymentChannel || channel?.id || null;
}

export function channelLabel(channel) {
  return channel?.label || channel?.name || channelCode(channel) || "Payment method";
}

export function channelDescription(channel) {
  if (channel?.mode === "components") {
    return "Secure card entry with Xendit";
  }

  if (channel?.mode === "redirect") {
    return channel?.description || "Secure redirect checkout";
  }

  return channel?.description || channelCode(channel) || "Xendit payment channel";
}

export function normalizeXenditChannels(channels = []) {
  return channels.map((channel) => ({
    ...channel,
    code: channelCode(channel),
    paymentChannel: channelCode(channel)
  }));
}

export function isComponentsChannel(channel) {
  return channel?.mode === "components";
}

export function isComponentsSession(session) {
  const mode = String(session?.mode || "").toLowerCase();
  return mode === "components" || Boolean(session?.cardCheckoutUrl || session?.componentsSdkKey);
}

export function isRedirectSession(session) {
  const mode = String(session?.mode || "").toLowerCase();
  return mode === "redirect" || Boolean(session?.redirectUrl);
}

export function buildXenditSessionPayload({
  channel,
  deliveryAddress,
  branchId,
  restaurantSlug,
  restaurantId,
  useCart = true,
  client = "mobile",
  cardCheckoutStrategy = "mobile"
}) {
  const paymentChannel = channelCode(channel);

  if (!paymentChannel) {
    throw new Error("Payment channel is missing.");
  }

  if (!deliveryAddress) {
    throw new Error("Delivery address is required.");
  }

  const payload = {
    useCart,
    deliveryAddress,
    paymentChannel,
    client
  };

  if (paymentChannel === "CARDS") {
    const checkoutOrigin = getCheckoutOrigin();
    const componentsAllowedOrigins = buildComponentsOrigins(checkoutOrigin);

    payload.checkoutOrigin = checkoutOrigin;
    payload.useHostedCardCheckout = true;

    if (cardCheckoutStrategy === "mobile-full") {
      payload.componentsAllowedOrigins = componentsAllowedOrigins;
      payload.componentsConfiguration = {
        origins: componentsAllowedOrigins
      };
    }
  }

  if (branchId) {
    payload.branchId = branchId;
  }

  if (restaurantSlug) {
    payload.restaurantSlug = restaurantSlug;
  } else if (restaurantId) {
    payload.restaurantId = restaurantId;
  }

  return payload;
}

export function buildXenditSessionPayloadVariants(options) {
  const paymentChannel = channelCode(options.channel);

  if (paymentChannel !== "CARDS") {
    return [buildXenditSessionPayload(options)];
  }

  return [
    buildXenditSessionPayload({
      ...options,
      client: "web",
      cardCheckoutStrategy: "web-hosted"
    }),
    buildXenditSessionPayload({
      ...options,
      client: "mobile",
      cardCheckoutStrategy: "mobile-hosted"
    }),
    buildXenditSessionPayload({
      ...options,
      client: "mobile",
      cardCheckoutStrategy: "mobile-full"
    })
  ];
}

export function extractXenditPaymentSession(data) {
  const payment = data?.payment || data?.session || data;
  const componentsSdkKey =
    payment?.componentsSdkKey ||
    payment?.components_sdk_key ||
    payment?.sessionClientKey ||
    data?.componentsSdkKey ||
    data?.components_sdk_key ||
    null;

  return {
    payment,
    mode: payment?.mode || data?.mode,
    redirectUrl: payment?.redirectUrl || payment?.checkoutUrl || payment?.paymentUrl || data?.redirectUrl || null,
    cardCheckoutUrl: payment?.cardCheckoutUrl || payment?.card_checkout_url || data?.cardCheckoutUrl || null,
    componentsSdkKey,
    publicKey: payment?.publicKey || data?.publicKey || null,
    pollUrl: payment?.pollUrl || data?.pollUrl || null,
    paymentId: payment?.id || payment?.paymentId || data?.paymentId || null,
    orderId: payment?.orderId || data?.orderId || null,
    providerReference: payment?.providerReference || data?.providerReference || null,
    status: payment?.status || data?.status || null
  };
}

export function resolveAbsoluteApiUrl(url, baseUrl = API_BASE_URL) {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalizedBase = String(baseUrl || "").replace(/\/$/, "");
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  if (!normalizedBase) {
    return trimmed;
  }

  return `${normalizedBase}${normalizedPath}`;
}

export function isValidHostedCardCheckoutUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.pathname.includes("/payments/xendit/mobile-card") &&
      (parsed.searchParams.has("token") || parsed.searchParams.has("sessionToken"))
    );
  } catch (error) {
    return false;
  }
}

export function isDartHostedCardCheckoutUrl(url = "") {
  return String(url).toLowerCase().includes("/payments/xendit/mobile-card");
}

export function resolveCardCheckoutTarget(session) {
  const hostedUrl = resolveAbsoluteApiUrl(session?.cardCheckoutUrl);

  if (hostedUrl) {
    return { type: "url", value: hostedUrl, hostedBy: isDartHostedCardCheckoutUrl(hostedUrl) ? "dart" : "external" };
  }

  const redirectUrl = resolveAbsoluteApiUrl(session?.redirectUrl);
  if (redirectUrl && isComponentsSession(session)) {
    return { type: "url", value: redirectUrl, hostedBy: "external" };
  }

  if (session?.componentsSdkKey) {
    return { type: "components", value: session.componentsSdkKey, hostedBy: "inline" };
  }

  return null;
}

export function isCardCheckoutOriginError(error) {
  const message = [
    error?.response?.data?.error,
    error?.response?.data?.message,
    error?.message,
    typeof error?.response?.data === "string" ? error.response.data : null,
    JSON.stringify(error?.response?.data?.details || {})
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    message.includes("components_configuration.origins") ||
    message.includes("need to use https") ||
    message.includes("allowed origins")
  );
}

export function getCardCheckoutOriginErrorMessage(error) {
  if (!isCardCheckoutOriginError(error)) {
    return null;
  }

  const origin = getCheckoutOrigin();
  return `Card checkout needs HTTPS origin ${origin} on the server. Ask backend to set XENDIT_COMPONENTS_ALLOWED_ORIGINS=${origin} and return cardCheckoutUrl for mobile.`;
}

export async function getXenditPaymentStatus(paymentId) {
  const response = await api.get(`/api/customer/payments/xendit/session/${paymentId}/status`);
  return response.data;
}

export async function listXenditChannels() {
  const response = await api.get("/api/customer/payments/xendit/channels");
  return response.data;
}

export async function createXenditPaymentSession(payload) {
  const response = await api.post("/api/customer/payments/xendit/session", payload);
  return response.data;
}

export async function createXenditPaymentSessionWithFallback(payloadVariants = []) {
  let lastError = null;

  for (const payload of payloadVariants) {
    try {
      const data = await createXenditPaymentSession(payload);

      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[xendit-session] created with", {
          client: payload.client,
          paymentChannel: payload.paymentChannel,
          strategy: payload.cardCheckoutStrategy || "default"
        });
      }

      return data;
    } catch (error) {
      lastError = error;

      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[xendit-session] attempt failed", {
          client: payload.client,
          strategy: payload.cardCheckoutStrategy || "default",
          error: error?.response?.data?.error || error?.message
        });
      }

      if (!isCardCheckoutOriginError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Unable to start card payment.");
}
