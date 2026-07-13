import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Users } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { Group } from "@/features/groups/api/groups-api";

/** The square group card visual (image/placeholder + gradient + name). */
export function GroupCardVisual({
  group,
  size,
}: {
  group: Group;
  size: number;
}) {
  return (
    <View
      className="bg-muted overflow-hidden rounded-3xl"
      style={{ width: size, height: size }}
    >
      {group.imageUrl ? (
        <Image
          source={{ uri: group.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View
          style={StyleSheet.absoluteFill}
          className="items-center justify-center bg-primary"
        >
          <Users size={56} color="#ffffff" />
        </View>
      )}
      {group.imageUrl ? (
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.9)"] as const}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "60%",
          }}
        />
      ) : null}

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          alignItems: "flex-start",
        }}
      >
        {group.description ? (
          <Text
            style={{ textAlign: "left" }}
            className="mt-1 text-xs text-primary-foreground"
            numberOfLines={2}
          >
            {group.description}
          </Text>
        ) : null}
        <Text
          style={{ textAlign: "left" }}
          className="text-lg font-bold text-white"
          numberOfLines={1}
        >
          {group.name}
        </Text>
      </View>
    </View>
  );
}
