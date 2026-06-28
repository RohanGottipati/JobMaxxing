import { AppPage } from "@/components/layout/app-page";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCareerProfile } from "@/lib/profile/career";

export default async function ProfilePage() {
  await requireCurrentUser();
  const profile = await getCareerProfile();

  return (
    <AppPage size="wide">
      <ProfileEditor profile={profile} />
    </AppPage>
  );
}
