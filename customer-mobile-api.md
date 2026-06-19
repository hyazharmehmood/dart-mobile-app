# Customer Mobile API Implementation Guide

This document describes the customer-facing APIs currently implemented for the mobile app team.

## Base Conventions

- Base path: `/api/customer`
- Request body format: JSON
- Response body format: JSON
- Authenticated customer endpoints accept:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

The mobile access token is returned by customer signup and login. It is a custom HS256 JWT signed with `NEXTAUTH_SECRET`.

```json
{
  "auth": {
    "accessToken": "jwt-token",
    "tokenType": "Bearer",
    "expiresIn": 2592000,
    "expiresAt": "2026-07-08T10:00:00.000Z"
  }
}
```

`expiresIn` is currently 30 days in seconds.

## Error Shape

Most endpoints return this shape on validation or runtime errors:

```json
{
  "error": "Human readable error message",
  "details": {
    "fieldName": ["Validation message"]
  }
}
```

`details` is only present on validation failures.

Common status codes:

- `400`: invalid request data or business rule failure
- `401`: missing, invalid, or expired customer token
- `403`: account exists but is not a customer account
- `404`: requested resource not found
- `409`: duplicate account or order number collision
- `500`: server error

## Shared Models

### Customer Address

```json
{
  "id": "address_id",
  "label": "Default address",
  "address": "Full formatted address",
  "addressLine1": "Street / area",
  "addressLine2": "",
  "city": "Lahore",
  "state": "Punjab",
  "postalCode": "54000",
  "country": "PK",
  "latitude": 31.5204,
  "longitude": 74.3587,
  "isActive": true
}
```

### Order

```json
{
  "id": "order_id",
  "orderNumber": "ORD-20260608-ABC123",
  "restaurant": {
    "id": "restaurant_id",
    "name": "Restaurant Name",
    "slug": "restaurant-slug",
    "logoUrl": "",
    "phone": ""
  },
  "restaurantName": "Restaurant Name",
  "restaurantSlug": "restaurant-slug",
  "driverName": "Unassigned",
  "status": "pending",
  "statusCode": "PENDING",
  "subtotal": 1200,
  "deliveryFee": 3,
  "tax": 0,
  "total": 1203,
  "totalLabel": "₱1,203.00",
  "deliveryAddress": "Full formatted address",
  "placedAt": "2026-06-08T10:00:00.000Z",
  "placedAtLabel": "Jun 8, 2026, 3:00 PM",
  "acceptedAt": null,
  "deliveredAt": null,
  "cancelledAt": null,
  "itemCount": 2,
  "items": [
    {
      "id": "order_item_id",
      "menuItemId": "menu_item_id",
      "name": "Menu Item",
      "quantity": 2,
      "unitPrice": 600,
      "price": 600,
      "total": 1200,
      "totalLabel": "₱1,200.00"
    }
  ]
}
```

Order `statusCode` values:

```text
PENDING, ACCEPTED, PREPARING, READY, PICKED_UP, ON_THE_WAY, DELIVERED, CANCELLED, REFUNDED
```

The lowercase `status` field is intended for mobile UI display/state mapping.

## Authentication

### Sign Up

`POST /api/customer/signup`

Creates a customer account and default customer profile. Address is optional during signup.

Request:

```json
{
  "firstName": "Taha",
  "lastName": "Customer",
  "email": "taha@example.com",
  "password": "password123"
}
```

Optional address can be included when the app already has one:

```json
{
  "firstName": "Taha",
  "lastName": "Customer",
  "email": "taha@example.com",
  "password": "password123",
  "address": {
    "addressLine1": "387-J, 2nd Floor",
    "addressLine2": "DHA Phase 12",
    "city": "Lahore",
    "state": "Punjab",
    "postalCode": "",
    "country": "PK",
    "latitude": 31.5204,
    "longitude": 74.3587
  }
}
```

Validation:

- `firstName`: required, minimum 2 characters
- `lastName`: required, minimum 2 characters
- `email`: valid email, unique
- `password`: minimum 8 characters
- `address`: optional
- `address.postalCode`: optional because Google/map results may omit it
- `address.latitude`: optional number from `-90` to `90`
- `address.longitude`: optional number from `-180` to `180`

Success `201`:

```json
{
  "user": {
    "id": "user_id",
    "name": "Taha Customer",
    "email": "taha@example.com",
    "role": "CUSTOMER",
    "createdAt": "2026-06-08T10:00:00.000Z",
    "customerProfile": {
      "id": "profile_id",
      "firstName": "Taha",
      "lastName": "Customer",
      "addresses": []
    }
  },
  "auth": {
    "accessToken": "jwt-token",
    "tokenType": "Bearer",
    "expiresIn": 2592000,
    "expiresAt": "2026-07-08T10:00:00.000Z"
  }
}
```

Possible errors:

- `400`: invalid signup data
- `409`: account already exists

### Login

`POST /api/customer/login`

Request:

```json
{
  "email": "taha@example.com",
  "password": "password123"
}
```

Success `200`:

```json
{
  "user": {
    "id": "user_id",
    "name": "Taha Customer",
    "email": "taha@example.com",
    "phone": "",
    "role": "CUSTOMER",
    "createdAt": "2026-06-08T10:00:00.000Z",
    "customerProfile": {
      "id": "profile_id",
      "firstName": "Taha",
      "lastName": "Customer",
      "address": "Active formatted address",
      "activeAddress": {
        "id": "address_id",
        "label": "Default address",
        "address": "Active formatted address",
        "addressLine1": "387-J, 2nd Floor",
        "addressLine2": "",
        "city": "Lahore",
        "state": "Punjab",
        "postalCode": "54000",
        "country": "PK",
        "latitude": 31.5204,
        "longitude": 74.3587,
        "isActive": true
      }
    }
  },
  "auth": {
    "accessToken": "jwt-token",
    "tokenType": "Bearer",
    "expiresIn": 2592000,
    "expiresAt": "2026-07-08T10:00:00.000Z"
  }
}
```

Possible errors:

- `400`: invalid login data
- `401`: invalid email or password
- `403`: account is not a customer account

## Profile

### Get Profile

`GET /api/customer/profile`

Auth required.

Success `200`:

```json
{
  "profile": {
    "id": "user_id",
    "name": "Taha Customer",
    "email": "taha@example.com",
    "phone": "+923105606554",
    "image": "",
    "deliveryAddress": "Active formatted address",
    "activeAddress": {},
    "addresses": [],
    "profile": {
      "id": "profile_id",
      "firstName": "Taha",
      "lastName": "Customer"
    },
    "stats": {
      "orderCount": 1,
      "savedPlaces": 2
    },
    "recentOrders": []
  }
}
```

Notes:

- `activeAddress` is the active saved address or first saved address.
- `deliveryAddress` is `activeAddress.address` or an empty string.
- `recentOrders` returns up to 4 recent orders.

### Update Profile

`PATCH /api/customer/profile`

Auth required.

Request:

```json
{
  "name": "Taha Customer",
  "phone": "+923105606554",
  "imageUrl": "https://res.cloudinary.com/.../profile.png"
}
```

You may also send separate names:

```json
{
  "firstName": "Taha",
  "lastName": "Customer"
}
```

Validation:

- Send at least one supported field.
- `name`: optional, 2 to 120 characters
- `firstName`: optional, 1 to 80 characters
- `lastName`: optional, max 80 characters
- `phone`: optional, max 40 characters
- `image` or `imageUrl`: optional URL from the customer upload endpoint

Success `200`:

```json
{
  "profile": {}
}
```

Returns the same profile shape as `GET /api/customer/profile`.

## Customer Uploads

### Upload Customer Image

`POST /api/customer/uploads`

Auth required. Use multipart form data.

Request form fields:

- `file`: required image file
- `purpose`: optional, e.g. `customer-profile-image`
- `folder`: optional subfolder, defaults to `profile-images`

Allowed file types:

- JPG
- PNG
- WebP
- GIF

Success `201`:

```json
{
  "asset": {
    "publicId": "dart/uploads/users/user_id/customer/profile-images/file_name",
    "url": "http://...",
    "secureUrl": "https://...",
    "resourceType": "image",
    "format": "png",
    "bytes": 12345,
    "width": 800,
    "height": 800
  }
}
```

Use `asset.secureUrl` as `imageUrl` when calling `PATCH /api/customer/profile`.

## Saved Addresses

### List Addresses

`GET /api/customer/addresses`

Auth required.

Success `200`:

```json
{
  "addresses": [],
  "activeAddress": {}
}
```

Addresses are ordered active first, then newest updated.

### Create Address

`POST /api/customer/addresses`

Auth required.

Request:

