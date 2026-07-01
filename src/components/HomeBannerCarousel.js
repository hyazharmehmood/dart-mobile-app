import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

export default function HomeBannerCarousel({ banners, onPress }) {
  const { width } = useWindowDimensions();

  if (!banners.length) {
    return null;
  }

  return (
    <View className="mb-6">
      <ScrollView
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
      >
        {banners.map((banner, index) => (
          <Pressable
            key={banner.id || `${banner.title}-${index}`}
            onPress={() => onPress(banner)}
            style={{ width }}
            className="h-[168px] overflow-hidden bg-[#1F2933]"
          >
            {banner.imageUrl ? (
              <Image source={{ uri: banner.imageUrl }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
            ) : (
              <View className="absolute inset-0 bg-primary" />
            )}

            <LinearGradient
              colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.78)"]}
              locations={[0, 0.45, 1]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}
            >
              <View className="px-6 pb-5">
                <Text className="text-[22px] font-extrabold leading-7 text-white" numberOfLines={2}>
                  {banner.title || "Dart offer"}
                </Text>
                {banner.subtitle ? (
                  <Text className="mt-1.5 text-sm font-medium leading-5 text-white/95" numberOfLines={2}>
                    {banner.subtitle}
                  </Text>
                ) : null}
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
