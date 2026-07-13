import { useCallback, useEffect, useRef } from "react";
import { Platform, ScrollView, useWindowDimensions } from "react-native";

import { useKeyboardBottomInset } from "@/hooks/use-keyboard-bottom-inset";

const ANDROID_KEYBOARD_CONTENT_GAP = 24;

/**
 * Android `adjustResize` already shrinks the window when the keyboard opens.
 * This computes the leftover keyboard height not covered by that resize
 * (`keyboardOverlayHeight`) to use as ScrollView bottom padding, and auto-scrolls
 * to the end so the focused field stays visible. No-ops on iOS.
 */
export function useAndroidKeyboardScroll() {
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardBottomInset = useKeyboardBottomInset();
  const { height: windowHeight } = useWindowDimensions();
  const expandedWindowHeightRef = useRef(windowHeight);

  useEffect(() => {
    if (keyboardBottomInset !== 0) return;

    expandedWindowHeightRef.current = Math.max(
      expandedWindowHeightRef.current,
      windowHeight,
    );
  }, [keyboardBottomInset, windowHeight]);

  const resizedWindowHeight = Math.max(
    0,
    expandedWindowHeightRef.current - windowHeight,
  );
  const keyboardOverlayHeight =
    Platform.OS === "android"
      ? Math.max(0, keyboardBottomInset - resizedWindowHeight)
      : 0;
  const androidKeyboardContentInset =
    Platform.OS === "android" && keyboardBottomInset > 0
      ? keyboardOverlayHeight + ANDROID_KEYBOARD_CONTENT_GAP
      : 0;
  const handleContentSizeChange = useCallback(() => {
    if (Platform.OS !== "android" || keyboardBottomInset === 0) return;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, [keyboardBottomInset]);

  useEffect(() => {
    if (Platform.OS !== "android" || keyboardBottomInset === 0) return;

    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timeout);
  }, [keyboardBottomInset, keyboardOverlayHeight]);

  return {
    scrollViewRef,
    keyboardOverlayHeight,
    androidKeyboardContentInset,
    handleContentSizeChange,
  };
}