```json
{
  "label": "Home",
  "address": "387-J, 2nd Floor, DHA Phase 12, Lahore, Pakistan",
  "addressLine1": "387-J, 2nd Floor",
  "addressLine2": "DHA Phase 12",
  "city": "Lahore",
  "state": "Punjab",
  "postalCode": "",
  "country": "PK",
  "latitude": 31.5204,
  "longitude": 74.3587,
  "isActive": true
}
```

Validation:

- `address`: required, 5 to 300 characters
- `label`: optional, max 60 characters
- `postalCode`: optional
- `city`: optional
- `state`: optional
- `latitude`: optional number from `-90` to `90`
- `longitude`: optional number from `-180` to `180`

Behavior:

- If this is the first saved address, it becomes active by default.
- If `isActive: true`, other customer addresses are deactivated.
- If `label` is omitted, the API uses `Default address` for active first address or `Delivery address`.

Success `201`:

```json
{
  "address": {}
}
```

### Get Address

`GET /api/customer/addresses/{addressId}`

Auth required. The address must belong to the logged-in customer.

Success `200`:

```json
{
  "address": {}
}
```

Possible errors:

- `404`: address not found or not owned by customer

### Update or Activate Address

`PATCH /api/customer/addresses/{addressId}`

Auth required. The address must belong to the logged-in customer.

Request for activation only:

```json
{
  "isActive": true
}
```

Request for editing:

```json
{
  "label": "Office",
  "address": "Updated formatted address",
  "addressLine1": "Updated line 1",
  "addressLine2": "",
  "city": "Lahore",
  "state": "Punjab",
  "postalCode": "",
  "country": "PK",
  "latitude": 31.5204,
  "longitude": 74.3587,
  "isActive": true
}
```

Behavior:

- All fields are optional.
- If `isActive: true`, other addresses are deactivated.
- Empty nullable address subfields are stored as `null`.

Success `200`:

```json
{
  "address": {}
}
```

Possible errors:

- `404`: address not found or not owned by customer

### Delete Address

`DELETE /api/customer/addresses/{addressId}`

Auth required.

Behavior:

- Deletes the address if it belongs to the logged-in customer.
- If the deleted address was active, the newest remaining address becomes active.

Success `200`:

```json
{
  "ok": true,
  "activeAddress": {}
}
```

If no addresses remain, `activeAddress` is `null`.

## Cuisines

### List Cuisines

`GET /api/customer/cuisines`

Public endpoint.

Returns active cuisines that have at least one approved restaurant.

Success `200`:

```json
{
  "cuisines": [
    {
      "id": "cuisine_id",
      "name": "Pizza",
      "label": "Pizza",
      "slug": "pizza",
      "imageUrl": "https://...",
      "restaurantCount": 12,
      "sortOrder": 1
    }
  ]
}
```

On server error, response is:

```json
{
  "error": "Unable to load cuisines",
  "cuisines": []
}
```

## Feed

Mobile should send the active customer address coordinates (`lat`, `lng`) whenever they are available. When coordinates are provided, feed restaurant sections return only restaurants whose configured `deliveryRadiusKm` covers that location. Without coordinates, public feed endpoints return an unfiltered fallback and include `meta.locationApplied: false`.

### Top Brands

`GET /api/customer/feed/top-brands`

Public endpoint.

If `lat` and `lng` are provided, this endpoint returns only restaurants whose `deliveryRadiusKm` covers the customer location. Restaurants without coordinates are excluded only when location filtering is active.

Query params:

- `lat`: optional active address latitude
- `lng`: optional active address longitude
- `limit`: default `10`, max `20`

Example:

```http
GET /api/customer/feed/top-brands?lat=31.44269&lng=74.20766&limit=8
```

Success `200`:

```json
{
  "restaurants": [],
  "meta": {
    "locationApplied": true
  }
}
```

### Order Again

`GET /api/customer/feed/order-again`

Auth required. Returns unique restaurants from the customer's delivered order history, filtered by current delivery radius when coordinates are provided.

Query params:

- `lat`: optional active address latitude
- `lng`: optional active address longitude
- `limit`: default `10`, max `20`

Success `200`:

```json
{
  "restaurants": [],
  "meta": {
    "locationApplied": true
  }
}
```

### Feed Cuisines

`GET /api/customer/feed/cuisines`

Public endpoint. Returns active cuisines with restaurant counts based on nearby deliverable restaurants when coordinates are provided.

Query params:

- `lat`: optional active address latitude
- `lng`: optional active address longitude
- `limit`: default `10`, max `100`

