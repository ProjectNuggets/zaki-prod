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
  Play,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { V2Button, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";
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
  | "check_answer"
  | "regenerate"
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
  readOnly = false,
  readOnlyReason = "Learn is read-only.",
}: {
  profile: LearningStudyProfile;
  savedProfile: LearningStudyProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (profile: LearningStudyProfile) => void;
  onSave: () => void;
  onBuildPlan: () => void;
  notebooksCount: number;
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const configured = studyProfileConfigured(savedProfile);
  const update = (field: keyof LearningStudyProfile, value: string) => {
    onChange({ ...profile, [field]: value });
  };

  if (!open) {
    return (
      <div className="mb-3 mt-2 flex items-center justify-between gap-3 border border-[var(--v2-hairline)] bg-[var(--v2-bg-raised)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <GraduationCap className="size-4 shrink-0 text-[var(--v2-accent)]" />
          <div className="min-w-0">
            <div className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-1)]">
              {configured ? savedProfile.course || "Personal study setup" : "Set up your study loop"}
            </div>
            <div className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--v2-ink-3)]">
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
        <V2Button
          size="sm"
          onClick={() => onOpenChange(true)}
          className="shrink-0"
          title={readOnly ? readOnlyReason : undefined}
        >
          {configured ? "Edit" : "Start"}
        </V2Button>
      </div>
    );
  }

  return (
    <V2Panel className="mb-3 mt-2">
      <V2PanelHead>
        <span>Study setup</span>
        <span>Learner preferences</span>
        <V2Button
          size="sm"
          variant="ghost"
          iconOnly
          onClick={() => onOpenChange(false)}
          title="Collapse study setup"
          aria-label="Collapse study setup"
        >
          <ChevronDown className="size-4" />
        </V2Button>
      </V2PanelHead>
      <V2PanelBody>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--v2-ink-3)]">
          ZAKI uses this to shape plans, quizzes, practice, review, and notebook saves.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-3)]">
            Course
            <input
              value={profile.course}
              onChange={(event) => update("course", event.target.value)}
              disabled={readOnly}
              placeholder="e.g. Calculus II"
              className="h-9 w-full border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg)] px-3 font-mono text-[12px] font-normal normal-case tracking-normal text-[var(--v2-ink-1)] outline-none focus:border-[var(--v2-accent)]"
            />
          </label>
          <label className="space-y-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-3)]">
            Exam date
            <input
              value={profile.examDate}
              onChange={(event) => update("examDate", event.target.value)}
              disabled={readOnly}
              placeholder="e.g. 2026-06-15"
              className="h-9 w-full border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg)] px-3 font-mono text-[12px] font-normal normal-case tracking-normal text-[var(--v2-ink-1)] outline-none focus:border-[var(--v2-accent)]"
            />
          </label>
          <label className="space-y-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-3)] md:col-span-2">
            Topics
            <input
              value={profile.topics}
              onChange={(event) => update("topics", event.target.value)}
              disabled={readOnly}
              placeholder="e.g. limits, derivatives, integrals, series"
              className="h-9 w-full border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg)] px-3 font-mono text-[12px] font-normal normal-case tracking-normal text-[var(--v2-ink-1)] outline-none focus:border-[var(--v2-accent)]"
            />
          </label>
          <label className="space-y-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-3)] md:col-span-2">
            Goal
            <input
              value={profile.goal}
              onChange={(event) => update("goal", event.target.value)}
              disabled={readOnly}
              placeholder="e.g. score 90% and understand proofs"
              className="h-9 w-full border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg)] px-3 font-mono text-[12px] font-normal normal-case tracking-normal text-[var(--v2-ink-1)] outline-none focus:border-[var(--v2-accent)]"
            />
          </label>
          <label className="space-y-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-3)]">
            Weak topics
            <input
              value={profile.weakTopics}
              onChange={(event) => update("weakTopics", event.target.value)}
              disabled={readOnly}
              placeholder="e.g. series, integration by parts"
              className="h-9 w-full border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg)] px-3 font-mono text-[12px] font-normal normal-case tracking-normal text-[var(--v2-ink-1)] outline-none focus:border-[var(--v2-accent)]"
            />
          </label>
          <div className="grid grid-cols-[1fr_150px_160px] gap-3 max-sm:grid-cols-1 md:col-span-2">
            <label className="space-y-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-3)]">
              Hours/week
              <input
                value={profile.weeklyHours}
                onChange={(event) => update("weeklyHours", event.target.value)}
                disabled={readOnly}
                placeholder="e.g. 6"
                className="h-9 w-full border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg)] px-3 font-mono text-[12px] font-normal normal-case tracking-normal text-[var(--v2-ink-1)] outline-none focus:border-[var(--v2-accent)]"
              />
            </label>
            <label className="space-y-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-3)]">
              Study difficulty
              <select
                value={profile.difficulty}
                onChange={(event) => update("difficulty", event.target.value)}
                disabled={readOnly}
                className="h-9 w-full border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg)] px-3 font-mono text-[12px] font-normal normal-case tracking-normal text-[var(--v2-ink-1)] outline-none focus:border-[var(--v2-accent)]"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="exam">Exam</option>
              </select>
            </label>
            <label className="space-y-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-3)]">
              Study style
              <select
                value={profile.preferredStyle}
                onChange={(event) => update("preferredStyle", event.target.value)}
                disabled={readOnly}
                className="h-9 w-full border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg)] px-3 font-mono text-[12px] font-normal normal-case tracking-normal text-[var(--v2-ink-1)] outline-none focus:border-[var(--v2-accent)]"
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
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--v2-ink-3)]">
            {notebooksCount
              ? `${notebooksCount} notebooks available for saving answers`
              : "Create a notebook to save important answers"}
          </span>
          <div className="flex items-center gap-2">
            <V2Button size="sm" onClick={onSave} disabled={readOnly} title={readOnly ? readOnlyReason : undefined}>
              Save setup
            </V2Button>
            <V2Button size="sm" variant="accent" onClick={onBuildPlan} disabled={readOnly} title={readOnly ? readOnlyReason : undefined}>
              <Sparkles className="size-3.5" />
              Build study plan
            </V2Button>
          </div>
        </div>
      </V2PanelBody>
    </V2Panel>
  );
}

