import { OnboardingSlideLayout } from "@/features/onboarding/components/onboarding-slide-layout";
import { Layers } from "lucide-react-native";

export function OnboardingSlide3() {
  return (
    <OnboardingSlideLayout
      icon={Layers}
      title="Registre despesas"
      description="Adicione gastos e divida automaticamente entre os participantes do grupo."
    />
  );
}