Success `200`:

```json
{
  "cuisines": [],
  "meta": {
    "locationApplied": true
  }
}
```

## Restaurants

### List Restaurants

`GET /api/customer/restaurants`

Public endpoint.

If `lat` and `lng` are provided, this endpoint returns only restaurants whose `deliveryRadiusKm` covers the customer location. Restaurants without coordinates are excluded only when location filtering is active.

Query params:

- `q`: optional text search across restaurant name, cuisine, description, and menu item name
- `city`: optional city filter
- `cuisine`: optional cuisine id, slug, or name
- `openNow`: optional boolean
- `acceptsOrders`: optional boolean
- `lat`: optional latitude for distance sorting/display and delivery-radius filtering
- `lng`: optional longitude for distance sorting/display and delivery-radius filtering
- `sort`: `recommended`, `rating`, `prep_time`, `distance`, `newest`
- `page`: default `1`
- `limit`: default `12`, max `50`

Example:

```http
GET /api/customer/restaurants?q=burger&cuisine=fast-food&lat=31.5204&lng=74.3587&sort=distance&page=1&limit=20
```

Success `200`:

```json
{
  "restaurants": [
    {
      "id": "restaurant_id",
      "slug": "restaurant-slug",
      "name": "Restaurant Name",
      "cuisine": "Pizza, Burgers",
      "cuisines": ["Pizza", "Burgers"],
      "description": "",
      "rating": 4.5,
      "reviewCount": 0,
      "isOpen": true,
      "acceptsOrders": true,
      "prepTimeMinutes": 25,
      "deliveryEta": "25-40 min",
      "address": "Restaurant address",
      "city": "Lahore",
      "distanceKm": 3.2,
      "deliveryRadiusKm": 8,
      "isDeliverable": true,
      "logoUrl": "",
      "coverImageUrl": "",
      "photoUrls": [],
      "activeItemCount": 20,
      "hasDeals": true,
      "dealLabel": "Menu deals",
      "featuredItems": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 42,
    "totalPages": 3
  },
  "filters": {
    "q": "burger",
    "city": "",
    "cuisine": "fast-food",
    "openNow": null,
    "acceptsOrders": null,
    "sort": "distance",
    "lat": 31.5204,
    "lng": 74.3587,
    "locationApplied": true
  }
}
```

### Restaurant Detail

`GET /api/customer/restaurants/{slug}`

Public endpoint. `{slug}` may be a restaurant slug or id.

Success `200`:

```json
{
  "restaurant": {
    "id": "restaurant_id",
    "slug": "restaurant-slug",
    "name": "Restaurant Name",
    "cuisine": "Pizza",
    "cuisines": ["Pizza"],
    "description": "",
    "businessType": "",
    "rating": 4.5,
    "reviewCount": 0,
    "isOpen": true,
    "acceptsOrders": true,
    "prepTimeMinutes": 25,
    "deliveryRadiusKm": 8,
    "deliveryEta": "25-40 min",
    "phone": "",
    "email": "",
    "address": "Restaurant address",
    "city": "Lahore",
    "latitude": 31.5204,
    "longitude": 74.3587,
    "logoUrl": "",
    "coverImageUrl": "",
    "photoUrls": [],
    "taxRate": 0,
    "availability": [
      {
        "id": "availability_id",
        "dayOfWeek": 1,
        "day": "Monday",
        "opensAt": "09:00",
        "closesAt": "22:00",
        "isClosed": false
      }
    ],
    "menu": {
      "categories": [],
      "featuredItems": [],
      "discountedItems": [],
      "stats": {
        "categories": 0,
        "items": 0,
        "availableItems": 0,
        "outOfStockItems": 0
      }
    }
  }
}
```

Menu item shape inside `menu.categories[].items`, `featuredItems`, and `discountedItems`:

```json
{
  "id": "menu_item_id",
  "name": "Menu Item",
  "description": "",
  "price": 600,
  "compareAtPrice": 750,
  "hasDiscount": true,
  "imageUrl": "",
  "stock": 10,
  "prepTimeMinutes": 20,
  "status": "active",
  "isFeatured": true,
  "tags": [],
  "modifierGroups": [
    {
      "id": "group_id",
      "name": "Choose Size",
      "type": "single",
      "isRequired": true,
      "minSelections": 1,
      "maxSelections": 1,
      "sortOrder": 0,
      "options": [
        {
          "id": "option_id",
          "name": "Large",
          "imageUrl": "",
          "linkedMenuItemId": null,
          "linkedMenuItemName": "",
          "linkedMenuItemPrice": null,
          "linkedMenuItemStatus": "",
          "linkedMenuItemStock": null,
          "priceDelta": 100,
          "isDefault": false,
          "isAvailable": true,
          "sortOrder": 0
        }
      ]
    }
  ],
  "isAvailable": true,
  "isOutOfStock": false
}
```

