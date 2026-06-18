# Food Delivery App

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
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

```sh
npm start
```

Open the project in Expo Go from the QR code, or run a platform directly:

```sh
npm run ios
npm run android
```

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
