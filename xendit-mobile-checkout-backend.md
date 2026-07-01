# Xendit mobile checkout — backend requirements

This document describes the backend contract for the Dart customer mobile app Xendit checkout flow.

## Summary

- Mobile creates a payment session with `POST /api/customer/payments/xendit/session` using `useCart: true` and `client: "mobile"`.
- **GCash / Maya**: open `payment.redirectUrl` in a WebView. Do **not** treat the return URL as final confirmation.
- **Cards**: open `payment.cardCheckoutUrl` in a WebView. Do **not** open `redirectUrl` for cards.
- After redirect return or `xendit_session_complete`, poll `GET /api/customer/payments/xendit/session/{paymentId}/status` until `confirmed: true`.
- The order is created only after Xendit webhook/status reconciliation on the server.

## Required endpoints

### 1. List channels

`GET /api/customer/payments/xendit/channels`

```json
{
  "channels": [
    { "code": "GCASH", "label": "GCash", "type": "ewallet", "mode": "redirect", "clients": ["web", "mobile"] },
    { "code": "PAYMAYA", "label": "Maya", "type": "ewallet", "mode": "redirect", "clients": ["web", "mobile"] },
    { "code": "CARDS", "label": "Cards", "type": "card", "mode": "components", "clients": ["web", "mobile"] }
  ]
}
```

### 2. Create session

`POST /api/customer/payments/xendit/session`

Request (mobile):

```json
{
  "useCart": true,
  "restaurantSlug": "restaurant-slug",
  "branchId": "branch_id",
  "deliveryAddress": "full delivery address",
  "paymentChannel": "GCASH",
  "client": "mobile"
}
```

#### Redirect channel response (GCash, Maya)

```json
{
  "payment": {
    "id": "payment_session_id",
    "mode": "redirect",
    "redirectUrl": "https://checkout.xendit.co/...",
    "providerReference": "DART-XND-...",
    "status": "pending",
    "pollUrl": "/api/customer/payments/xendit/session/payment_session_id/status"
  }
}
```

#### Card channel response (mobile)

```json
{
  "payment": {
    "id": "payment_session_id",
    "paymentChannel": "CARDS",
    "mode": "components",
    "status": "pending",
    "redirectUrl": "",
    "publicKey": "xnd_public_...",
    "componentsSdkKey": "components_sdk_key_from_xendit",
    "cardCheckoutUrl": "https://your-domain.com/payments/xendit/mobile-card?token=...",
    "pollUrl": "/api/customer/payments/xendit/session/payment_session_id/status"
  }
}
```

Mobile uses `cardCheckoutUrl` (Dart-hosted Xendit Components page). `componentsSdkKey` is only needed for legacy inline fallback.

### 3. Poll payment status

`GET /api/customer/payments/xendit/session/{paymentId}/status`

```json
{
  "paymentId": "payment_session_id",
  "status": "paid",
  "rawStatus": "SUCCESS",
  "providerStatus": "COMPLETED",
  "orderId": "order_id",
  "providerReference": "DART-XND-...",
  "paymentChannel": "GCASH",
  "amount": 250,
  "currency": "PHP",
  "confirmed": true,
  "orderCreated": true,
  "cartConsumed": true,
  "updatedAt": "2026-07-01T12:00:00.000Z",
  "message": "Payment confirmed and order created."
}
```

Rules:

- Treat checkout as complete only when `confirmed: true`.
- `status` values: `paid`, `pending`, `failed`.
- Poll every 2–3 seconds for up to 2 minutes after redirect/WebView completion.

## Mobile behavior

| Step | GCash / Maya | Cards |
| --- | --- | --- |
| Open checkout | `PaymentWebView` with `redirectUrl` | `PaymentCard` with `cardCheckoutUrl` |
| Completion signal | Return to `/payments/xendit/return` starts polling | `xendit_session_complete` from hosted page starts polling |
| Confirmation | Poll until `confirmed: true` | Poll until `confirmed: true` |
| After confirmed | Clear cart + go to OrderTracking/Orders | Clear cart + go to OrderTracking/Orders |

## Bruno files

- `mobile-api/Customer/Payments/list-xendit-channels.bru`
- `mobile-api/Customer/Payments/create-xendit-session.bru`
- `mobile-api/Customer/Payments/get-xendit-payment-status.bru`

