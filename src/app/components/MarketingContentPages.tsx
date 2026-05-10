import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Globe2,
  HelpCircle,
  Mail,
  Scale,
  Shield,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { WebsiteShell } from "./WebsitePage";

type WebsiteLocale = "en" | "ar";

type ComparisonSlug =
  | "vs-chatgpt"
  | "zaki-vs-spaces"
  | "best-arabic-ai-assistant"
  | "zaki-vs-openclaw";

type HowToSlug =
  | "write-arabic-emails-ai"
  | "translate-dialects-arabic-english"
  | "create-social-media-content-arabic"
  | "how-zaki-and-spaces-work"
  | "what-to-use-spaces-for"
  | "what-to-use-zaki-for";

type TablePage = {
  badge: string;
  title: string;
  intro: string;
  definition: string;
  quote: string;
  table: {
    headers: string[];
    rows: Array<{ feature: string; values: string[] }>;
  };
  sections: Array<{ title: string; body?: string; items?: string[] }>;
  links: Array<{ label: string; href: string }>;
};

type HowToPage = {
  badge: string;
  title: string;
  intro: string;
  steps: Array<{ title: string; text: string }>;
  examplePrompt: string;
  goodOutput: string;
  links: Array<{ label: string; href: string }>;
};

const comparisons: Record<ComparisonSlug, TablePage> = {
  "vs-chatgpt": {
    badge: "Comparison",
    title: "Spaces vs ChatGPT",
    intro:
      "ChatGPT is the general-purpose default. Spaces is the lighter, cleaner ZAKI entry point for focused work when you want a workspace, not another loose thread.",
    definition:
      "Use ChatGPT when you want the widest mainstream AI surface. Use Spaces when you want a free, structured place to draft, compare, translate, plan, and decide without creating an account. When memory matters, upgrade into ZAKI Complete.",
    quote:
      "The edge is not pretending Spaces beats every frontier model. The edge is making everyday AI work easier to start, easier to separate, and easier to continue.",
    table: {
      headers: ["Need", "Spaces", "ChatGPT"],
      rows: [
        {
          feature: "Starting fast",
          values: ["No registration for anonymous daily use", "Account-based mainstream chat"],
        },
        {
          feature: "Work separation",
          values: ["Spaces keep work grouped by job", "General thread history"],
        },
        {
          feature: "Memory",
          values: ["Anonymous use is memory-free; paid Complete adds memory", "Plan-dependent memory"],
        },
        {
          feature: "Best fit",
          values: ["Daily bilingual work, drafts, plans, and structured decisions", "Broad general AI coverage"],
        },
      ],
    },
    sections: [
      {
        title: "Choose Spaces when",
        items: [
          "You want to try ZAKI without friction.",
          "You are drafting, translating, researching, or planning a single job.",
          "You want a clean workspace before deciding whether memory is worth paying for.",
        ],
      },
      {
        title: "Choose ChatGPT when",
        items: [
          "You primarily want the broadest model ecosystem.",
          "You are already deep inside OpenAI’s consumer workflow.",
          "You do not need ZAKI’s product ladder: Spaces, Agent, Learn, and Complete.",
        ],
      },
    ],
    links: [
      { label: "Try Spaces", href: "/spaces" },
      { label: "See Complete", href: "/pricing?plan=complete" },
    ],
  },
  "zaki-vs-spaces": {
    badge: "Product model",
    title: "ZAKI Agent vs Spaces",
    intro:
      "Spaces is where a job starts. ZAKI Agent is what stays with you after the job becomes part of your life or work.",
    definition:
      "Spaces are structured work areas. ZAKI Agent is the paid personal agent for continuity, planning, follow-through, scheduled work, and durable context. Complete connects both, adding Learn and uncapped Spaces with memory.",
    quote:
      "Spaces gives the first answer room to breathe. ZAKI Agent gives the relationship memory and follow-through.",
    table: {
      headers: ["Use case", "ZAKI Agent", "Spaces"],
      rows: [
        {
          feature: "Quick trial",
          values: ["10 preview messages per week", "10 anonymous messages per day"],
        },
        {
          feature: "Continuity",
          values: ["Built for recurring context and follow-through", "Memory-free while anonymous"],
        },
        {
          feature: "Execution",
          values: ["Planning, review, scheduled checks, and tool-backed work", "Focused chat workspace"],
        },
        {
          feature: "Best upgrade",
          values: ["Agent plan or Complete", "Complete for uncapped Spaces with memory"],
        },
      ],
    },
    sections: [
      {
        title: "Start in Spaces when",
        items: [
          "The job is narrow: draft this, compare that, translate this, plan this.",
          "You do not need memory yet.",
          "You want to feel the product before registering.",
        ],
      },
      {
        title: "Move to Agent when",
        items: [
          "You keep returning to the same context.",
          "You want the system to remember preferences, decisions, and recurring work.",
          "You need follow-through, not just answers.",
        ],
      },
    ],
    links: [
      { label: "Open Agent", href: "/products/agent" },
      { label: "Open Spaces", href: "/products/spaces" },
    ],
  },
  "best-arabic-ai-assistant": {
    badge: "Guide",
    title: "Best Arabic AI assistant for real work",
    intro:
      "The best Arabic AI assistant depends on the job. ZAKI’s strength is not a slogan about Arabic. It is bilingual work, memory boundaries, and product structure that makes Arabic-English workflows less messy.",
    definition:
      "Use Spaces for fast Arabic-English drafting, translation, and structured work. Use ZAKI Agent when continuity matters. Use ZAKI Learn when the job is studying, explaining, practicing, or turning material into durable knowledge.",
    quote:
      "Arabic AI quality is not only language support. It is whether the product respects how bilingual people actually work.",
    table: {
      headers: ["Need", "Best ZAKI path", "Why"],
      rows: [
        {
          feature: "Arabic-English writing",
          values: ["Spaces", "Fast, focused, and free to try without memory"],
        },
        {
          feature: "Long-running personal context",
          values: ["ZAKI Agent", "Preferences, decisions, and recurring work need continuity"],
        },
        {
          feature: "Study and understanding",
          values: ["ZAKI Learn", "Deep Solve, research, quiz, notes, and guided practice belong together"],
        },
        {
          feature: "Everything",
          values: ["ZAKI Complete", "Agent, Learn, and uncapped Spaces with memory"],
        },
      ],
    },
    sections: [
      {
        title: "What makes the experience better",
        items: [
          "Mixed Arabic-English prompts do not need ceremony.",
          "Anonymous Spaces keeps the first try simple.",
          "Paid plans make the memory boundary explicit instead of vague.",
        ],
      },
      {
        title: "What we will not claim",
        body:
          "We are not claiming that every ZAKI answer beats every frontier assistant. The claim is product fit: cleaner routes, better continuity, and a real upgrade path from free workspace chat to paid memory and learning.",
      },
    ],
    links: [
      { label: "Try Spaces", href: "/spaces" },
      { label: "See Learn", href: "/products/learn" },
    ],
  },
  "zaki-vs-openclaw": {
    badge: "Technical comparison",
    title: "ZAKI vs tool-first agent runtimes",
    intro:
      "Some agent systems are built around maximal tool breadth. ZAKI is built around a commercial product ladder: free workspace chat, paid personal agent, paid learning system, and a Complete bundle.",
    definition:
      "Tool-first runtimes are compelling for builders and experimenters. ZAKI is shaped for users who want a calmer product: memory, study, execution, billing, account access, and support boundaries in one place.",
    quote:
      "The product question is not how many tools can be exposed. It is whether the system can become useful in daily life without becoming chaotic.",
    table: {
      headers: ["Area", "ZAKI", "Tool-first runtimes"],
      rows: [
        {
          feature: "Product surface",
          values: ["Spaces, Agent, Learn, Complete", "Usually a broader operator console"],
        },
        {
          feature: "User model",
          values: ["Paid SaaS users, previews, access codes, memory boundaries", "Often builder/operator-led"],
        },
        {
          feature: "Strength",
          values: ["Continuity, commercial routing, learning, and controlled memory", "Tool breadth and experimentation"],
        },
        {
          feature: "Best fit",
          values: ["People who want a personal AI product", "People who want to build or operate an agent stack"],
        },
      ],
    },
    sections: [
      {
        title: "Where ZAKI should win",
        items: [
          "A clearer first-use experience.",
          "Memory users can understand and pay for.",
          "Learning workflows that feel like a product, not a prompt trick.",
          "A commercial bundle that makes the upgrade path obvious.",
        ],
      },
      {
        title: "Where broad runtimes still matter",
        body:
          "Builder systems are valuable. ZAKI should learn from them without turning the consumer product into an exposed control panel.",
      },
    ],
    links: [
      { label: "See Agent", href: "/products/agent" },
      { label: "See Complete", href: "/products/complete" },
    ],
  },
};

