import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthTextField } from "@/features/auth/components/auth-text-field";
import { useLogin } from "@/features/auth/hooks/use-login";
import { useAuthStore } from "@/features/auth/auth-store";
import { getPostAuthRoute } from "@/features/onboarding/onboarding-store";
import {
  loginInputSchema,
  type LoginInput,
} from "@/features/auth/api/auth-schemas";
import { useZodForm } from "@/components/ui/form";
import { useTheme } from "@/hooks/use-theme";
import { Redirect, useRouter, type Href } from "expo-router";
import { Mail, KeyRound } from "lucide-react-native";
import { Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

export default function SignInScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { mutate, isLoading, error } = useLogin();
  const router = useRouter();
  const theme = useTheme();
  const [postAuthHref, setPostAuthHref] = useState<Href | null>(null);

  const { control, handleSubmit, formState } = useZodForm<LoginInput>({
    schema: loginInputSchema,
    defaultValues: { email: "", password: "" },
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

  const onSubmit = handleSubmit(
    async (data) => {
      console.log("[sign-in] onValid", data);
      try {
        await mutate({ email: data.email.trim(), password: data.password });
      } catch {}
    },
    (errors) => {
      console.log("[sign-in] onInvalid", JSON.stringify(errors));
    },
  );

  return (
    <View className="flex-1 items-center justify-center p-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1  justify-center"
      >
        <Text className="text-foreground text-3xl font-extrabold tracking-tight">
          Acesse sua conta
        </Text>
        <Text className="text-muted-foreground mb-6 mt-2 text-base">
          Faça login para acessar sua conta e aproveitar todos os recursos do
          app.
        </Text>

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
              placeholder="Senha"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.password?.message}
            />
          )}
        />

        <View className="mb-4 mt-6 flex-row justify-between">
          <Pressable onPress={() => router.replace("/(auth)/register" as Href)}>
            <Text className="text-muted-foreground text-sm">
              Criar uma conta
            </Text>
          </Pressable>
          <Pressable>
            <Text className="text-muted-foreground text-sm">
              Esqueci minha senha
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text className="text-destructive mb-3 text-sm">{error}</Text>
        ) : null}

        <Pressable
          disabled={isLoading}
          className="rounded-full bg-primary px-4 py-3 items-center"
          onPress={() => {
            onSubmit();
          }}
        >
          <Text className="text-primary-foreground font-semibold">
            {isLoading ? "Entrando..." : "Entrar"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
