import { uploadApi } from "@/common/api/upload";
import { FormError } from "@/components/ui/form/form-error";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  Controller,
  type Control,
  type FieldError,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";

export function getUserInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  const last = parts[parts.length - 1];
  return last
    ? (parts[0][0] + last[0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

type AvatarFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  fullName: string;
  error?: FieldError;
  disabled?: boolean;
};

export function AvatarField<T extends FieldValues>({
  control,
  name,
  fullName,
  error,
  disabled = false,
}: AvatarFieldProps<T>) {
  const theme = useTheme();
  const [isPicking, setIsPicking] = useState(false);

  return (
    <View className="gap-3">
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => {
          const avatarUrl = (value as string | undefined) ?? "";

          const handlePickImage = async () => {
            if (disabled || isPicking) return;
            setIsPicking(true);
            try {
              const permission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) {
                Alert.alert(
                  "Permissão necessária",
                  "Permita o acesso à galeria para escolher um avatar.",
                );
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
              });

              if (result.canceled || !result.assets[0]) return;

              const asset = result.assets[0];
              const mimeType = asset.mimeType?.toLowerCase();
              if (
                mimeType &&
                mimeType !== "image/jpeg" &&
                mimeType !== "image/jpg" &&
                mimeType !== "image/png"
              ) {
                Alert.alert(
                  "Formato inválido",
                  "Use apenas imagens JPEG ou PNG.",
                );
                return;
              }

              if (asset.fileSize) {
                const validation = uploadApi.validateImage(asset.fileSize);
                if (!validation.isValid) {
                  Alert.alert(
                    "Imagem inválida",
                    validation.error ?? "Imagem inválida.",
                  );
                  return;
                }
              }

              onChange(asset.uri);
            } catch (pickError) {
              const message =
                pickError instanceof Error
                  ? pickError.message
                  : "Não foi possível escolher a imagem.";
              Alert.alert("Erro", message);
            } finally {
              setIsPicking(false);
            }
          };

          return (
            <View className="items-center gap-3">
              <View
                className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-card"
                style={{ borderColor: theme.border }}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: 96, height: 96 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text className="text-2xl font-bold text-primary">
                    {getUserInitials(fullName || "?")}
                  </Text>
                )}
              </View>

              <View className="flex-row flex-wrap justify-center gap-2">
                <Pressable
                  onPress={handlePickImage}
                  disabled={disabled || isPicking}
                  className="rounded-xl border border-border bg-card px-4 py-2"
                  accessibilityRole="button"
                  accessibilityLabel="Escolher da galeria"
                >
                  {isPicking ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text className="text-sm font-medium text-card-foreground">
                      Escolher da galeria
                    </Text>
                  )}
                </Pressable>
                {avatarUrl ? (
                  <Pressable
                    onPress={() => onChange("")}
                    disabled={disabled || isPicking}
                    className="rounded-xl border border-border bg-card px-4 py-2"
                    accessibilityRole="button"
                    accessibilityLabel="Remover avatar"
                  >
                    <Text className="text-sm font-medium text-card-foreground">
                      Remover
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
      <FormError error={error} />
    </View>
  );
}
