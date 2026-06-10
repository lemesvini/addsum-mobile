import { OnboardingSlideLayout } from "@/features/onboarding/components/onboarding-slide-layout";
import { BarChart3 } from "lucide-react-native";

export function OnboardingSlide2() {
  return (
    <OnboardingSlideLayout
      icon={BarChart3}
      title="Crie grupos"
      description="Monte grupos para a república, a viagem ou o rolê — e convide a galera com um código."
    />
  );
}