export function LearningRunStateStrip({
  state,
  connected,
  streaming,
  hasMessages,
  steps = [],
  retryLabel = "",
  onRetry,
}: {
  state: LearningRunState;
  connected: boolean;
  streaming: boolean;
  hasMessages: boolean;
  steps?: string[];
  retryLabel?: string;
  onRetry?: () => void;
}) {
  if (!hasMessages && state.phase === "idle" && connected) return null;
  const tone =
    state.phase === "error"
      ? "border-[var(--v2-danger)] bg-[var(--v2-danger-faint)] text-[var(--v2-danger)]"
      : state.phase === "complete"
        ? "border-[rgba(33,145,111,0.4)] bg-[var(--v2-bg-sunken)] text-[var(--v2-success)]"
        : "border-[var(--v2-hairline)] bg-[var(--v2-bg-raised)] text-[var(--v2-ink-3)]";
  const visibleSteps = steps.filter(Boolean).slice(-3);
  return (
    <div className={cn("mb-2 border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em]", tone)}>
      <div className="flex items-center gap-2">
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
        {onRetry ? (
          <V2Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="shrink-0"
            title={retryLabel ? `Retry: ${retryLabel}` : "Retry last learning turn"}
          >
            <RefreshCw className="size-3" />
            Retry
          </V2Button>
        ) : null}
      </div>
      {visibleSteps.length ? (
        <ol className="mt-2 space-y-1 border-l border-current/20 pl-3">
          {visibleSteps.map((step, index) => (
            <li key={`${step}-${index}`} className="truncate text-[11px] opacity-80">
              {step}
            </li>
          ))}
        </ol>
      ) : null}
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
          className="inline-flex items-center gap-1 border border-[var(--v2-hairline)] px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--v2-ink-3)]"
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
  disabled = false,
}: {
  onAction: (action: LearningStudyAction) => void;
  canSave: boolean;
  disabled?: boolean;
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
    { id: "check_answer", label: "Check my answer", icon: CheckCircle2 },
    { id: "regenerate", label: "Regenerate clearer", icon: RefreshCw },
    { id: "visualize", label: "Visualize", icon: BarChart3 },
    { id: "study_plan", label: "Add to study plan", icon: Clock3 },
    { id: "research", label: "Research deeper", icon: Microscope },
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <V2Button
            key={action.id}
            size="sm"
            variant="ghost"
            disabled={disabled || action.disabled}
            onClick={() => onAction(action.id)}
          >
            <Icon className="size-3.5" />
            {action.label}
          </V2Button>
        );
      })}
    </div>
  );
}