Possible errors:

- `404`: restaurant not found

## Cart Quote and Orders

### Quote Order

`POST /api/customer/orders/quote`

Public endpoint. Use before checkout to calculate totals and availability.

Request:

```json
{
  "restaurantSlug": "restaurant-slug",
  "items": [
    {
      "menuItemId": "menu_item_id",
      "quantity": 2,
      "modifierSelections": [
        {
          "groupId": "modifier_group_id",
          "optionIds": ["modifier_option_id"]
        }
      ],
      "specialInstructions": "No mayo",
      "unavailablePreference": "REMOVE_ITEM"
    }
  ]
}
```

`restaurantId` can be used instead of `restaurantSlug`.

Behavior:

- Duplicate configured items are merged only when `menuItemId`, selected options, instructions, and unavailable preference match.
- Only `ACTIVE` menu items are quoteable.
- Required modifier groups must satisfy `minSelections` and `maxSelections`.
- Option ids must belong to the menu item modifier group.
- Unavailable options, inactive linked items, and out-of-stock linked items are rejected.
- `canOrder` is false if the restaurant is closed, not accepting orders, or any item lacks stock.
- Simple old mobile payloads still work for menu items without required modifiers.

Success `200`:

```json
{
  "quote": {
    "restaurant": {
      "id": "restaurant_id",
      "slug": "restaurant-slug",
      "name": "Restaurant Name",
      "isOpen": true,
      "acceptsOrders": true,
      "taxRate": 0
    },
    "items": [
      {
        "lineId": "configuration_hash",
        "menuItemId": "menu_item_id",
        "name": "Menu Item",
        "displayName": "Menu Item (Large, Ranch)",
        "quantity": 2,
        "basePrice": 600,
        "modifierTotal": 100,
        "unitPrice": 700,
        "total": 1400,
        "customizations": {
          "selections": [],
          "basePrice": 600,
          "modifierTotal": 100
        },
        "specialInstructions": "No mayo",
        "unavailablePreference": "REMOVE_ITEM",
        "isAvailable": true
      }
    ],
    "canOrder": true,
    "subtotal": 1400,
    "deliveryFee": 3,
    "tax": 0,
    "total": 1403,
    "labels": {
      "subtotal": "₱1,400.00",
      "deliveryFee": "₱3.00",
      "tax": "₱0.00",
      "total": "₱1,403.00"
    }
  }
}
```

Possible errors:

- `400`: invalid quote data, unavailable item, invalid modifier selection, or missing required selection
- `404`: restaurant not found

### List Dragonpay Payment Channels

`GET /api/dragonpay/payments/processors?amount=350.00`

Public. Use this before checkout to render available Dragonpay payment methods. The older `GET /api/customer/payments/dragonpay/processors?amount=350.00` route remains available for compatibility.

Success `200`:

```json
{
  "processors": [
    {
      "procId": "BOG",
      "shortName": "Test Bank Online",
      "longName": "Test Bank Online",
      "name": "Test Bank Online",
      "logo": "",
      "type": "online_bank",
      "status": "",
      "remarks": "",
      "minAmount": null,
      "maxAmount": null,
      "mustRedirect": false,
      "surcharge": null,
      "description": "Dragonpay UAT online banking simulator",
      "isDefault": true,
      "source": "fallback"
    }
  ],
  "source": "fallback",
  "fallbackReason": "Dragonpay processor discovery did not return processors"
}
```

Notes:

- The endpoint first calls Dragonpay `/processors/available/{amount}` and falls back to `/processors`.
- Always include the checkout amount when available so Dragonpay can filter channel limits/surcharges.
- Include an app option named "Show all payment methods on Dragonpay"; send blank `procId` for that option.
- UAT fallback currently includes `BOG` and `BOGX`.
- Production channel lists must come from this endpoint or app configuration after Dragonpay confirms enabled channels.

### Create Dragonpay Payment

`POST /api/customer/payments/dragonpay/create`

