import { SettingsPanel } from "@/components/settings/panel";
import { getLicenseTier, FEATURES } from "@/lib/license";

export default function SettingsPage() {
  const tier = getLicenseTier();
  return <SettingsPanel tier={tier} showSSO={FEATURES.sso(tier)} />;
}
