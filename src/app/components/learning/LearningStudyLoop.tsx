import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  Lightbulb,
  Layers,
  Loader2,
  Microscope,
  NotebookPen,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = Record<string, unknown>;

export type LearningRunState =
  | { phase: "idle"; label: string }
  | { phase: "connecting"; label: string }
  | { phase: "working"; label: string }
  | { phase: "complete"; label: string }
  | { phase: "error"; label: string };

export type LearningStudyProfile = {
  course: string;
  examDate: string;
  topics: string;
  goal: string;
  weakTopics: string;
  weeklyHours: string;
  difficulty: string;
  preferredStyle: string;
};

export type LearningStudyAction =
  | "quiz"
  | "simplify"
  | "flashcards"
  | "lesson"
  | "practice"
  | "visualize"
  | "research"
  | "study_plan"
  | "save";

type StudyActionMessage = {
  id: string;
  content: string;
  capability?: string;
};

const defaultStudyProfile: LearningStudyProfile = {
  course: "",
  examDate: "",
  topics: "",
  goal: "",
  weakTopics: "",
  weeklyHours: "",
  difficulty: "medium",
  preferredStyle: "balanced",
};

export const STUDY_PROFILE_STORAGE_KEY = "zaki.learn.studyProfile.v1";

function asRecord(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Item)
    : {};
}

function textOf(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

export function readLearningStudyProfile(
  storageKey = STUDY_PROFILE_STORAGE_KEY,
): LearningStudyProfile {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultStudyProfile;
    const parsed = asRecord(JSON.parse(raw));
    return {
      course: textOf(parsed.course),
      examDate: textOf(parsed.examDate),
      topics: textOf(parsed.topics),
      goal: textOf(parsed.goal),
      weakTopics: textOf(parsed.weakTopics),
      weeklyHours: textOf(parsed.weeklyHours),
      difficulty: textOf(parsed.difficulty, "medium"),
      preferredStyle: textOf(parsed.preferredStyle, "balanced"),
    };
  } catch {
    return defaultStudyProfile;
  }
}

export function writeLearningStudyProfile(
  profile: LearningStudyProfile,
  storageKey = STUDY_PROFILE_STORAGE_KEY,
) {
  window.localStorage.setItem(storageKey, JSON.stringify(profile));
}

export function studyProfileConfigured(profile: LearningStudyProfile) {
  return Boolean(
      profile.course.trim() ||
      profile.examDate.trim() ||
      profile.topics.trim() ||
      profile.goal.trim() ||
      profile.weakTopics.trim(),
  );
}

