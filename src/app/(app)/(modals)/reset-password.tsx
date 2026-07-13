import { Text } from "@/components/ui/text";
import { useZodForm } from "@/components/ui/form";
import { ChangePasswordFormFields } from "@/features/auth/components/change-password-form-fields";
import { ResetPasswordFormFields } from "@/features/auth/components/reset-password-form-fields";
import {
  changePasswordFormSchema,
  resetPasswordFormSchema,
  type ChangePasswordFormInput,
  type ResetPasswordFormInput,
} from "@/features/auth/api/auth-schemas";
import { useChangePassword } from "@/features/auth/hooks/use-change-password";
import { useResetPassword } from "@/features/auth/hooks/use-reset-password";
import { useTheme } from "@/hooks/use-theme";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { router, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function computeOnline(state: NetInfoState): boolean {
  return !!(state.isConnected && state.isInternetReachable !== false);
}

export default function ResetPasswordModal() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const tokenParam = params.token;
  const token = Array.isArray(tokenParam)
    ? (tokenParam[0] ?? "")
    : (tokenParam ?? "");
  // With a token this is the email-link reset; without, it's the logged-in
  // "Alterar senha" flow (requires the current password).
  const isResetFlow = Boolean(token.trim());

  const { resetPassword, isLoading, error, setError } = useResetPassword();
  const {
    changePassword,
    isLoading: isChangingPassword,
    error: changeError,
    setError: setChangePasswordError,
  } = useChangePassword();
  const [isOnline, setIsOnline] = useState(false);

  const resetForm = useZodForm<ResetPasswordFormInput>({
    schema: resetPasswordFormSchema,
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onSubmit",
  });
  const changeForm = useZodForm<ChangePasswordFormInput>({
    schema: changePasswordFormSchema,
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    let cancelled = false;
    const sync = (state: NetInfoState) => {
      if (!cancelled) setIsOnline(computeOnline(state));
    };
    void NetInfo.fetch().then(sync);
    const unsub = NetInfo.addEventListener(sync);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const isSubmitting = isLoading || isChangingPassword;
  const inputsEnabled = !isSubmitting && isOnline && (!isResetFlow || !!token.trim());
  const iconColor = theme.cardForeground;

  const handleClose = () => router.back();

  const onSubmit = isResetFlow
    ? resetForm.handleSubmit(async (data) => {
        setError(null);
        const ok = await resetPassword({ token, data });
        if (!ok) return;
        Alert.alert("Sucesso", "Senha redefinida com sucesso.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      })
    : changeForm.handleSubmit(async (data) => {
        setChangePasswordError(null);
        changeForm.clearErrors("currentPassword");
        const result = await changePassword(data);
        if (!result.ok) {
          if (result.error?.toLowerCase().includes("senha atual")) {
            changeForm.setError("currentPassword", {
              type: "server",
              message: result.error,
            });
          }
          return;
        }
        Alert.alert("Sucesso", "Senha alterada com sucesso.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      });

  const activeError = isResetFlow ? error : changeError;

  return (
    <SafeAreaView className="flex-1 bg-background pt-4" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View className="flex-row items-center px-4 pb-2 pt-4">
          <View className="flex-1 items-center">
            <Text className="font-bold text-card-foreground">
              {isResetFlow ? "Redefinir senha" : "Alterar senha"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            className="absolute right-4 h-8 w-8 items-center justify-center rounded-full bg-muted"
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <X size={16} color={iconColor} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-4 pb-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isResetFlow ? (
            <ResetPasswordFormFields
              control={resetForm.control}
              formState={resetForm.formState}
              editable={inputsEnabled}
            />
          ) : (
            <ChangePasswordFormFields
              control={changeForm.control}
              formState={changeForm.formState}
              editable={inputsEnabled}
            />
          )}
          {activeError ? (
            <Text className="text-sm text-destructive">{activeError}</Text>
          ) : null}
        </ScrollView>

        <View
          className="flex-row gap-3 border-t border-border px-4 pb-2 pt-3"
          style={{ borderTopColor: theme.border }}
        >
          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            className="h-12 flex-1 items-center justify-center rounded-xl border border-border bg-card"
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
          >
            <Text className="text-base font-medium text-card-foreground">
              Cancelar
            </Text>
          </Pressable>
          <Pressable
            onPress={onSubmit}
            disabled={!inputsEnabled || isSubmitting}
            className="h-12 flex-1 items-center justify-center rounded-xl bg-primary"
            accessibilityRole="button"
            accessibilityLabel={isResetFlow ? "Redefinir senha" : "Alterar senha"}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-medium text-white">
                {isResetFlow ? "Redefinir" : "Alterar"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
