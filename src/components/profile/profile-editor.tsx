"use client";

import {
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  FolderGit2,
  GraduationCap,
  HeartHandshake,
  Loader2,
  Plus,
  Save,
  SquarePen,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  clearProfileAction,
  saveProfileAction,
} from "@/app/(app)/profile/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  AchievementInput,
  CareerProfile,
  CareerProfilePayload,
  EducationInput,
  ExperienceInput,
  ProfileLinkInput,
  ProjectInput,
} from "@/lib/profile/career";
import { cn } from "@/lib/utils";

type SectionId =
  | "personal"
  | "summary"
  | "experience"
  | "volunteer"
  | "education"
  | "projects"
  | "skills"
  | "achievements"
  | "additional";

const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "volunteer", label: "Volunteer", icon: HeartHandshake },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "skills", label: "Skills", icon: BookOpen },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "additional", label: "Additional", icon: SquarePen },
];

const emptyLink: ProfileLinkInput = { label: "", url: "" };

function emptyExperience(kind: ExperienceInput["kind"]): ExperienceInput {
  return {
    kind,
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    responsibilities: "",
  };
}

const emptyEducation: EducationInput = {
  school: "",
  degree: "",
  field: "",
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  details: "",
};

const emptyProject: ProjectInput = {
  title: "",
  date: "",
  url: "",
  description: "",
  techStack: "",
};

const emptyAchievement: AchievementInput = {
  title: "",
  description: "",
  date: "",
};

function toPayload(profile: CareerProfile): CareerProfilePayload {
  return {
    fullName: profile.fullName,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    additionalInfo: profile.additionalInfo,
    links: profile.links,
    experiences: profile.experiences,
    volunteer: profile.volunteer,
    education: profile.education,
    projects: profile.projects,
    skills: profile.skills,
    achievements: profile.achievements,
  };
}

function emptyPayload(): CareerProfilePayload {
  return {
    fullName: "",
    phone: "",
    location: "",
    summary: "",
    additionalInfo: "",
    links: [],
    experiences: [],
    volunteer: [],
    education: [],
    projects: [],
    skills: [],
    achievements: [],
  };
}