Auth required. Use this endpoint for customer checkout when Dragonpay is selected. It validates the cart, creates a pending Dragonpay payment session, and returns a redirect URL.

Request:

```json
{
  "restaurantSlug": "restaurant-slug",
  "deliveryAddress": "Customer delivery address",
  "procId": "",
  "items": [
    {
      "menuItemId": "menu_item_id",
      "quantity": 1,
      "modifierSelections": [],
      "specialInstructions": "",
      "unavailablePreference": "REMOVE_ITEM"
    }
  ]
}
```

Notes:

- `procId` is optional. If omitted or blank, Dragonpay shows its hosted Pay.aspx payment method selection page.
- If the customer selects a specific channel from the processors endpoint, pass that channel code as `procId`.
- For card payments with `procId: "CC"`, the server sends Dragonpay `BillingDetails` from the customer profile and active address where available.
- Supported UAT test `procId` values for the current Dragonpay account:
  - `BOG`: Test Bank Online. Use this for immediate success/failure UAT checkout testing.
  - `BOGX`: Test Bank Over-the-Counter. Use this for pending OTC flow testing.
- Other channel codes such as GCash/card/OTC must come from the processors endpoint for the merchant account. Do not hardcode production channel lists.
- Production payment channels must be confirmed from Dragonpay for the merchant account before exposing them in mobile UI. Do not hardcode production channel lists in the app.
- The order is not released to the restaurant until Dragonpay returns status `S`.
- Pending OTC payments remain pending until Dragonpay sends a later success/failure callback.
- Mobile should open `payment.redirectUrl` in an external browser or secure webview. The return URL is handled by the web app and then redirects to the order or checkout route.
- If the user closes the webview before returning, mobile should poll `GET /api/customer/orders` or listen to order/notification socket events. The payment can still complete by server postback.

Success `200`:

```json
{
  "payment": {
    "id": "payment_session_id",
    "txnId": "DART...",
    "refNo": "DRAGONPAY_REF",
    "status": "pending",
    "redirectUrl": "https://test.dragonpay.ph/..."
  }
}
```

Possible errors:

- `400`: invalid checkout data, missing address, unavailable items, invalid modifiers
- `422`: Dragonpay rejected the selected `procId`. Retry with `BOG` or `BOGX` in UAT.
- `502`: Dragonpay failed to initialize the payment

Dragonpay callback behavior:

- Collection postback URL: `/api/dragonpay/payments/postback`
- Customer return URL: `/payments/dragonpay/return`
- Mobile does not call either URL directly.
- Dragonpay postback is HTTP GET and the API must return plain text `result=OK`.
- The return URL is display-only; it does not mark payment as paid.
- Status `S`: server creates the real order, decrements stock, creates marketplace ledger entries, emits `ORDER_PLACED`, and sends restaurant/admin notifications.
- Status `P`/`U`: payment session remains pending. This is expected for OTC channels such as `BOGX`.
- Status `F`/`V`: payment session is failed/cancelled and no order is released to the restaurant.

### Create Order

`POST /api/customer/orders`

Auth required. Legacy/internal order creation endpoint. Mobile should prefer `POST /api/customer/payments/dragonpay/create` for live checkout.

Request:

```json
{
  "restaurantSlug": "restaurant-slug",
  "deliveryAddress": "Optional override delivery address",
  "items": [
    {
      "menuItemId": "menu_item_id",
      "quantity": 2,
      "modifierSelections": [
        {
          "groupId": "modifier_group_id",
          "optionIds": ["modifier_option_id"]
        }
      ],
      "specialInstructions": "No mayo",
      "unavailablePreference": "REMOVE_ITEM"
    }
  ]
}
```

`restaurantId` can be used instead of `restaurantSlug`.

Behavior:

- Duplicate configured items are merged only when `menuItemId`, selected options, instructions, and unavailable preference match.
- Restaurant must be approved, open, and accepting orders.
- Items must be `ACTIVE`.
- Required modifier groups must satisfy `minSelections` and `maxSelections`.
- Linked add-on items must belong to the same restaurant, be active, and have enough stock if stock is tracked.
- Stock is decremented transactionally where stock is finite.
- Linked add-on stock is also decremented where stock is finite.
- If `deliveryAddress` is omitted, the active saved address is used.
- If no delivery address exists, order creation fails.
- Order financials are calculated using current platform settings:
  - platform delivery fee
  - platform commission rate
  - restaurant tax rate