const howTos: Record<HowToSlug, HowToPage> = {
  "write-arabic-emails-ai": {
    badge: "How to",
    title: "Write better Arabic emails with AI",
    intro:
      "Use Spaces when you need a clean draft. Use ZAKI Agent when the email depends on a relationship, recurring context, or a decision you have already discussed.",
    steps: [
      {
        title: "Give the real situation.",
        text: "Tell ZAKI who the email is for, what happened, what you need, and whether the tone should be formal, warm, firm, or diplomatic.",
      },
      {
        title: "Ask for two versions.",
        text: "Request a polished Modern Standard Arabic version and a simpler human version. Pick the one that sounds like you.",
      },
      {
        title: "Refine the intent.",
        text: "Ask ZAKI to make it shorter, less apologetic, more executive, or more culturally appropriate.",
      },
    ],
    examplePrompt:
      "Draft a concise Arabic email to a university administrator asking for an extension. Keep it respectful, clear, and not overly dramatic.",
    goodOutput:
      "A good draft should sound like a person with judgment: clear ask, enough context, no filler, and no artificial grandiosity.",
    links: [
      { label: "Open Spaces", href: "/spaces" },
      { label: "Try Agent", href: "/products/agent" },
    ],
  },
  "translate-dialects-arabic-english": {
    badge: "How to",
    title: "Translate Arabic dialects without losing intent",
    intro:
      "Translation is rarely word-for-word. Spaces is useful when you need the meaning, tone, and cultural signal to survive the move between Arabic and English.",
    steps: [
      {
        title: "Name the dialect or region.",
        text: "If you know it is Saudi, Egyptian, Levantine, Gulf, Moroccan, or mixed, say so. If not, ask ZAKI to infer cautiously.",
      },
      {
        title: "Ask for literal and natural versions.",
        text: "The literal version explains the words. The natural version explains what a person would actually say.",
      },
      {
        title: "Preserve social tone.",
        text: "Ask whether the phrase is friendly, formal, sarcastic, direct, soft, or emotionally loaded.",
      },
    ],
    examplePrompt:
      "Translate this Gulf Arabic message into natural English. Give me the literal meaning, the intended tone, and a version I can send in a business context.",
    goodOutput:
      "Good output separates meaning from wording, explains tone, and gives a sendable version without flattening the culture.",
    links: [
      { label: "Open Spaces", href: "/spaces" },
      { label: "Compare Arabic AI", href: "/best-arabic-ai-assistant" },
    ],
  },
  "create-social-media-content-arabic": {
    badge: "How to",
    title: "Create Arabic social content that does not sound machine-made",
    intro:
      "The mistake is asking for a post. The better move is giving ZAKI the audience, the tension, the proof, and the voice.",
    steps: [
      {
        title: "Start with the point.",
        text: "Say what the post should make people believe, feel, or do. Without that, the copy becomes decorative.",
      },
      {
        title: "Give voice constraints.",
        text: "Tell ZAKI if the style should be Saudi business Arabic, simple MSA, founder voice, educational, direct, or warm.",
      },
      {
        title: "Ask for a set, not one post.",
        text: "Request a short version, a punchier version, and a more thoughtful version. Pick the one with the most truth.",
      },
    ],
    examplePrompt:
      "Write three Arabic LinkedIn posts about launching a paid AI learning product. Make them human, specific, and not hype-driven.",
    goodOutput:
      "Good content has a real angle, one clear reader, a useful idea, and language that a person would actually publish.",
    links: [
      { label: "Open Spaces", href: "/spaces" },
      { label: "See Learn", href: "/products/learn" },
    ],
  },
  "how-zaki-and-spaces-work": {
    badge: "Guide",
    title: "How ZAKI and Spaces work together",
    intro:
      "Spaces is the free workspace. Agent is the paid continuity layer. Learn is the paid study system. Complete ties all of it together.",
    steps: [
      {
        title: "Start with Spaces.",
        text: "Use the free daily quota for a focused task. No account is required, and no durable memory is used while anonymous.",
      },
      {
        title: "Upgrade when memory matters.",
        text: "If the work repeats, if preferences matter, or if context should carry forward, move into Agent or Complete.",
      },
      {
        title: "Use Learn for study.",
        text: "When the work is explaining, practicing, researching, quizzing, or building knowledge, Learn is the right product.",
      },
    ],
    examplePrompt:
      "I am starting a new research project. Help me separate what belongs in Spaces, what Agent should remember, and what Learn should turn into study material.",
    goodOutput:
      "Good output should route the job instead of mixing every need into one chat.",
    links: [
      { label: "View pricing", href: "/pricing" },
      { label: "See Complete", href: "/products/complete" },
    ],
  },
  "what-to-use-spaces-for": {
    badge: "Guide",
    title: "What to use Spaces for",
    intro:
      "Use Spaces for work that benefits from a clean container: one draft, one decision, one project, one translation, one plan.",
    steps: [
      {
        title: "Drafting and rewriting",
        text: "Emails, posts, briefs, proposals, summaries, and messages.",
      },
      {
        title: "Thinking through options",
        text: "Compare choices, list tradeoffs, stress-test assumptions, and turn messy thoughts into structure.",
      },
      {
        title: "Bilingual work",
        text: "Translate, localize, rewrite, and explain across Arabic and English without switching tools.",
      },
    ],
    examplePrompt:
      "Create a Space for this hiring decision. Help me compare candidates, identify risks, and write a final recommendation.",
    goodOutput:
      "Good Spaces work is organized, scoped, and easy to return to.",
    links: [
      { label: "Open Spaces", href: "/spaces" },
      { label: "Spaces product page", href: "/products/spaces" },
    ],
  },
  "what-to-use-zaki-for": {
    badge: "Guide",
    title: "What to use ZAKI Agent for",
    intro:
      "Use Agent when the work has a past and a future. If you will come back to it, ZAKI should carry the thread.",
    steps: [
      {
        title: "Recurring decisions",
        text: "Work priorities, writing preferences, project context, and tradeoffs you revisit.",
      },
      {
        title: "Follow-through",
        text: "Scheduled checks, reminders, reviews, and multi-step execution where continuity is the value.",
      },
      {
        title: "Personal operating context",
        text: "The things a one-off chat should not have to be told every time.",
      },
    ],
    examplePrompt:
      "Remember how I make product decisions, then help me review this pricing change against that pattern.",
    goodOutput:
      "Good Agent work should feel like continuity: less re-explaining, better judgment, and clearer next steps.",
    links: [
      { label: "See Agent", href: "/products/agent" },
      { label: "Choose a plan", href: "/pricing" },
    ],
  },
};

