import { Text } from "@/components/ui/text";
import { useTabScreenTopPadding } from "@/hooks/use-tab-screen-top-padding";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router, type Href } from "expo-router";
import { Plus, Users, UserPlus, ListPlus } from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";

export default function GroupsScreen() {
  const theme = useTheme();
  const topPadding = useTabScreenTopPadding();
  const { groups } = useGroups();
  const { width } = useWindowDimensions();
  // 2-column grid: screen minus px-4 (16*2) and the 16px gap between columns.
  const cardSize = Math.floor((width - 32 - 16) / 2);

  return (
    <SafeAreaView className="bg-background flex-1 px-4">
      <ScrollView
        contentContainerStyle={{
          ...topPadding,
          paddingBottom: 120,
          flexGrow: 1,
        }}
      >
        <View className="flex-row items-center justify-between mb-6 ">
          <Text className="text-foreground text-3xl font-extrabold tracking-tight">
            Grupos
          </Text>
          <View className="flex-row items-center">
            <Pressable
              className="bg-muted rounded-full p-3 mb-2"
              onPress={() => router.push("(modals)/join-group-modal" as Href)}
            >
              <ListPlus size={18} color={theme.foreground} />
            </Pressable>
            <Pressable
              className="bg-muted rounded-full p-3 mb-2 ml-2"
              onPress={() => router.push("(modals)/create-group-modal" as Href)}
            >
              <Plus size={18} color={theme.foreground} />
            </Pressable>
          </View>
        </View>

        {groups.length === 0 ? (
          <View className="flex-1 items-center justify-center pb-24">
            {/* <View className="bg-muted rounded-full p-6 mb-5">
              <Users size={48} color={theme.mutedForeground} />
            </View> */}
            <Text className="text-foreground text-lg font-semibold">
              Nenhum grupo encontrado
            </Text>
            <Text className="text-muted-foreground mt-1 px-6 text-center">
              Crie um grupo ou entre com um código de convite.
            </Text>
          </View>
        ) : (
          <View className="flex flex-row flex-wrap gap-4 mb-6">
            {groups.map((g) => (
              <View key={g._id} style={{ width: cardSize }}>
                <Link href={`/group/${g._id}` as Href} asChild>
                  <Link.AppleZoom>
                    <Pressable>
                      <View
                        className="bg-muted overflow-hidden rounded-3xl"
                        style={{ width: cardSize, height: cardSize }}
                      >
                        {g.imageUrl ? (
                          <Image
                            source={{ uri: g.imageUrl }}
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
                        {g.imageUrl ? (
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
                          {g.description ? (
                            <Text
                              style={{ textAlign: "left" }}
                              className="mt-1 text-xs text-primary-foreground"
                              numberOfLines={2}
                            >
                              {g.description}
                            </Text>
                          ) : null}
                          <Text
                            style={{ textAlign: "left" }}
                            className="text-lg font-bold text-white"
                            numberOfLines={1}
                          >
                            {g.name}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </Link.AppleZoom>
                </Link>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
