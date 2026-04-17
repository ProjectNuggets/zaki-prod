import { useEffect, useRef, useState } from "react";
import { cn } from "./utils";
import type { Locale } from "../../lib/content";

/**
 * ChatDemo — a live, looping animated chat inside a browser chrome.
 * Replaces the static SafariMockup image in the hero section.
 *
 * Cycles through multiple scenarios to showcase ZAKI's core differentiators:
 *   1. External tool integration (Gmail)
 *   2. Scheduled automation (cron / "works while you sleep")
 *   3. Persistent memory recall
 *
 * Design notes:
 * - Pure React + CSS. No external animation libraries.
 * - Respects prefers-reduced-motion (shows composed final state, no loop).
 * - Only animates when in viewport (IntersectionObserver).
 * - Pauses when tab is hidden (visibilitychange).
 * - Bilingual EN/AR with proper RTL layout.
 */

type Phase = 0 | 1 | 2 | 3 | 4 | 5;
type IconKey = "gmail" | "clock" | "memory";

type Scenario = {
  tool: { label: string; icon: IconKey };
  copy: {
    en: ScenarioCopy;
    ar: ScenarioCopy;
  };
};

type ScenarioCopy = {
  userMsg: string;
  toolRunning: string;
  responseIntro: string;
  bullets: string[];
  responseOutro?: string;
  memoryLabel: string;
  memoryText: string;
};

const SCENARIOS: Scenario[] = [
  {
    tool: { label: "Gmail", icon: "gmail" },
    copy: {
      en: {
        userMsg: "Summarize my unread emails from this week",
        toolRunning: "Reading 12 emails",
        responseIntro: "3 need action:",
        bullets: ["VC intro request", "Contract to sign", "Team standup rescheduled"],
        responseOutro: "2 are FYI. 7 can wait.",
        memoryLabel: "Remembered",
        memoryText: "prefers brief summaries",
      },
      ar: {
        userMsg: "لخّص رسائلي غير المقروءة من هذا الأسبوع",
        toolRunning: "جارٍ قراءة ١٢ رسالة",
        responseIntro: "٣ تحتاج إجراء:",
        bullets: ["طلب تعارف VC", "عقد للتوقيع", "اجتماع الفريق أُعيد جدولته"],
        responseOutro: "٢ للعلم. ٧ يمكنها الانتظار.",
        memoryLabel: "تذكّر",
        memoryText: "تفضّل الملخصات المختصرة",
      },
    },
  },
  {
    tool: { label: "Schedule", icon: "clock" },
    copy: {
      en: {
        userMsg: "Send me a daily 8am briefing",
        toolRunning: "Creating scheduled task",
        responseIntro: "Scheduled. Every day at 8:00 AM I will check:",
        bullets: ["Inbox priorities", "Calendar for the day", "Urgent threads"],
        responseOutro: "First run tomorrow morning.",
        memoryLabel: "Remembered",
        memoryText: "morning briefing at 8 AM",
      },
      ar: {
        userMsg: "أرسل لي ملخص يومي الساعة ٨ صباحًا",
        toolRunning: "جارٍ إنشاء مهمة مجدولة",
        responseIntro: "تم الجدولة. كل يوم الساعة ٨:٠٠ صباحًا سأتحقق من:",
        bullets: ["أولويات البريد", "جدول اليوم", "المحادثات العاجلة"],
        responseOutro: "أول تشغيل غدًا صباحًا.",
        memoryLabel: "تذكّر",
        memoryText: "ملخص صباحي الساعة ٨",
      },
    },
  },
  {
    tool: { label: "Memory", icon: "memory" },
    copy: {
      en: {
        userMsg: "What did I commit to for Sara by Friday?",
        toolRunning: "Searching your commitments",
        responseIntro: "Two items for Sara, due Friday:",
        bullets: ["Send the Q2 deck draft", "Reply to her proposal email"],
        responseOutro: "Flagged Tuesday in your thread with her.",
        memoryLabel: "Remembered",
        memoryText: "tracks deadlines per contact",
      },
      ar: {
        userMsg: "ماذا وعدت سارة بتسليمه قبل الجمعة؟",
        toolRunning: "جارٍ البحث في التزاماتك",
        responseIntro: "عنصران لسارة، يستحقان الجمعة:",
        bullets: ["إرسال مسودة عرض الربع الثاني", "الرد على إيميل اقتراحها"],
        responseOutro: "مُميّز منذ الثلاثاء في محادثتك معها.",
        memoryLabel: "تذكّر",
        memoryText: "يتتبّع المواعيد لكل جهة اتصال",
      },
    },
  },
];

