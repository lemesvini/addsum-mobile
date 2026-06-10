import { OnboardingSlide1 } from "./components/slides/onboarding-slide-1";
import { OnboardingSlide2 } from "./components/slides/onboarding-slide-2";
import { OnboardingSlide3 } from "./components/slides/onboarding-slide-3";
import { OnboardingSlide4 } from "./components/slides/onboarding-slide-4";
import type { ComponentType } from "react";

export const ONBOARDING_SLIDES: ComponentType[] = [
  OnboardingSlide1,
  OnboardingSlide2,
  OnboardingSlide3,
  OnboardingSlide4,
];

export {
  getPostAuthRoute,
  hasCompletedOnboarding,
  markOnboardingCompleted,
  resetOnboarding,
} from "./onboarding-store";
