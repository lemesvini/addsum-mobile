import { Text } from "@/components/ui/text";
import { useTabScreenTopPadding } from "@/hooks/use-tab-screen-top-padding";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { GroupCard } from "@/features/groups/components/group-card";
import { AddGroupMenu } from "@/features/groups/components/add-group-menu";
import {
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";

export default function GroupsScreen() {
  const theme = useTheme();
  const topPadding = useTabScreenTopPadding();
  const { groups, refetch } = useGroups();
  const { width } = useWindowDimensions();
  // 2-column grid: screen minus px-4 (16*2) and the 16px gap between columns.
  const cardSize = Math.floor((width - 32 - 16) / 2);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View className="bg-background flex-1 px-4">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          ...topPadding,
          paddingBottom: 120,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View className="flex-row items-center justify-between mb-6 ">
          <Text className="text-foreground text-3xl font-extrabold tracking-tight">
            Grupos
          </Text>
          <AddGroupMenu />
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
                <GroupCard group={g} size={cardSize} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
