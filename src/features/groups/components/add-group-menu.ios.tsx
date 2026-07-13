import { View } from "react-native";
import { Button, Host, Image, Menu } from "@expo/ui/swift-ui";
import { router, type Href } from "expo-router";
import { useTheme } from "@/hooks/use-theme";

/**
 * "+" button in the Groups header that opens a native iOS menu with
 * "Criar grupo" / "Entrar em um grupo".
 */
export function AddGroupMenu() {
  const theme = useTheme();
  return (
    <View
      className="bg-muted items-center justify-center rounded-full"
      style={{ width: 44, height: 44, overflow: "hidden" }}
    >
      <Host matchContents>
        <Menu label={<Image systemName="plus" size={18} color={theme.foreground} />}>
          <Button
            systemImage="plus"
            label="Criar grupo"
            onPress={() => router.push("(modals)/create-group-modal" as Href)}
          />
          <Button
            systemImage="person.badge.plus"
            label="Entrar em um grupo"
            onPress={() => router.push("(modals)/join-group-modal" as Href)}
          />
        </Menu>
      </Host>
    </View>
  );
}
