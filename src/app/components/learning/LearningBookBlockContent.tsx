import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Code2,
  Compass,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  StickyNote,
  XCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLearningProtectedAsset } from "./learningProtectedAsset";

type Item = Record<string, unknown>;

export type LearningBookContentBlock = {
  id: string;
  type: string;
  status?: string;
  title?: string;
  params?: Item;
  payload?: Item;
  metadata?: Item;
  error?: string;
};

export type LearningBookQuizAttempt = {
  questionId?: string;
  userAnswer?: string;
  isCorrect: boolean;
};

type LearningBookBlockContentProps = {
  block: LearningBookContentBlock;
  onQuizAttempt?: (args: LearningBookQuizAttempt) => void;
  onDeepDiveTopic?: (topic: string) => void | Promise<void>;
  pendingDeepDiveTopic?: string | null;
};

type QuizQuestion = {
  question_id?: string;
  question?: string;
  question_type?: string;
  options?: Record<string, string> | null;
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
};

type FlashCard = {
  front?: string;
  back?: string;
  hint?: string;
};

type TimelineEvent = {
  date?: string;
  title?: string;
  description?: string;
};

type DeepDiveSuggestion = {
  topic?: string;
  rationale?: string;
};

const QUESTION_TYPE_ALIASES: Record<string, "choice" | "written" | "coding"> = {
  choice: "choice",
  multiple_choice: "choice",
  "multiple-choice": "choice",
  mcq: "choice",
  written: "written",
  open_ended: "written",
  "open-ended": "written",
  open_response: "written",
  "open-response": "written",
  short_answer: "written",
  "short-answer": "written",
  essay: "written",
  fill_in_blank: "written",
  "fill-in-the-blank": "written",
  coding: "coding",
  code: "coding",
  programming: "coding",
};

const CALLOUT_STYLES: Record<
  string,
  { icon: typeof Lightbulb; className: string; iconClassName: string }
> = {
  key_idea: {
    icon: Lightbulb,
    className: "border-amber-400/70 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    iconClassName: "text-amber-700 dark:text-amber-300",
  },
  common_pitfall: {
    icon: AlertTriangle,
    className: "border-rose-400/70 bg-rose-500/10 text-rose-950 dark:text-rose-100",
    iconClassName: "text-rose-700 dark:text-rose-300",
  },
  summary: {
    icon: BookmarkCheck,
    className: "border-sky-400/70 bg-sky-500/10 text-sky-950 dark:text-sky-100",
    iconClassName: "text-sky-700 dark:text-sky-300",
  },
  tip: {
    icon: Sparkles,
    className: "border-emerald-400/70 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
    iconClassName: "text-emerald-700 dark:text-emerald-300",
  },
};

function asRecord(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Item) : {};
}

