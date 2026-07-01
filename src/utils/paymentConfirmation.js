function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function extractPaymentParamsFromUrl(pageUrl = "") {
  try {
    const parsed = new URL(String(pageUrl || ""));
    return {
      paymentId:
        parsed.searchParams.get("paymentId") ||
        parsed.searchParams.get("payment_id") ||
        parsed.searchParams.get("paymentSessionId") ||
        null,
      providerReference:
        parsed.searchParams.get("providerReference") ||
        parsed.searchParams.get("reference") ||
        parsed.searchParams.get("provider_reference") ||
        null,
      orderId: parsed.searchParams.get("orderId") || parsed.searchParams.get("order_id") || null,
      status: parsed.searchParams.get("status") || parsed.searchParams.get("payment_status") || null
    };
  } catch (error) {
    return {
      paymentId: null,
      providerReference: null,
      orderId: null,
      status: null
    };
  }
}

export function isConfirmedPaymentStatus(status) {
  if (status?.confirmed === true) {
    return true;
  }

  const paymentStatus = normalizeStatus(status?.status || status?.paymentStatus || status?.state);
  return paymentStatus === "paid" && Boolean(status?.orderId);
}

export function isPaidPaymentStatus(status) {
  if (isConfirmedPaymentStatus(status)) {
    return true;
  }

  const paymentStatus = normalizeStatus(status?.status || status?.paymentStatus || status?.state);
  return ["paid", "succeeded", "success", "completed", "captured", "settled"].includes(paymentStatus);
}

export function isFailedPaymentStatus(status) {
  const paymentStatus = normalizeStatus(status?.status || status?.paymentStatus || status?.state);
  return ["failed", "cancelled", "canceled", "expired", "voided", "rejected"].includes(paymentStatus);
}

function orderMatchesPayment(order, { paymentId, providerReference }) {
  if (!order) {
    return false;
  }

  const orderPaymentId = order.paymentId || order.payment?.id || order.paymentSessionId || null;
  const orderProviderReference =
    order.providerReference || order.payment?.providerReference || order.paymentReference || null;

  if (paymentId && orderPaymentId && String(orderPaymentId) === String(paymentId)) {
    return true;
  }

  if (providerReference && orderProviderReference && String(orderProviderReference) === String(providerReference)) {
    return true;
  }

  return false;
}

