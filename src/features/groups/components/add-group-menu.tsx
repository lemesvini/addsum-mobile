import { useState } from "react";
import { Pressable } from "react-native";
import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Text,
} from "@expo/ui/jetpack-compose";
import { Plus } from "lucide-react-native";
import { router, type Href } from "expo-router";
import { useTheme } from "@/hooks/use-theme";

/**
 * "+" button in the Groups header that opens a native Android dropdown menu
 * with "Criar grupo" / "Entrar em um grupo".
 */
export function AddGroupMenu() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const go = (href: string) => () => {
    setOpen(false);
    router.push(href as Href);
  };

  return (
    <Host matchContents style={{ width: 44, height: 44 }}>
      <DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
        <DropdownMenu.Trigger>
          <Pressable
            className="bg-muted items-center justify-center rounded-full"
            style={{ width: 44, height: 44 }}
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Adicionar grupo"
          >
            <Plus size={18} color={theme.foreground} />
          </Pressable>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          <DropdownMenuItem onClick={go("(modals)/create-group-modal")}>
            <DropdownMenuItem.Text>
              <Text>Criar grupo</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={go("(modals)/join-group-modal")}>
            <DropdownMenuItem.Text>
              <Text>Entrar em um grupo</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