const TIMELINE: { phase: Phase; duration: number }[] = [
  { phase: 0, duration: 500 }, // brief pause
  { phase: 1, duration: 1300 }, // user message
  { phase: 2, duration: 2000 }, // tool execution
  { phase: 3, duration: 2500 }, // response
  { phase: 4, duration: 2800 }, // memory + hold
  { phase: 5, duration: 1200 }, // fade, then advance scenario
];
// total: ~10.3s per scenario. Three scenarios → ~31s full cycle.

interface ChatDemoProps {
  locale: Locale;
  className?: string;
}

export function ChatDemo({ locale, className }: ChatDemoProps) {
  const isArabic = locale === "ar";
  const [phase, setPhase] = useState<Phase>(0);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.25,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handler = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase(4); // composed final state, no loop
      return;
    }
    if (!inView || !pageVisible) return;

    let index = 0;
    let timer: ReturnType<typeof setTimeout>;

    const advance = () => {
      setPhase(TIMELINE[index].phase);
      timer = setTimeout(() => {
        const nextIndex = (index + 1) % TIMELINE.length;
        // When a scenario completes its fade, roll over to the next scenario
        if (nextIndex === 0) {
          setScenarioIndex((s) => (s + 1) % SCENARIOS.length);
        }
        index = nextIndex;
        advance();
      }, TIMELINE[index].duration);
    };

    advance();
    return () => clearTimeout(timer);
  }, [reducedMotion, inView, pageVisible]);

  const scenario = SCENARIOS[scenarioIndex];
  const copy = isArabic ? scenario.copy.ar : scenario.copy.en;

  const userMsgVisible = phase >= 1 && phase <= 4;
  const toolVisible = phase >= 2 && phase <= 4;
  const responseVisible = phase >= 3 && phase <= 4;
  const memoryVisible = phase === 4;
  const fading = phase === 5;

  const ToolIcon = ICON_MAP[scenario.tool.icon];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl bg-zk-bg transition-opacity duration-700 ease-out",
        fading ? "opacity-0" : "opacity-100",
        className
      )}
      aria-label={isArabic ? "عرض توضيحي لمحادثة زكي" : "ZAKI chat demo"}
      role="img"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-zk-border bg-zk-surface px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-zk-text-ghost" />
          <span className="size-2.5 rounded-full bg-zk-text-ghost" />
          <span className="size-2.5 rounded-full bg-zk-text-ghost" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-zk-bg/60 px-3 py-1 font-mono-ui text-xs text-zk-text-tertiary">
          <LockIcon className="size-3" />
          <span>app.chatzaki.com</span>
        </div>
      </div>

      {/* Agent header */}
      <div className="flex items-center justify-between border-b border-zk-border bg-zk-bg-raised px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-zk-accent/[0.08] ring-1 ring-zk-accent/20">
            <span className="font-logo text-sm tracking-wider text-zk-accent">Z</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-zk-text">
              {isArabic ? "زكي" : "ZAKI"}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-zk-success" />
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-zk-text-tertiary">
                {isArabic ? "متصل" : "Online"}
              </p>
            </div>
          </div>
        </div>
        {/* Scenario indicator dots */}
        <div
          className="hidden items-center gap-1.5 sm:flex"
          aria-hidden="true"
        >
          {SCENARIOS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i === scenarioIndex
                  ? "w-5 bg-zk-accent"
                  : "w-1 bg-zk-text-ghost"
              )}
            />
          ))}
        </div>
      </div>

      {/* Chat body */}
      <div
        className="relative bg-zk-bg px-5 py-6 sm:px-6"
        style={{ minHeight: "380px" }}
      >
        <div className="flex flex-col gap-4">
          {/* User message */}
          <div
            className={cn(
              "flex transition-all duration-500 ease-out",
              isArabic ? "justify-start" : "justify-end",
              userMsgVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            )}
          >
            <div className="max-w-[80%] rounded-2xl border border-zk-border-strong bg-zk-surface px-4 py-2.5 shadow-sm">
              <p className="text-sm leading-6 text-zk-text">{copy.userMsg}</p>
            </div>
          </div>

          {/* Tool execution pill + chip */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 transition-all duration-500 ease-out",
              isArabic ? "justify-end" : "justify-start",
              toolVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            )}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-3 py-1.5">
              <span className="relative inline-flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zk-accent opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-zk-accent" />
              </span>
              <span className="font-mono-ui text-[11px] text-zk-text-secondary">
                {copy.toolRunning}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zk-accent/25 bg-zk-accent/[0.06] px-2.5 py-1">
              <ToolIcon className="size-3 text-zk-accent" />
              <span className="font-mono-ui text-[10px] font-semibold uppercase tracking-[0.16em] text-zk-accent">
                {scenario.tool.label}
              </span>
            </div>
          </div>

          {/* ZAKI response */}
          <div
            className={cn(
              "flex transition-all duration-500 ease-out",
              isArabic ? "justify-end" : "justify-start",
              responseVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            )}
          >
            <div className="max-w-[85%] rounded-2xl border border-zk-border-strong bg-zk-surface-hover px-4 py-3 shadow-sm">
              <p className="mb-2 text-sm font-semibold leading-6 text-zk-text">
                {copy.responseIntro}
              </p>
              <ul className="mb-2 space-y-1">
                {copy.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="relative text-sm leading-6 text-zk-text-secondary ps-3.5"
                  >
                    <span className="absolute start-0 top-[0.65rem] size-1 rounded-full bg-zk-accent" />
                    {bullet}
                  </li>
                ))}
              </ul>
              {copy.responseOutro && (
                <p className="text-sm leading-6 text-zk-text-secondary">{copy.responseOutro}</p>
              )}
            </div>
          </div>
        </div>

        {/* Memory chip */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-5 bottom-5 transition-all duration-500 ease-out sm:inset-x-6",
            memoryVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
        >
          <div className="inline-flex items-center gap-2 rounded-xl border border-zk-accent/20 bg-zk-accent/[0.04] px-3 py-2 backdrop-blur-sm">
            <MemoryIcon className="size-3.5 text-zk-accent" />
            <p className="text-xs text-zk-text-secondary">
              <span className="font-semibold text-zk-text">{copy.memoryLabel}:</span>{" "}
              {copy.memoryText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline SVG icons — keeps the component self-contained.

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10" height="6" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </svg>
  );
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 6.4A1.4 1.4 0 013.4 5h17.2A1.4 1.4 0 0122 6.4v.55l-10 6.55L2 6.95V6.4zm0 2.42v8.78A1.4 1.4 0 003.4 19h17.2a1.4 1.4 0 001.4-1.4V8.82l-9.4 6.16a1.1 1.1 0 01-1.2 0L2 8.82z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function MemoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5.25A3.25 3.25 0 0112.25 2h.5A3.25 3.25 0 0116 5.25v.5a2.5 2.5 0 011 4.6V14a3 3 0 01-3 3h-.5v2a2 2 0 11-4 0v-2H9a3 3 0 01-3-3v-3.65a2.5 2.5 0 011-4.6v-.5z" />
      <path d="M9 11h2M13 9v4" />
    </svg>
  );
}

const ICON_MAP: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  gmail: GmailIcon,
  clock: ClockIcon,
  memory: MemoryIcon,
};
