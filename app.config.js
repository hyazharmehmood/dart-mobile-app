const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "dart-app-eaa91";

module.exports = {
  expo: {
    name: "dart",
    slug: "food-delivery-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.azhar.fooddelivery",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Allow dart to use your location for nearby restaurants and delivery."
      },
      config: {
        googleMapsApiKey
      }
    },
    android: {
      package: "com.twowaydigitalmedia.dart",
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/logo.png",
        backgroundColor: "#FF6400"
      },
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey
        }
      },
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "POST_NOTIFICATIONS"],
      edgeToEdgeEnabled: true
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      "expo-secure-store",
      [
        "expo-font",
        {
          fonts: [
            "./assets/fonts/Satoshi-Light.ttf",
            "./assets/fonts/Satoshi-Regular.ttf",
            "./assets/fonts/Satoshi-Medium.ttf",
            "./assets/fonts/Satoshi-Bold.ttf",
            "./assets/fonts/Satoshi-Black.ttf"
          ]
        }
      ]
    ],
    extra: {
      firebase: {
        projectId: firebaseProjectId
      }
    }
  }
};
