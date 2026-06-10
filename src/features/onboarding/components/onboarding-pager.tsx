import { Text } from "@/components/ui/text";
import { ONBOARDING_SLIDES } from "@/features/onboarding";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SLIDE_COUNT = ONBOARDING_SLIDES.length;

type OnboardingPagerProps = {
  onComplete: () => void;
};

export function OnboardingPager({ onComplete }: OnboardingPagerProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === SLIDE_COUNT - 1;

  const syncIndexFromOffset = useCallback(
    (offsetX: number) => {
      const index = Math.round(offsetX / screenWidth);
      if (index >= 0 && index < SLIDE_COUNT) {
        setActiveIndex(index);
      }
    },
    [screenWidth],
  );

  const goToSlide = useCallback(
    (index: number) => {
      listRef.current?.scrollToOffset({
        offset: index * screenWidth,
        animated: true,
      });
      setActiveIndex(index);
    },
    [screenWidth],
  );

  const handleNext = useCallback(() => {
    if (activeIndex >= SLIDE_COUNT - 1) {
      onComplete();
      return;
    }
    goToSlide(activeIndex + 1);
  }, [activeIndex, goToSlide, onComplete]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncIndexFromOffset(event.nativeEvent.contentOffset.x);
    },
    [syncIndexFromOffset],
  );

  const renderItem = useCallback(
    ({ item: Slide }: ListRenderItemInfo<(typeof ONBOARDING_SLIDES)[number]>) => (
      <View style={{ width: screenWidth, flex: 1 }}>
        <Slide />
      </View>
    ),
    [screenWidth],
  );

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row justify-end px-6"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable onPress={onComplete} hitSlop={12}>
          <Text className="text-primary font-medium" style={{ fontSize: 16 }}>
            Pular
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} pointerEvents="box-none">
        <FlatList
          ref={listRef}
          data={ONBOARDING_SLIDES}
          renderItem={renderItem}
          keyExtractor={(_, index) => String(index)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          bounces={false}
          style={{ flex: 1 }}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          onScrollToIndexFailed={({ index }) => {
            goToSlide(index);
          }}
        />
      </View>

      <View
        className="px-8 bg-background"
        style={{ paddingBottom: insets.bottom + 24, zIndex: 10 }}
      >
        <View className="flex-row items-center justify-center gap-2 mb-8">
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              className="rounded-full"
              style={{
                width: index === activeIndex ? 24 : 8,
                height: 8,
                backgroundColor: index === activeIndex ? "#2C67CA" : "#D0CBD9",
              }}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleNext}
          className="w-full items-center justify-center rounded-md bg-primary"
          style={{ height: 44 }}
        >
          <Text className="font-medium text-primary-foreground">
            {isLastSlide ? "Começar" : "Próximo"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
