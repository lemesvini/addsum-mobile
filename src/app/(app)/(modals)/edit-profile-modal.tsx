import { Text } from "@/components/ui/text";
import { useZodForm } from "@/components/ui/form";
import { ProfileForm } from "@/features/profile/components/profile-form";
import {
  profileEditSchema,
  type ProfileEditSchema,
} from "@/features/profile/api/profile-schemas";
import {
  fetchAuthenticatedProfile,
  updateAuthProfile,
} from "@/features/profile/hooks/use-profile-api";
import { uploadLocalAvatarUrl } from "@/common/api/media-upload";
import { useAppearance } from "@/hooks/use-appearance";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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

export default function EditProfileModal() {
  const { isDark } = useAppearance();
  const theme = useTheme();
  const iconColor = isDark ? "white" : "black";
  const initialAvatarUrlRef = useRef<string>("");

  const [email, setEmail] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, formState, reset, register } =
    useZodForm<ProfileEditSchema>({
      schema: profileEditSchema,
      defaultValues: { fullName: "", avatarUrl: "" },
    });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      setIsLoadingProfile(true);
      try {
        const user = await fetchAuthenticatedProfile();
        if (cancelled) return;
        const av = user.avatarUrl?.trim() ?? "";
        initialAvatarUrlRef.current = av;
        setEmail(user.email ?? "");
        reset({ fullName: user.fullName ?? "", avatarUrl: av });
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Erro ao carregar perfil",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const handleClose = () => router.back();

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const trimmedAvatar = (data.avatarUrl ?? "").trim();
      const hadInitialAvatar = Boolean(initialAvatarUrlRef.current.trim());

      const payload: { fullName: string; avatarUrl?: string } = {
        fullName: data.fullName.trim(),
      };

      if (!trimmedAvatar) {
        if (hadInitialAvatar) payload.avatarUrl = "";
      } else if (
        trimmedAvatar.startsWith("file://") ||
        trimmedAvatar.startsWith("content://")
      ) {
        payload.avatarUrl = await uploadLocalAvatarUrl(trimmedAvatar);
        if (!payload.avatarUrl) {
          throw new Error("Não foi possível enviar o avatar.");
        }
      } else {
        payload.avatarUrl = trimmedAvatar;
      }

      await updateAuthProfile(payload);
      router.back();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Não foi possível salvar o perfil.";
      setSubmitError(message);
      Alert.alert("Erro", message);
    } finally {
      setIsSubmitting(false);
    }
  });

  if (isLoadingProfile) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-center text-sm text-muted-foreground">
            {loadError}
          </Text>
          <Pressable
            onPress={handleClose}
            className="rounded-xl bg-primary px-6 py-3"
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Text className="font-medium text-white">Fechar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background pt-4" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-4 pb-2 pt-4">
          <View className="flex-1 items-center">
            <Text className="font-bold text-card-foreground">
              Editar perfil
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ProfileForm
            control={control}
            formState={formState}
            register={register}
            disabled={isSubmitting}
          />

          <View className="gap-2">
            <Text className="text-sm font-medium text-card-foreground">
              E-mail
            </Text>
            <View className="overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 opacity-75">
              <Text className="text-[15px] text-card-foreground">{email}</Text>
            </View>
          </View>

          {submitError ? (
            <Text className="text-sm text-destructive">{submitError}</Text>
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
            disabled={isSubmitting}
            className="h-12 flex-1 items-center justify-center rounded-xl bg-primary"
            accessibilityRole="button"
            accessibilityLabel="Salvar alterações"
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-medium text-white">Salvar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