- Ledger entries are created during order creation.
- Creating an order writes an `ORDER_PLACED` event and creates in-app notifications for restaurant/admin dashboards.

Success `201`:

```json
{
  "order": {}
}
```

Returns the shared `Order` shape.

Possible errors:

- `400`: invalid order data, restaurant not accepting orders, unavailable items, invalid modifier selection, insufficient stock, missing delivery address
- `404`: restaurant not found
- `409`: order number collision

### List Orders

`GET /api/customer/orders`

Auth required.

Query params:

- `status`: optional uppercase order status
- `page`: default `1`
- `limit`: default `10`, max `50`

Example:

```http
GET /api/customer/orders?status=PENDING&page=1&limit=20
```

Success `200`:

```json
{
  "orders": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 1
  }
}
```

### Order Detail

`GET /api/customer/orders/{orderId}`

Auth required. The order must belong to the logged-in customer.

Success `200`:

```json
{
  "order": {}
}
```

Returns the shared `Order` shape.

Possible errors:

- `404`: order not found

## Realtime Socket.IO

Socket.IO is available on the same app host.

- Path: `/socket.io`
- Auth: send the customer access token in socket auth as `token`
- Alternative auth: send `Authorization: Bearer <accessToken>` during the socket handshake if your mobile Socket.IO client supports custom headers
- REST APIs remain the source of truth if the socket disconnects

Example client setup:

```js
import { io } from "socket.io-client";

const socket = io(baseUrl, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  auth: {
    token: customerAccessToken
  },
  extraHeaders: {
    Authorization: `Bearer ${customerAccessToken}`
  }
});
```

Customer sockets automatically join these rooms after authentication:

- `user:{userId}`
- `role:CUSTOMER`

When the customer opens an order detail/tracking screen, join the order room:

```js
socket.emit("order:join", orderId);
socket.emit("order:leave", orderId);
```

### Socket Events To Listen For

`notification:new`

```json
{
  "id": "notification_id",
  "type": "ORDER_ON_THE_WAY",
  "title": "Order on the way",
  "message": "Order ORD-20260612-ABC123 is on the way.",
  "orderId": "order_id",
  "restaurantId": "restaurant_id",
  "driverId": "driver_profile_id",
  "metadata": {},
  "readAt": null,
  "createdAt": "2026-06-12T10:10:00.000Z"
}
```

`notification:read`

```json
{
  "id": "notification_id",
  "readAt": "2026-06-12T10:11:00.000Z"
}
```

`notification:read-all`

```json
{
  "readAt": "2026-06-12T10:11:00.000Z",
  "count": 3
}
```

`order:event`

```json
{
  "orderId": "order_id",
  "eventId": "event_id",
  "type": "ORDER_ON_THE_WAY",
  "previousStatus": "PICKED_UP",
  "nextStatus": "ON_THE_WAY",
  "message": "Order ORD-20260612-ABC123 is on the way.",
  "metadata": {
    "driverId": "driver_profile_id"
  },
  "actor": {
    "id": "driver_user_id",
    "name": "Usama Driver",
    "email": "driver@example.com",
    "role": "DRIVER"
  },
  "actorRole": "DRIVER",
  "createdAt": "2026-06-12T10:10:00.000Z"
}
```

`order:updated`

```json
{
  "orderId": "order_id",
  "status": "on_the_way",
  "driverId": "driver_profile_id",
  "assignedAt": "2026-06-12T10:00:00.000Z",
  "pickedUpAt": "2026-06-12T10:08:00.000Z",
  "onTheWayAt": "2026-06-12T10:10:00.000Z",
  "deliveredAt": null
}
```

Customer app event handling checklist:

- Listen to `notification:new` for live badge/list updates.
- Listen to `order:event` while the tracking screen is open and append it to the local timeline.
- Listen to `order:updated` while the tracking screen is open and refresh that order's status/timestamps.
- Customers do not need to listen to `driver:availability`; that event is for admin/dispatch/driver operational screens.

### Customer Event Types

Customer mobile should map these event types for order tracking:

```text
ORDER_PLACED
ORDER_ACCEPTED
ORDER_PREPARING
ORDER_READY
DRIVER_ASSIGNED
DRIVER_AUTO_ASSIGNED
DRIVER_ACCEPTED_ORDER
ORDER_PICKED_UP
ORDER_ON_THE_WAY
ORDER_DELIVERED
ORDER_CANCELLED
```

