import { OnboardingSlideLayout } from "@/features/onboarding/components/onboarding-slide-layout";
import { CloudOff } from "lucide-react-native";

export function OnboardingSlide4() {
  return (
    <OnboardingSlideLayout
      icon={CloudOff}
      title="Trabalhe offline"
      description="Os dados ficam sincronizados localmente. Continue usando o app sem conexão e sincronize quando a rede voltar."
    />
  );
}