## E-wallet return URL (GCash / Maya)

After payment, Xendit should redirect to:

`https://app.dart.com.ph/payments/xendit/return?paymentId={id}&providerReference={ref}`

The return page is **display-only**. Mobile detects this URL, hides the WebView, polls
`GET /api/customer/payments/xendit/session/{paymentId}/status` until `confirmed: true`,
then navigates to `OrderTracking`.

If the return URL has no `paymentId`, mobile still polls using the `paymentId` from the
original session create response.

Backend should ensure the status endpoint returns `confirmed: true` and `orderId` after webhook.

## Backend env fix for Cards error

If mobile shows:

`The property 'components_configuration.origins' need to use HTTPS`

the server is passing non-HTTPS origins to Xendit (for example `exp://`, `capacitor://`, `ionic://`, or `http://localhost`).

### Root cause

When `POST /api/customer/payments/xendit/session` is called with `paymentChannel: "CARDS"`, the backend creates a **Xendit Payment Session** with `mode: components`. Xendit validates:

```json
"components_configuration": {
  "origins": ["https://app.dart.com.ph"]
}
```

Every origin must be a valid **HTTPS** URL. If the backend merges env defaults like `capacitor://localhost`, `ionic://localhost`, `exp://192.168.x.x:8081`, or `http://localhost:3000`, Xendit rejects the session and mobile cannot start card checkout.

**Mobile cannot fix this.** The app already sends HTTPS origins in the request body; the backend must use them (or correct env) when calling Xendit.

---

### Required backend env (production)

```env
XENDIT_ENABLE_COMPONENTS=true
NEXT_PUBLIC_APP_URL=https://app.dart.com.ph
XENDIT_COMPONENTS_ALLOWED_ORIGINS=https://app.dart.com.ph
```

Rules:

- **HTTPS only** — no `http://`, no `exp://`, no `capacitor://`, no `ionic://`
- Comma-separated if multiple: `https://app.dart.com.ph,https://www.dart.com.ph`
- Do **not** auto-append Capacitor/Ionic/Expo dev origins in production

Optional (local backend dev only, never in prod):

```env
# Only if you test card components on local HTTPS tunnel, e.g. ngrok
# XENDIT_COMPONENTS_ALLOWED_ORIGINS=https://your-ngrok-id.ngrok-free.app
```

---

### Request mobile sends for CARDS

Mobile tries up to **3 payload variants** (all fail today with the same origins error until backend is fixed):

**Attempt 1 — web client + hosted checkout**

```json
{
  "useCart": true,
  "deliveryAddress": "full address string",
  "paymentChannel": "CARDS",
  "client": "web",
  "restaurantSlug": "...",
  "branchId": "...",
  "checkoutOrigin": "https://app.dart.com.ph",
  "useHostedCardCheckout": true
}
```

**Attempt 2 — mobile client + hosted checkout**

```json
{
  "useCart": true,
  "deliveryAddress": "full address string",
  "paymentChannel": "CARDS",
  "client": "mobile",
  "checkoutOrigin": "https://app.dart.com.ph",
  "useHostedCardCheckout": true
}
```

**Attempt 3 — mobile client + explicit origins**

```json
{
  "useCart": true,
  "deliveryAddress": "full address string",
  "paymentChannel": "CARDS",
  "client": "mobile",
  "checkoutOrigin": "https://app.dart.com.ph",
  "useHostedCardCheckout": true,
  "componentsAllowedOrigins": ["https://app.dart.com.ph"],
  "componentsConfiguration": {
    "origins": ["https://app.dart.com.ph"]
  }
}
```

Backend should **prefer request fields** when present:

| Request field | Use for Xendit |
| --- | --- |
| `componentsConfiguration.origins` | Pass directly to Xendit session create |
| `componentsAllowedOrigins` | Fallback if above missing |
| `checkoutOrigin` | Single-origin fallback |
| Env `XENDIT_COMPONENTS_ALLOWED_ORIGINS` | Last resort only |

**Never** merge mobile HTTPS origins with invalid dev origins from env.

---

### Backend handler logic (pseudocode)