## Notifications Inbox APIs

These shared endpoints are available to customer mobile clients with the same bearer token.

### List Notifications

`GET /api/notifications?limit=20&unreadOnly=false`

Query params:

- `limit`: optional, default `20`, max `50`
- `cursor`: optional notification id from `nextCursor`
- `unreadOnly`: optional `true` or `false`

Success `200`:

```json
{
  "notifications": [
    {
      "id": "notification_id",
      "type": "ORDER_ON_THE_WAY",
      "title": "Order on the way",
      "message": "Order ORD-20260612-ABC123 is on the way.",
      "orderId": "order_id",
      "restaurantId": "restaurant_id",
      "driverId": "driver_profile_id",
      "metadata": {},
      "readAt": null,
      "createdAt": "2026-06-12T10:10:00.000Z"
    }
  ],
  "unreadCount": 1,
  "nextCursor": null
}
```

### Mark One Notification Read

`PATCH /api/notifications/{notificationId}/read`

Success `200`:

```json
{
  "notification": {
    "id": "notification_id",
    "readAt": "2026-06-12T10:11:00.000Z"
  }
}
```

### Mark All Notifications Read

`POST /api/notifications/read-all`

Success `200`:

```json
{
  "ok": true,
  "readAt": "2026-06-12T10:11:00.000Z",
  "count": 3
}
```

## Order Event Timeline API

Use this for customer order tracking screens and socket reconnect recovery.

`GET /api/orders/{orderId}/events`

Auth required. The order must belong to the logged-in customer.

Success `200`:

```json
{
  "events": [
    {
      "id": "event_id",
      "orderId": "order_id",
      "type": "ORDER_READY",
      "previousStatus": "PREPARING",
      "nextStatus": "READY",
      "message": "Order ORD-20260612-ABC123 is ready for pickup.",
      "metadata": {},
      "actor": {
        "id": "restaurant_owner_user_id",
        "name": "Restaurant Owner",
        "email": "owner@example.com",
        "role": "RESTAURANT"
      },
      "actorRole": "RESTAURANT",
      "createdAt": "2026-06-12T10:07:00.000Z"
    }
  ]
}
```

Possible errors:

- `401`: customer token missing or expired
- `403`: customer is not allowed to view this order timeline
- `404`: order not found

## Suggested Mobile Integration Flow

1. On app launch, read stored `auth.accessToken`.
2. If token exists, call `GET /api/customer/profile`.
3. If profile returns `401`, clear token and show login.
4. On login/signup success, store:
   - `auth.accessToken`
   - `auth.expiresAt`
   - `profile.activeAddress` or `user.customerProfile.activeAddress`
5. Home screen:
   - Load cuisines using `GET /api/customer/cuisines`.
   - Load restaurants using `GET /api/customer/restaurants`.
   - Pass active address coordinates as `lat` and `lng` when available.
6. Restaurant screen:
   - Load detail using `GET /api/customer/restaurants/{slug}`.
   - Use `menu.categories` for full menu.
7. Cart:
   - Call `POST /api/customer/orders/quote` whenever items or quantities change.
8. Checkout:
   - Ensure token is valid.
   - Ensure an active address exists or create one using `POST /api/customer/addresses`.
   - Create a Dragonpay payment using `POST /api/customer/payments/dragonpay/create`.
   - Open the returned `payment.redirectUrl` in a browser/webview.
   - The order is created only after Dragonpay confirms `S` success through postback/return.
9. Orders:
   - Use `GET /api/customer/orders` for history.
   - Use `GET /api/customer/orders/{orderId}` for detail.
   - Use `GET /api/orders/{orderId}/events` for the durable tracking timeline.
   - Join the Socket.IO `order:{orderId}` room while the tracking screen is open.
10. Notifications:
   - Use `GET /api/notifications` for inbox and unread count.
   - Listen to `notification:new` for live badge updates.

## Current Limitations / Notes

- There is no refresh-token endpoint yet. Mobile should treat `expiresAt` as the session expiry and send the user back to login when expired.
- Dragonpay payment collection is implemented for checkout. The legacy `POST /api/customer/orders` endpoint still creates an internal order for backward compatibility and non-provider testing.
- Order cancellation is not currently exposed as a customer endpoint.
- Favorites are not currently exposed as a customer endpoint.
- Address geocoding/autocomplete is handled by frontend Google Maps utilities, not a customer API endpoint.
- Currency labels currently use the existing server currency formatter.
