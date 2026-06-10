import { Text } from "@/components/ui/text";
import {
  formatDateForInput,
  parseDateInput,
} from "@/common/utils/date";
import { useAppearance } from "@/hooks/use-appearance";
import { useTheme } from "@/hooks/use-theme";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";

type DatePickerInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  label?: string;
  labelClassName?: string;
  editable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DatePickerInput({
  value,
  onChange,
  onBlur,
  placeholder = "dd/mm/aaaa",
  label,
  labelClassName = "shrink-0 text-base text-card-foreground",
  editable = true,
  minimumDate,
  maximumDate,
}: DatePickerInputProps) {
  const theme = useTheme();
  const { isDark } = useAppearance();
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const pickerValue = useMemo(
    () => parseDateInput(value) ?? new Date(),
    [value],
  );

  const displayText = value.trim() || null;

  const openAndroidPicker = () => {
    if (!editable) return;
    setShowAndroidPicker(true);
  };

  const handleAndroidChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowAndroidPicker(false);
    if (event.type === "set" && selectedDate) {
      onChange(formatDateForInput(selectedDate));
    }
    onBlur?.();
  };

  const handleIosCompactChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === "set" && selectedDate) {
      onChange(formatDateForInput(selectedDate));
      onBlur?.();
    }
  };

  if (Platform.OS === "ios") {
    return (
      <View
        className={`min-h-11 w-full flex-row items-center ${label ? "justify-between gap-3" : "justify-end"}`}
        style={{ opacity: editable ? 1 : 0.7 }}
        pointerEvents={editable ? "auto" : "none"}
      >
        {label ? (
          <Text className={labelClassName}>{label}</Text>
        ) : null}
        <View className={label ? "shrink-0" : undefined}>
          <DateTimePicker
          value={pickerValue}
          mode="date"
          display="compact"
          locale="pt-BR"
          themeVariant={isDark ? "dark" : "light"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleIosCompactChange}
          />
        </View>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={openAndroidPicker}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={label ?? "Selecionar data"}
        className="flex-row items-center overflow-hidden rounded-2xl border border-border bg-card"
        style={{ opacity: editable ? 1 : 0.7 }}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 15,
            color: displayText ? theme.cardForeground : theme.mutedForeground,
          }}
        >
          {displayText ?? placeholder}
        </Text>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Calendar size={20} color={theme.mutedForeground} />
        </View>
      </Pressable>

      {showAndroidPicker && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      )}
    </>
  );
}
