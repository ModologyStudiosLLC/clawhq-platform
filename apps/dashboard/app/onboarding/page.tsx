import { OnboardingWizard } from "@/components/onboarding/wizard";

export default function OnboardingPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--color-bg)" }}
    >
      <OnboardingWizard />
    </div>
  );
}
