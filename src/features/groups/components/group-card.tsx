import { Link, type Href } from "expo-router";
import { useState } from "react";
import { Pressable } from "react-native";
import { LogOut, Pencil, Trash2 } from "lucide-react-native";
import { ActionSheet, type ActionSheetItem } from "@/components/ui/action-sheet";
import type { Group } from "@/features/groups/api/groups-api";
import { GroupCardVisual } from "@/features/groups/components/group-card-visual";
import { useGroupActions } from "@/features/groups/hooks/use-group-actions";

type GroupCardProps = {
  group: Group;
  size: number;
};

/**
 * Group card: tap opens the group; long-press shows the themed action sheet
 * (Editar/Excluir for the admin, Sair for a participant).
 */
export function GroupCard({ group, size }: GroupCardProps) {
  const { isAdmin, onEdit, onDelete, onLeave } = useGroupActions(group);
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);
  // Defer the action so the sheet's dismiss animation doesn't clash with the
  // navigation / confirm dialog it triggers.
  const run = (fn: () => void) => () => {
    close();
    setTimeout(fn, 180);
  };

  const items: ActionSheetItem[] = isAdmin
    ? [
        { label: "Editar", icon: Pencil, onPress: run(onEdit) },
        {
          label: "Excluir",
          icon: Trash2,
          destructive: true,
          onPress: run(onDelete),
        },
      ]
    : [
        {
          label: "Sair do grupo",
          icon: LogOut,
          destructive: true,
          onPress: run(onLeave),
        },
      ];

  return (
    <>
      <Link href={`/group/${group._id}` as Href} asChild>
        <Link.AppleZoom>
          <Pressable onLongPress={() => setMenuOpen(true)} delayLongPress={350}>
            <GroupCardVisual group={group} size={size} />
          </Pressable>
        </Link.AppleZoom>
      </Link>

      <ActionSheet
        visible={menuOpen}
        onClose={close}
        title={group.name}
        items={items}
      />
    </>
  );
}
