import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthTextField } from "@/features/auth/components/auth-text-field";
import { useRegister } from "@/features/auth/hooks/use-register";
import { useAuthStore } from "@/features/auth/auth-store";
import { getPostAuthRoute } from "@/features/onboarding/onboarding-store";
import {
  registerInputSchema,
  type RegisterInput,
} from "@/features/auth/api/auth-schemas";
import { useZodForm } from "@/components/ui/form";
import { useTheme } from "@/hooks/use-theme";
import { Redirect, useRouter, type Href } from "expo-router";
import { User, Mail, KeyRound } from "lucide-react-native";
import { Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

export default function RegisterScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { mutate, isLoading, error } = useRegister();
  const router = useRouter();
  const theme = useTheme();
  const [postAuthHref, setPostAuthHref] = useState<Href | null>(null);

  const { control, handleSubmit, formState } = useZodForm<RegisterInput>({
    schema: registerInputSchema,
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!accessToken) {
      setPostAuthHref(null);
      return;
    }
    getPostAuthRoute(accessToken).then(setPostAuthHref);
  }, [accessToken]);

  if (accessToken) {
    if (!postAuthHref) return null;
    return <Redirect href={postAuthHref} />;
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await mutate({
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        password: data.password,
      });
    } catch {
      // surfaced via `error`
    }
  });

  return (
    <View className="flex-1 items-center justify-center p-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <Text className="text-foreground text-3xl font-extrabold tracking-tight">
          Criar conta
        </Text>
        <Text className="text-muted-foreground mb-6 mt-2 text-base">
          Comece a dividir despesas com seus grupos em segundos.
        </Text>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { value, onChange, onBlur } }) => (
            <AuthTextField
              icon={User}
              placeholder="Nome completo"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <AuthTextField
              icon={Mail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <AuthTextField
              icon={KeyRound}
              password
              placeholder="Senha (mín. 8 caracteres)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { value, onChange, onBlur } }) => (
            <AuthTextField
              icon={KeyRound}
              password
              placeholder="Confirmar senha"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.confirmPassword?.message}
            />
          )}
        />

        <View className="mb-4 mt-1 flex-row">
          <Text className="text-muted-foreground text-sm">Já tem conta? </Text>
          <Pressable onPress={() => router.replace("/(auth)/sign-in" as Href)}>
            <Text className="text-primary text-sm font-semibold">Entrar</Text>
          </Pressable>
        </View>

        {error ? (
          <Text className="text-destructive mb-3 text-sm">{error}</Text>
        ) : null}

        <Pressable
          disabled={isLoading}
          onPress={onSubmit}
          className="rounded-full bg-primary px-4 py-3 items-center"
        >
          <Text className="text-primary-foreground font-semibold">
            {isLoading ? "Criando..." : "Criar conta"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
