import CloseButton from "@/components/close-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useGroup } from "@/features/groups/hooks/use-group";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Copy, X } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ShareGroupModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { group } = useGroup(id);
  const [copied, setCopied] = useState(false);

  const code = group?.inviteCode ?? "";

  const onCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView className="">
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-foreground text-xl font-bold">
          Convidar um amigo
        </Text>
        <CloseButton />
      </View>

      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="items-center py-6">
          {code ? (
            <View className="rounded-2xl">
              <QRCode
                value={code}
                size={280}
                color="#ffffff"
                backgroundColor="transparent"
              />
            </View>
          ) : null}
        </View>

        {/* <Card>
          <CardContent className="gap-3">
            <CardTitle>Código de convite</CardTitle>
            <CardDescription>
              Compartilhe este código para que outras pessoas entrem no grupo.
            </CardDescription>
            <View className="bg-muted flex-row items-center justify-between rounded-lg px-4 py-3">
              <Text className="text-foreground text-2xl font-bold tracking-[4px]">
                {code || "------"}
              </Text>
              <TouchableOpacity
                onPress={onCopy}
                hitSlop={8}
                disabled={!code}
                className="flex-row items-center gap-1.5"
              >
                {copied ? (
                  <Check size={20} color="#16a34a" />
                ) : (
                  <Copy size={20} color="#111827" />
                )}
                <Text className="text-foreground text-sm font-semibold">
                  {copied ? "Copiado" : "Copiar"}
                </Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card> */}
      </ScrollView>
    </SafeAreaView>
  );
}
