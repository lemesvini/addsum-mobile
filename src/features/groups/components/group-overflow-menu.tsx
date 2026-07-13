import { useState } from "react";
import { TouchableOpacity } from "react-native";
import { LogOut, MoreHorizontal, Pencil, Trash2 } from "lucide-react-native";
import { ActionSheet, type ActionSheetItem } from "@/components/ui/action-sheet";
import type { Group } from "@/features/groups/api/groups-api";
import { useGroupActions } from "@/features/groups/hooks/use-group-actions";

type GroupOverflowMenuProps = {
  group: Group | null | undefined;
  /** Called when the user leaves/deletes the group (navigate away). */
  onRemoved?: () => void;
};

/**
 * Overflow menu (⋯) for the group-detail header. Opens the themed action sheet
 * (Editar/Excluir for the admin, Sair for a participant) on both platforms.
 */
export function GroupOverflowMenu({ group, onRemoved }: GroupOverflowMenuProps) {
  const { isAdmin, onEdit, onDelete, onLeave } = useGroupActions(group, {
    onRemoved,
  });
  const [menuOpen, setMenuOpen] = useState(false);

  if (!group) return null;

  const close = () => setMenuOpen(false);
  // Defer so the sheet's dismiss animation doesn't clash with the navigation /
  // confirm dialog the action triggers.
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
      <TouchableOpacity
        onPress={() => setMenuOpen(true)}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        accessibilityRole="button"
        accessibilityLabel="Opções do grupo"
      >
        <MoreHorizontal size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <ActionSheet
        visible={menuOpen}
        onClose={close}
        title={group.name}
        items={items}
      />
    </>
  );
}
