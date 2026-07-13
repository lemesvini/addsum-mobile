import {
  Host,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
} from "@expo/ui/jetpack-compose";

export type SegmentOption = { label: string; value: string };

type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
};

/** Native Android segmented control (Material 3 SegmentedButton row). */
export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <Host style={{ height: 48 }} matchContents={false}>
      <SingleChoiceSegmentedButtonRow>
        {options.map((o) => (
          <SegmentedButton
            key={o.value}
            selected={o.value === value}
            onClick={() => onChange(o.value)}
          >
            <SegmentedButton.Label>{o.label}</SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