export function LearningStudyPlanHome({
  plan,
  onBuildPlan,
  onOpenSetup,
  onStartTask,
  onCompleteTask,
  completingTaskId = "",
  readOnly = false,
}: {
  plan: Item | null | undefined;
  onBuildPlan: () => void;
  onOpenSetup: () => void;
  onStartTask: (task: Item) => void;
  onCompleteTask: (taskId: string) => void;
  completingTaskId?: string;
  readOnly?: boolean;
}) {
  const tasks = Array.isArray(plan?.tasks) ? (plan.tasks as Item[]) : [];
  const title = textOf(plan?.title, "Study plan");
  const planJson = asRecord(plan?.plan);
  const summary = textOf(planJson.summary) || textOf(plan?.summary);
  const pendingTasks = tasks.filter((task) => textOf(task.status, "pending") !== "done");
  const doneTasks = tasks.length - pendingTasks.length;
  const nextTasks = pendingTasks.slice(0, 4);
  if (!plan || !tasks.length) {
    return (
      <V2Panel className="mt-8 w-full max-w-[720px] text-left">
        <V2PanelHead title="Start with a plan" meta="Course / exam / weak areas" />
        <V2PanelBody>
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 size-5 shrink-0 text-[var(--v2-accent)]" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase leading-5 tracking-[0.12em] text-[var(--v2-ink-3)]">
              Set your course, exam date, weak topics, and weekly time so ZAKI can turn answers,
              quizzes, notebooks, and books into one study loop.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <V2Button size="sm" onClick={onOpenSetup}>
            <PenLine className="size-3.5" />
            Configure setup
          </V2Button>
          <V2Button size="sm" variant="accent" onClick={onBuildPlan} disabled={readOnly}>
            <Sparkles className="size-3.5" />
            Build study plan
          </V2Button>
        </div>
        </V2PanelBody>
      </V2Panel>
    );
  }

  return (
    <V2Panel className="mt-8 w-full max-w-[760px] text-left">
      <V2PanelHead title={title} meta={`${doneTasks}/${tasks.length} done`} />
      <V2PanelBody>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-[var(--v2-accent)]" />
            <h2 className="truncate font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-1)]">{title}</h2>
          </div>
          {summary ? (
            <p className="mt-1 font-mono text-[11px] uppercase leading-5 tracking-[0.12em] text-[var(--v2-ink-3)]">{summary}</p>
          ) : null}
        </div>
        <div className="border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg-sunken)] px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-2)]">
          {doneTasks}/{tasks.length} done
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(nextTasks.length ? nextTasks : tasks.slice(0, 4)).map((task, index) => {
          const taskId = textOf(task.id, `task-${index + 1}`);
          const status = textOf(task.status, "pending");
          const done = status === "done";
          return (
            <div
              key={taskId}
              className="border border-[var(--v2-hairline)] bg-[var(--v2-bg)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Clock3 className="size-3.5 shrink-0 text-zaki-muted" />
                    )}
                    <span className="truncate font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-1)]">
                      {textOf(task.title, `Task ${index + 1}`)}
                    </span>
                  </div>
                  {textOf(task.description) ? (
                    <p className="mt-1 line-clamp-2 font-mono text-[10px] uppercase leading-5 tracking-[0.08em] text-[var(--v2-ink-3)]">
                      {textOf(task.description)}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!done ? (
                    <V2Button
                      size="sm"
                      onClick={() => onStartTask(task)}
                      disabled={readOnly}
                    >
                      <Play className="size-3.5" />
                      Start
                    </V2Button>
                  ) : null}
                  {!done ? (
                    <V2Button
                      size="sm"
                      variant="ghost"
                      disabled={readOnly || completingTaskId === taskId}
                      onClick={() => onCompleteTask(taskId)}
                    >
                      {completingTaskId === taskId ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Done
                    </V2Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <V2Button size="sm" onClick={onOpenSetup}>
          <PenLine className="size-3.5" />
          Edit setup
        </V2Button>
        <V2Button size="sm" variant="accent" onClick={onBuildPlan} disabled={readOnly}>
          <RefreshCw className="size-3.5" />
          Rebuild plan
        </V2Button>
      </div>
      </V2PanelBody>
    </V2Panel>
  );
}
