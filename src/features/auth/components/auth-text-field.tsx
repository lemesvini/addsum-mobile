import { Text } from "@/components/ui/text";
import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import {
  Platform,
  Pressable,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";

type AuthTextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Optional leading icon (lucide). */
  icon?: LucideIcon;
  /** When true, renders a show/hide password eye toggle. */
  password?: boolean;
};

/** Pill-shaped, icon-led text input used across the auth sheets. */
export function AuthTextField({
  label,
  error,
  icon: Icon,
  password,
  ...props
}: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const theme = useTheme();

  return (
    <View className="mb-3">
      {label ? (
        <Text className="text-foreground mb-2 text-sm font-medium">
          {label}
        </Text>
      ) : null}
      <View
        className="flex-row items-center rounded-full px-4"
        style={{
          borderWidth: focused ? 1.5 : 0.5,
          borderColor: focused ? "#10B981" : "white",
        }}
      >
        {Icon ? <Icon size={20} color="#9CA3AF" /> : null}
        <TextInput
          placeholderTextColor="#9CA3AF"
          {...props}
          secureTextEntry={password ? hidden : props.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={{
            flex: 1,
            paddingHorizontal: Icon ? 12 : 4,
            paddingVertical: Platform.OS === "ios" ? 15 : 12,
            fontSize: 16,
            color: theme.foreground,
          }}
        />
        {password ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            {hidden ? (
              <Eye size={20} color="#9CA3AF" />
            ) : (
              <EyeOff size={20} color="#9CA3AF" />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="text-destructive mt-1.5 text-sm">{error}</Text>
      ) : null}
    </View>
  );
}
