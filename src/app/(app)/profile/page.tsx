import { saveProfile } from "@/app/(app)/profile/actions";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getProfile } from "@/lib/profile/repository";
import { formatDateTime } from "@/lib/applications/status";

type ProfilePageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  await requireCurrentUser();
  const params = await searchParams;
  const { email, profile } = await getProfile();

  return (
    <AppPage size="narrow">
      <AppPageHeader
        title="Profile"
        description="Your account details and how you appear in JobMaxxing."
      />

      {params.saved ? (
        <Alert>
          <AlertDescription>Profile saved.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Email is managed through Supabase Auth.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email ?? ""} disabled />
          </div>
          {profile ? (
            <p className="text-xs text-muted-foreground">
              Member since {formatDateTime(profile.created_at)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
          <CardDescription>
            Optional details for your job search workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveProfile} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                placeholder="Your name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                name="headline"
                defaultValue={profile?.headline ?? ""}
                placeholder="e.g. Product manager · Toronto"
              />
            </div>
            <SubmitButton type="submit" pendingLabel="Saving...">
              Save profile
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </AppPage>
  );
}
