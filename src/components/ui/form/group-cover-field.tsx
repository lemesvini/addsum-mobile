import { uploadApi } from "@/common/api/upload";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Pencil, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";

/**
 * Copies a picked image out of the (volatile) cache into the document directory so
 * a queued offline upload survives cache eviction and app restarts. Returns the new
 * persistent `file://` URI, or the original URI if the copy fails.
 */
function persistPickedImage(uri: string): string {
  try {
    const ext = (uri.split("?")[0]?.split(".").pop() || "jpg").toLowerCase();
    const fileName = `group-cover-${Date.now()}.${ext}`;
    const dest = new File(Paths.document, fileName);
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

type GroupCoverFieldProps = {
  /** Current cover URI (local `file://` or remote `https://`), or empty. */
  value: string;
  onChange: (uri: string) => void;
  disabled?: boolean;
};

export function GroupCoverField({
  value,
  onChange,
  disabled = false,
}: GroupCoverFieldProps) {
  const theme = useTheme();
  const [isPicking, setIsPicking] = useState(false);

  const handlePickImage = async () => {
    if (disabled || isPicking) return;
    setIsPicking(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso à galeria para escolher uma capa.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
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
        Alert.alert("Formato inválido", "Use apenas imagens JPEG ou PNG.");
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

      onChange(persistPickedImage(asset.uri));
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

  const handleRemoveImage = () => {
    if (disabled || isPicking) return;
    Alert.alert(
      "Remover capa",
      "Tem certeza que deseja remover a capa do grupo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => onChange(""),
        },
      ],
    );
  };

  return (
    <View className="mb-4">
      <Pressable
        onPress={handlePickImage}
        disabled={disabled || isPicking}
        accessibilityRole="button"
        accessibilityLabel="Escolher capa do grupo"
        className="aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card"
        style={{ borderColor: theme.border }}
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View className="items-center gap-2">
            {isPicking ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <ImagePlus size={28} color={theme.mutedForeground} />
                <Text className="text-muted-foreground text-sm">
                  Adicionar capa
                </Text>
              </>
            )}
          </View>
        )}

        {value ? (
          <View
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <Pressable
              onPress={handlePickImage}
              disabled={disabled || isPicking}
              style={{
                height: 36,
                width: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
              accessibilityRole="button"
              accessibilityLabel="Trocar capa"
            >
              {isPicking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Pencil size={16} color="#fff" />
              )}
            </Pressable>
            <Pressable
              onPress={handleRemoveImage}
              disabled={disabled || isPicking}
              style={{
                height: 36,
                width: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
              accessibilityRole="button"
              accessibilityLabel="Remover capa"
            >
              <Trash2 size={16} color="#fff" />
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
