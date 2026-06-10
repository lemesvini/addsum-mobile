import { cn } from "@/lib/utils";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FormSheetScreenProps = {
  children: ReactNode;
  className?: string;
};

export function FormSheetScreen({ children, className }: FormSheetScreenProps) {
  const useLiquidGlass = isLiquidGlassAvailable();

  return (
    <SafeAreaView
      className={cn(
        "flex-1",
        !useLiquidGlass && "bg-background",
        Platform.OS === "ios" && "pt-4",
        className,
      )}
      edges={Platform.OS === "ios" ? ["top", "bottom"] : ["bottom"]}
    >
      {children}
    </SafeAreaView>
  );
}
