import { Text } from "@/components/ui/text";
import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

type OnboardingSlideLayoutProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function OnboardingSlideLayout({
  icon: Icon,
  title,
  description,
}: OnboardingSlideLayoutProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="items-center justify-center rounded-full bg-primary/10"
        style={{ width: 120, height: 120, marginBottom: 40 }}
      >
        <Icon size={56} color="#2C67CA" strokeWidth={1.5} />
      </View>
      <Text
        className="text-center font-bold text-foreground"
        style={{ fontSize: 28, letterSpacing: -0.5, lineHeight: 34 }}
      >
        {title}
      </Text>
      <Text
        className="text-center text-muted-foreground"
        style={{ fontSize: 16, lineHeight: 24, marginTop: 16 }}
      >
        {description}
      </Text>
    </View>
  );
}
