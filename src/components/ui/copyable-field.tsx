import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import * as Clipboard from "expo-clipboard";
import { Check, Copy } from "lucide-react-native";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";

type CopyableFieldProps = {
  label: string;
  /** What the user sees (e.g. a formatted Pix key). */
  displayValue: string;
  /** What gets copied to the clipboard (defaults to `displayValue`). */
  copyValue?: string;
  /** Small caption shown under the value (e.g. the key type). */
  caption?: string;
};

/**
 * Labeled value with a copy button. Displays `displayValue` but copies
 * `copyValue` (raw), mirroring the copy pattern used in share-group-modal.
 */
export function CopyableField({
  label,
  displayValue,
  copyValue,
  caption,
}: CopyableFieldProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const value = copyValue ?? displayValue;
    if (!value) return;
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View className="bg-muted flex-row items-center justify-between rounded-xl px-4 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-muted-foreground text-xs">{label}</Text>
        <Text className="text-foreground text-base font-semibold" numberOfLines={1}>
          {displayValue}
        </Text>
        {caption ? (
          <Text className="text-muted-foreground mt-0.5 text-xs">{caption}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onCopy}
        hitSlop={8}
        className="flex-row items-center gap-1.5"
        accessibilityRole="button"
        accessibilityLabel={`Copiar ${label}`}
      >
        {copied ? (
          <Check size={18} color="#22C55E" />
        ) : (
          <Copy size={18} color={theme.foreground} />
        )}
        <Text className="text-foreground text-sm font-semibold">
          {copied ? "Copiado" : "Copiar"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