const faqs = [
  {
    q: "Is ZAKI still beta?",
    a: "No. ZAKI Agent is now a full paid product. Spaces remains the free entry point, and Learn is the dedicated paid learning product.",
  },
  {
    q: "Can I use Spaces without registering?",
    a: "Yes. Anonymous Spaces has a daily message quota and no durable memory. That boundary is intentional.",
  },
  {
    q: "What is the difference between Learn and Agent?",
    a: "Agent is for continuity, planning, follow-through, and recurring work. Learn is for study workflows: explanations, deep problem solving, quizzes, research, notes, and knowledge work.",
  },
  {
    q: "What does Complete include?",
    a: "Complete includes Agent, Learn, and uncapped Spaces with memory. It is the cleanest plan for people who want the full product.",
  },
  {
    q: "What is the free preview?",
    a: "Agent and Learn each include 10 preview messages per week. Spaces gives anonymous users 10 messages per day.",
  },
  {
    q: "What does the LoCoMo result mean?",
    a: "ZAKI scored 91.7% on its first LoCoMo benchmark run. We use it as a memory-system proof point, not as a claim that one benchmark tells the whole story.",
  },
];

const faqsAr = [
  {
    q: "هل ZAKI ما زال بيتا؟",
    a: "لا. ZAKI Agent أصبح منتجًا مدفوعًا كاملًا. Spaces تبقى المدخل المجاني، و Learn هو منتج التعلم المدفوع.",
  },
  {
    q: "هل يمكن استخدام Spaces بدون تسجيل؟",
    a: "نعم. Spaces للمستخدم المجهول لديها حصة يومية ولا تستخدم ذاكرة دائمة. هذا الحد مقصود وواضح.",
  },
  {
    q: "ما الفرق بين Learn و Agent؟",
    a: "Agent للاستمرارية والتخطيط والمتابعة والعمل المتكرر. Learn للدراسة: الشرح، حل المسائل، البحث، الاختبارات، الدفاتر، والعمل المعرفي.",
  },
  {
    q: "ماذا تشمل Complete؟",
    a: "Complete تشمل Agent و Learn و Spaces غير محدودة مع الذاكرة. هي أبسط خطة لمن يريد المنتج كاملًا.",
  },
  {
    q: "هل يمكن نقل الذاكرة من أدوات أخرى؟",
    a: "نعم. يوجد مسار لجلب الذاكرة من ChatGPT أو Claude أو Gemini حتى لا تبدأ من الصفر.",
  },
  {
    q: "ماذا تعني نتيجة LoCoMo؟",
    a: "حقق ZAKI نتيجة 91.7% في أول تشغيل لمعيار LoCoMo. نستخدمها كإشارة جودة لنظام الذاكرة، لا كادعاء أن معيارًا واحدًا يشرح كل شيء.",
  },
];

