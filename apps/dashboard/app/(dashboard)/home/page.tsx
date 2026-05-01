import { withAuth } from "@workos-inc/authkit-nextjs";
import { HomeDigest } from "@/components/home/digest";

export default async function HomePage() {
  const { user } = await withAuth();
  const firstName = user?.firstName ?? undefined;
  return <HomeDigest userName={firstName} />;
}
