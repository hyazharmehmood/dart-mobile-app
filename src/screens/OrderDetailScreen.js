import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StatusBar, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/ui/Button";
import { useToast } from "../components/ui/ToastProvider";
import { getOrderDisputeState, openDispute } from "../services/disputeService";
import { createReview, getReview, getReviewEligibility, updateReview } from "../services/reviewService";
import { joinOrderRoom, leaveOrderRoom } from "../services/socketService";
import { uploadReviewPhoto } from "../services/uploadService";
import useOrderStore from "../store/useOrderStore";

const EMPTY_EVENTS = [];

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "₱0.00";
  }

  if (typeof value === "number") {
    return `₱${value.toFixed(2)}`;
  }

  return String(value).replace(/^Rs\.?\s*/i, "₱").replace(/^PHP\s*/i, "₱");
}

function formatDate(value) {
  if (!value) {
    return "Recent order";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function statusLabel(status) {
  return String(status || "pending").replace(/_/g, " ").toLowerCase();
}

function statusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("deliver") || normalized.includes("complete")) {
    return { icon: "checkmark-circle", label: "Delivered", tone: "success" };
  }

  if (normalized.includes("cancel") || normalized.includes("fail")) {
    return { icon: "close-circle", label: "Cancelled", tone: "danger" };
  }

  if (normalized.includes("prepar") || normalized.includes("accept")) {
    return { icon: "restaurant", label: "Preparing", tone: "primary" };
  }

  if (
    normalized.includes("driver_assigned") ||
    normalized.includes("driver_auto_assigned") ||
    normalized.includes("driver_accepted") ||
    normalized.includes("rider") ||
    normalized.includes("pickup") ||
    normalized.includes("picked_up") ||
    normalized.includes("on_the_way") ||
    normalized.includes("transit")
  ) {
    return { icon: "bicycle", label: "On the way", tone: "primary" };
  }

  return { icon: "time", label: statusLabel(status), tone: "primary" };
}

function isDelivered(order) {
  return String(order?.statusCode || order?.status || "").toLowerCase().includes("deliver");
}

