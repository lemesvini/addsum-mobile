import { Text } from "@/components/ui/text";
import { Pressable, View } from "react-native";

export type SegmentOption = { label: string; value: string };

type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
};

// Matches iOS's native dark-mode UISegmentedControl: a dark track with a
// lighter, higher-contrast pill behind the selected segment. The app's own
// `card`/`muted` tokens are too close in tone for this — hand-picked to
// mirror the real iOS look instead.
const TRACK_COLOR = "#1C1C1E";
const ACTIVE_PILL_COLOR = "#3A3A3C";
const INACTIVE_TEXT_COLOR = "#8E8E93";

/**
 * Custom Android segmented control: a plain highlighted pill (no checkmark),
 * styled to match iOS's native segmented control as closely as possible
 * instead of Material 3's default SegmentedButton look.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <View
      className="h-9 flex-row rounded-full p-0.5"
      style={{ backgroundColor: TRACK_COLOR }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className="flex-1 items-center justify-center rounded-full"
            style={
              active
                ? {
                    backgroundColor: ACTIVE_PILL_COLOR,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.3,
                    shadowRadius: 2,
                    elevation: 2,
                  }
                : undefined
            }
          >
            <Text
              className={`text-sm ${active ? "font-semibold text-white" : "font-medium"}`}
              style={active ? undefined : { color: INACTIVE_TEXT_COLOR }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