export function compactMessageExcerpt(value: string, limit = 520) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit - 1)}...`;
}

export function LearningStudySetupPanel({
  profile,
  savedProfile,
  open,
  onOpenChange,
  onChange,
  onSave,
  onBuildPlan,
  notebooksCount,
}: {
  profile: LearningStudyProfile;
  savedProfile: LearningStudyProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (profile: LearningStudyProfile) => void;
  onSave: () => void;
  onBuildPlan: () => void;
  notebooksCount: number;
}) {
  const configured = studyProfileConfigured(savedProfile);
  const update = (field: keyof LearningStudyProfile, value: string) => {
    onChange({ ...profile, [field]: value });
  };

  if (!open) {
    return (
      <div className="mb-3 mt-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <GraduationCap className="size-4 shrink-0 text-zaki-brand" />
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-[var(--foreground)]">
              {configured ? savedProfile.course || "Personal study setup" : "Set up your study loop"}
            </div>
            <div className="truncate text-[11px] text-[var(--muted-foreground)]">
              {configured
                ? [
                    savedProfile.examDate ? `Deadline ${savedProfile.examDate}` : "",
                    savedProfile.goal || "",
                    savedProfile.weakTopics ? `Focus: ${savedProfile.weakTopics}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Saved study preferences"
                : "Course, topics, exam, weak areas, practice, and notebook capture"}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="inline-flex h-8 shrink-0 items-center rounded-full border border-zaki-brand-40 bg-zaki-brand-10 px-3 text-[11px] font-semibold text-zaki-brand transition-colors hover:bg-zaki-brand-15 hover:text-zaki-brand"
        >
          {configured ? "Edit" : "Start"}
        </button>
      </div>
    );
  }

  return (
    <section className="mb-3 mt-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">Study setup</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            ZAKI will use this to shape plans, quizzes, practice, review, and notebook saves.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Collapse study setup"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Course
          <input
            value={profile.course}
            onChange={(event) => update("course", event.target.value)}
            placeholder="e.g. Calculus II"
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-zaki-brand"
          />
        </label>
        <label className="space-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Exam date
          <input
            value={profile.examDate}
            onChange={(event) => update("examDate", event.target.value)}
            placeholder="e.g. 2026-06-15"
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-zaki-brand"
          />
        </label>
        <label className="space-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] md:col-span-2">
          Topics
          <input
            value={profile.topics}
            onChange={(event) => update("topics", event.target.value)}
            placeholder="e.g. limits, derivatives, integrals, series"
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-zaki-brand"
          />
        </label>
        <label className="space-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] md:col-span-2">
          Goal
          <input
            value={profile.goal}
            onChange={(event) => update("goal", event.target.value)}
            placeholder="e.g. score 90% and understand proofs"
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-zaki-brand"
          />
        </label>
        <label className="space-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Weak topics
          <input
            value={profile.weakTopics}
            onChange={(event) => update("weakTopics", event.target.value)}
            placeholder="e.g. series, integration by parts"
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-zaki-brand"
          />
        </label>
        <div className="grid grid-cols-[1fr_150px_160px] gap-3 max-sm:grid-cols-1 md:col-span-2">
          <label className="space-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Hours/week
            <input
              value={profile.weeklyHours}
              onChange={(event) => update("weeklyHours", event.target.value)}
              placeholder="e.g. 6"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-zaki-brand"
            />
          </label>
          <label className="space-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Study difficulty
            <select
              value={profile.difficulty}
              onChange={(event) => update("difficulty", event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-zaki-brand"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="exam">Exam</option>
            </select>
          </label>
          <label className="space-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Study style
            <select
              value={profile.preferredStyle}
              onChange={(event) => update("preferredStyle", event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-zaki-brand"
            >
              <option value="balanced">Balanced</option>
              <option value="simple">Simple</option>
              <option value="deep">Deep</option>
              <option value="exam">Exam</option>
              <option value="visual">Visual</option>
              <option value="practice">Practice</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-[var(--muted-foreground)]">
          {notebooksCount
            ? `${notebooksCount} notebooks available for saving answers`
            : "Create a notebook to save important answers"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-9 items-center rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[12px] font-semibold text-zaki-text transition-colors hover:bg-zaki-hover"
          >
            Save setup
          </button>
          <button
            type="button"
            onClick={onBuildPlan}
            className="inline-flex h-9 items-center gap-2 rounded-zaki-md bg-zaki-brand px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zaki-brand-hover"
          >
            <Sparkles className="size-3.5" />
            Build study plan
          </button>
        </div>
      </div>
    </section>
  );
}

export function LearningRunStateStrip({
  state,
  connected,
  streaming,
  hasMessages,
}: {
  state: LearningRunState;
  connected: boolean;
  streaming: boolean;
  hasMessages: boolean;
}) {
  if (!hasMessages && state.phase === "idle" && connected) return null;
  const tone =
    state.phase === "error"
      ? "border-red-500/25 bg-red-500/5 text-red-600"
      : state.phase === "complete"
        ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700"
        : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]";
  return (
    <div className={cn("mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px]", tone)}>
      {streaming || state.phase === "connecting" ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : state.phase === "error" ? (
        <AlertTriangle className="size-3.5" />
      ) : state.phase === "complete" ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <Clock3 className="size-3.5" />
      )}
      <span className="min-w-0 flex-1 truncate">
        {connected ? state.label : "Reconnecting to ZAKI learning"}
      </span>
    </div>
  );
}

export function LearningQualityChecklist({ message }: { message: StudyActionMessage }) {
  const capability = message.capability || "chat";
  const items =
    capability === "deep_question"
      ? ["Answer key", "Explanations", "Review prompt"]
      : capability === "deep_solve"
        ? ["Steps", "Final answer", "Practice next"]
        : capability === "deep_research"
          ? ["Sources", "Study brief", "Save notes"]
          : capability === "math_animator"
            ? ["Preview", "Download", "Code"]
            : capability === "visualize"
              ? ["Diagram", "Source", "Save"]
              : ["Understand", "Practice", "Save"];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {items.map((item) => (
        <span
          key={`${message.id}-quality-${item}`}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)]/60 px-2 py-1 text-[10px] font-medium text-[var(--muted-foreground)]"
        >
          <CheckCircle2 className="size-3 text-emerald-600" />
          {item}
        </span>
      ))}
    </div>
  );
}

export function LearningNextActionRow({
  onAction,
  canSave,
}: {
  onAction: (action: LearningStudyAction) => void;
  canSave: boolean;
}) {
  const actions: Array<{
    id: LearningStudyAction;
    label: string;
    icon: LucideIcon;
    disabled?: boolean;
  }> = [
    { id: "save", label: "Save to notebook", icon: NotebookPen, disabled: !canSave },
    { id: "quiz", label: "Make quiz", icon: PenLine },
    { id: "simplify", label: "Explain simpler", icon: Lightbulb },
    { id: "flashcards", label: "Generate flashcards", icon: Layers },
    { id: "lesson", label: "Turn into lesson/book", icon: BookOpen },
    { id: "practice", label: "Practice similar", icon: BrainCircuit },
    { id: "visualize", label: "Visualize", icon: BarChart3 },
    { id: "study_plan", label: "Add to study plan", icon: Clock3 },
    { id: "research", label: "Research deeper", icon: Microscope },
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            onClick={() => onAction(action.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)]/40 hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon className="size-3.5" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