function findLatestOrder(orders = []) {
  if (!orders.length) {
    return null;
  }

  return [...orders].sort((left, right) => {
    const leftTime = new Date(left?.placedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.placedAt || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  })[0];
}

export function isXenditReturnUrl(pageUrl = "") {
  const url = String(pageUrl || "").toLowerCase();
  return url.includes("/payments/xendit/return") || url.includes("/payments/xendit/mobile-return");
}

export function isDartPaymentPageUrl(pageUrl = "") {
  const url = String(pageUrl || "").toLowerCase();
  return url.includes("app.dart.com.ph") && url.includes("/payments/");
}

export function isExplicitPaymentSuccess({ pageText = "", pageUrl = "" } = {}) {
  if (isXenditReturnUrl(pageUrl) || isDartPaymentPageUrl(pageUrl)) {
    return false;
  }

  const text = String(pageText || "").toLowerCase();
  const url = String(pageUrl || "").toLowerCase();

  return (
    text.includes("payment successful") ||
    text.includes("transaction successful") ||
    text.includes("payment complete") ||
    url.includes("status=s") ||
    url.includes("payment_status=success") ||
    url.includes("payment-success")
  );
}

export function shouldStartPaymentConfirmation({ pageText = "", pageUrl = "" } = {}) {
  const text = String(pageText || "").toLowerCase();
  const url = String(pageUrl || "").toLowerCase();

  if (isXenditReturnUrl(pageUrl) || isDartPaymentPageUrl(pageUrl)) {
    return true;
  }

  if (
    text.includes("payment verification pending") ||
    text.includes("payment successful") ||
    text.includes("payment complete") ||
    text.includes("thank you for your payment") ||
    text.includes("your payment was successful") ||
    text.includes("order placed")
  ) {
    return true;
  }

  if (
    url.includes("checkout.xendit.co") &&
    (text.includes("success") || text.includes("completed") || url.includes("success"))
  ) {
    return true;
  }

  const urlStatus = extractPaymentParamsFromUrl(pageUrl).status;
  if (urlStatus && ["success", "paid", "s", "completed"].includes(normalizeStatus(urlStatus))) {
    return true;
  }

  return isExplicitPaymentSuccess({ pageText, pageUrl });
}

export function isExplicitPaymentFailure({ pageText = "", pageUrl = "" } = {}) {
  if (isXenditReturnUrl(pageUrl) || isDartPaymentPageUrl(pageUrl)) {
    return false;
  }

  const text = String(pageText || "").toLowerCase();
  const url = String(pageUrl || "").toLowerCase();

  const urlStatus = extractPaymentParamsFromUrl(pageUrl).status;
  if (urlStatus && ["failed", "f", "cancelled", "canceled", "expired"].includes(normalizeStatus(urlStatus))) {
    return true;
  }

  return (
    text.includes("transaction failed") ||
    text.includes("payment failed") ||
    text.includes("payment cancelled") ||
    text.includes("payment canceled") ||
    url.includes("status=f") ||
    url.includes("payment_status=failed") ||
    url.includes("payment-failed")
  );
}

export class CheckoutConfirmationError extends Error {
  constructor(code, details = null) {
    super(
      code === "timeout"
        ? "Payment confirmation timed out. Please check Orders in a moment."
        : "Payment was not confirmed by the server."
    );
    this.name = "CheckoutConfirmationError";
    this.code = code;
    this.details = details;
  }
}

export async function waitForCheckoutConfirmation({
  paymentId,
  providerReference,
  orderId,
  getPaymentStatus,
  loadOrders,
  getOrder,
  isServerCartEmpty,
  maxWaitMs = 120000,
  pollMs = 2500
}) {
  const startedAt = Date.now();
  const deadline = startedAt + maxWaitMs;
  let resolvedOrderId = orderId || null;

  while (Date.now() < deadline) {
    if (paymentId && getPaymentStatus) {
      try {
        const status = await getPaymentStatus(paymentId);

        if (status?.orderId) {
          resolvedOrderId = status.orderId;
        }

        if (isConfirmedPaymentStatus(status)) {
          return { ...status, orderId: status.orderId || resolvedOrderId };
        }

        if (resolvedOrderId && isPaidPaymentStatus(status)) {
          return { ...status, orderId: resolvedOrderId };
        }

        if (isFailedPaymentStatus(status)) {
          throw new CheckoutConfirmationError("failed", status);
        }
      } catch (error) {
        if (error instanceof CheckoutConfirmationError) {
          throw error;
        }
      }
    }

    if (resolvedOrderId && getOrder) {
      try {
        const data = await getOrder(resolvedOrderId);
        const order = data?.order || data;
        if (order?.id) {
          return { orderId: order.id, order, status: "paid" };
        }
      } catch (error) {
        // Order may not be visible yet.
      }
    }

    if (loadOrders) {
      const orders = await loadOrders({ limit: 15 });
      const match = (orders || []).find((order) => orderMatchesPayment(order, { paymentId, providerReference }));
      if (match) {
        return { orderId: match.id, order: match, status: "paid" };
      }

      if (isServerCartEmpty) {
        try {
          const cart = await isServerCartEmpty();
          const lineCount = cart?.items?.length || cart?.lines?.length || 0;
          const latestOrder = findLatestOrder(orders || []);

          if (cart && lineCount === 0 && latestOrder?.id) {
            return { orderId: latestOrder.id, order: latestOrder, status: "paid", source: "latest-order" };
          }
        } catch (error) {
          // Keep waiting for webhook/order creation.
        }
      }
    }

    await sleep(pollMs);
  }

  throw new CheckoutConfirmationError("timeout");
}
