import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { Modal, Platform, Pressable, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ActionSheetItem = {
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  destructive?: boolean;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
  cancelLabel?: string;
};

/**
 * Themed bottom action sheet: the backdrop fades in place while the card slides
 * up from the bottom. Used for the group long-press / overflow (⋯) menus and
 * the "+" menu, on both platforms.
 */
export function ActionSheet({
  visible,
  onClose,
  title,
  items,
  cancelLabel = "Cancelar",
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  // iOS presents the sheet above the tab bar (already clear of the home
  // indicator), so it only needs a small gap; Android draws to the true bottom
  // edge and needs the inset.
  const chin =
    Platform.OS === "ios" ? 10 : Math.max(insets.bottom, 12);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        <Animated.View entering={SlideInDown.duration(240)}>
          {/* Absorb presses so tapping the sheet doesn't dismiss it. */}
          <Pressable
            onPress={() => {}}
            className="px-3"
            style={{ paddingBottom: chin }}
          >
            <View className="bg-card border-border overflow-hidden rounded-3xl border">
              {title ? (
                <View className="border-border border-b px-5 py-4">
                  <Text
                    className="text-foreground text-base font-semibold"
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                </View>
              ) : null}
              {items.map((item, i) => (
                <SheetRow
                  key={item.label}
                  item={item}
                  divider={i < items.length - 1}
                />
              ))}
            </View>

            <Pressable
              onPress={onClose}
              className="bg-card border-border mt-2 h-12 items-center justify-center rounded-3xl border active:opacity-80"
            >
              <Text className="text-foreground font-semibold">
                {cancelLabel}
              </Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function SheetRow({
  item,
  divider,
}: {
  item: ActionSheetItem;
  divider: boolean;
}) {
  const theme = useTheme();
  const Icon = item.icon;
  const color = item.destructive ? theme.destructive : theme.foreground;
  return (
    <Pressable
      onPress={item.onPress}
      className={`flex-row items-center gap-3 px-5 py-4 active:opacity-70 ${
        divider ? "border-border border-b" : ""
      }`}
    >
      {Icon ? <Icon size={20} color={color} /> : null}
      <Text
        className={`text-base font-medium ${
          item.destructive ? "text-destructive" : "text-foreground"
        }`}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}
