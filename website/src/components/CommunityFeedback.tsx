import { MessageSquare } from "lucide-react";
import { Reveal } from "./Reveal";
import type { Locale } from "../lib/content";

interface FeedbackItem {
  id: string;
  text: string;
  author: string;
  votes: number;
  date: string;
  tag?: string;
}

const MOCK_FEEDBACK_EN: FeedbackItem[] = [
  {
    id: "1",
    text: "Let ZAKI remember my writing style across sessions — so drafts feel like mine, not generic AI output.",
    author: "Nora M.",
    votes: 47,
    date: "2 days ago",
    tag: "Memory",
  },
  {
    id: "2",
    text: "Arabic-first summarization that actually understands context, not just word-by-word translation.",
    author: "Anonymous",
    votes: 38,
    date: "3 days ago",
    tag: "Arabic",
  },
  {
    id: "3",
    text: "A daily briefing mode — ZAKI checks my calendar, emails, and gives me a 30-second morning summary.",
    author: "Khalid R.",
    votes: 31,
    date: "5 days ago",
    tag: "Operator",
  },
  {
    id: "4",
    text: "Integration with Notion and Google Docs so ZAKI can pull context from where I actually work.",
    author: "Sara A.",
    votes: 26,
    date: "1 week ago",
    tag: "Integration",
  },
  {
    id: "5",
    text: "Voice input with real-time transcription — especially for Arabic dialects.",
    author: "Anonymous",
    votes: 19,
    date: "1 week ago",
    tag: "Voice",
  },
];

const MOCK_FEEDBACK_AR: FeedbackItem[] = [
  {
    id: "1",
    text: "خلّوا زكي يتذكر أسلوب كتابتي بين الجلسات — عشان المسودات تكون بصوتي، مش كلام AI عام.",
    author: "نورا م.",
    votes: 47,
    date: "قبل يومين",
    tag: "الذاكرة",
  },
  {
    id: "2",
    text: "تلخيص بالعربي يفهم السياق فعلًا، مش ترجمة حرفية كلمة بكلمة.",
    author: "مجهول",
    votes: 38,
    date: "قبل 3 أيام",
    tag: "العربية",
  },
  {
    id: "3",
    text: "وضع ملخص يومي — زكي يتابع جدولي وإيميلاتي ويعطيني ملخص الصبح بـ 30 ثانية.",
    author: "خالد ر.",
    votes: 31,
    date: "قبل 5 أيام",
    tag: "المشغّل",
  },
  {
    id: "4",
    text: "ربط مع Notion و Google Docs عشان زكي يسحب السياق من المكان اللي فعلًا أشتغل فيه.",
    author: "سارة أ.",
    votes: 26,
    date: "قبل أسبوع",
    tag: "تكامل",
  },
  {
    id: "5",
    text: "إدخال صوتي مع تحويل فوري للنص — خصوصًا للهجات العربية.",
    author: "مجهول",
    votes: 19,
    date: "قبل أسبوع",
    tag: "الصوت",
  },
];

function FeedbackCard({ item }: { item: FeedbackItem }) {
  return (
    <div className="flex gap-4 rounded-[20px] border border-line-strong bg-chat-surface p-5 transition-colors hover:bg-chat-surface-raised">
      <div className="flex min-w-16 flex-col items-center justify-center rounded-[16px] border border-line-strong/70 bg-chat-bg/70 px-3 py-2">
        <span className="font-display text-[20px] font-extrabold tracking-[-0.03em] text-chat-text">
          {item.votes}
        </span>
        <span className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-chat-muted">
          votes
        </span>
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-7 text-chat-text">{item.text}</p>
          {item.tag && (
            <span className="shrink-0 rounded-full border border-line-strong bg-chat-bg/60 px-2.5 py-0.5 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-chat-muted">
              {item.tag}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3 font-mono-ui text-[11px] text-chat-muted">
          <span>{item.author}</span>
          <span className="text-line-strong">·</span>
          <span>{item.date}</span>
        </div>
      </div>
    </div>
  );
}

export function CommunityFeedback({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <section className="px-4 py-14 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="size-5 text-chat-accent" />
            <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-chat-accent">
              {isArabic ? "صوت المجتمع" : "Community voice"}
            </p>
          </div>
          <h2 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[36px]">
            {isArabic ? "ساعدنا في تشكيل زكي" : "Help shape ZAKI"}
          </h2>
          <p className="mt-3 max-w-[52ch] text-sm leading-7 text-chat-muted">
            {isArabic
              ? "بسيطة، علنية، ومجهولة افتراضيًا. انضم إلى المجتمع الذي يشكل ما سيأتي بعد ذلك."
              : "Simple, public, and anonymous by default. Join the community shaping what comes next."}
          </p>
        </Reveal>

        <Reveal delay={60} className="mt-8">
          <div className="grid gap-3">
            {(isArabic ? MOCK_FEEDBACK_AR : MOCK_FEEDBACK_EN).map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>
          <p className="mt-6 text-center font-mono-ui text-[11px] uppercase tracking-[0.2em] text-chat-muted">
            {isArabic ? "لقطة من الطلبات التي يشكّل بها المجتمع الاتجاه" : "A snapshot of the requests shaping the direction"}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
