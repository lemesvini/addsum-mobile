import { OnboardingSlideLayout } from "@/features/onboarding/components/onboarding-slide-layout";
import { Sparkles } from "lucide-react-native";

export function OnboardingSlide1() {
  return (
    <OnboardingSlideLayout
      icon={Sparkles}
      title="Bem-vindo ao Addsum"
      description="Divida despesas com seus grupos de forma simples e justa, em qualquer lugar."
    />
  );
}
