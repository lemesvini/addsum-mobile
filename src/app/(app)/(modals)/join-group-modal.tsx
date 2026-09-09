import { Text } from "@/components/ui/text";
import { useGroupsMutations } from "@/features/groups/hooks/use-groups-mutations";
import { useTheme } from "@/hooks/use-theme";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ClipboardPaste, Ticket, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getApiErrorMessage } from "@/common/api/api-error";

// Invite codes are 8 hex chars (`generateInviteCode` on the API); a few
// legacy groups still have 6-char codes, so both are accepted.
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 8;

export default function JoinGroupModal() {
  const { joinGroup } = useGroupsMutations();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = code.trim();
  const canSubmit = trimmed.length >= MIN_CODE_LENGTH && !busy;

  const onChangeCode = (value: string) => {
    setCode(value.toUpperCase().replace(/\s/g, ""));
    if (error) setError(null);
  };

  const onPaste = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) return;
    Haptics.selectionAsync();
    onChangeCode(text);
  };

  const onJoin = async () => {
    if (trimmed.length < MIN_CODE_LENGTH) {
      setError("Código inválido");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await joinGroup(trimmed);
      router.back();
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Não foi possível entrar no grupo"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <View className="flex-row items-center justify-end px-5 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          className="bg-muted h-9 w-9 items-center justify-center rounded-full"
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
          <X size={18} color={theme.foreground} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 items-center px-6 pt-6">
          <View
            className="bg-muted items-center justify-center rounded-3xl"
            style={{ width: 80, height: 80 }}
          >
            <Ticket size={32} color={theme.primary} />
          </View>

          <Text className="text-foreground mt-6 text-center text-3xl font-extrabold tracking-tight">
            Entrar em um grupo
          </Text>
          <Text className="text-muted-foreground mt-2 max-w-xs text-center text-base leading-6">
            Peça o código de convite para alguém que já faz parte do grupo.
          </Text>

          <View
            className="bg-card mt-8 w-full rounded-2xl"
            style={{
              borderWidth: focused ? 1.5 : 1,
              borderColor: focused ? theme.primary : theme.border,
            }}
          >
            <TextInput
              value={code}
              onChangeText={onChangeCode}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="ABCD1234"
              placeholderTextColor={theme.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={MAX_CODE_LENGTH}
              returnKeyType="go"
              onSubmitEditing={() => canSubmit && onJoin()}
              style={{
                height: 64,
                textAlign: "center",
                fontSize: 24,
                fontWeight: "700",
                letterSpacing: 6,
                color: theme.foreground,
              }}
            />
          </View>

          <Pressable
            onPress={onPaste}
            className="mt-3 flex-row items-center gap-2 rounded-full px-4 py-2 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Colar código"
          >
            <ClipboardPaste size={16} color={theme.mutedForeground} />
            <Text className="text-muted-foreground text-sm font-medium">
              Colar código
            </Text>
          </Pressable>

          {error ? (
            <Text className="text-destructive mt-4 text-center text-sm">
              {error}
            </Text>
          ) : null}
        </View>

        <View
          className="px-6 pt-3"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Pressable
            disabled={!canSubmit}
            onPress={onJoin}
            className={`h-14 items-center justify-center rounded-2xl ${
              canSubmit ? "bg-primary active:opacity-90" : "bg-muted"
            }`}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`text-base font-bold ${
                  canSubmit ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Entrar
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
