import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  View,
} from "react-native";
import { Text } from "@/components/ui/text";
import { ArrowBigRightDash } from "lucide-react-native";

const THUMB_SIZE = 70;
const THUMB_INNER = THUMB_SIZE - 6;

interface SlideButtonProps {
  onSlide: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  /** Increment this from the parent whenever login fails to snap the thumb back. */
  resetKey: number;
}

export function SlideButton({
  onSlide,
  isLoading,
  isSuccess,
  resetKey,
}: SlideButtonProps) {
  // translateX — native driver (transform only)
  const thumbX = useRef(new Animated.Value(0)).current;
  // success color + scale — JS driver (backgroundColor / scale)
  const successAnim = useRef(new Animated.Value(0)).current;

  const trackWidthRef = useRef(0);
  const onSlideRef = useRef(onSlide);
  onSlideRef.current = onSlide;

  // Snap back only when the parent explicitly signals failure (resetKey increments).
  // Skips the initial mount by comparing to the initial value.
  const prevResetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = resetKey;
      Animated.spring(thumbX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
  }, [resetKey, thumbX]);

  // Success animation
  useEffect(() => {
    if (isSuccess) {
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [isSuccess, successAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dx }) => {
        const max = trackWidthRef.current - THUMB_SIZE;
        thumbX.setValue(Math.max(0, Math.min(dx, max)));
      },
      onPanResponderRelease: (_, { dx }) => {
        const max = trackWidthRef.current - THUMB_SIZE;
        const current = Math.max(0, Math.min(dx, max));
        if (max > 0 && current >= max * 0.82) {
          Animated.spring(thumbX, {
            toValue: max,
            useNativeDriver: true,
            bounciness: 0,
          }).start(() => {
            onSlideRef.current();
          });
        } else {
          Animated.spring(thumbX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    }),
  ).current;

  const textOpacity = thumbX.interpolate({
    inputRange: [0, 90],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const trackBg = successAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#5654C7", "#22C55E"],
  });

  const thumbBg = successAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#6100FF", "#22C55E"],
  });

  const thumbScale = successAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.12, 1],
  });

  return (
    <Animated.View
      onLayout={(e) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
      }}
      style={{
        height: THUMB_SIZE,
        backgroundColor: trackBg,
        borderRadius: 14,
        marginTop: 28,
        overflow: "hidden",
        justifyContent: "center",
      }}
    >
      <Animated.Text
        style={{
          opacity: textOpacity,
          textAlign: "center",
          color: "#AEAEB2",
          fontSize: 16,
          fontWeight: "500",
        }}
      >
        Deslize para continuar...
      </Animated.Text>

      {/* Outer view: translateX only (native driver) */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: "absolute",
          left: 3,
          width: THUMB_INNER,
          height: THUMB_INNER,
          transform: [{ translateX: thumbX }],
        }}
      >
        {/* Inner view: backgroundColor + scale (JS driver — no mixing) */}
        <Animated.View
          style={{
            flex: 1,
            borderRadius: 10,
            backgroundColor: thumbBg,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: thumbScale }],
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : isSuccess ? (
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold" }}>
              ✓
            </Text>
          ) : (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <ArrowBigRightDash size={22} color="#fff" />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
