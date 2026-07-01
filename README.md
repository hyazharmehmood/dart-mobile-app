# dart

Expo React Native starter app built with JavaScript, NativeWind, React Navigation,
Zustand, and Axios.

## Install

```sh
npm install
```

## Run

Create a local `.env` file first:

```sh
cp .env.example .env
```

Then set:

```text
EXPO_PUBLIC_API_BASE_URL=https://app.dart.com.ph
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id_or_key_here
```

```sh
npm start
```

Open the project in Expo Go from the QR code, or run a platform directly:

```sh
npm run ios
npm run android
```

## Customer API Coverage

The app is wired to the updated customer mobile APIs for:

- Xendit checkout channels and payment sessions
- customer auth, password reset, profile, uploads, addresses, cart, orders, notifications, and push preferences
- home banners, cuisine filtering, favorites, reviews, and disputes

Checkout uses `POST /api/customer/payments/xendit/session` with `client: "mobile"`.
Redirect payment channels open inside the app WebView. The final order is created
server-side after Xendit confirms payment, so the app refreshes orders and listens for
notifications/socket updates instead of assuming an order exists immediately.

## Initial Setup Commands Used

```sh
npm install
npm install expo@~54.0.34
npx expo install --fix
npx expo install react-native-maps expo-location
npm install --save-dev babel-preset-expo
```

## Structure

```text
src/
  components/
  navigation/
  screens/
  services/
  store/
  theme/
```