```ts
function resolveComponentsOrigins(req) {
  const fromBody =
    req.body?.componentsConfiguration?.origins ||
    req.body?.componentsAllowedOrigins ||
    (req.body?.checkoutOrigin ? [req.body.checkoutOrigin] : null);

  const fromEnv = (process.env.XENDIT_COMPONENTS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origins = (fromBody?.length ? fromBody : fromEnv)
    .map(normalizeToHttpsOrigin)
    .filter((o) => /^https:\/\//i.test(o));

  if (!origins.length) {
    throw new Error("No HTTPS components origins configured");
  }

  return [...new Set(origins)];
}

// When calling Xendit Create Payment Session for CARDS:
await xendit.createPaymentSession({
  // ...amount, currency, etc.
  mode: "components",
  components_configuration: {
    origins: resolveComponentsOrigins(req)
  }
});
```

```ts
function normalizeToHttpsOrigin(value) {
  const trimmed = String(value).trim().replace(/\/$/, "");
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) return trimmed.replace(/^http:/i, "https:");
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
```

---

### Required response for `client: "mobile"` + `CARDS`

```json
{
  "payment": {
    "id": "clx_payment_session_id",
    "paymentChannel": "CARDS",
    "mode": "components",
    "status": "pending",
    "redirectUrl": "",
    "publicKey": "xnd_public_development_...",
    "componentsSdkKey": "pscs_...",
    "cardCheckoutUrl": "https://app.dart.com.ph/payments/xendit/mobile-card?token=ONE_TIME_TOKEN",
    "pollUrl": "/api/customer/payments/xendit/session/clx_payment_session_id/status",
    "providerReference": "DART-XND-..."
  }
}
```

Mobile opens **`cardCheckoutUrl`** in a WebView (not `redirectUrl`).

The hosted page at `/payments/xendit/mobile-card`:

1. Loads Xendit Components with `componentsSdkKey` / session token
2. `components_configuration.origins` on the Xendit session must include `https://app.dart.com.ph` (page origin)
3. On success, post message or redirect so mobile receives `xendit_session_complete`
4. Mobile polls `pollUrl` until `confirmed: true`

`componentsSdkKey` alone is **not enough** for mobile — `cardCheckoutUrl` is required for the primary flow.

---

### What to remove from backend

Search the backend repo for and **stop sending to Xendit** in production:

- `capacitor://localhost`
- `ionic://localhost`
- `exp://...`
- `http://localhost:3000`
- Any non-HTTPS origin in `components_configuration.origins`

Common mistake: a shared `getAllowedOrigins()` that unions web URL + Capacitor + Expo dev URLs for all clients. For mobile CARDS, use HTTPS web app origin only.

---

### Verify after deploy

**1. Bruno / curl — create CARDS session**

```http
POST /api/customer/payments/xendit/session
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "useCart": true,
  "deliveryAddress": "Test address, Manila, Philippines",
  "paymentChannel": "CARDS",
  "client": "mobile",
  "checkoutOrigin": "https://app.dart.com.ph",
  "useHostedCardCheckout": true,
  "componentsConfiguration": {
    "origins": ["https://app.dart.com.ph"]
  }
}
```

Expected: **200** with `payment.cardCheckoutUrl` (not 400 origins error).

**2. Open card checkout URL**

`https://app.dart.com.ph/payments/xendit/mobile-card?token=...` should render card form without CORS/origin errors.

**3. Mobile app**

- Cart → Cards → WebView opens hosted card page
- Complete test payment → poll returns `confirmed: true` + `orderId`
- App navigates to Order Tracking

**4. Metro logs (dev)**

Should see `[xendit-session] created with` and **not** repeated `attempt failed` + `components_configuration.origins`.

---

### Until backend is fixed

- **GCash** and **Maya** continue to work (redirect flow, separate from Components origins)
- **Cards** will show error toast; mobile displays hint on Cards row in payment sheet

---

## Test checklist

- [ ] GCash/Maya session returns `payment.id` + `redirectUrl`
- [ ] CARDS session returns `payment.id` + `cardCheckoutUrl` (no origins HTTPS error)
- [ ] CARDS `components_configuration.origins` is HTTPS only when calling Xendit
- [ ] `/payments/xendit/mobile-card?token=...` loads card form in browser
- [ ] Status endpoint returns `pending` before webhook completes
- [ ] Status endpoint returns `confirmed: true` + `orderId` after webhook completes
- [ ] Cart is empty after confirmation
- [ ] Failed payment returns `failed` and does not create order