function RatingRow({ label, value, onChange }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-ink">{label}</Text>
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Pressable key={rating} onPress={() => onChange(rating)} className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-[#FFF0E5]">
            <Ionicons name={rating <= value ? "star" : "star-outline"} size={20} color="#FF6400" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ReviewModal({
  visible,
  foodRating,
  deliveryRating,
  comment,
  photos,
  isSubmitting,
  onClose,
  onFoodRating,
  onDeliveryRating,
  onComment,
  onPickPhoto,
  onSubmit
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-[28px] bg-white px-5 pb-6 pt-5">
          <Text className="text-xl font-extrabold text-ink">Review order</Text>
          <Text className="mt-1 text-sm text-muted">Share feedback for this delivered order.</Text>
          <View className="mt-5">
            <RatingRow label="Food" value={foodRating} onChange={onFoodRating} />
            <RatingRow label="Delivery" value={deliveryRating} onChange={onDeliveryRating} />
            <TextInput
              value={comment}
              onChangeText={onComment}
              placeholder="Optional comment"
              placeholderTextColor="#9CA3AF"
              multiline
              className="min-h-[100px] rounded-2xl border border-border px-4 py-3 text-base text-ink"
            />
            <Pressable
              disabled={isSubmitting || photos.length >= 3}
              onPress={onPickPhoto}
              className="mt-4 flex-row items-center justify-center rounded-2xl border border-border px-4 py-3"
            >
              <Ionicons name="image-outline" size={20} color="#FF6400" />
              <Text className="ml-2 text-sm font-bold text-primary">
                {photos.length ? `${photos.length}/3 photos added` : "Add photo"}
              </Text>
            </Pressable>
            <Button title="Submit review" onPress={onSubmit} loading={isSubmitting} className="mt-5" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DisputeModal({ visible, type, summary, isSubmitting, onClose, onType, onSummary, onSubmit }) {
  const types = ["MISSING_WRONG_ITEM", "FOOD_QUALITY", "DELIVERY_ISSUE", "PAYMENT_REFUND", "OTHER"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-[28px] bg-white px-5 pb-6 pt-5">
          <Text className="text-xl font-extrabold text-ink">Open dispute</Text>
          <Text className="mt-1 text-sm text-muted">Tell support what went wrong.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5">
            {types.map((item) => (
              <Pressable
                key={item}
                onPress={() => onType(item)}
                className={`mr-2 rounded-full px-4 py-2 ${type === item ? "bg-primary" : "bg-[#F6F7F8]"}`}
              >
                <Text className={`text-xs font-bold ${type === item ? "text-white" : "text-ink"}`}>{item.replace(/_/g, " ")}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={summary}
            onChangeText={onSummary}
            placeholder="Summarize the issue"
            placeholderTextColor="#9CA3AF"
            multiline
            className="mt-5 min-h-[110px] rounded-2xl border border-border px-4 py-3 text-base text-ink"
          />
          <Button title="Submit dispute" onPress={onSubmit} loading={isSubmitting} disabled={!summary.trim()} className="mt-5" />
        </View>
      </View>
    </Modal>
  );
}

function eventTitle(event) {
  return event?.message || String(event?.type || "Order update").replace(/_/g, " ").toLowerCase();
}

function orderItems(order) {
  return order?.items || order?.cartItems || order?.lines || order?.orderItems || [];
}

function itemName(item) {
  return item?.name || item?.menuItemName || item?.menuItem?.name || item?.product?.name || "Menu item";
}

function itemImage(item) {
  return item?.imageUrl || item?.image || item?.menuItem?.imageUrl || item?.menuItem?.image || item?.product?.imageUrl || null;
}

function itemQuantity(item) {
  return Number(item?.quantity || item?.qty || 1);
}

function itemTotal(item) {
  return item?.labels?.total || item?.totalLabel || item?.lineTotal || item?.total || item?.unitPriceSnapshot || item?.price;
}

function addressText(order) {
  const address = order?.deliveryAddress || order?.address || order?.customerAddress || {};

  if (typeof address === "string") {
    return address;
  }

  return (
    address.formattedAddress ||
    address.addressLine1 ||
    order?.deliveryAddressLabel ||
    order?.addressLabel ||
    "Delivery address unavailable"
  );
}

function SummaryRow({ label, value, strong }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className={`text-sm ${strong ? "font-extrabold text-ink" : "font-medium text-muted"}`}>{label}</Text>
      <Text className={`text-sm ${strong ? "font-extrabold text-primary" : "font-bold text-ink"}`}>{formatMoney(value)}</Text>
    </View>
  );
}

function OrderItemRow({ item }) {
  const image = itemImage(item);

  return (
    <View className="flex-row border-b border-[#F1F2F4] py-4 last:border-b-0">
      <View className="mr-3 h-14 w-14 overflow-hidden rounded-2xl bg-[#FFF4ED]">
        {image ? (
          <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="fast-food-outline" size={24} color="#FF6400" />
          </View>
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-3 text-sm font-extrabold text-ink" numberOfLines={2}>
            {itemName(item)}
          </Text>
          <Text className="text-sm font-extrabold text-ink">{formatMoney(itemTotal(item))}</Text>
        </View>
        <Text className="mt-1 text-xs font-semibold text-muted">Qty {itemQuantity(item)}</Text>
        {item.specialInstructions ? (
          <Text className="mt-1 text-xs leading-4 text-muted" numberOfLines={2}>
            {item.specialInstructions}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Timeline({ events, currentStatus }) {
  const fallback = events.length
    ? events
    : [
        {
          id: "current",
          type: currentStatus || "pending",
          message: currentStatus ? `Order ${statusLabel(currentStatus)}` : "Waiting for order updates"
        }
      ];

  return (
    <View className="rounded-[24px] bg-white px-5 py-5 shadow-sm">
      <View className="mb-1 flex-row items-center">
        <Ionicons name="radio-outline" size={20} color="#FF6400" />
        <Text className="ml-2 text-lg font-extrabold text-ink">Live tracking</Text>
      </View>
      <Text className="mb-4 text-sm text-muted">Realtime order activity will appear here.</Text>

      {fallback.map((event, index) => {
        const isLast = index === fallback.length - 1;

        return (
          <View key={event.id || event.eventId || `${event.type}-${index}`} className="flex-row">
            <View className="mr-3 items-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#FFF0E5]">
                <Ionicons name={index === 0 ? "checkmark" : "ellipse"} size={index === 0 ? 18 : 10} color="#FF6400" />
              </View>
              {!isLast ? <View className="h-10 w-px bg-[#FFE1D2]" /> : null}
            </View>
            <View className="flex-1 pb-5 pt-1">
              <Text className="text-sm font-extrabold capitalize text-ink">{eventTitle(event)}</Text>
              {event.createdAt ? <Text className="mt-1 text-xs text-muted">{formatDate(event.createdAt)}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderDetailScreen({ navigation, route }) {
  const { showToast } = useToast();
  const orderId = route?.params?.orderId || route?.params?.order?.id;
  const fallbackOrder = route?.params?.order || null;
  const order = useOrderStore((state) => state.orderDetails[orderId]) || fallbackOrder;
  const events = useOrderStore((state) => state.orderEvents[orderId] || EMPTY_EVENTS);
  const isLoading = useOrderStore((state) => state.isLoading);
  const loadOrderDetail = useOrderStore((state) => state.loadOrderDetail);
  const loadOrderEvents = useOrderStore((state) => state.loadOrderEvents);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [disputeState, setDisputeState] = useState(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [foodRating, setFoodRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [disputeType, setDisputeType] = useState("MISSING_WRONG_ITEM");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const refresh = () => {
    if (!orderId) {
      return;
    }

    Promise.all([
      loadOrderDetail(orderId),
      loadOrderEvents(orderId),
      getReviewEligibility(orderId).then(setReviewEligibility).catch(() => null),
      getOrderDisputeState(orderId).then(setDisputeState).catch(() => null)
    ]).catch((error) => {
      showToast({
        type: "error",
        title: "Order unavailable",
        message: error?.response?.data?.error || error?.message || "Please try again in a moment."
      });
    });
  };

  useEffect(() => {
    refresh();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      return undefined;
    }

    joinOrderRoom(orderId);
    return () => leaveOrderRoom(orderId);
  }, [orderId]);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Orders");
  };

  const meta = statusMeta(order?.status);
  const items = orderItems(order);
  const delivered = isDelivered(order);

  const submitReview = async () => {
    try {
      setIsSubmittingAction(true);
      const payload = {
        foodRating,
        deliveryRating,
        comment: reviewComment.trim(),
        photos: reviewPhotos
      };

      if (reviewEligibility?.existingReviewId) {
        await updateReview(reviewEligibility.existingReviewId, payload);
      } else {
        await createReview(orderId, payload);
      }
      setReviewVisible(false);
      setReviewPhotos([]);
      const nextEligibility = await getReviewEligibility(orderId).catch(() => ({ eligible: false }));
      setReviewEligibility(nextEligibility);
      showToast({ type: "success", title: "Review submitted", message: "Thanks for your feedback." });
    } catch (error) {
      showToast({
        type: "error",
        title: "Review failed",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const openReviewModal = async () => {
    if (reviewEligibility?.existingReviewId) {
      try {
        setIsSubmittingAction(true);
        const data = await getReview(reviewEligibility.existingReviewId);
        const review = data?.review || data;
        setFoodRating(Number(review?.foodRating) || 5);
        setDeliveryRating(Number(review?.deliveryRating) || 5);
        setReviewComment(review?.comment || "");
        setReviewPhotos(review?.photos || []);
      } catch (error) {
        showToast({
          type: "error",
          title: "Review unavailable",
          message: error?.response?.data?.error || error?.message || "Please try again."
        });
      } finally {
        setIsSubmittingAction(false);
      }
    }

    setReviewVisible(true);
  };

  const pickReviewPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showToast({ type: "error", title: "Permission required", message: "Allow photo access to upload review photos." });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8
    });
    const asset = result?.assets?.[0];

    if (result.canceled || !asset?.uri) {
      return;
    }

    try {
      setIsSubmittingAction(true);
      const upload = await uploadReviewPhoto({
        uri: asset.uri,
        name: asset.fileName || "review-photo.jpg",
        type: asset.mimeType || "image/jpeg"
      });
      const url = upload.url;
      const publicId = upload.publicId;

      if (!url || !publicId) {
        throw new Error("Photo upload response is missing url or publicId.");
      }

      setReviewPhotos((current) => [...current, { url, publicId }].slice(0, 3));
    } catch (error) {
      showToast({
        type: "error",
        title: "Photo upload failed",
        message: error?.response?.data?.error || error?.message || "Please try another image."
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const submitDispute = async () => {
    try {
      setIsSubmittingAction(true);
      const data = await openDispute(orderId, {
        type: disputeType,
        summary: disputeSummary.trim()
      });
      setDisputeVisible(false);
      setDisputeSummary("");
      setDisputeState({ dispute: data?.dispute, canOpen: false, reason: "A dispute already exists for this order" });
      showToast({ type: "success", title: "Dispute opened", message: "Support can now review your issue." });
    } catch (error) {
      showToast({
        type: "error",
        title: "Dispute failed",
        message: error?.response?.data?.error || error?.message || "Please try again."
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6400" />
      <View className="bg-primary px-5 pb-5 pt-2">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={goBack} className="h-11 w-11 items-center justify-center rounded-full bg-white/20">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-base font-extrabold text-white">Order details</Text>
          <Pressable onPress={refresh} className="h-11 w-11 items-center justify-center rounded-full bg-white/20">
            <Ionicons name="refresh" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-center rounded-[26px] bg-white/15 px-4 py-4">
          <View className="mr-4 h-14 w-14 items-center justify-center rounded-full bg-white">
            <Ionicons name={meta.icon} size={28} color="#FF6400" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wide text-white/80">Current status</Text>
            <Text className="mt-1 text-2xl font-extrabold capitalize text-white" numberOfLines={1}>
              {meta.label}
            </Text>
            <Text className="mt-1 text-sm font-medium text-white/85" numberOfLines={1}>
              {order?.orderNumber || orderId || "Recent order"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 rounded-t-[30px] bg-[#F7F8FA]"
        contentContainerStyle={{ padding: 20, paddingBottom: 42 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#FF6400" />}
      >
        {!order && isLoading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator color="#FF6400" />
            <Text className="mt-3 text-sm font-semibold text-muted">Loading order...</Text>
          </View>
        ) : null}

        {order ? (
          <>
            <View className="rounded-[24px] bg-white px-5 py-5 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-lg font-extrabold text-ink" numberOfLines={2}>
                    {order.restaurantName || order.restaurant?.name || "Dart Restaurant"}
                  </Text>
                  <Text className="mt-1 text-sm font-medium text-muted">{formatDate(order.createdAt)}</Text>
                </View>
                <View className="rounded-full bg-[#FFF0E5] px-3 py-1.5">
                  <Text className="text-xs font-extrabold capitalize text-primary">{statusLabel(order.status)}</Text>
                </View>
              </View>

              <View className="mt-5 flex-row rounded-2xl bg-[#FFF5EF] px-4 py-4">
                <Ionicons name="location-outline" size={22} color="#FF6400" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-extrabold text-ink">Delivery address</Text>
                  <Text className="mt-1 text-sm leading-5 text-muted" numberOfLines={3}>
                    {addressText(order)}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-5 rounded-[24px] bg-white px-5 py-5 shadow-sm">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-lg font-extrabold text-ink">Items</Text>
                <Text className="text-sm font-bold text-primary">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </Text>
              </View>
              {items.length ? (
                items.map((item, index) => <OrderItemRow key={item.id || item.cartItemId || `${itemName(item)}-${index}`} item={item} />)
              ) : (
                <View className="mt-4 rounded-2xl bg-[#F7F8FA] px-4 py-4">
                  <Text className="text-sm font-semibold text-muted">Item details are not available for this order yet.</Text>
                </View>
              )}
            </View>

            <View className="mt-5 rounded-[24px] bg-white px-5 py-5 shadow-sm">
              <View className="mb-2 flex-row items-center">
                <Ionicons name="card-outline" size={21} color="#FF6400" />
                <Text className="ml-2 text-lg font-extrabold text-ink">Payment summary</Text>
              </View>
              <SummaryRow label="Subtotal" value={order?.labels?.subtotal || order?.subtotalLabel || order?.subtotal} />
              <SummaryRow label="Delivery fee" value={order?.labels?.deliveryFee || order?.deliveryFeeLabel || order?.deliveryFee || 0} />
              <SummaryRow label="Discount" value={order?.labels?.discount || order?.discountLabel || order?.discount || 0} />
              <View className="my-2 h-px bg-[#F1F2F4]" />
              <SummaryRow label="Total" value={order?.labels?.total || order?.totalLabel || order?.total || order?.grandTotal} strong />
            </View>

            <View className="mt-5">
              <Timeline events={events} currentStatus={order.status} />
            </View>

            {delivered ? (
              <View className="mt-5 rounded-[24px] bg-white px-5 py-5 shadow-sm">
                <Text className="text-lg font-extrabold text-ink">After delivery</Text>
                <View className="mt-4">
                  {reviewEligibility?.eligible ? (
                    <Button title="Review this order" onPress={openReviewModal} />
                  ) : reviewEligibility?.existingReviewId ? (
                    <Button title="Edit review" variant="secondary" onPress={openReviewModal} />
                  ) : null}
                  {disputeState?.canOpen ? (
                    <Button title="Open dispute" variant="secondary" onPress={() => setDisputeVisible(true)} className="mt-3" />
                  ) : disputeState?.dispute ? (
                    <Button
                      title="View dispute"
                      variant="secondary"
                      onPress={() => navigation.navigate("DisputeDetail", { disputeId: disputeState.dispute.id })}
                      className="mt-3"
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <ReviewModal
        visible={reviewVisible}
        foodRating={foodRating}
        deliveryRating={deliveryRating}
        comment={reviewComment}
        photos={reviewPhotos}
        isSubmitting={isSubmittingAction}
        onClose={() => setReviewVisible(false)}
        onFoodRating={setFoodRating}
        onDeliveryRating={setDeliveryRating}
        onComment={setReviewComment}
        onPickPhoto={pickReviewPhoto}
        onSubmit={submitReview}
      />
      <DisputeModal
        visible={disputeVisible}
        type={disputeType}
        summary={disputeSummary}
        isSubmitting={isSubmittingAction}
        onClose={() => setDisputeVisible(false)}
        onType={setDisputeType}
        onSummary={setDisputeSummary}
        onSubmit={submitDispute}
      />
    </SafeAreaView>
  );
}