export function ProfileEditor({ profile }: { profile: CareerProfile }) {
  const [data, setData] = useState<CareerProfilePayload>(() =>
    toPayload(profile),
  );
  const [active, setActive] = useState<SectionId>("personal");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isClearing, startClear] = useTransition();

  function patch(next: Partial<CareerProfilePayload>) {
    setData((prev) => ({ ...prev, ...next }));
  }

  function handleSave() {
    startSave(async () => {
      try {
        await saveProfileAction(data);
        toast.success("Profile saved");
      } catch {
        toast.error("Could not save your profile. Try again.");
      }
    });
  }

  function handleClear() {
    startClear(async () => {
      try {
        await clearProfileAction();
        setData(emptyPayload());
        setConfirmDelete(false);
        toast.success("Profile cleared");
      } catch {
        toast.error("Could not clear your profile. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Your profile is your career source of truth. Add your experience in
            your own words, no formatting needed, and we&apos;ll handle turning
            it into a polished, tailored resume or cover letter in seconds. The
            more you add, the better your results.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 aria-hidden />
            Delete
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Save aria-hidden />
            )}
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <nav className="lg:sticky lg:top-4 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          {active === "personal" ? (
            <PersonalSection
              data={data}
              email={profile.email}
              memberSince={profile.memberSince}
              patch={patch}
            />
          ) : null}
          {active === "summary" ? (
            <SummarySection data={data} patch={patch} />
          ) : null}
          {active === "experience" ? (
            <ExperienceSection
              kind="work"
              title="Work experience"
              addLabel="Add role"
              rowLabel="Role"
              items={data.experiences}
              onChange={(experiences) => patch({ experiences })}
            />
          ) : null}
          {active === "volunteer" ? (
            <ExperienceSection
              kind="volunteer"
              title="Volunteer experience"
              addLabel="Add entry"
              rowLabel="Entry"
              items={data.volunteer}
              onChange={(volunteer) => patch({ volunteer })}
            />
          ) : null}
          {active === "education" ? (
            <EducationSection
              items={data.education}
              onChange={(education) => patch({ education })}
            />
          ) : null}
          {active === "projects" ? (
            <ProjectsSection
              items={data.projects}
              onChange={(projects) => patch({ projects })}
            />
          ) : null}
          {active === "skills" ? (
            <SkillsSection
              skills={data.skills}
              onChange={(skills) => patch({ skills })}
            />
          ) : null}
          {active === "achievements" ? (
            <AchievementsSection
              items={data.achievements}
              onChange={(achievements) => patch({ achievements })}
            />
          ) : null}
          {active === "additional" ? (
            <AdditionalSection data={data} patch={patch} />
          ) : null}
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear your profile?</DialogTitle>
            <DialogDescription>
              This removes every section of your career profile: personal info,
              summary, experience, education, projects, skills, achievements,
              and additional knowledge. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={isClearing}
            >
              {isClearing ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <Trash2 aria-hidden />
              )}
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function RowCard({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function FieldInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn("h-9", props.className)} />;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function PersonalSection({
  data,
  email,
  memberSince,
  patch,
}: {
  data: CareerProfilePayload;
  email: string | null;
  memberSince: string | null;
  patch: (next: Partial<CareerProfilePayload>) => void;
}) {
  function addLink() {
    patch({ links: [...data.links, { ...emptyLink }] });
  }

  function updateLink(index: number, next: Partial<ProfileLinkInput>) {
    patch({
      links: data.links.map((link, i) =>
        i === index ? { ...link, ...next } : link,
      ),
    });
  }

  function removeLink(index: number) {
    patch({ links: data.links.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Personal info"
        action={
          <Button variant="ghost" size="sm" onClick={addLink}>
            <Plus aria-hidden />
            Add link
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="full_name" required>
          <FieldInput
            id="full_name"
            value={data.fullName}
            onChange={(e) => patch({ fullName: e.target.value })}
            placeholder="Your name"
          />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <FieldInput id="email" value={email ?? ""} disabled />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <FieldInput
            id="phone"
            value={data.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </Field>
        <Field label="Location" htmlFor="location">
          <FieldInput
            id="location"
            value={data.location}
            onChange={(e) => patch({ location: e.target.value })}
            placeholder="City, Region, Country"
          />
        </Field>
      </div>

      <div className="space-y-4">
        {data.links.length === 0 ? (
          <EmptyState message="No links yet. Add LinkedIn, GitHub, or a portfolio." />
        ) : (
          data.links.map((link, index) => (
            <div
              key={index}
              className="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]"
            >
              <Field label="Name" required>
                <FieldInput
                  value={link.label}
                  onChange={(e) => updateLink(index, { label: e.target.value })}
                  placeholder="LinkedIn"
                />
              </Field>
              <Field label="URL" required>
                <FieldInput
                  value={link.url}
                  onChange={(e) => updateLink(index, { url: e.target.value })}
                  placeholder="https://linkedin.com/in/you"
                />
              </Field>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLink(index)}
                aria-label="Remove link"
                className="mb-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))
        )}
      </div>

      {memberSince ? (
        <p className="text-xs text-muted-foreground">
          Member since {new Date(memberSince).toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );
}

function SummarySection({
  data,
  patch,
}: {
  data: CareerProfilePayload;
  patch: (next: Partial<CareerProfilePayload>) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Professional summary"
        description="Only needed if you have 7+ years of experience and want to summarize your career at a glance. Otherwise, leave it blank."
      />
      <Textarea
        value={data.summary}
        onChange={(e) => patch({ summary: e.target.value })}
        placeholder="A concise overview of your experience, strengths, and focus."
        className="min-h-40"
      />
    </div>
  );
}

function ExperienceSection({
  kind,
  title,
  addLabel,
  rowLabel,
  items,
  onChange,
}: {
  kind: ExperienceInput["kind"];
  title: string;
  addLabel: string;
  rowLabel: string;
  items: ExperienceInput[];
  onChange: (items: ExperienceInput[]) => void;
}) {
  function add() {
    onChange([...items, emptyExperience(kind)]);
  }

  function update(index: number, next: Partial<ExperienceInput>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={title}
        action={
          <Button variant="ghost" size="sm" onClick={add}>
            <Plus aria-hidden />
            {addLabel}
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState message={`No entries yet. Use "${addLabel}" to get started.`} />
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <RowCard
              key={index}
              label={`${rowLabel} ${index + 1}`}
              onRemove={() => remove(index)}
            >
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={kind === "work" ? "Job title" : "Role"} required>
                    <FieldInput
                      value={item.jobTitle}
                      onChange={(e) => update(index, { jobTitle: e.target.value })}
                      placeholder="Software Developer"
                    />
                  </Field>
                  <Field
                    label={kind === "work" ? "Company" : "Organization"}
                    required
                  >
                    <FieldInput
                      value={item.company}
                      onChange={(e) => update(index, { company: e.target.value })}
                      placeholder="Company name"
                    />
                  </Field>
                  <Field label="Location">
                    <FieldInput
                      value={item.location}
                      onChange={(e) => update(index, { location: e.target.value })}
                      placeholder="City, Region, Country"
                    />
                  </Field>
                  <Field label="Start date">
                    <FieldInput
                      value={item.startDate}
                      onChange={(e) => update(index, { startDate: e.target.value })}
                      placeholder="e.g. Apr 2024"
                    />
                  </Field>
                  <Field label="End date">
                    <FieldInput
                      value={item.endDate}
                      onChange={(e) => update(index, { endDate: e.target.value })}
                      placeholder="Present"
                      disabled={item.isCurrent}
                    />
                  </Field>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <Checkbox
                      checked={item.isCurrent}
                      onCheckedChange={(checked) =>
                        update(index, { isCurrent: checked })
                      }
                    />
                    I currently work here
                  </label>
                </div>
                <Field
                  label={kind === "work" ? "Responsibilities" : "What you did"}
                  required
                >
                  <Textarea
                    value={item.responsibilities}
                    onChange={(e) =>
                      update(index, { responsibilities: e.target.value })
                    }
                    placeholder="Describe what you did and the impact you had, in your own words."
                    className="min-h-32"
                  />
                </Field>
              </div>
            </RowCard>
          ))}
        </div>
      )}
    </div>
  );
}

function EducationSection({
  items,
  onChange,
}: {
  items: EducationInput[];
  onChange: (items: EducationInput[]) => void;
}) {
  function add() {
    onChange([...items, { ...emptyEducation }]);
  }

  function update(index: number, next: Partial<EducationInput>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Education"
        action={
          <Button variant="ghost" size="sm" onClick={add}>
            <Plus aria-hidden />
            Add school
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState message='No education yet. Use "Add school" to get started.' />
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <RowCard
              key={index}
              label={`School ${index + 1}`}
              onRemove={() => remove(index)}
            >
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="School" required>
                    <FieldInput
                      value={item.school}
                      onChange={(e) => update(index, { school: e.target.value })}
                      placeholder="University of Example"
                    />
                  </Field>
                  <Field label="Degree">
                    <FieldInput
                      value={item.degree}
                      onChange={(e) => update(index, { degree: e.target.value })}
                      placeholder="B.Sc."
                    />
                  </Field>
                  <Field label="Field of study">
                    <FieldInput
                      value={item.field}
                      onChange={(e) => update(index, { field: e.target.value })}
                      placeholder="Computer Science"
                    />
                  </Field>
                  <Field label="Location">
                    <FieldInput
                      value={item.location}
                      onChange={(e) => update(index, { location: e.target.value })}
                      placeholder="City, Region, Country"
                    />
                  </Field>
                  <Field label="Start date">
                    <FieldInput
                      value={item.startDate}
                      onChange={(e) => update(index, { startDate: e.target.value })}
                      placeholder="e.g. Sep 2021"
                    />
                  </Field>
                  <Field label="End date">
                    <FieldInput
                      value={item.endDate}
                      onChange={(e) => update(index, { endDate: e.target.value })}
                      placeholder="e.g. May 2025"
                      disabled={item.isCurrent}
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={item.isCurrent}
                    onCheckedChange={(checked) =>
                      update(index, { isCurrent: checked })
                    }
                  />
                  I currently study here
                </label>
                <Field label="Details">
                  <Textarea
                    value={item.details}
                    onChange={(e) => update(index, { details: e.target.value })}
                    placeholder="Honors, relevant coursework, GPA, activities."
                    className="min-h-24"
                  />
                </Field>
              </div>
            </RowCard>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsSection({
  items,
  onChange,
}: {
  items: ProjectInput[];
  onChange: (items: ProjectInput[]) => void;
}) {
  function add() {
    onChange([...items, { ...emptyProject }]);
  }

  function update(index: number, next: Partial<ProjectInput>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Projects"
        action={
          <Button variant="ghost" size="sm" onClick={add}>
            <Plus aria-hidden />
            Add project
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState message='No projects yet. Use "Add project" to get started.' />
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <RowCard
              key={index}
              label={`Project ${index + 1}`}
              onRemove={() => remove(index)}
            >
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title" required>
                    <FieldInput
                      value={item.title}
                      onChange={(e) => update(index, { title: e.target.value })}
                      placeholder="Project name"
                    />
                  </Field>
                  <Field label="Date">
                    <FieldInput
                      value={item.date}
                      onChange={(e) => update(index, { date: e.target.value })}
                      placeholder="e.g. Mar 2025"
                    />
                  </Field>
                </div>
                <Field label="Project URL">
                  <FieldInput
                    value={item.url}
                    onChange={(e) => update(index, { url: e.target.value })}
                    placeholder="https://github.com/you/project"
                  />
                </Field>
                <Field label="Description" required>
                  <Textarea
                    value={item.description}
                    onChange={(e) =>
                      update(index, { description: e.target.value })
                    }
                    placeholder="What you built, the approach, and the outcome."
                    className="min-h-28"
                  />
                </Field>
                <Field label="Tech stack">
                  <FieldInput
                    value={item.techStack}
                    onChange={(e) => update(index, { techStack: e.target.value })}
                    placeholder="Next.js, TypeScript, Supabase"
                  />
                </Field>
              </div>
            </RowCard>
          ))}
        </div>
      )}
    </div>
  );
}

function SkillsSection({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const additions = draft
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => !skills.includes(value));

    if (additions.length) {
      onChange([...skills, ...additions]);
    }
    setDraft("");
  }

  function removeSkill(skill: string) {
    onChange(skills.filter((value) => value !== skill));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Skills"
        description="Add the tools, languages, and frameworks you work with. Press Enter or comma to add."
      />

      <div className="rounded-xl border border-border bg-card/40 p-4">
        {skills.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">No skills added yet.</p>
        ) : (
          <div className="mb-3 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1 py-1 pr-1">
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove ${skill}`}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <FieldInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft();
            }
          }}
          onBlur={commitDraft}
          placeholder="Type a skill and press Enter"
        />
      </div>
    </div>
  );
}

function AchievementsSection({
  items,
  onChange,
}: {
  items: AchievementInput[];
  onChange: (items: AchievementInput[]) => void;
}) {
  function add() {
    onChange([...items, { ...emptyAchievement }]);
  }

  function update(index: number, next: Partial<AchievementInput>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Achievements and extracurriculars"
        action={
          <Button variant="ghost" size="sm" onClick={add}>
            <Plus aria-hidden />
            Add entry
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState message="No achievements added yet." />
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <RowCard
              key={index}
              label={`Entry ${index + 1}`}
              onRemove={() => remove(index)}
            >
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                  <Field label="Title" required>
                    <FieldInput
                      value={item.title}
                      onChange={(e) => update(index, { title: e.target.value })}
                      placeholder="Award, club, or recognition"
                    />
                  </Field>
                  <Field label="Date">
                    <FieldInput
                      value={item.date}
                      onChange={(e) => update(index, { date: e.target.value })}
                      placeholder="e.g. 2025"
                    />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea
                    value={item.description}
                    onChange={(e) =>
                      update(index, { description: e.target.value })
                    }
                    placeholder="What it was and why it mattered."
                    className="min-h-24"
                  />
                </Field>
              </div>
            </RowCard>
          ))}
        </div>
      )}
    </div>
  );
}

function AdditionalSection({
  data,
  patch,
}: {
  data: CareerProfilePayload;
  patch: (next: Partial<CareerProfilePayload>) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Additional knowledge"
        description="Anything worth knowing about you that doesn't belong in the other sections goes here. You can add to it manually, and we'll fill it in over time as we learn more about you."
      />
      <Textarea
        value={data.additionalInfo}
        onChange={(e) => patch({ additionalInfo: e.target.value })}
        placeholder="Context, preferences, instructions, or anything else that helps tailor your applications."
        className="min-h-48"
      />
    </div>
  );
}
