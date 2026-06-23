import { forwardRef } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

function SuggestionRow({ item, onPress }) {
  const title = item.structured_formatting?.main_text || item.description;
  const subtitle = item.structured_formatting?.secondary_text || "";

  return (
    <Pressable
      onPress={() => onPress(item)}
      className="mb-2 flex-row items-start rounded-2xl bg-white px-1 py-3 active:opacity-80"
    >
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-[#F6F7F8]">
        <Ionicons name="business-outline" size={20} color="#8A8F98" />
      </View>
      <View className="flex-1 border-b border-[#F0F0F0] pb-3">
        <Text className="text-base font-semibold leading-5 text-ink" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-sm leading-5 text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function ActionRow({ icon, iconColor, title, subtitle, onPress, loading }) {
  return (
    <Pressable onPress={onPress} className="mb-2 flex-row items-center rounded-2xl bg-white py-3 active:opacity-80">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F8]">
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={21} color={iconColor} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-ink">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-xs leading-4 text-muted">{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B6BBC3" />
    </Pressable>
  );
}

const GoogleAddressSearch = forwardRef(function GoogleAddressSearch(
  {
    value,
    suggestions = [],
    isFocused,
    isSearching,
    isResolvingLocation,
    maxResultsHeight,
    placeholder = "Enter your address",
    onBlur,
    onChangeText,
    onClear,
    onFocus,
    onSelectMapCenter,
    onSelectSuggestion,
    onSubmit,
    onUseCurrentLocation
  },
  ref
) {
  const trimmedValue = value.trim();
  const showResults = isFocused;
  const showNoResults = showResults && trimmedValue.length > 2 && !isSearching && !suggestions.length;

  return (
    <View>
      <View className="h-14 flex-row items-center rounded-2xl border border-[#ECECEC] bg-[#F6F7F8] px-4">
        <View className="mr-3 h-7 w-7 items-center justify-center">
          {isSearching ? (
            <ActivityIndicator size="small" color="#FF6400" />
          ) : (
            <Ionicons name="search" size={19} color="#6B7280" />
          )}
        </View>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          className="h-full flex-1 text-base text-ink"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          blurOnSubmit={false}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={() => {
            if (trimmedValue) {
              onSubmit?.();
            }
          }}
        />
        {value ? (
          <Pressable onPress={onClear} className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white">
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>

      <ActionRow
        icon="locate-outline"
        iconColor="#00A85A"
        title="Use my current location"
        subtitle="We will pin your device location on the map"
        loading={isResolvingLocation}
        onPress={onUseCurrentLocation}
      />

      {!isFocused ? (
        <ActionRow
          icon="location-outline"
          iconColor="#FF6400"
          title="Select pinned location on map"
          subtitle="Move the map or tap a place, then use the pin"
          onPress={onSelectMapCenter}
        />
      ) : null}

      {showResults ? (
        <ScrollView
          className="mt-2"
          style={{ maxHeight: maxResultsHeight }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {suggestions.map((item) => (
            <SuggestionRow key={item.place_id} item={item} onPress={onSelectSuggestion} />
          ))}

          {showNoResults ? (
            <View className="mt-2 rounded-2xl bg-[#F6F7F8] px-4 py-5">
              <Text className="text-sm font-bold text-ink">No addresses found</Text>
              <Text className="mt-1 text-xs leading-5 text-muted">
                Try a more complete street, area, or city name.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
});

export default GoogleAddressSearch;
