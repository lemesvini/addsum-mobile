import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

export type SegmentOption = { label: string; value: string };

type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
};

/** Native iOS segmented control (UISegmentedControl via SwiftUI Picker). */
export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <Host style={{ height: 36 }} matchContents={false}>
      <Picker
        selection={value}
        onSelectionChange={(v) => onChange(String(v))}
        modifiers={[pickerStyle("segmented")]}
      >
        {options.map((o) => (
          <Text key={o.value} modifiers={[tag(o.value)]}>
            {o.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
