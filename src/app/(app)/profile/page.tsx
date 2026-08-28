import { AppPage } from "@/components/layout/app-page";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCanonicalCareerProfile } from "@/lib/career/repository";

export default async function ProfilePage() {
  await requireCurrentUser();
  const profile = await getCanonicalCareerProfile();

  return (
    <AppPage size="wide">
      <ProfileEditor profile={profile} />
    </AppPage>
  );
}
