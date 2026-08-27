"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  FileUp,
  FolderGit2,
  GraduationCap,
  HeartHandshake,
  Languages,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Unlock,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  saveProfileAction,
  type SaveProfileResult,
} from "@/app/(app)/profile/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  careerProfileV1Schema,
  newId,
  type CareerProfileV1,
} from "@/lib/career/schemas";
import { cn } from "@/lib/utils";

type ProfileWithEmail = CareerProfileV1 & { email: string | null };
type Experience = CareerProfileV1["experiences"][number];
type Project = CareerProfileV1["projects"][number];
type Bullet = Experience["bullets"][number];

type SectionId =
  | "personal"
  | "preferences"
  | "summary"
  | "experience"
  | "volunteer"
  | "education"
  | "projects"
  | "skills"
  | "credentials"
  | "recognition";

const SECTIONS: Array<{ id: SectionId; label: string; icon: typeof User }> = [
  { id: "personal", label: "Personal", icon: User },
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "volunteer", label: "Volunteer", icon: HeartHandshake },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "skills", label: "Skills", icon: BookOpen },
  { id: "credentials", label: "Credentials", icon: Languages },
  { id: "recognition", label: "Recognition", icon: Award },
];

const CAREER_STAGES = [
  ["student", "Student"],
  ["new_grad", "New graduate"],
  ["early_career", "Early career"],
  ["mid_career", "Mid career"],
  ["senior", "Senior individual contributor"],
  ["manager", "Manager"],
  ["executive", "Executive"],
  ["career_change", "Career change"],
] as const;

const PROFILE_LINK_KINDS = ["linkedin", "github", "portfolio", "website", "other"] as const;

function profileData(profile: ProfileWithEmail): CareerProfileV1 {
  const value = structuredClone(profile) as Partial<ProfileWithEmail>;
  delete value.email;
  return value as CareerProfileV1;
}

function emptyBullet(): Bullet {
  return {
    id: newId(),
    originalText: "",
    approvedText: "",
    technologies: [],
    demonstratedSkills: [],
    metrics: [],
    sourceKind: "manual",
    verificationStatus: "user_confirmed",
    confidence: 1,
    isLocked: false,
  };
}

function emptyExperience(kind: Experience["kind"]): Experience {
  return {
    id: newId(),
    kind,
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    originalText: "",
    approvedText: "",
    technologies: [],
    demonstratedSkills: [],
    metrics: [],
    sourceKind: "manual",
    verificationStatus: "user_confirmed",
    confidence: 1,
    isLocked: false,
    bullets: [],
  };
}

function emptyProject(): Project {
  return {
    id: newId(),
    title: "",
    date: "",
    url: "",
    originalText: "",
    approvedText: "",
    technologies: [],
    demonstratedSkills: [],
    metrics: [],
    sourceKind: "manual",
    verificationStatus: "user_confirmed",
    confidence: 1,
    isLocked: false,
    bullets: [],
  };
}

function normalizeForSave(profile: CareerProfileV1): CareerProfileV1 {
  const normalizeBullets = (bullets: Bullet[]) =>
    bullets
      .map((bullet) => ({
        ...bullet,
        approvedText: bullet.approvedText.trim(),
        originalText: (bullet.originalText || bullet.approvedText).trim(),
      }))
      .filter((bullet) => bullet.approvedText.length > 0);

  return {
    ...profile,
    skills: profile.skills
      .map((skill) => ({ ...skill, name: skill.name.trim() }))
      .filter((skill) => skill.name.length > 0),
    experiences: profile.experiences.map((item) => ({
      ...item,
      originalText: item.originalText || item.approvedText,
      bullets: normalizeBullets(item.bullets),
    })),
    projects: profile.projects.map((item) => ({
      ...item,
      originalText: item.originalText || item.approvedText,
      bullets: normalizeBullets(item.bullets),
    })),
  };
}

function emptyProfile(revision: number): CareerProfileV1 {
  return {
    schemaVersion: 1,
    revision,
    fullName: "",
    headline: "",
    phone: "",
    location: "",
    summary: "",
    additionalInfo: "",
    careerStage: null,
    links: [],
    experiences: [],
    education: [],
    projects: [],
    skills: [],
    achievements: [],
    certifications: [],
    publications: [],
    languages: [],
    preferences: {
      targetRoles: [],
      preferredLocations: [],
      workArrangements: [],
      salaryMin: null,
      salaryCurrency: null,
      workAuthorizationStatus: "",
      requiresSponsorship: null,
    },
  };
}

