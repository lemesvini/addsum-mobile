import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Native Tabs on Android only apply bottom safe-area insets automatically.
 * iOS tab screens rely on contentInsetAdjustmentBehavior="automatic" instead.
 */
export function useTabScreenTopPadding() {
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === "android" ? insets.top : 0;
  return { paddingTop };
}
