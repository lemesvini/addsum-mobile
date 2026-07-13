import { useCallback } from "react";
import { Alert } from "react-native";
import { router, type Href } from "expo-router";
import { useAuthUser } from "@/features/auth/auth-store";
import { useGroupsMutations } from "@/features/groups/hooks/use-groups-mutations";
import type { Group } from "@/features/groups/api/groups-api";

type UseGroupActionsOptions = {
  /** Called when the current user is no longer in the group (deleted, or leave finalized). */
  onRemoved?: () => void;
};

/**
 * Edit / delete / leave actions for a group, shared by the list context menu
 * and the group-detail overflow menu. Destructive actions confirm first.
 */
export function useGroupActions(
  group: Group | null | undefined,
  { onRemoved }: UseGroupActionsOptions = {},
) {
  const authUser = useAuthUser();
  const { deleteGroup, leaveGroup } = useGroupsMutations();

  const isAdmin = !!group && !!authUser && group.adminUserId === authUser._id;

  const onEdit = useCallback(() => {
    if (!group) return;
    router.push(`(modals)/edit-group-modal?id=${group._id}` as Href);
  }, [group]);

  const onDelete = useCallback(() => {
    if (!group) return;
    Alert.alert(
      "Excluir grupo",
      `Excluir "${group.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGroup(group._id);
              onRemoved?.();
            } catch (e: any) {
              Alert.alert(
                "Erro",
                e?.message ?? "Não foi possível excluir o grupo.",
              );
            }
          },
        },
      ],
    );
  }, [group, deleteGroup, onRemoved]);

  const onLeave = useCallback(() => {
    if (!group) return;
    Alert.alert("Sair do grupo", `Deseja sair de "${group.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await leaveGroup(group._id);
            if (result.status === "LEAVING") {
              Alert.alert(
                "Pagamentos pendentes",
                "Você tem pagamentos pendentes neste grupo. Quite-os para sair — você não será adicionado a novas despesas.",
              );
            } else {
              onRemoved?.();
            }
          } catch (e: any) {
            Alert.alert(
              "Erro",
              e?.message ?? "Não foi possível sair do grupo.",
            );
          }
        },
      },
    ]);
  }, [group, leaveGroup, onRemoved]);

  return { isAdmin, onEdit, onDelete, onLeave };
}