function PageHero({ badge, title, intro }: { badge: string; title: string; intro: string }) {
  return (
    <section className="border-b border-[#eadfce] bg-[linear-gradient(180deg,#fffaf4_0%,#fff3e8_100%)] px-4 py-12 dark:border-[#2a2018] dark:bg-[linear-gradient(180deg,#0c0a09_0%,#14100d_100%)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
          {badge}
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] text-zaki-primary sm:text-5xl lg:text-6xl dark:text-[#efe6d9]">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-zaki-secondary sm:text-lg dark:text-[#c9b8a4]">
          {intro}
        </p>
      </div>
    </section>
  );
}

function ActionLinks({ links }: { links: Array<{ label: string; href: string }> }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className="inline-flex items-center gap-2 rounded-zaki-md border border-[#eadfce] bg-white px-4 py-2 text-sm font-semibold text-zaki-primary transition hover:-translate-y-0.5 hover:bg-[#fff8f0] dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#efe6d9]"
        >
          {link.label}
          <ArrowUpRight className="size-4" />
        </Link>
      ))}
    </div>
  );
}

export function WebsiteComparisonPage({ slug }: { slug: ComparisonSlug }) {
  const content = comparisons[slug];
  if (!content) return <Navigate to="/" replace />;

  return (
    <WebsiteShell>
      <PageHero badge={content.badge} title={content.title} intro={content.intro} />
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6">
          <div className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
            <p className="text-base leading-8 text-zaki-primary dark:text-[#efe6d9]">{content.definition}</p>
          </div>
          <div className="overflow-hidden rounded-zaki-2xl border border-[#eadfce] bg-white dark:border-[#2a2018] dark:bg-[#14100d]">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    {content.table.headers.map((header) => (
                      <th key={header} className="border-b border-[#eadfce] bg-[#fff8f0] px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#a89684]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.table.rows.map((row) => (
                    <tr key={row.feature}>
                      <td className="border-b border-[#eadfce] px-5 py-4 text-sm font-semibold text-zaki-primary dark:border-[#2a2018] dark:text-[#efe6d9]">
                        {row.feature}
                      </td>
                      {row.values.map((value) => (
                        <td key={`${row.feature}-${value}`} className="border-b border-[#eadfce] px-5 py-4 text-sm leading-6 text-zaki-secondary dark:border-[#2a2018] dark:text-[#c9b8a4]">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-zaki-2xl border-l-4 border-l-[#e10600] bg-[#fff3e8] p-6 text-base leading-8 text-zaki-primary dark:bg-[#1d1712] dark:text-[#efe6d9]">
            {content.quote}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {content.sections.map((section) => (
              <article key={section.title} className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
                <h2 className="text-2xl font-semibold text-zaki-primary dark:text-[#efe6d9]">{section.title}</h2>
                {section.body ? (
                  <p className="mt-3 text-sm leading-7 text-zaki-secondary dark:text-[#c9b8a4]">{section.body}</p>
                ) : null}
                {section.items ? (
                  <ul className="mt-5 grid gap-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
                        <Check className="mt-1 size-4 shrink-0 text-zaki-brand" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
          <ActionLinks links={content.links} />
        </div>
      </section>
    </WebsiteShell>
  );
}

export function WebsiteComparisonRoute() {
  const { slug } = useParams();
  return <WebsiteComparisonPage slug={String(slug || "") as ComparisonSlug} />;
}

export function WebsiteHowToPage({ slug }: { slug: HowToSlug }) {
  const content = howTos[slug];
  if (!content) return <Navigate to="/" replace />;
  return (
    <WebsiteShell>
      <PageHero badge={content.badge} title={content.title} intro={content.intro} />
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
            <h2 className="text-2xl font-semibold text-zaki-primary dark:text-[#efe6d9]">Step by step</h2>
            <ol className="mt-6 grid gap-4">
              {content.steps.map((step, index) => (
                <li key={step.title} className="rounded-zaki-lg border border-[#eadfce] bg-[#fffaf4] p-4 dark:border-[#2a2018] dark:bg-[#0c0a09]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">Step {index + 1}</p>
                  <h3 className="mt-2 text-base font-semibold text-zaki-primary dark:text-[#efe6d9]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <aside className="grid content-start gap-4">
            <div className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">Example prompt</p>
              <p className="mt-3 text-sm leading-7 text-zaki-primary dark:text-[#efe6d9]">{content.examplePrompt}</p>
            </div>
            <div className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">Good output</p>
              <p className="mt-3 text-sm leading-7 text-zaki-secondary dark:text-[#c9b8a4]">{content.goodOutput}</p>
            </div>
            <ActionLinks links={content.links} />
          </aside>
        </div>
      </section>
    </WebsiteShell>
  );
}

export function WebsiteHowToRoute() {
  const { slug } = useParams();
  return <WebsiteHowToPage slug={String(slug || "") as HowToSlug} />;
}

export function WebsiteStoryPage() {
  const beats = [
    ["The gap", "Most AI products are strong in the moment and weak over time. Users keep rebuilding context, repeating preferences, and losing the thread between jobs."],
    ["The product", "ZAKI separates the work: Spaces for the first useful task, Agent for memory and follow-through, Learn for turning material into practice."],
    ["The proof", "The first LoCoMo benchmark run scored 91.7%, giving us a concrete signal that ZAKI’s memory system is worth building around."],
  ] satisfies Array<[string, string]>;
  return <WebsiteStoryContent locale="en" beats={beats} />;
}

export function WebsiteStoryPageAr() {
  const beats = [
    ["الفجوة", "معظم منتجات AI قوية في اللحظة وضعيفة مع الوقت. المستخدم يعيد بناء السياق ويكرر التفضيلات ويفقد الخيط بين الأعمال."],
    ["المنتج", "ZAKI يفصل العمل: Spaces لأول مهمة مفيدة، Agent للذاكرة والمتابعة، و Learn لتحويل المادة إلى تدريب."],
    ["الإثبات", "أول تشغيل على معيار LoCoMo حقق 91.7%، وهي إشارة ملموسة أن نظام ذاكرة ZAKI يستحق البناء عليه."],
  ] satisfies Array<[string, string]>;
  return <WebsiteStoryContent locale="ar" beats={beats} />;
}

function WebsiteStoryContent({ locale, beats }: { locale: WebsiteLocale; beats: Array<[string, string]> }) {
  const isArabic = locale === "ar";
  return (
    <WebsiteShell locale={locale}>
      <PageHero
        badge={isArabic ? "لماذا ZAKI" : "Why ZAKI"}
        title={isArabic ? "قيمة ZAKI تظهر بعد الإجابة الأولى." : "ZAKI becomes valuable after the first answer."}
        intro={isArabic
          ? "الفكرة الأصلية بسيطة: المساعد المفيد لا يكتفي بإجابة جيدة ثم ينسى. يجب أن يحفظ السياق عندما تسمح له، يساعدك على المتابعة، ويفصل بين العمل السريع والتعلم والعمل المتكرر."
          : "The original idea is simple: a useful assistant should not give one good answer and forget everything around it. It should keep context when you allow it, help you continue, and separate quick work from learning and recurring execution."}
      />
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {beats.map(([title, body]) => (
            <article key={title} className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
              <Sparkles className="size-5 text-zaki-brand" />
              <h2 className="mt-4 text-xl font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y border-[#eadfce] bg-white px-4 py-12 dark:border-[#2a2018] dark:bg-[#14100d] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
              {isArabic ? "لمن هذا؟" : "Who it is for"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
              {isArabic ? "هذا ليس مساعدًا واحدًا لكل شيء. إنه نظام لثلاث لحظات مختلفة." : "This is not one assistant for everything. It is a system for three different moments."}
            </h2>
          </div>
          <div className="grid gap-3">
            {(isArabic
              ? [
                  ["للمستخدم العادي", "ابدأ في Spaces بدون حساب عندما تحتاج مسودة أو ترجمة أو قرارًا سريعًا."],
                  ["للمستخدم المتقدم", "Agent يحفظ السياق، يستورد الذاكرة، ويتابع العمل المتكرر بدل أن تبدأ كل مرة من الصفر."],
                  ["للمتعلم", "Learn يحول الملفات والأسئلة والبحث والدفاتر إلى شرح وتدريب ومراجعة."],
                  ["للمهاجر من أدوات أخرى", "استيراد الذاكرة من ChatGPT أو Claude أو Gemini يقلل ألم الانتقال."],
                ]
              : [
                  ["For normal users", "Start in Spaces without an account when you need a draft, translation, decision, or quick plan."],
                  ["For power users", "Agent keeps context, imports memory, and follows through on recurring work instead of making you start over."],
                  ["For students", "Learn turns files, questions, research, and notebooks into explanation, practice, and review."],
                  ["For people migrating", "Memory import from ChatGPT, Claude, or Gemini lowers the cost of switching."],
                ]).map(([title, body]) => (
              <div key={title} className="rounded-zaki-lg border border-[#eadfce] bg-[#fffaf4] p-4 dark:border-[#2a2018] dark:bg-[#0c0a09]">
                <h3 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </WebsiteShell>
  );
}

export function WebsiteFaqPage({ locale = "en" }: { locale?: WebsiteLocale }) {
  const isArabic = locale === "ar";
  const items = isArabic ? faqsAr : faqs;
  return (
    <WebsiteShell locale={locale}>
      <PageHero
        badge={isArabic ? "الأسئلة" : "FAQ"}
        title={isArabic ? "أسئلة المنتج، بإجابات مباشرة." : "Product questions, answered directly."}
        intro={isArabic
          ? "النموذج التجاري تغير. هذه هي الإجابات التي يحتاجها المستخدم قبل أن يبدأ مجانًا أو يجرب Agent أو Learn أو يشتري Complete."
          : "The commercial model changed. These are the answers users need before they decide whether to start free, preview Agent or Learn, or buy Complete."}
      />
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-4xl gap-3">
          {items.map((item) => (
            <details key={item.q} className="group rounded-zaki-2xl border border-[#eadfce] bg-white p-5 dark:border-[#2a2018] dark:bg-[#14100d]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-zaki-primary dark:text-[#efe6d9]">
                {item.q}
                <HelpCircle className="size-5 shrink-0 text-zaki-brand" />
              </summary>
              <p className="mt-3 text-sm leading-7 text-zaki-secondary dark:text-[#c9b8a4]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </WebsiteShell>
  );
}

export function WebsiteContactPage({ locale = "en" }: { locale?: WebsiteLocale }) {
  const isArabic = locale === "ar";
  return (
    <WebsiteShell locale={locale}>
      <PageHero
        badge={isArabic ? "تواصل" : "Contact"}
        title={isArabic ? "تواصل مع فريق ZAKI." : "Reach the ZAKI team."}
        intro={isArabic
          ? "استخدم هذه الصفحة للدعم، الفوترة، أكواد الوصول، الشراكات، أو أي سؤال يحتاج ردًا بشريًا."
          : "Use this page for product support, billing questions, access-code issues, partnerships, and anything that needs a human answer."}
      />
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {(isArabic ? [
            [Mail, "الدعم", "الحساب، الفوترة، أكواد الوصول، تسجيل الدخول، أو مشاكل المنتج.", "support@chatzaki.com"],
            [Shield, "الأمان والخصوصية", "الإبلاغ عن مشاكل حساسة أو مخاطر وصول للحساب.", "support@chatzaki.com"],
            [Sparkles, "الشراكات", "تعلم، توزيع، تعليم، أو شراكات منتج.", "support@chatzaki.com"],
            [FileText, "الصحافة والتوثيق", "طلبات تفاصيل المنتج أو الصور أو خلفية الشركة.", "support@chatzaki.com"],
          ] : [
            [Mail, "Support", "Account, billing, access-code, login, or product issues.", "support@chatzaki.com"],
            [Shield, "Security and privacy", "Report sensitive issues, data concerns, or account access risks.", "support@chatzaki.com"],
            [Sparkles, "Partnerships", "Learning, distribution, education, or product partnership conversations.", "support@chatzaki.com"],
            [FileText, "Press and documentation", "Requests for product details, screenshots, or company background.", "support@chatzaki.com"],
          ]).map(([Icon, title, body, email]) => {
            const CardIcon = Icon as typeof Mail;
            return (
              <article key={String(title)} className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
                <CardIcon className="size-5 text-zaki-brand" />
                <h2 className="mt-4 text-xl font-semibold text-zaki-primary dark:text-[#efe6d9]">{title as string}</h2>
                <p className="mt-3 text-sm leading-7 text-zaki-secondary dark:text-[#c9b8a4]">{body as string}</p>
                <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-zaki-brand" href={`mailto:${email}`}>
                  {email as string}
                  <ArrowRight className="size-4" />
                </a>
              </article>
            );
          })}
        </div>
      </section>
    </WebsiteShell>
  );
}

export function WebsiteAutismGuidancePage({ locale = "en" }: { locale?: WebsiteLocale }) {
  const isArabic = locale === "ar";
  return (
    <WebsiteShell locale={locale}>
      <PageHero
        badge={isArabic ? "نموذج إثبات" : "Proof of concept"}
        title={isArabic ? "إرشاد منظم للتوحد، بحدود واضحة." : "Structured autism guidance, with hard boundaries."}
        intro={isArabic
          ? "هذه الصفحة تحفظ حالة الاستخدام الأصلية: مساعد هادئ ثنائي اللغة يساعد في تنظيم الأسئلة والملاحظات قبل الحديث مع المختصين. هو تعليمي وليس تشخيصيًا."
          : "This page preserves the original proof-of-concept use case: a calm bilingual assistant that helps organize questions and observations before expert conversations. It is educational, not diagnostic."}
      />
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {(isArabic ? [
            [Stethoscope, "ما الذي يساعد فيه", "تنظيم الملاحظات، شرح المصطلحات، تجهيز الأسئلة، ودعم الفهم العربي-الإنجليزي قبل التقييم المختص."],
            [Scale, "ما الذي لا يفعله", "لا يشخص ولا يعالج ولا يستبدل المختصين ولا يتعامل مع الطوارئ."],
            [Globe2, "لماذا اللغة مهمة", "العائلات والمختصون ينتقلون بين العربية والإنجليزية. يجب حفظ المعنى بدون قسوة أو برود."],
            [Shield, "يحتاج مراجعة مختصين", "يبقى هذا سطح مراجعة سريريًا وأخلاقيًا ولغويًا قبل أي استخدام أوسع."],
          ] : [
            [Stethoscope, "What it can help with", "Organize observations, explain terms, prepare questions, and support Arabic-English understanding before a qualified assessment."],
            [Scale, "What it cannot do", "It does not diagnose, treat, replace clinicians, or handle emergencies. Those limits should stay visible wherever this prototype appears."],
            [Globe2, "Why bilingual matters", "Families and professionals often move between Arabic and English. The assistant should preserve meaning without turning sensitive language clinical or cold."],
            [Shield, "Expert review needed", "This remains a review surface for clinical, ethical, language, and safety validation before any broader public use."],
          ]).map(([Icon, title, body]) => {
            const CardIcon = Icon as typeof Shield;
            return (
              <article key={String(title)} className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
                <CardIcon className="size-5 text-zaki-brand" />
                <h2 className="mt-4 text-xl font-semibold text-zaki-primary dark:text-[#efe6d9]">{title as string}</h2>
                <p className="mt-3 text-sm leading-7 text-zaki-secondary dark:text-[#c9b8a4]">{body as string}</p>
              </article>
            );
          })}
        </div>
      </section>
    </WebsiteShell>
  );
}
