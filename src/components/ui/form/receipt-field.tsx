import { uploadApi } from "@/common/api/upload";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Camera, Eye, ImagePlus, Pencil, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { Card } from "../card";

/**
 * Copies a picked image out of the (volatile) cache into the document directory so
 * a queued offline upload survives cache eviction and app restarts. Returns the new
 * persistent `file://` URI, or the original URI if the copy fails.
 */
function persistPickedImage(uri: string): string {
  try {
    const ext = (uri.split("?")[0]?.split(".").pop() || "jpg").toLowerCase();
    const fileName = `expense-receipt-${Date.now()}.${ext}`;
    const dest = new File(Paths.document, fileName);
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/** Validates the picked asset's mime type and size; returns true if acceptable. */
function validateAsset(asset: ImagePicker.ImagePickerAsset): boolean {
  const mimeType = asset.mimeType?.toLowerCase();
  if (
    mimeType &&
    mimeType !== "image/jpeg" &&
    mimeType !== "image/jpg" &&
    mimeType !== "image/png"
  ) {
    Alert.alert("Formato inválido", "Use apenas imagens JPEG ou PNG.");
    return false;
  }

  if (asset.fileSize) {
    const validation = uploadApi.validateImage(asset.fileSize);
    if (!validation.isValid) {
      Alert.alert("Imagem inválida", validation.error ?? "Imagem inválida.");
      return false;
    }
  }

  return true;
}

type ReceiptFieldProps = {
  /** Current receipt URI (local `file://` or remote `https://`), or empty. */
  value: string;
  onChange: (uri: string) => void;
  disabled?: boolean;
};

export function ReceiptField({
  value,
  onChange,
  disabled = false,
}: ReceiptFieldProps) {
  const theme = useTheme();
  const [isPicking, setIsPicking] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Permita o acesso à galeria para escolher um comprovante.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateAsset(asset)) return;
    onChange(persistPickedImage(asset.uri));
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Permita o acesso à câmera para fotografar um comprovante.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateAsset(asset)) return;
    onChange(persistPickedImage(asset.uri));
  };

  const runPicker = async (pick: () => Promise<void>) => {
    if (disabled || isPicking) return;
    setIsPicking(true);
    try {
      await pick();
    } catch (pickError) {
      const message =
        pickError instanceof Error
          ? pickError.message
          : "Não foi possível obter a imagem.";
      Alert.alert("Erro", message);
    } finally {
      setIsPicking(false);
    }
  };

  const handlePress = () => {
    if (disabled || isPicking) return;
    Alert.alert("Comprovante", "Como deseja adicionar o comprovante?", [
      { text: "Tirar foto", onPress: () => runPicker(takePhoto) },
      {
        text: "Escolher da galeria",
        onPress: () => runPicker(pickFromGallery),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleRemove = () => {
    if (disabled || isPicking) return;
    Alert.alert("Remover comprovante", "Deseja remover o comprovante?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => onChange(""),
      },
    ]);
  };

  return (
    <View className="mb-4">
      {value ? (
        <View className="gap-2 flex flex-row items-center">
          <Pressable
            onPress={() => setViewerOpen(true)}
            disabled={isPicking}
            accessibilityRole="button"
            accessibilityLabel="Ver comprovante"
            className="bg-secondary h-11 flex-1 flex-row items-center justify-center gap-2 rounded-md active:opacity-80"
          >
            <Eye size={18} color={theme.secondaryForeground} />
            <Text className="text-secondary-foreground font-semibold">
              Ver comprovante
            </Text>
          </Pressable>

          <View className="flex-row gap-2">
            <Pressable
              onPress={handlePress}
              disabled={disabled || isPicking}
              accessibilityRole="button"
              accessibilityLabel="Trocar comprovante"
              className={` border-border px-4 h-11 flex-row items-center justify-center gap-2 rounded-md border active:opacity-80 ${
                disabled || isPicking ? "opacity-50" : ""
              }`}
            >
              {isPicking ? (
                <ActivityIndicator size="small" />
              ) : (
                <Pencil size={16} color={theme.foreground} />
              )}
              {/* <Text className="text-foreground font-medium">Trocar</Text> */}
            </Pressable>
            <Pressable
              onPress={handleRemove}
              disabled={disabled || isPicking}
              accessibilityRole="button"
              accessibilityLabel="Remover comprovante"
              className={` border-border px-4 h-11 flex-row items-center justify-center gap-2 rounded-md border active:opacity-80 ${
                disabled || isPicking ? "opacity-50" : ""
              }`}
            >
              <Trash2 size={16} color="#EF4444" />
              {/* <Text className="text-destructive font-medium">Remover</Text> */}
            </Pressable>
          </View>
        </View>
      ) : (
        <Card>
          <Pressable
            onPress={handlePress}
            disabled={disabled || isPicking}
            accessibilityRole="button"
            accessibilityLabel="Adicionar comprovante da despesa"
            className="items-center justify-center gap-2  py-8"
            style={{ borderColor: theme.border }}
          >
            {isPicking ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <ImagePlus size={28} color={theme.mutedForeground} />
                <Text className="text-muted-foreground text-sm">
                  Adicionar comprovante (opcional)
                </Text>
                <View className="flex-row items-center gap-1">
                  <Camera size={14} color={theme.mutedForeground} />
                  <Text className="text-muted-foreground text-xs">
                    Câmera ou galeria
                  </Text>
                </View>
              </>
            )}
          </Pressable>
        </Card>
      )}

      {value ? (
        <Modal
          visible={viewerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerOpen(false)}
        >
          <Pressable
            onPress={() => setViewerOpen(false)}
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          >
            <TouchableOpacity
              onPress={() => setViewerOpen(false)}
              hitSlop={12}
              style={{ position: "absolute", top: 56, right: 20, zIndex: 1 }}
              accessibilityRole="button"
              accessibilityLabel="Fechar comprovante"
            >
              <X size={28} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: value }}
              style={{ width: "92%", height: "80%" }}
              contentFit="contain"
            />
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
