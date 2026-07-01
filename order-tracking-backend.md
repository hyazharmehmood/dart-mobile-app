# Order tracking — backend requirements (Foodpanda-style)

Mobile app now supports:

- Live order tracking screen with map (pickup + dropoff + driver)
- Home screen active-order chip above bottom navigation
- Orders list opens tracking for active orders
- Post-payment redirect goes to tracking when `orderId` is known

This document describes what the backend must provide.

## Goals

1. Customer sees **Preparing** state after restaurant accepts, before driver pickup
2. Customer sees **On the way** with live driver marker after pickup
3. Map shows restaurant pickup pin and customer dropoff pin
4. Active order appears on home until delivered/cancelled
5. Realtime updates via Socket.IO + REST fallback polling

---

## Order status lifecycle

Canonical `statusCode` values (already documented):

```text
PENDING -> ACCEPTED -> PREPARING -> READY -> PICKED_UP -> ON_THE_WAY -> DELIVERED
```

Terminal:

```text
CANCELLED, REFUNDED
```

### Mobile tracking phases

| Backend status | Mobile phase | Map behavior |
| --- | --- | --- |
| `PENDING` | Preparing | Restaurant + dropoff pins, no driver |
| `ACCEPTED`, `PREPARING`, `READY` | Preparing | Restaurant + dropoff pins, no driver |
| `PICKED_UP`, `ON_THE_WAY` | On the way | Restaurant + dropoff + driver pin |
| `DELIVERED` | Delivered | Tracking ends, order detail/review |
| `CANCELLED`, `REFUNDED` | Cancelled | Chip hidden |

Mobile shows the home chip for any **non-terminal** active order.

---

## Required REST endpoints

### 1. Order detail (existing)

`GET /api/customer/orders/{orderId}`

Must include enough data for tracking fallback:

```json
{
  "order": {
    "id": "order_id",
    "orderNumber": "ORD-20260608-ABC123",
    "statusCode": "PREPARING",
    "restaurantName": "Restaurant Name",
    "deliveryAddress": "Full customer address",
    "driverName": "Juan",
    "paymentId": "pay_123",
    "providerReference": "xendit_ref",
    "pickup": {
      "latitude": 14.5995,
      "longitude": 120.9842,
      "address": "Branch address"
    },
    "dropoff": {
      "latitude": 14.5547,
      "longitude": 121.0242,
      "address": "Customer address"
    },
    "driver": {
      "id": "driver_profile_id",
      "name": "Juan",
      "phone": "+639171234567",
      "latitude": 14.5801,
      "longitude": 121.0102,
      "heading": 92
    },
    "etaMinutes": 18
  }
}
```

#### Coordinate fields (minimum)

Pickup (restaurant branch):

- `order.pickup.latitude` / `order.pickup.longitude`
- or `order.restaurant.latitude` / `order.restaurant.longitude`

Dropoff (customer):

- `order.dropoff.latitude` / `order.dropoff.longitude`
- or `order.deliveryLatitude` / `order.deliveryLongitude`

Driver (only after assignment/pickup):

- `order.driver.latitude` / `order.driver.longitude`
- or `order.driverLatitude` / `order.driverLongitude`

Without coordinates, mobile still shows the tracking UI but map markers may be missing.

---

### 2. Live tracking endpoint (new — recommended)

`GET /api/customer/orders/{orderId}/tracking`

Purpose: single payload optimized for the tracking screen (map + ETA + phase).

Response:

```json
{
  "order": {
    "id": "order_id",
    "statusCode": "ON_THE_WAY",
    "etaMinutes": 12,
    "pickup": { "latitude": 14.5995, "longitude": 120.9842, "address": "..." },
    "dropoff": { "latitude": 14.5547, "longitude": 121.0242, "address": "..." },
    "driver": {
      "id": "driver_profile_id",
      "name": "Juan",
      "latitude": 14.5801,
      "longitude": 121.0102,
      "heading": 92
    }
  },
  "tracking": {
    "phase": "ON_THE_WAY",
    "etaMinutes": 12,
    "updatedAt": "2026-06-08T10:15:00.000Z"
  }
}
```

Mobile polls this every 15 seconds while tracking screen is open.

If endpoint returns `404`, mobile falls back to `GET /api/customer/orders/{orderId}`.

Bruno: `mobile-api/Customer/Orders/get-order-tracking.bru`

---

### 3. Orders list (existing)

`GET /api/customer/orders`

Used for:

- home active-order chip
- orders history screen

Each order row should include at minimum:

```json
{
  "id": "order_id",
  "orderNumber": "ORD-...",
  "statusCode": "PREPARING",
  "restaurantName": "Restaurant Name",
  "createdAt": "2026-06-08T10:00:00.000Z",
  "totalLabel": "₱1,203.00"
}
```

Optional but useful for fallback matching after payment:

```json
{
  "paymentId": "pay_123",
  "providerReference": "xendit_ref"
}
```

