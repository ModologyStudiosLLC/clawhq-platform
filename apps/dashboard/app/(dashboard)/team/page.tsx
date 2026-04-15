import { getLicenseTier, FEATURES } from "@/lib/license";
import { TeamPageClient } from "@/components/team/team-page-client";

export default async function TeamPage() {
  const tier = getLicenseTier();
  const showMembers = FEATURES.memberManagement(tier);
  const showRBAC = FEATURES.rbac(tier);

  return <TeamPageClient showMembers={showMembers} showRBAC={showRBAC} tier={tier} />;
}