export function ProfileEditor({ profile }: { profile: ProfileWithEmail }) {
  const initial = useMemo(() => profileData(profile), [profile]);
  const [data, setData] = useState<CareerProfileV1>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));
  const [active, setActive] = useState<SectionId>("personal");
  const [confirmClear, setConfirmClear] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const isDirty = JSON.stringify(data) !== savedSnapshot;

  const completion = useMemo(() => {
    const checks = [
      data.fullName,
      data.headline,
      data.phone,
      data.location,
      data.summary,
      data.preferences.targetRoles.length,
      data.experiences.some((item) => item.kind === "work"),
      data.education.length,
      data.projects.length,
      data.skills.length,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [data]);

  function patch(next: Partial<CareerProfileV1>) {
    setData((current) => ({ ...current, ...next }));
  }

  function finishSave(result: SaveProfileResult, next: CareerProfileV1) {
    if (!result.ok) {
      setConflict(result.code === "conflict");
      toast.error(result.message);
      return;
    }
    const saved = { ...next, revision: result.revision };
    setData(saved);
    setSavedSnapshot(JSON.stringify(saved));
    setConflict(false);
    toast.success("Career profile saved");
  }

  function save(nextValue = data) {
    startSaving(async () => {
      const normalized = normalizeForSave(nextValue);
      const parsed = careerProfileV1Schema.safeParse(normalized);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Review the profile fields before saving.");
        return;
      }
      const result = await saveProfileAction(parsed.data);
      finishSave(result, parsed.data);
    });
  }

  function clearAll() {
    const cleared = emptyProfile(data.revision);
    setConfirmClear(false);
    save(cleared);
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-[1.8rem] font-semibold tracking-[-0.04em]">Your career profile</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            This verified source of truth powers every resume version. Resume-specific edits stay separate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/resumes/import"><FileUp aria-hidden />Import resume</Link>
          </Button>
          <Button size="sm" onClick={() => save()} disabled={!isDirty || isSaving || conflict}>
            {isSaving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
            {isSaving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>

      {conflict ? (
        <Alert variant="destructive">
          <AlertTitle>Newer profile changes are available</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Your local edits remain in this tab. Reload to use the latest saved revision.</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Reload profile</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Profile completeness</span>
              <span className="tabular-nums text-muted-foreground">{completion}%</span>
            </div>
            <Progress value={completion} className="mt-2" />
          </div>
          <p className="max-w-md text-xs leading-5 text-muted-foreground">
            Add verified evidence before asking AI tools to tailor application materials.
          </p>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Career profile sections" className="rounded-xl border border-border bg-card p-2 shadow-paper lg:sticky lg:top-4 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(id)}
                  aria-current={active === id ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2",
                    active === id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          {active === "personal" ? <PersonalSection data={data} email={profile.email} patch={patch} /> : null}
          {active === "preferences" ? <PreferencesSection data={data} patch={patch} /> : null}
          {active === "summary" ? <SummarySection data={data} patch={patch} /> : null}
          {active === "experience" || active === "volunteer" ? (
            <ExperienceSection
              kind={active === "experience" ? "work" : "volunteer"}
              items={data.experiences}
              onChange={(experiences) => patch({ experiences })}
            />
          ) : null}
          {active === "education" ? <EducationSection data={data} patch={patch} /> : null}
          {active === "projects" ? <ProjectsSection data={data} patch={patch} /> : null}
          {active === "skills" ? <SkillsSection data={data} patch={patch} /> : null}
          {active === "credentials" ? <CredentialsSection data={data} patch={patch} /> : null}
          {active === "recognition" ? <RecognitionSection data={data} patch={patch} /> : null}
        </div>
      </div>

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 ml-auto flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur sm:w-fit">
        <span aria-live="polite" className="hidden px-2 text-xs text-muted-foreground sm:inline">
          {isDirty ? "You have unsaved changes" : "Profile is up to date"}
        </span>
        <Button size="sm" onClick={() => save()} disabled={!isDirty || isSaving || conflict}>
          {isSaving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
          {isSaving ? "Saving…" : "Save profile"}
        </Button>
      </div>

      <Card className="border-destructive/20 bg-destructive/[0.025]">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Clear career profile</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Applications and resume documents are retained.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setConfirmClear(true)}><Trash2 aria-hidden />Clear profile</Button>
        </CardContent>
      </Card>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear your career profile?</DialogTitle>
            <DialogDescription>This deletes all canonical profile fields and evidence. Existing resume snapshots remain available.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button variant="destructive" onClick={clearAll} disabled={isSaving}>Clear profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PersonalSection({ data, email, patch }: { data: CareerProfileV1; email: string | null; patch: (next: Partial<CareerProfileV1>) => void }) {
  return (
    <SectionCard title="Personal information" description="Contact details and public links used across your application materials.">
      <FieldGrid>
        <Field label="Full name" id="profile-full-name"><Input id="profile-full-name" value={data.fullName} onChange={(event) => patch({ fullName: event.target.value })} autoComplete="name" /></Field>
        <Field label="Account email" id="profile-email" helper="Change this from account settings."><Input id="profile-email" value={email ?? ""} readOnly aria-readonly /></Field>
        <Field label="Professional headline" id="profile-headline"><Input id="profile-headline" value={data.headline} onChange={(event) => patch({ headline: event.target.value })} /></Field>
        <Field label="Phone" id="profile-phone"><Input id="profile-phone" value={data.phone} onChange={(event) => patch({ phone: event.target.value })} autoComplete="tel" /></Field>
        <Field label="Location" id="profile-location"><Input id="profile-location" value={data.location} onChange={(event) => patch({ location: event.target.value })} autoComplete="address-level2" /></Field>
        <Field label="Career stage" id="profile-career-stage">
          <Select id="profile-career-stage" value={data.careerStage ?? ""} onChange={(event) => patch({ careerStage: (event.target.value || null) as CareerProfileV1["careerStage"] })}>
            <option value="">Not selected</option>
            {CAREER_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
      </FieldGrid>
      <RecordHeader title="Links" description="LinkedIn, GitHub, portfolio, and other professional destinations." actionLabel="Add link" onAdd={() => patch({ links: [...data.links, { id: newId(), kind: "other", label: "", url: "" }] })} />
      <RecordList empty={data.links.length === 0} emptyText="No professional links yet.">
        {data.links.map((link, index) => (
          <div key={link.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[9rem_1fr_1.4fr_auto] sm:items-end">
            <Field label="Type" id={`link-kind-${link.id}`}><Select id={`link-kind-${link.id}`} value={link.kind} onChange={(event) => patch({ links: updateById(data.links, link.id, { kind: event.target.value as typeof link.kind }) })}>{PROFILE_LINK_KINDS.map((kind) => <option key={kind} value={kind}>{titleCase(kind)}</option>)}</Select></Field>
            <Field label="Label" id={`link-label-${link.id}`}><Input id={`link-label-${link.id}`} value={link.label} onChange={(event) => patch({ links: updateById(data.links, link.id, { label: event.target.value }) })} /></Field>
            <Field label="URL" id={`link-url-${link.id}`}><Input id={`link-url-${link.id}`} type="url" value={link.url} onChange={(event) => patch({ links: updateById(data.links, link.id, { url: event.target.value }) })} /></Field>
            <RowActions label={link.label || `Link ${index + 1}`} index={index} count={data.links.length} onMove={(direction) => patch({ links: moveItem(data.links, index, direction) })} onDelete={() => patch({ links: data.links.filter((item) => item.id !== link.id) })} />
          </div>
        ))}
      </RecordList>
    </SectionCard>
  );
}

function PreferencesSection({ data, patch }: { data: CareerProfileV1; patch: (next: Partial<CareerProfileV1>) => void }) {
  const preferences = data.preferences;
  const update = (next: Partial<typeof preferences>) => patch({ preferences: { ...preferences, ...next } });
  return (
    <SectionCard title="Career preferences" description="Used for recommendations and fit checks. Work authorization is never guessed.">
      <Field label="Target roles" id="target-roles" helper="Separate values with commas."><DelimitedInput id="target-roles" value={preferences.targetRoles} onChange={(targetRoles) => update({ targetRoles })} /></Field>
      <Field label="Preferred locations" id="preferred-locations" helper="Separate values with commas."><DelimitedInput id="preferred-locations" value={preferences.preferredLocations} onChange={(preferredLocations) => update({ preferredLocations })} /></Field>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Work arrangements</legend>
        <div className="flex flex-wrap gap-4">
          {(["remote", "hybrid", "onsite"] as const).map((arrangement) => (
            <label key={arrangement} className="flex items-center gap-2 text-sm">
              <Checkbox checked={preferences.workArrangements.includes(arrangement)} onCheckedChange={(checked) => update({ workArrangements: checked === true ? [...preferences.workArrangements, arrangement] : preferences.workArrangements.filter((item) => item !== arrangement) })} />
              {titleCase(arrangement)}
            </label>
          ))}
        </div>
      </fieldset>
      <FieldGrid>
        <Field label="Minimum base salary" id="salary-min"><Input id="salary-min" type="number" min={0} inputMode="numeric" value={preferences.salaryMin ?? ""} onChange={(event) => update({ salaryMin: event.target.value ? Number(event.target.value) : null })} /></Field>
        <Field label="Currency" id="salary-currency" helper="Three-letter ISO code."><Input id="salary-currency" maxLength={3} value={preferences.salaryCurrency ?? ""} onChange={(event) => update({ salaryCurrency: event.target.value ? event.target.value.toUpperCase() : null })} placeholder="USD" /></Field>
        <Field label="Work authorization" id="work-authorization"><Input id="work-authorization" value={preferences.workAuthorizationStatus} onChange={(event) => update({ workAuthorizationStatus: event.target.value })} placeholder="e.g. Canadian citizen" /></Field>
        <Field label="Requires sponsorship" id="requires-sponsorship"><Select id="requires-sponsorship" value={preferences.requiresSponsorship === null ? "" : String(preferences.requiresSponsorship)} onChange={(event) => update({ requiresSponsorship: event.target.value === "" ? null : event.target.value === "true" })}><option value="">Not specified</option><option value="false">No</option><option value="true">Yes</option></Select></Field>
      </FieldGrid>
      <Alert><AlertTitle>Factual fields only</AlertTitle><AlertDescription>These values can support future autofill, but legal answers always require your explicit approval.</AlertDescription></Alert>
    </SectionCard>
  );
}

function SummarySection({ data, patch }: { data: CareerProfileV1; patch: (next: Partial<CareerProfileV1>) => void }) {
  return (
    <SectionCard title="Professional summary" description="Keep this factual. Resume versions can override it without changing the source profile.">
      <Field label="Canonical summary" id="profile-summary"><Textarea id="profile-summary" className="min-h-40" value={data.summary} onChange={(event) => patch({ summary: event.target.value })} maxLength={10_000} /></Field>
      <Field label="Additional information" id="profile-additional" helper="Awards context, availability, interests, or other relevant details."><Textarea id="profile-additional" className="min-h-32" value={data.additionalInfo} onChange={(event) => patch({ additionalInfo: event.target.value })} maxLength={10_000} /></Field>
    </SectionCard>
  );
}

function ExperienceSection({ kind, items, onChange }: { kind: Experience["kind"]; items: Experience[]; onChange: (items: Experience[]) => void }) {
  const visible = items.filter((item) => item.kind === kind);
  const patchItem = (id: string, next: Partial<Experience>) => onChange(updateById(items, id, next));
  return (
    <SectionCard title={kind === "work" ? "Work experience" : "Volunteer experience"} description="Store approved facts and bullet-level evidence once, then reference them from resumes.">
      <RecordHeader title={kind === "work" ? "Roles" : "Volunteer roles"} description={`${visible.length} ${visible.length === 1 ? "entry" : "entries"}`} actionLabel={kind === "work" ? "Add role" : "Add volunteer role"} onAdd={() => onChange([...items, emptyExperience(kind)])} />
      <RecordList empty={visible.length === 0} emptyText={kind === "work" ? "Add your first role or import a resume." : "No volunteer experience added."}>
        {visible.map((item, index) => (
          <EvidenceCard
            key={item.id}
            title={item.jobTitle || (kind === "work" ? "Untitled role" : "Untitled volunteer role")}
            subtitle={item.company}
            item={item}
            onPatch={(next) => patchItem(item.id, next)}
            actions={<RowActions label={item.jobTitle || "experience"} index={index} count={visible.length} onMove={(direction) => onChange(moveFilteredItem(items, item.id, kind, direction))} onDelete={() => onChange(items.filter((value) => value.id !== item.id))} />}
          >
            <FieldGrid>
              <Field label="Role title" id={`experience-title-${item.id}`}><Input id={`experience-title-${item.id}`} value={item.jobTitle} onChange={(event) => patchItem(item.id, { jobTitle: event.target.value })} /></Field>
              <Field label="Organization" id={`experience-company-${item.id}`}><Input id={`experience-company-${item.id}`} value={item.company} onChange={(event) => patchItem(item.id, { company: event.target.value })} /></Field>
              <Field label="Location" id={`experience-location-${item.id}`}><Input id={`experience-location-${item.id}`} value={item.location} onChange={(event) => patchItem(item.id, { location: event.target.value })} /></Field>
              <Field label="Start date" id={`experience-start-${item.id}`}><Input id={`experience-start-${item.id}`} value={item.startDate} onChange={(event) => patchItem(item.id, { startDate: event.target.value })} placeholder="YYYY-MM" /></Field>
              <Field label="End date" id={`experience-end-${item.id}`}><Input id={`experience-end-${item.id}`} value={item.endDate} onChange={(event) => patchItem(item.id, { endDate: event.target.value })} placeholder="YYYY-MM" disabled={item.isCurrent} /></Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm"><Checkbox checked={item.isCurrent} onCheckedChange={(checked) => patchItem(item.id, { isCurrent: checked === true, endDate: checked === true ? "" : item.endDate })} />Current role</label>
            </FieldGrid>
            <Field label="Approved overview" id={`experience-overview-${item.id}`}><Textarea id={`experience-overview-${item.id}`} value={item.approvedText} onChange={(event) => patchItem(item.id, { approvedText: event.target.value, originalText: item.originalText || event.target.value })} /></Field>
            <EvidenceMetadata item={item} onPatch={(next) => patchItem(item.id, next)} />
            <BulletEditor bullets={item.bullets} onChange={(bullets) => patchItem(item.id, { bullets })} />
          </EvidenceCard>
        ))}
      </RecordList>
    </SectionCard>
  );
}

function ProjectsSection({ data, patch }: { data: CareerProfileV1; patch: (next: Partial<CareerProfileV1>) => void }) {
  const update = (id: string, next: Partial<Project>) => patch({ projects: updateById(data.projects, id, next) });
  return (
    <SectionCard title="Projects" description="Capture verifiable project evidence, technologies, and outcomes.">
      <RecordHeader title="Projects" description={`${data.projects.length} ${data.projects.length === 1 ? "project" : "projects"}`} actionLabel="Add project" onAdd={() => patch({ projects: [...data.projects, emptyProject()] })} />
      <RecordList empty={data.projects.length === 0} emptyText="No projects added yet.">
        {data.projects.map((item, index) => (
          <EvidenceCard key={item.id} title={item.title || "Untitled project"} subtitle={item.date} item={item} onPatch={(next) => update(item.id, next)} actions={<RowActions label={item.title || "project"} index={index} count={data.projects.length} onMove={(direction) => patch({ projects: moveItem(data.projects, index, direction) })} onDelete={() => patch({ projects: data.projects.filter((value) => value.id !== item.id) })} />}>
            <FieldGrid>
              <Field label="Project title" id={`project-title-${item.id}`}><Input id={`project-title-${item.id}`} value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} /></Field>
              <Field label="Date" id={`project-date-${item.id}`}><Input id={`project-date-${item.id}`} value={item.date} onChange={(event) => update(item.id, { date: event.target.value })} /></Field>
              <Field label="Project URL" id={`project-url-${item.id}`}><Input id={`project-url-${item.id}`} type="url" value={item.url} onChange={(event) => update(item.id, { url: event.target.value })} /></Field>
            </FieldGrid>
            <Field label="Approved overview" id={`project-overview-${item.id}`}><Textarea id={`project-overview-${item.id}`} value={item.approvedText} onChange={(event) => update(item.id, { approvedText: event.target.value, originalText: item.originalText || event.target.value })} /></Field>
            <EvidenceMetadata item={item} onPatch={(next) => update(item.id, next)} />
            <BulletEditor bullets={item.bullets} onChange={(bullets) => update(item.id, { bullets })} />
          </EvidenceCard>
        ))}
      </RecordList>
    </SectionCard>
  );
}

function EvidenceCard<T extends Experience | Project>({ title, subtitle, item, onPatch, actions, children }: { title: string; subtitle?: string; item: T; onPatch: (next: Partial<T>) => void; actions: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><CardTitle className="truncate text-base">{title}</CardTitle>{subtitle ? <CardDescription className="truncate">{subtitle}</CardDescription> : null}</div>
          <div className="flex items-center gap-2"><VerificationBadge status={item.verificationStatus} />{actions}</div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {children}
        {item.originalText && item.originalText !== item.approvedText ? (
          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium">View original imported text</summary>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{item.originalText}</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={() => onPatch({ approvedText: item.originalText } as Partial<T>)}><RotateCcw aria-hidden />Restore original</Button>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EvidenceMetadata<T extends Experience | Project>({ item, onPatch }: { item: T; onPatch: (next: Partial<T>) => void }) {
  return (
    <div className="grid gap-4 rounded-lg border border-border bg-muted/20 p-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Technologies" id={`technologies-${item.id}`} helper="Comma separated."><DelimitedInput id={`technologies-${item.id}`} value={item.technologies} onChange={(technologies) => onPatch({ technologies } as Partial<T>)} /></Field>
        <Field label="Skills demonstrated" id={`demonstrated-skills-${item.id}`} helper="Only include supported skills."><DelimitedInput id={`demonstrated-skills-${item.id}`} value={item.demonstratedSkills} onChange={(demonstratedSkills) => onPatch({ demonstratedSkills } as Partial<T>)} /></Field>
        <Field label="Verified metrics" id={`metrics-${item.id}`} helper="Comma separated; never inferred."><DelimitedInput id={`metrics-${item.id}`} value={item.metrics} onChange={(metrics) => onPatch({ metrics } as Partial<T>)} /></Field>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Verification" id={`verification-${item.id}`} className="sm:w-52"><Select id={`verification-${item.id}`} value={item.verificationStatus} onChange={(event) => onPatch({ verificationStatus: event.target.value as T["verificationStatus"], confidence: event.target.value === "user_confirmed" ? 1 : item.confidence } as Partial<T>)}><option value="unverified">Unverified</option><option value="user_confirmed">User confirmed</option><option value="source_verified">Source verified</option></Select></Field>
        <Button variant="outline" size="sm" onClick={() => onPatch({ isLocked: !item.isLocked } as Partial<T>)}>{item.isLocked ? <Unlock aria-hidden /> : <Lock aria-hidden />}{item.isLocked ? "Unlock for AI" : "Lock from AI changes"}</Button>
      </div>
    </div>
  );
}

function BulletEditor({ bullets, onChange }: { bullets: Bullet[]; onChange: (bullets: Bullet[]) => void }) {
  return (
    <div className="grid gap-3">
      <RecordHeader title="Accomplishment bullets" description="Blank drafts are ignored when saved." actionLabel="Add bullet" onAdd={() => onChange([...bullets, emptyBullet()])} />
      {bullets.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No bullets yet.</p> : null}
      {bullets.map((bullet, index) => (
        <div key={bullet.id} className="grid gap-3 rounded-lg border border-border p-3">
          <div className="flex items-start gap-2">
            <Textarea aria-label={`Approved bullet ${index + 1}`} className="min-h-24 flex-1" value={bullet.approvedText} onChange={(event) => onChange(updateById(bullets, bullet.id, { approvedText: event.target.value, originalText: bullet.originalText || event.target.value }))} />
            <RowActions label={`bullet ${index + 1}`} index={index} count={bullets.length} onMove={(direction) => onChange(moveItem(bullets, index, direction))} onDelete={() => onChange(bullets.filter((item) => item.id !== bullet.id))} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Technologies" id={`bullet-technologies-${bullet.id}`}><DelimitedInput id={`bullet-technologies-${bullet.id}`} value={bullet.technologies} onChange={(technologies) => onChange(updateById(bullets, bullet.id, { technologies }))} /></Field>
            <Field label="Skills" id={`bullet-skills-${bullet.id}`}><DelimitedInput id={`bullet-skills-${bullet.id}`} value={bullet.demonstratedSkills} onChange={(demonstratedSkills) => onChange(updateById(bullets, bullet.id, { demonstratedSkills }))} /></Field>
            <Field label="Metrics" id={`bullet-metrics-${bullet.id}`}><DelimitedInput id={`bullet-metrics-${bullet.id}`} value={bullet.metrics} onChange={(metrics) => onChange(updateById(bullets, bullet.id, { metrics }))} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={bullet.verificationStatus} />
            <Button variant="ghost" size="sm" onClick={() => onChange(updateById(bullets, bullet.id, { isLocked: !bullet.isLocked }))}>{bullet.isLocked ? <Unlock aria-hidden /> : <Lock aria-hidden />}{bullet.isLocked ? "Unlock" : "Lock from AI"}</Button>
            {bullet.originalText && bullet.originalText !== bullet.approvedText ? <Button variant="ghost" size="sm" onClick={() => onChange(updateById(bullets, bullet.id, { approvedText: bullet.originalText }))}><RotateCcw aria-hidden />Restore original</Button> : null}
            {bullet.verificationStatus !== "user_confirmed" ? <Button variant="ghost" size="sm" onClick={() => onChange(updateById(bullets, bullet.id, { verificationStatus: "user_confirmed", confidence: 1 }))}><Check aria-hidden />Confirm facts</Button> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function EducationSection({ data, patch }: { data: CareerProfileV1; patch: (next: Partial<CareerProfileV1>) => void }) {
  type Education = CareerProfileV1["education"][number];
  const add = (): Education => ({ id: newId(), school: "", degree: "", field: "", location: "", startDate: "", endDate: "", isCurrent: false, details: "" });
  return (
    <SectionCard title="Education" description="Degrees, programs, and relevant educational details.">
      <RecordHeader title="Education entries" description={`${data.education.length} saved`} actionLabel="Add education" onAdd={() => patch({ education: [...data.education, add()] })} />
      <RecordList empty={data.education.length === 0} emptyText="No education added yet.">
        {data.education.map((item, index) => <Card key={item.id}><CardContent className="grid gap-4"><div className="flex justify-end"><RowActions label={item.school || "education"} index={index} count={data.education.length} onMove={(direction) => patch({ education: moveItem(data.education, index, direction) })} onDelete={() => patch({ education: data.education.filter((value) => value.id !== item.id) })} /></div><FieldGrid><SimpleInput label="School" value={item.school} id={`school-${item.id}`} onChange={(school) => patch({ education: updateById(data.education, item.id, { school }) })} /><SimpleInput label="Degree" value={item.degree} id={`degree-${item.id}`} onChange={(degree) => patch({ education: updateById(data.education, item.id, { degree }) })} /><SimpleInput label="Field of study" value={item.field} id={`field-${item.id}`} onChange={(field) => patch({ education: updateById(data.education, item.id, { field }) })} /><SimpleInput label="Location" value={item.location} id={`education-location-${item.id}`} onChange={(location) => patch({ education: updateById(data.education, item.id, { location }) })} /><SimpleInput label="Start date" value={item.startDate} id={`education-start-${item.id}`} onChange={(startDate) => patch({ education: updateById(data.education, item.id, { startDate }) })} /><SimpleInput label="End date" value={item.endDate} id={`education-end-${item.id}`} disabled={item.isCurrent} onChange={(endDate) => patch({ education: updateById(data.education, item.id, { endDate }) })} /></FieldGrid><label className="flex items-center gap-2 text-sm"><Checkbox checked={item.isCurrent} onCheckedChange={(checked) => patch({ education: updateById(data.education, item.id, { isCurrent: checked === true, endDate: checked === true ? "" : item.endDate }) })} />Currently enrolled</label><Field label="Details" id={`education-details-${item.id}`}><Textarea id={`education-details-${item.id}`} value={item.details} onChange={(event) => patch({ education: updateById(data.education, item.id, { details: event.target.value }) })} /></Field></CardContent></Card>)}
      </RecordList>
    </SectionCard>
  );
}

function SkillsSection({ data, patch }: { data: CareerProfileV1; patch: (next: Partial<CareerProfileV1>) => void }) {
  return (
    <SectionCard title="Skills" description="Keep only skills you can support with work, project, or educational evidence.">
      <Field label="Canonical skills" id="canonical-skills" helper="Separate values with commas. Blank values are ignored when saved."><DelimitedInput id="canonical-skills" value={data.skills.map((item) => item.name)} onChange={(names) => patch({ skills: names.map((name, index) => ({ id: data.skills[index]?.id ?? newId(), name })) })} /></Field>
      <Alert><AlertTitle>Evidence matters</AlertTitle><AlertDescription>Future tailoring and match scoring will prefer skills demonstrated by a verified experience or project, not keyword lists alone.</AlertDescription></Alert>
    </SectionCard>
  );
}

function CredentialsSection({ data, patch }: { data: CareerProfileV1; patch: (next: Partial<CareerProfileV1>) => void }) {
  type Certification = CareerProfileV1["certifications"][number];
  const certification = (): Certification => ({ id: newId(), name: "", issuer: "", issuedOn: "", expiresOn: "", credentialId: "", credentialUrl: "", sourceKind: "manual", verificationStatus: "user_confirmed", confidence: 1, isLocked: false });
  return (
    <SectionCard title="Credentials and languages" description="Certifications and language proficiency available to resume versions.">
      <RecordHeader title="Certifications" description={`${data.certifications.length} saved`} actionLabel="Add certification" onAdd={() => patch({ certifications: [...data.certifications, certification()] })} />
      <RecordList empty={data.certifications.length === 0} emptyText="No certifications added.">
        {data.certifications.map((item, index) => <div key={item.id} className="grid gap-3 rounded-lg border border-border p-3"><div className="flex justify-end"><RowActions label={item.name || "certification"} index={index} count={data.certifications.length} onMove={(direction) => patch({ certifications: moveItem(data.certifications, index, direction) })} onDelete={() => patch({ certifications: data.certifications.filter((value) => value.id !== item.id) })} /></div><FieldGrid><SimpleInput label="Certification" id={`cert-name-${item.id}`} value={item.name} onChange={(name) => patch({ certifications: updateById(data.certifications, item.id, { name }) })} /><SimpleInput label="Issuer" id={`cert-issuer-${item.id}`} value={item.issuer} onChange={(issuer) => patch({ certifications: updateById(data.certifications, item.id, { issuer }) })} /><SimpleInput label="Issued" id={`cert-issued-${item.id}`} value={item.issuedOn} onChange={(issuedOn) => patch({ certifications: updateById(data.certifications, item.id, { issuedOn }) })} /><SimpleInput label="Expires" id={`cert-expires-${item.id}`} value={item.expiresOn} onChange={(expiresOn) => patch({ certifications: updateById(data.certifications, item.id, { expiresOn }) })} /><SimpleInput label="Credential ID" id={`cert-id-${item.id}`} value={item.credentialId} onChange={(credentialId) => patch({ certifications: updateById(data.certifications, item.id, { credentialId }) })} /><SimpleInput label="Credential URL" id={`cert-url-${item.id}`} value={item.credentialUrl} type="url" onChange={(credentialUrl) => patch({ certifications: updateById(data.certifications, item.id, { credentialUrl }) })} /></FieldGrid></div>)}
      </RecordList>
      <RecordHeader title="Languages" description={`${data.languages.length} saved`} actionLabel="Add language" onAdd={() => patch({ languages: [...data.languages, { id: newId(), name: "", proficiency: null }] })} />
      <RecordList empty={data.languages.length === 0} emptyText="No languages added.">
        {data.languages.map((item, index) => <div key={item.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><SimpleInput label="Language" id={`language-${item.id}`} value={item.name} onChange={(name) => patch({ languages: updateById(data.languages, item.id, { name }) })} /><Field label="Proficiency" id={`language-level-${item.id}`}><Select id={`language-level-${item.id}`} value={item.proficiency ?? ""} onChange={(event) => patch({ languages: updateById(data.languages, item.id, { proficiency: (event.target.value || null) as typeof item.proficiency }) })}><option value="">Not specified</option><option value="basic">Basic</option><option value="conversational">Conversational</option><option value="professional">Professional</option><option value="native">Native</option></Select></Field><RowActions label={item.name || "language"} index={index} count={data.languages.length} onMove={(direction) => patch({ languages: moveItem(data.languages, index, direction) })} onDelete={() => patch({ languages: data.languages.filter((value) => value.id !== item.id) })} /></div>)}
      </RecordList>
    </SectionCard>
  );
}

function RecognitionSection({ data, patch }: { data: CareerProfileV1; patch: (next: Partial<CareerProfileV1>) => void }) {
  type Achievement = CareerProfileV1["achievements"][number];
  type Publication = CareerProfileV1["publications"][number];
  const achievement = (): Achievement => ({ id: newId(), kind: "achievement", title: "", description: "", date: "" });
  const publication = (): Publication => ({ id: newId(), title: "", publisher: "", publishedOn: "", url: "", description: "", sourceKind: "manual", verificationStatus: "user_confirmed", confidence: 1, isLocked: false });
  return (
    <SectionCard title="Recognition and publications" description="Awards, achievements, and published work.">
      <RecordHeader title="Awards and achievements" description={`${data.achievements.length} saved`} actionLabel="Add recognition" onAdd={() => patch({ achievements: [...data.achievements, achievement()] })} />
      <RecordList empty={data.achievements.length === 0} emptyText="No recognition added.">
        {data.achievements.map((item, index) => <div key={item.id} className="grid gap-3 rounded-lg border border-border p-3"><div className="flex justify-end"><RowActions label={item.title || "recognition"} index={index} count={data.achievements.length} onMove={(direction) => patch({ achievements: moveItem(data.achievements, index, direction) })} onDelete={() => patch({ achievements: data.achievements.filter((value) => value.id !== item.id) })} /></div><FieldGrid><Field label="Type" id={`achievement-kind-${item.id}`}><Select id={`achievement-kind-${item.id}`} value={item.kind} onChange={(event) => patch({ achievements: updateById(data.achievements, item.id, { kind: event.target.value as Achievement["kind"] }) })}><option value="achievement">Achievement</option><option value="award">Award</option></Select></Field><SimpleInput label="Title" id={`achievement-title-${item.id}`} value={item.title} onChange={(title) => patch({ achievements: updateById(data.achievements, item.id, { title }) })} /><SimpleInput label="Date" id={`achievement-date-${item.id}`} value={item.date} onChange={(date) => patch({ achievements: updateById(data.achievements, item.id, { date }) })} /></FieldGrid><Field label="Description" id={`achievement-description-${item.id}`}><Textarea id={`achievement-description-${item.id}`} value={item.description} onChange={(event) => patch({ achievements: updateById(data.achievements, item.id, { description: event.target.value }) })} /></Field></div>)}
      </RecordList>
      <RecordHeader title="Publications" description={`${data.publications.length} saved`} actionLabel="Add publication" onAdd={() => patch({ publications: [...data.publications, publication()] })} />
      <RecordList empty={data.publications.length === 0} emptyText="No publications added.">
        {data.publications.map((item, index) => <div key={item.id} className="grid gap-3 rounded-lg border border-border p-3"><div className="flex justify-end"><RowActions label={item.title || "publication"} index={index} count={data.publications.length} onMove={(direction) => patch({ publications: moveItem(data.publications, index, direction) })} onDelete={() => patch({ publications: data.publications.filter((value) => value.id !== item.id) })} /></div><FieldGrid><SimpleInput label="Title" id={`publication-title-${item.id}`} value={item.title} onChange={(title) => patch({ publications: updateById(data.publications, item.id, { title }) })} /><SimpleInput label="Publisher" id={`publication-publisher-${item.id}`} value={item.publisher} onChange={(publisher) => patch({ publications: updateById(data.publications, item.id, { publisher }) })} /><SimpleInput label="Published" id={`publication-date-${item.id}`} value={item.publishedOn} onChange={(publishedOn) => patch({ publications: updateById(data.publications, item.id, { publishedOn }) })} /><SimpleInput label="URL" id={`publication-url-${item.id}`} type="url" value={item.url} onChange={(url) => patch({ publications: updateById(data.publications, item.id, { url }) })} /></FieldGrid><Field label="Description" id={`publication-description-${item.id}`}><Textarea id={`publication-description-${item.id}`} value={item.description} onChange={(event) => patch({ publications: updateById(data.publications, item.id, { description: event.target.value }) })} /></Field></div>)}
      </RecordList>
    </SectionCard>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Card className="min-w-0"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid min-w-0 gap-5">{children}</CardContent></Card>;
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({ label, id, helper, className, children }: { label: string; id: string; helper?: string; className?: string; children: ReactNode }) {
  return <div className={cn("grid min-w-0 gap-1.5", className)}><Label htmlFor={id}>{label}</Label>{children}{helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}</div>;
}

function SimpleInput({ label, id, value, onChange, type = "text", disabled = false }: { label: string; id: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return <Field label={label} id={id}><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} /></Field>;
}

function DelimitedInput({ id, value, onChange }: { id: string; value: string[]; onChange: (value: string[]) => void }) {
  const joined = value.join(", ");
  function commit(text: string) {
    onChange([...new Set(text.split(",").map((item) => item.trim()).filter(Boolean))]);
  }
  return <Input key={joined} id={id} defaultValue={joined} onBlur={(event) => commit(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(event.currentTarget.value); } }} />;
}

function RecordHeader({ title, description, actionLabel, onAdd }: { title: string; description: string; actionLabel: string; onAdd: () => void }) {
  return <div className="flex flex-col gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Button variant="outline" size="sm" onClick={onAdd}><Plus aria-hidden />{actionLabel}</Button></div>;
}

function RecordList({ empty, emptyText, children }: { empty: boolean; emptyText: string; children: ReactNode }) {
  return <div className="grid gap-3">{empty ? <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyText}</div> : children}</div>;
}

function RowActions({ label, index, count, onMove, onDelete }: { label: string; index: number; count: number; onMove: (direction: -1 | 1) => void; onDelete: () => void }) {
  return <div className="flex shrink-0 items-center"><Button type="button" variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${label} up`}><ChevronUp aria-hidden /></Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${label} down`}><ChevronDown aria-hidden /></Button><Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${label}`} className="text-destructive"><Trash2 aria-hidden /></Button></div>;
}

function VerificationBadge({ status }: { status: Bullet["verificationStatus"] }) {
  return <Badge variant={status === "unverified" ? "destructive" : "outline"}>{status === "user_confirmed" ? "User confirmed" : status === "source_verified" ? "Source verified" : "Unverified"}</Badge>;
}

function updateById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map((item) => item.id === id ? { ...item, ...patch } : item);
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function moveFilteredItem(items: Experience[], id: string, kind: Experience["kind"], direction: -1 | 1): Experience[] {
  const filtered = items.filter((item) => item.kind === kind);
  const index = filtered.findIndex((item) => item.id === id);
  const target = filtered[index + direction];
  if (!target) return items;
  const sourceIndex = items.findIndex((item) => item.id === id);
  const targetIndex = items.findIndex((item) => item.id === target.id);
  const next = [...items];
  [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
  return next;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
