import { Host, Button } from "@expo/ui/swift-ui";
import type { ComponentProps } from "react";
import {
  buttonStyle,
  labelStyle,
  controlSize,
  font,
  frame,
  clipShape,
} from "@expo/ui/swift-ui/modifiers";

type SystemImage = ComponentProps<typeof Button>["systemImage"];

export default function HeaderActionButton({
  label,
  systemImage,
  onPress,
}: {
  label: string;
  systemImage: SystemImage;
  onPress: () => void;
}) {
  return (
    <Host>
      <Button
        label={label}
        onPress={onPress}
        systemImage={systemImage}
        modifiers={[
          buttonStyle("glass"),
          labelStyle("iconOnly"),
          //   controlSize("large"),
          //   font({ size: 20, weight: "semibold" }),
          //   frame({ width: 48, height: 48 }),
        ]}
      />
    </Host>
  );
}
