import { CheckoutConfirmationError, waitForCheckoutConfirmation } from "./paymentConfirmation";

export async function completePaymentAndGoToOrders({
  navigation,
  loadOrders,
  loadNotifications,
  finalizeAfterCheckout,
  hydrateServerCart,
  getPaymentStatus,
  getOrder,
  paymentId,
  providerReference,
  orderId,
  showToast,
  onConfirming,
  message = "Your order is being processed."
}) {
  onConfirming?.();

  let confirmedOrderId = orderId;

  try {
    const confirmation = await waitForCheckoutConfirmation({
      paymentId,
      providerReference,
      orderId,
      getPaymentStatus,
      loadOrders,
      getOrder,
      isServerCartEmpty: hydrateServerCart
    });
    confirmedOrderId = confirmation?.orderId || orderId;
  } catch (error) {
    if (error instanceof CheckoutConfirmationError && error.code === "timeout") {
      showToast({
        type: "info",
        title: "Payment received",
        message: "Confirmation is taking longer than usual. Check Orders for updates."
      });
    } else if (error instanceof CheckoutConfirmationError) {
      throw error;
    } else {
      throw error;
    }
  }

  if (!confirmedOrderId) {
    try {
      const orders = await loadOrders({ limit: 5 });
      confirmedOrderId = orders?.[0]?.id || confirmedOrderId;
    } catch (error) {
      // Fall back to Orders list.
    }
  }

  await Promise.all([
    Promise.allSettled([loadOrders({ limit: 10 }), loadNotifications({ limit: 20 })]),
    finalizeAfterCheckout()
  ]);

  showToast({
    type: "success",
    title: "Payment successful",
    message
  });

  navigation.reset({
    index: 1,
    routes: [
      { name: "Home" },
      confirmedOrderId
        ? { name: "OrderTracking", params: { orderId: confirmedOrderId } }
        : { name: "Orders" }
    ]
  });
}
