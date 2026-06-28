import { saveProfile } from "@/app/(app)/profile/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Your account details and how you appear in JobMaxxing.
        </p>
      </div>

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
            <Button type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