function textOf(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function sanitizeBookDisplayText(value: string) {
  const text = value.trim();
  if (!text) return "";
  const metaMarker =
    /^\s*["'“”]*(The user wants|User wants|Key requirements|Key constraints|Content requirements|Let me|I need to|I should|So I should|Word count|Drafting:|Structure:|Tone:|Wait,|The prompt says|Identity policy|No H1|No JSON|Check constraints|Constraints check|Final check|Reviewing constraints|Looks good|Keep it|\d+\s*-\s*\d+\s+short sentences)\b/im;
  const promptLeak =
    /\b(The user wants|Key constraints|Content requirements|The prompt says|Identity policy|I need to|I should|So I should)\b/i;
  const postAnswer =
    /^\s*["'“”]*(Word count|Let me|I should|So I should|The prompt says|Wait,|Identity policy|No H1|No JSON|Check constraints|Constraints check|Final check|Reviewing constraints|Looks good|Keep it|\d+\s*-\s*\d+\s+short sentences)\b/im;
  const trimmed = (text.replace(postAnswer, "\u0000").split("\u0000")[0] || "").trim();
  if (promptLeak.test(trimmed)) return "";
  if (metaMarker.test(trimmed.slice(0, 2500))) return "";
  return trimmed;
}

function stripHtmlFence(value: string) {
  return value.trim().replace(/^```(?:html)?\s*([\s\S]*?)\s*```$/i, "$1").trim();
}

function arrayOfRecords(value: unknown): Item[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function markdown(content: string) {
  const safeContent = sanitizeBookDisplayText(content);
  return (
    <div className="prose prose-sm max-w-none text-zaki-text dark:prose-invert">
      <ReactMarkdown>{safeContent}</ReactMarkdown>
    </div>
  );
}

function normalizeQuizQuestionType(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return QUESTION_TYPE_ALIASES[normalized] || "written";
}

function resolveChoiceAnswerKey(
  correctAnswer: unknown,
  options: Record<string, string> | null | undefined,
) {
  const correct = String(correctAnswer || "").trim();
  if (!correct || !options) return "";
  const directKey = correct.toUpperCase();
  if (directKey in options) return directKey;
  const normalizedAnswer = correct.toLowerCase();
  for (const [key, label] of Object.entries(options)) {
    if (normalizedAnswer === String(label || "").trim().toLowerCase()) {
      return key.toUpperCase();
    }
  }
  return directKey;
}

function resolveLearningAssetUrl(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/outputs/")) {
    return buildApiUrl(`/api/learning/outputs/${url.slice("/api/outputs/".length)}`);
  }
  if (url.startsWith("/api/attachments/")) {
    return buildApiUrl(`/api/learning/attachments/${url.slice("/api/attachments/".length)}`);
  }
  if (url.startsWith("/api/v1/")) {
    return buildApiUrl(`/api/learning/${url.slice("/api/v1/".length)}`);
  }
  return buildApiUrl(url);
}

export function LearningBookBlockContent({
  block,
  onQuizAttempt,
  onDeepDiveTopic,
  pendingDeepDiveTopic,
}: LearningBookBlockContentProps) {
  const payload = block.payload || {};
  const bridgeText = textOf(payload.bridge_text);

  if (block.status === "pending" || block.status === "generating") {
    return (
      <div className="flex items-center gap-2 rounded-zaki-md border border-dashed border-zaki-border bg-zaki-base px-4 py-3 text-sm text-zaki-muted">
        <Loader2 className="size-4 animate-spin" />
        Generating {block.type}...
      </div>
    );
  }

  if (block.status === "error") {
    const failure = asRecord(block.metadata?.failure);
    return (
      <div className="rounded-zaki-md border border-rose-300/70 bg-rose-500/10 px-4 py-3 text-sm text-rose-900 dark:text-rose-100">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <AlertTriangle className="size-4" />
          {block.type} block failed
        </div>
        {textOf(failure.kind) ? (
          <div className="mb-1 text-[11px] uppercase tracking-normal opacity-70">
            {textOf(failure.kind)}
            {failure.retryable === false ? " / not retryable" : ""}
          </div>
        ) : null}
        <div className="text-xs opacity-80">
          {block.error || textOf(failure.message, "Unknown error")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bridgeText ? markdown(bridgeText) : null}
      <TypedBlock
        block={block}
        onQuizAttempt={onQuizAttempt}
        onDeepDiveTopic={onDeepDiveTopic}
        pendingDeepDiveTopic={pendingDeepDiveTopic}
      />
    </div>
  );
}

function TypedBlock({
  block,
  onQuizAttempt,
  onDeepDiveTopic,
  pendingDeepDiveTopic,
}: LearningBookBlockContentProps) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "section":
      return <SectionBlock block={block} />;
    case "callout":
      return <CalloutBlock block={block} />;
    case "quiz":
      return <QuizBlock block={block} onQuizAttempt={onQuizAttempt} />;
    case "user_note":
      return <UserNoteBlock block={block} />;
    case "figure":
      return <FigureBlock block={block} />;
    case "interactive":
      return <InteractiveBlock block={block} />;
    case "animation":
      return <AnimationBlock block={block} />;
    case "code":
      return <CodeBlock block={block} />;
    case "timeline":
      return <TimelineBlock block={block} />;
    case "flash_cards":
      return <FlashCardsBlock block={block} />;
    case "deep_dive":
      return (
        <DeepDiveBlock
          block={block}
          onDeepDiveTopic={onDeepDiveTopic}
          pendingDeepDiveTopic={pendingDeepDiveTopic}
        />
      );
    case "concept_graph":
      return <ConceptGraphBlock block={block} />;
    default:
      return <FallbackBlock block={block} />;
  }
}

function TextBlock({ block }: { block: LearningBookContentBlock }) {
  const body =
    textOf(block.payload?.body) ||
    textOf(block.payload?.content) ||
    textOf(block.payload?.text);
  return body ? markdown(body) : <FallbackBlock block={block} />;
}

function SectionBlock({ block }: { block: LearningBookContentBlock }) {
  const payload = block.payload || {};
  const intro = textOf(payload.intro);
  const focus = textOf(payload.focus);
  const keyTakeaway = textOf(payload.key_takeaway);
  const subsections = arrayOfRecords(payload.subsections);
  return (
    <section className="space-y-5 text-zaki-text">
      {intro ? markdown(intro) : null}
      {focus ? (
        <div className="text-[11px] font-semibold uppercase tracking-normal text-zaki-muted">
          Section focus / {focus}
        </div>
      ) : null}
      {subsections.map((subsection, index) => {
        const body = textOf(subsection.body);
        if (!body) return null;
        return <div key={index}>{markdown(body)}</div>;
      })}
      {keyTakeaway ? (
        <div className="flex items-start gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-zaki-brand" />
          <div>
            <span className="mr-1 font-semibold">Key takeaway:</span>
            {keyTakeaway}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CalloutBlock({ block }: { block: LearningBookContentBlock }) {
  const variant = textOf(block.payload?.variant, "key_idea");
  const label = textOf(block.payload?.label, variant.replace(/_/g, " "));
  const body = sanitizeBookDisplayText(textOf(block.payload?.body));
  const style = CALLOUT_STYLES[variant] || CALLOUT_STYLES.key_idea!;
  const Icon = style.icon;
  return (
    <aside className={cn("flex gap-3 border-l-[3px] py-2 pl-4 pr-3", style.className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", style.iconClassName)} />
      <div className="min-w-0 space-y-1">
        <div className={cn("text-[11px] font-semibold uppercase tracking-normal", style.iconClassName)}>
          {label}
        </div>
        <div className="text-sm leading-6">{body}</div>
      </div>
    </aside>
  );
}

function QuizBlock({
  block,
  onQuizAttempt,
}: {
  block: LearningBookContentBlock;
  onQuizAttempt?: (args: LearningBookQuizAttempt) => void;
}) {
  const questions = arrayOfRecords(block.payload?.questions) as QuizQuestion[];
  if (!questions.length) {
    return <div className="text-sm text-zaki-muted">No quiz questions generated.</div>;
  }
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-normal text-zaki-brand">
        <span className="h-px flex-1 bg-zaki-brand/20" />
        Quick Check
        <span className="h-px flex-1 bg-zaki-brand/20" />
      </div>
      <div className="space-y-3">
        {questions.map((question, index) => (
          <QuizQuestionCard
            key={question.question_id || index}
            index={index}
            question={question}
            onQuizAttempt={onQuizAttempt}
          />
        ))}
      </div>
    </section>
  );
}

function QuizQuestionCard({
  index,
  question,
  onQuizAttempt,
}: {
  index: number;
  question: QuizQuestion;
  onQuizAttempt?: (args: LearningBookQuizAttempt) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reported, setReported] = useState(false);
  const normalizedType = normalizeQuizQuestionType(question.question_type);
  const options = question.options || {};
  const isChoice = normalizedType === "choice";
  const correct = textOf(question.correct_answer);
  const correctChoiceKey = resolveChoiceAnswerKey(correct, options);

  const report = () => {
    if (reported || !onQuizAttempt) return;
    const userAnswer = selected || "";
    onQuizAttempt({
      questionId: question.question_id,
      userAnswer,
      isCorrect: isChoice ? userAnswer.toUpperCase() === correctChoiceKey : true,
    });
    setReported(true);
  };

  return (
    <div className="rounded-zaki-md border border-zaki-border bg-zaki-base p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="pt-0.5 text-sm font-semibold text-zaki-text">{index + 1}.</span>
          <div className="min-w-0 flex-1">
            {markdown(textOf(question.question, "(missing)"))}
          </div>
        </div>
        {question.difficulty ? (
          <span className="rounded-full bg-zaki-hover px-2 py-0.5 text-[10px] uppercase tracking-normal text-zaki-muted">
            {question.difficulty}
          </span>
        ) : null}
      </div>
      {isChoice && Object.keys(options).length ? (
        <div className="mt-3 space-y-1.5">
          {Object.entries(options).map(([key, label]) => {
            const upperKey = key.toUpperCase();
            const isSelected = selected === upperKey;
            const isCorrect = revealed && upperKey === correctChoiceKey;
            const isWrongPick = revealed && isSelected && upperKey !== correctChoiceKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(upperKey)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-zaki-md border px-3 py-2 text-left text-sm transition-colors",
                  isCorrect
                    ? "border-emerald-300 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                    : isWrongPick
                      ? "border-rose-300 bg-rose-500/10 text-rose-900 dark:text-rose-100"
                      : isSelected
                        ? "border-zaki-brand bg-zaki-brand/10 text-zaki-text"
                        : "border-zaki-border bg-zaki-raised text-zaki-text hover:border-zaki-brand/40",
                )}
              >
                <span className="font-mono text-xs uppercase text-zaki-muted">{upperKey}.</span>
                <span className="flex-1 whitespace-pre-wrap break-words">{label}</span>
                {isCorrect ? <CheckCircle2 className="mt-0.5 size-4" /> : null}
                {isWrongPick ? <XCircle className="mt-0.5 size-4" /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 text-xs text-zaki-muted">
          Think about your answer, then reveal the solution.
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setRevealed((value) => !value);
            if (!revealed) report();
          }}
          className="inline-flex items-center gap-1.5 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2.5 py-1 text-xs font-semibold text-zaki-muted hover:border-zaki-brand/40 hover:text-zaki-brand"
        >
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {revealed ? "Hide answer" : "Reveal answer"}
        </button>
        {revealed && correct && isChoice ? (
          <span className="text-xs text-zaki-muted">
            Answer: <span className="font-mono text-zaki-text">{correctChoiceKey || correct}</span>
          </span>
        ) : null}
      </div>
      {revealed && correct && !isChoice ? (
        <div className="mt-2 rounded-zaki-md border border-zaki-border bg-zaki-raised p-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-normal text-zaki-muted">
            Answer
          </div>
          {markdown(correct)}
        </div>
      ) : null}
      {revealed && question.explanation ? (
        <div className="mt-2 rounded-zaki-md border border-zaki-border bg-zaki-hover/50 p-2">
          {markdown(String(question.explanation))}
        </div>
      ) : null}
    </div>
  );
}

function FlashCardsBlock({ block }: { block: LearningBookContentBlock }) {
  const cards = arrayOfRecords(block.payload?.cards) as FlashCard[];
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  if (!cards.length) return <FallbackBlock block={block} />;
  const card = cards[Math.min(index, cards.length - 1)] || {};
  return (
    <div className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-normal text-zaki-brand">
          Flash Cards
        </span>
        <span className="text-xs text-zaki-muted">
          {index + 1} / {cards.length}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setShowBack((value) => !value)}
        className="mt-3 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-raised px-6 text-center hover:border-zaki-brand/40"
      >
        <span className="text-[10px] uppercase tracking-normal text-zaki-muted">
          {showBack ? "Answer" : "Question"}
        </span>
        <span className="text-base font-semibold text-zaki-text">
          {showBack ? card.back : card.front}
        </span>
        {!showBack && card.hint ? (
          <span className="text-xs italic text-zaki-muted">Hint: {card.hint}</span>
        ) : null}
      </button>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setShowBack(false);
            setIndex((value) => Math.max(0, value - 1));
          }}
          disabled={index === 0}
          className="inline-flex items-center gap-1 rounded-zaki-md border border-zaki-border px-2 py-1 text-xs disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5" />
          Prev
        </button>
        <button
          type="button"
          onClick={() => setShowBack((value) => !value)}
          className="inline-flex items-center gap-1 rounded-zaki-md border border-zaki-border px-2 py-1 text-xs hover:border-zaki-brand/40 hover:text-zaki-brand"
        >
          <RotateCcw className="size-3.5" />
          Flip
        </button>
        <button
          type="button"
          onClick={() => {
            setShowBack(false);
            setIndex((value) => Math.min(cards.length - 1, value + 1));
          }}
          disabled={index >= cards.length - 1}
          className="inline-flex items-center gap-1 rounded-zaki-md border border-zaki-border px-2 py-1 text-xs disabled:opacity-30"
        >
          Next
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function TimelineBlock({ block }: { block: LearningBookContentBlock }) {
  const events = arrayOfRecords(block.payload?.events) as TimelineEvent[];
  if (!events.length) return <FallbackBlock block={block} />;
  return (
    <div className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-4">
      <ol className="relative ml-3 space-y-4 border-l border-zaki-border pl-4">
        {events.map((event, index) => (
          <li key={index} className="relative">
            <span className="absolute -left-[23px] top-1 inline-flex size-3 rounded-full border-2 border-zaki-base bg-zaki-brand" />
            <div className="text-xs font-mono uppercase tracking-normal text-zaki-muted">
              {event.date || ""}
            </div>
            <div className="text-sm font-semibold text-zaki-text">{event.title}</div>
            {event.description ? (
              <div className="mt-0.5 text-xs leading-5 text-zaki-muted">{event.description}</div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CodeBlock({ block }: { block: LearningBookContentBlock }) {
  const language = textOf(block.payload?.language, "python");
  const code = textOf(block.payload?.code) || textOf(block.payload?.source);
  const explanation = sanitizeBookDisplayText(textOf(block.payload?.explanation));
  if (!code) return <FallbackBlock block={block} />;
  return (
    <div className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-4">
      <pre className="overflow-x-auto rounded-zaki-md bg-zaki-raised p-4 text-xs text-zaki-text">
        <code>{code}</code>
      </pre>
      {language ? <div className="mt-2 text-[11px] text-zaki-muted">{language}</div> : null}
      {explanation ? <p className="mt-2 text-xs text-zaki-muted">{explanation}</p> : null}
    </div>
  );
}

function FigureBlock({ block }: { block: LearningBookContentBlock }) {
  const code = asRecord(block.payload?.code);
  const language = textOf(code.language, "svg").toLowerCase();
  const content = stripHtmlFence(textOf(code.content));
  const description = sanitizeBookDisplayText(textOf(block.payload?.description));
  const imageUrl = textOf(block.payload?.url) || textOf(block.payload?.image_url);

  if (imageUrl) {
    return (
      <figure className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-3">
        <ProtectedLearningImage
          url={resolveLearningAssetUrl(imageUrl)}
          alt={description || "Generated figure"}
          className="h-auto w-full rounded-zaki-md"
        />
        {description ? <figcaption className="mt-3 text-xs text-zaki-muted">{description}</figcaption> : null}
      </figure>
    );
  }

  if (language === "svg" && content.trim().startsWith("<svg")) {
    const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
    return (
      <figure className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-3">
        <img src={src} alt={description || "Generated figure"} className="h-auto w-full" />
        {description ? <figcaption className="mt-3 text-xs text-zaki-muted">{description}</figcaption> : null}
      </figure>
    );
  }

  return <CodeBlock block={{ ...block, payload: { ...block.payload, code: content, language } }} />;
}

function buildSafeInteractiveSrcDoc(content: string) {
  const csp =
    "default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; font-src 'none'; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  const sanitized = content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
  if (/<head\b[^>]*>/i.test(sanitized)) {
    return sanitized.replace(/<head\b([^>]*)>/i, `<head$1>${meta}`);
  }
  return `<!doctype html><html><head>${meta}</head><body>${sanitized}</body></html>`;
}

function InteractiveBlock({ block }: { block: LearningBookContentBlock }) {
  const code = asRecord(block.payload?.code);
  const content = stripHtmlFence(textOf(code.content) || textOf(block.payload?.html));
  const description = sanitizeBookDisplayText(textOf(block.payload?.description));
  const safeContent = useMemo(() => buildSafeInteractiveSrcDoc(content), [content]);
  if (!content.trim()) return <FallbackBlock block={block} />;
  return (
    <figure className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-3">
      <iframe
        title={block.title || "Interactive learning block"}
        sandbox=""
        srcDoc={safeContent}
        className="h-[420px] w-full rounded-zaki-md border border-zaki-border bg-white"
      />
      {description ? <figcaption className="mt-3 text-xs text-zaki-muted">{description}</figcaption> : null}
    </figure>
  );
}

function AnimationBlock({ block }: { block: LearningBookContentBlock }) {
  const artifacts = arrayOfRecords(block.payload?.artifacts);
  const rawUrl = textOf(block.payload?.video_url) || textOf(artifacts[0]?.url);
  const summary = textOf(block.payload?.summary) || textOf(block.payload?.description);
  if (!rawUrl) return <FallbackBlock block={block} />;
  const url = resolveLearningAssetUrl(rawUrl);
  const contentType = textOf(artifacts[0]?.content_type);
  const isVideo =
    /\.(mp4|webm|mov)(\?|$)/i.test(rawUrl) || contentType.startsWith("video/");
  return (
    <figure className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-3">
      <div className="overflow-hidden rounded-zaki-md bg-black">
        {isVideo ? (
          <ProtectedLearningVideo url={url} className="aspect-video w-full object-contain" />
        ) : (
          <ProtectedLearningImage url={url} alt={summary || "Animation frame"} className="h-auto w-full" />
        )}
      </div>
      {summary ? <figcaption className="mt-3 text-xs text-zaki-muted">{summary}</figcaption> : null}
    </figure>
  );
}

function ProtectedLearningImage({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const asset = useLearningProtectedAsset(url);
  if (asset.status === "loading") {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-zaki-md bg-zaki-raised text-xs text-zaki-muted">
        Loading asset...
      </div>
    );
  }
  if (asset.status === "error") {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-zaki-md border border-dashed border-zaki-border bg-zaki-raised px-3 text-center text-xs text-zaki-muted">
        Asset preview is unavailable. Refresh the page and try again.
      </div>
    );
  }
  return <img src={asset.src} alt={alt} className={className} />;
}

function ProtectedLearningVideo({ url, className }: { url: string; className?: string }) {
  const asset = useLearningProtectedAsset(url);
  if (asset.status === "loading") {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-zaki-raised text-xs text-zaki-muted">
        Loading video...
      </div>
    );
  }
  if (asset.status === "error") {
    return (
      <div className="flex aspect-video w-full items-center justify-center border border-dashed border-zaki-border bg-zaki-raised px-3 text-center text-xs text-zaki-muted">
        Video preview is unavailable. Refresh the page and try again.
      </div>
    );
  }
  return <video src={asset.src} controls playsInline preload="metadata" className={className} />;
}

function DeepDiveBlock({
  block,
  onDeepDiveTopic,
  pendingDeepDiveTopic,
}: {
  block: LearningBookContentBlock;
  onDeepDiveTopic?: (topic: string) => void | Promise<void>;
  pendingDeepDiveTopic?: string | null;
}) {
  const suggestions = arrayOfRecords(block.payload?.suggestions) as DeepDiveSuggestion[];
  const linkedPageId = textOf(block.metadata?.deep_dive_page_id);
  const [busyTopic, setBusyTopic] = useState<string | null>(null);
  if (!suggestions.length) return <FallbackBlock block={block} />;
  return (
    <div className="rounded-zaki-lg border border-zaki-brand/30 bg-zaki-brand/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-zaki-brand" />
        <span className="text-[11px] font-semibold uppercase tracking-normal text-zaki-brand">
          Go Deeper
        </span>
      </div>
      <ul className="space-y-2">
        {suggestions.map((suggestion, index) => {
          const topic = suggestion.topic || "";
          const pending = busyTopic === topic || pendingDeepDiveTopic === topic;
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => {
                  if (!topic || !onDeepDiveTopic) return;
                  setBusyTopic(topic);
                  void Promise.resolve(onDeepDiveTopic(topic)).finally(() => {
                    setBusyTopic(null);
                  });
                }}
                disabled={!topic || pending || Boolean(linkedPageId)}
                className="group flex w-full items-start justify-between gap-3 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-left transition-colors hover:border-zaki-brand/40 disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zaki-text">{topic}</span>
                  {suggestion.rationale ? (
                    <span className="mt-0.5 block text-xs leading-5 text-zaki-muted">
                      {suggestion.rationale}
                    </span>
                  ) : null}
                </span>
                {pending ? (
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-zaki-brand" />
                ) : (
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-zaki-muted transition-transform group-hover:translate-x-0.5 group-hover:text-zaki-brand" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {linkedPageId ? (
        <p className="mt-2 text-[11px] text-zaki-muted">Linked sub-page already exists.</p>
      ) : null}
    </div>
  );
}

function ConceptGraphBlock({ block }: { block: LearningBookContentBlock }) {
  const graph = asRecord(block.payload?.graph);
  const nodes = arrayOfRecords(graph.nodes);
  const edges = arrayOfRecords(graph.edges);
  const code = asRecord(block.payload?.code);
  const mermaidSource = textOf(code.content);
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <figure className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-3">
        <header className="mb-2 flex items-center gap-2 text-xs text-zaki-muted">
          <Compass className="size-3.5" />
          Concept map / {nodes.length} concepts / {edges.length} relations
        </header>
        {mermaidSource ? (
          <pre className="max-h-[60vh] overflow-auto rounded-zaki-md bg-zaki-raised p-4 text-xs text-zaki-text">
            <code>{mermaidSource}</code>
          </pre>
        ) : (
          <div className="rounded-zaki-md border border-dashed border-zaki-border p-4 text-xs text-zaki-muted">
            Concept graph metadata is available, but no diagram source was provided.
          </div>
        )}
      </figure>
      <aside className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-normal text-zaki-muted">
          Concepts
        </h3>
        <ol className="space-y-1.5">
          {nodes.slice(0, 20).map((node, index) => (
            <li key={textOf(node.id, String(index))} className="rounded-zaki-sm px-2 py-1 text-xs text-zaki-text">
              {textOf(node.label) || textOf(node.title) || textOf(node.id, `Concept ${index + 1}`)}
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}

function UserNoteBlock({ block }: { block: LearningBookContentBlock }) {
  const body = textOf(block.payload?.body);
  return (
    <aside className="flex gap-3 border-l-[3px] border-dashed border-zaki-brand/50 bg-zaki-brand/5 py-2 pl-4 pr-3">
      <StickyNote className="mt-0.5 size-4 shrink-0 text-zaki-brand" />
      <div className="min-w-0 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-normal text-zaki-brand">
          Your note
        </div>
        {body ? markdown(body) : <div className="text-xs text-zaki-muted">Empty note.</div>}
      </div>
    </aside>
  );
}

function FallbackBlock({ block }: { block: LearningBookContentBlock }) {
  const payload = useMemo(() => {
    try {
      return JSON.stringify(block.payload || block.params || {}, null, 2);
    } catch {
      return "{}";
    }
  }, [block.params, block.payload]);

  const markdownText =
    textOf(block.payload?.markdown) ||
    textOf(block.payload?.content) ||
    textOf(block.payload?.text) ||
    textOf(block.payload?.body) ||
    textOf(block.payload?.summary) ||
    textOf(block.payload?.explanation) ||
    textOf(block.params?.prompt);

  if (markdownText) return markdown(markdownText);

  return (
    <div className="rounded-zaki-md border border-dashed border-zaki-border bg-zaki-base p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-zaki-muted">
        <Code2 className="size-3.5" />
        Raw block payload
      </div>
      <pre className="max-h-72 overflow-auto text-xs text-zaki-muted">{payload}</pre>
    </div>
  );
}