---

### 4. Order events timeline (existing)

`GET /api/orders/{orderId}/events`

Mobile shows the latest 3 events on the tracking screen.

Emit events when status changes:

```text
ORDER_PLACED
ORDER_ACCEPTED
ORDER_PREPARING
ORDER_READY
DRIVER_ASSIGNED
DRIVER_ACCEPTED_ORDER
ORDER_PICKED_UP
ORDER_ON_THE_WAY
ORDER_DELIVERED
ORDER_CANCELLED
```

---

## Realtime Socket.IO requirements

Customer socket auth: Bearer customer access token.

### Rooms

When tracking screen opens:

```js
socket.emit("order:join", orderId);
socket.emit("order:leave", orderId);
```

Customer should be joined to `order:{orderId}` room server-side after `order:join`.

### Events mobile listens to

#### `order:updated`

```json
{
  "orderId": "order_id",
  "status": "preparing",
  "statusCode": "PREPARING",
  "driverId": "driver_profile_id",
  "driverName": "Juan",
  "assignedAt": "2026-06-08T10:05:00.000Z",
  "pickedUpAt": null,
  "onTheWayAt": null,
  "deliveredAt": null,
  "etaMinutes": 20
}
```

Emit on every meaningful status transition.

#### `order:event`

Timeline event for the tracking feed.

```json
{
  "orderId": "order_id",
  "eventId": "evt_123",
  "type": "ORDER_PREPARING",
  "message": "Restaurant is preparing your order",
  "previousStatus": "ACCEPTED",
  "nextStatus": "PREPARING",
  "createdAt": "2026-06-08T10:04:00.000Z"
}
```

#### `driver:location` (new — required for live rider map)

Broadcast to the order room while driver is assigned and before delivery completes.

```json
{
  "orderId": "order_id",
  "driverId": "driver_profile_id",
  "driverName": "Juan",
  "latitude": 14.5801,
  "longitude": 121.0102,
  "heading": 92,
  "updatedAt": "2026-06-08T10:12:00.000Z"
}
```

Suggested source: driver app `PATCH /api/driver/location` throttled to every 5–10 seconds while carrying an active order.

---

## Restaurant acceptance flow

Foodpanda-style UX expects:

1. Customer pays -> order created (`PENDING`)
2. Restaurant accepts -> `ACCEPTED` / `PREPARING`
3. Home chip appears: **"Restaurant is preparing your order"**
4. Driver picks up -> `PICKED_UP` / `ON_THE_WAY`
5. Chip changes to **"Rider is on the way"**
6. Map shows driver marker moving
7. Delivered -> chip disappears

Backend must emit `order:updated` and timeline `order:event` at each step.

---

## Payment -> order -> tracking chain

After Xendit payment success:

1. Backend webhook creates order from cart
2. Backend clears cart
3. Payment status endpoint returns `orderId`
4. Mobile opens `OrderTracking` with that `orderId`

See also: `xendit-mobile-checkout-backend.md`

---

## ETA (optional but recommended)

Return `etaMinutes` on:

- `GET /api/customer/orders/{orderId}`
- `GET /api/customer/orders/{orderId}/tracking`
- `order:updated` socket payload

Mobile displays: **"Arriving in about X min"**

---

## Driver object (recommended shape)

```json
{
  "driver": {
    "id": "driver_profile_id",
    "name": "Juan Dela Cruz",
    "phone": "+639171234567",
    "photoUrl": "https://...",
    "latitude": 14.5801,
    "longitude": 121.0102,
    "heading": 92,
    "vehicleLabel": "Motorcycle"
  }
}
```

---

## Backend implementation checklist

- [ ] Branch/restaurant coordinates stored and returned on order
- [ ] Customer delivery coordinates stored on order (`dropoff`)
- [ ] `GET /api/customer/orders/{orderId}/tracking` implemented
- [ ] `order:updated` emitted on status transitions
- [ ] `order:event` emitted for timeline
- [ ] `driver:location` emitted to `order:{orderId}` room
- [ ] Driver location updated from driver app during active delivery
- [ ] Orders list includes `statusCode` for active chip detection
- [ ] Payment status endpoint returns `orderId` after checkout
- [ ] Order list/detail includes `paymentId` for payment matching

---

## Bruno files

- `mobile-api/Customer/Orders/list-orders.bru`
- `mobile-api/Customer/Orders/get-order.bru`
- `mobile-api/Customer/Orders/get-order-tracking.bru`
- `mobile-api/Customer/Events/get-order-events.bru`
- `mobile-api/Customer/Payments/get-xendit-payment-status.bru`

---

## Mobile files (reference)

- `src/screens/OrderTrackingScreen.js`
- `src/components/OrderTrackingMap.js`
- `src/components/ActiveOrderChip.js`
- `src/utils/orderTracking.js`
- `src/screens/HomeScreen.js` (active chip)
- `src/screens/OrdersScreen.js` (track live CTA)
