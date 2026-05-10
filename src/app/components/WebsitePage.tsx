import { Link, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  GraduationCap,
  LayoutGrid,
  Lock,
  MessageSquare,
  Shield,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import { CenterLogo } from "./icons";
import { cn } from "@/lib/utils";

type ProductSlug = "spaces" | "agent" | "learn" | "complete";
type WebsiteLocale = "en" | "ar";

type Product = {
  slug: ProductSlug;
  name: string;
  eyebrow: string;
  price: string;
  headline: string;
  summary: string;
  icon: typeof LayoutGrid;
  accent: string;
  cta: string;
  href: string;
  points: string[];
  sections: Array<{ title: string; body: string }>;
};

const PRODUCTS_EN: Product[] = [
  {
    slug: "spaces",
    name: "Spaces",
    eyebrow: "Free entry point",
    price: "$0",
    headline: "Start useful AI work before you sign up.",
    summary:
      "Open a focused workspace for a draft, translation, plan, decision, or research thread. It is free, fast, and intentionally memory-free until you decide the work should continue.",
    icon: LayoutGrid,
    accent: "bg-[#e9f5f1] text-[#1f6c54] border-[#b7ded0]",
    cta: "Open Spaces",
    href: "/spaces",
    points: [
      "Anonymous daily quota: 10 messages per day.",
      "No durable memory while anonymous.",
      "Complete unlocks uncapped Spaces with account memory.",
    ],
    sections: [
      {
        title: "Organized work, not loose chat",
        body:
          "Give each job its own container so a hiring decision, Arabic email, research question, or launch plan does not disappear inside one endless chat history.",
      },
      {
        title: "Arabic, English, or both",
        body:
          "Spaces are built for natural mixed-language work, including Arabic and English prompts, drafts, explanations, and translations.",
      },
      {
        title: "Memory stays an upgrade boundary",
        body:
          "Anonymous Spaces is deliberately simple: useful daily work, no durable memory. Complete turns Spaces into an uncapped memory-backed workspace.",
      },
    ],
  },
  {
    slug: "agent",
    name: "ZAKI Agent",
    eyebrow: "Paid personal agent",
    price: "$29/mo",
    headline: "Stop briefing your AI from zero every time.",
    summary:
      "ZAKI Agent remembers preferences, decisions, project context, and recurring work. Import memory from other assistants, then use ZAKI for planning, review, follow-through, and execution that carries forward.",
    icon: Bot,
    accent: "bg-[#eef0fb] text-[#384987] border-[#c8d0f2]",
    cta: "Choose Agent",
    href: "/pricing?plan=agent&autostart=1&source=website_product_agent",
    points: [
      "10 free preview messages each week.",
      "Paid plan unlocks the Agent product.",
      "Best for workflows, decisions, and ongoing execution.",
    ],
    sections: [
      {
        title: "Bring your context with you",
        body:
          "Memory import from ChatGPT, Claude, or Gemini lowers the cost of switching. Your useful context can move into ZAKI instead of starting as an empty account.",
      },
      {
        title: "Memory you can use, not just collect",
        body:
          "Preferences, corrections, decisions, and working context carry forward so recurring work gets better instead of repeating the same setup.",
      },
      {
        title: "Follow-through, not only answers",
        body:
          "Use Agent for planning, reviews, scheduled follow-ups, tool-backed work, and multi-step execution where the next step matters as much as the first answer.",
      },
    ],
  },
  {
    slug: "learn",
    name: "ZAKI Learn",
    eyebrow: "Paid learning system",
    price: "$19/mo",
    headline: "Turn material into understanding, practice, and recall.",
    summary:
      "ZAKI Learn turns source material into explanations, Deep Solve work, research paths, quizzes, notebooks, co-writing, knowledge files, and visual explanations so learning becomes a system.",
    icon: GraduationCap,
    accent: "bg-[#fff4d8] text-[#765716] border-[#efd27d]",
    cta: "Choose Learn",
    href: "/pricing?plan=learn&autostart=1&source=website_product_learn",
    points: [
      "10 free preview messages each week.",
      "Paid plan unlocks the Learn product.",
      "Best for self-learners, operators, and knowledge-heavy work.",
    ],
    sections: [
      {
        title: "From source material to study flow",
        body:
          "Bring knowledge into a learning workspace, then turn it into explanations, notebooks, practice questions, research paths, and guided study tasks.",
      },
      {
        title: "Practice is built in",
        body:
          "Generate quizzes, keep a question bank, revisit weak spots, and move from explanation to repetition without leaving the learning surface.",
      },
      {
        title: "Research, writing, and visuals together",
        body:
          "Deep Research, Co-Writer, notebooks, knowledge files, books, and visual explanations live together instead of becoming separate prompt tricks.",
      },
    ],
  },
  {
    slug: "complete",
    name: "ZAKI Complete",
    eyebrow: "Best value bundle",
    price: "$39/mo",
    headline: "The full ZAKI loop in one plan.",
    summary:
      "Complete gives you Agent for continuity, Learn for study, and uncapped Spaces with memory. It is the simplest plan when ZAKI becomes part of daily work.",
    icon: Sparkles,
    accent: "bg-[#fdebe6] text-[#9b3f2c] border-[#edb4a6]",
    cta: "Choose Complete",
    href: "/pricing?plan=complete&autostart=1&source=website_product_complete",
    points: [
      "Includes ZAKI Agent.",
      "Includes ZAKI Learn.",
      "Includes uncapped Spaces with memory.",
    ],
    sections: [
      {
        title: "One subscription for the full loop",
        body:
          "Use Spaces for quick organized work, Learn for deep study, and Agent for ongoing execution without having to decide which surface deserves access later.",
      },
      {
        title: "Uncapped Spaces with memory",
        body:
          "Complete turns Spaces from an anonymous daily-cap entry point into the persistent workspace layer for your account.",
      },
      {
        title: "Whole-app access",
        body:
          "Active legacy paid users and V1 access-code users receive Complete-style access, so the commercial model stays simple during launch.",
      },
    ],
  },
];

const PRODUCTS_AR: Product[] = [
  {
    slug: "spaces",
    name: "Spaces",
    eyebrow: "المدخل المجاني",
    price: "$0",
    headline: "ابدأ عملًا مفيدًا بالذكاء الاصطناعي قبل التسجيل.",
    summary:
      "افتح مساحة مركزة لمسودة أو ترجمة أو خطة أو قرار أو بحث. Spaces مجانية وسريعة وبلا ذاكرة دائمة حتى تقرر أن العمل يستحق الاستمرار.",
    icon: LayoutGrid,
    accent: "bg-[#e9f5f1] text-[#1f6c54] border-[#b7ded0]",
    cta: "افتح Spaces",
    href: "/spaces",
    points: [
      "10 رسائل يوميًا للمستخدم المجهول.",
      "لا توجد ذاكرة دائمة بدون حساب.",
      "Complete يفتح Spaces غير محدودة مع ذاكرة الحساب.",
    ],
    sections: [
      {
        title: "عمل منظم بدل محادثة مبعثرة",
        body:
          "كل مهمة تحصل على مكانها: قرار توظيف، إيميل عربي، سؤال بحث، أو خطة إطلاق، بدل أن تضيع داخل سجل محادثة طويل.",
      },
      {
        title: "عربي، إنجليزي، أو الاثنين معًا",
        body:
          "Spaces مصممة للعمل الطبيعي بين العربية والإنجليزية: صياغة، شرح، ترجمة، وتحرير بدون تبديل أدوات.",
      },
      {
        title: "الذاكرة حد واضح للترقية",
        body:
          "الاستخدام المجهول مفيد ومحدود يوميًا وبلا ذاكرة دائمة. Complete يحول Spaces إلى مساحة غير محدودة مع ذاكرة الحساب.",
      },
    ],
  },
  {
    slug: "agent",
    name: "ZAKI Agent",
    eyebrow: "وكيل شخصي مدفوع",
    price: "$29/mo",
    headline: "توقف عن شرح كل شيء للمساعد من الصفر.",
    summary:
      "ZAKI Agent يتذكر التفضيلات والقرارات وسياق المشاريع والعمل المتكرر. استورد ذاكرتك من مساعدات أخرى، ثم استخدم ZAKI للتخطيط والمراجعة والمتابعة والتنفيذ.",
    icon: Bot,
    accent: "bg-[#eef0fb] text-[#384987] border-[#c8d0f2]",
    cta: "اختر Agent",
    href: "/pricing?plan=agent&autostart=1&source=website_product_agent_ar",
    points: [
      "10 رسائل تجربة كل أسبوع.",
      "الخطة المدفوعة تفتح منتج Agent.",
      "أفضل للأعمال المتكررة والقرارات والتنفيذ.",
    ],
    sections: [
      {
        title: "اجلب سياقك معك",
        body:
          "استيراد الذاكرة من ChatGPT أو Claude أو Gemini يقلل ألم الانتقال. سياقك المفيد ينتقل إلى ZAKI بدل أن تبدأ بحساب فارغ.",
      },
      {
        title: "ذاكرة تُستخدم لا تُخزن فقط",
        body:
          "التفضيلات والتصحيحات والقرارات وسياق العمل تنتقل بين الجلسات حتى يصبح العمل المتكرر أفضل بدل تكرار نفس التمهيد.",
      },
      {
        title: "متابعة وليس إجابات فقط",
        body:
          "استخدم Agent للتخطيط والمراجعة والمتابعات المجدولة والعمل متعدد الخطوات عندما تكون الخطوة التالية مهمة مثل الإجابة الأولى.",
      },
    ],
  },
  {
    slug: "learn",
    name: "ZAKI Learn",
    eyebrow: "نظام تعلم مدفوع",
    price: "$19/mo",
    headline: "حوّل المادة إلى فهم وتدريب واسترجاع.",
    summary:
      "ZAKI Learn يحول المادة إلى شرح، Deep Solve، مسارات بحث، اختبارات، دفاتر، كتابة، ملفات معرفة، وشرح مرئي حتى يصبح التعلم نظامًا متكررًا.",
    icon: GraduationCap,
    accent: "bg-[#fff4d8] text-[#765716] border-[#efd27d]",
    cta: "اختر Learn",
    href: "/pricing?plan=learn&autostart=1&source=website_product_learn_ar",
    points: [
      "10 رسائل تجربة كل أسبوع.",
      "الخطة المدفوعة تفتح منتج Learn.",
      "أفضل للمتعلمين والعمل المعرفي المكثف.",
    ],
    sections: [
      {
        title: "من المادة إلى خطة دراسة",
        body:
          "أدخل ملفاتك ومعرفتك ثم حوّلها إلى شرح، دفاتر، أسئلة تدريب، بحث، ومهام دراسة موجهة.",
      },
      {
        title: "التدريب جزء من المنتج",
        body:
          "أنشئ اختبارات، احفظ بنك أسئلة، راجع نقاط الضعف، وانتقل من الشرح إلى التكرار بدون مغادرة مساحة التعلم.",
      },
      {
        title: "بحث وكتابة وشرح مرئي معًا",
        body:
          "Deep Research و Co-Writer والدفاتر وملفات المعرفة والكتب والشرح المرئي تعمل معًا بدل أن تكون حيلًا منفصلة في محادثة.",
      },
    ],
  },
  {
    slug: "complete",
    name: "ZAKI Complete",
    eyebrow: "أفضل قيمة",
    price: "$39/mo",
    headline: "حلقة ZAKI الكاملة في خطة واحدة.",
    summary:
      "Complete تمنحك Agent للاستمرارية، و Learn للدراسة، و Spaces غير محدودة مع ذاكرة. هي الخطة الأبسط عندما يصبح ZAKI جزءًا من عملك اليومي.",
    icon: Sparkles,
    accent: "bg-[#fdebe6] text-[#9b3f2c] border-[#edb4a6]",
    cta: "اختر Complete",
    href: "/pricing?plan=complete&autostart=1&source=website_product_complete_ar",
    points: [
      "يشمل ZAKI Agent.",
      "يشمل ZAKI Learn.",
      "يشمل Spaces غير محدودة مع ذاكرة.",
    ],
    sections: [
      {
        title: "اشتراك واحد للحلقة الكاملة",
        body:
          "استخدم Spaces للعمل السريع، Learn للدراسة العميقة، وAgent للاستمرارية والتنفيذ.",
      },
      {
        title: "Spaces غير محدودة مع ذاكرة",
        body:
          "Complete يحول Spaces من مدخل مجاني محدود إلى طبقة عمل مستمرة داخل حسابك.",
      },
      {
        title: "وصول كامل للتطبيق",
        body:
          "المستخدمون المدفوعون الحاليون وأكواد الوصول V1 يحصلون على وصول كامل مبسط أثناء الإطلاق.",
      },
    ],
  },
];

function getProducts(locale: WebsiteLocale = "en") {
  return locale === "ar" ? PRODUCTS_AR : PRODUCTS_EN;
}

function localizeProductPath(slug: ProductSlug, locale: WebsiteLocale = "en") {
  return locale === "ar" ? `/ar/products/${slug}` : `/products/${slug}`;
}

function localizeMarketingPath(path: string, locale: WebsiteLocale = "en") {
  if (locale !== "ar") return path;
  if (path === "/") return "/ar";
  if (path.startsWith("/products/")) return `/ar${path}`;
  if (["/story", "/faq", "/contact", "/autism-guidance"].includes(path)) return `/ar${path}`;
  return path;
}

const DIFFERENTIATORS = [
  {
    icon: Brain,
    title: "Continuity you can feel",
    body:
      "ZAKI is built around what should survive between sessions: preferences, decisions, working context, and the next step.",
  },
  {
    icon: Shield,
    title: "Memory with clear boundaries",
    body:
      "Anonymous Spaces stays memory-free. Paid memory can be imported, reviewed, searched, and managed instead of becoming invisible background behavior.",
  },
  {
    icon: Timer,
    title: "Follow-through after the answer",
    body:
      "Agent adds planning, scheduled checks, tool approvals, and multi-step execution for work that needs to keep moving.",
  },
  {
    icon: Lock,
    title: "Learning is its own surface",
    body:
      "Learn is not a tutor prompt. It combines solving, research, quizzes, notebooks, writing, knowledge files, and visual explanation.",
  },
];

const linkFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf4] dark:focus-visible:ring-offset-[#0c0a09]";

function DirectionalArrow({
  locale = "en",
  className,
}: {
  locale?: WebsiteLocale;
  className?: string;
}) {
  return (
    <ArrowRight
      className={cn(className, locale === "ar" && "rotate-180")}
      aria-hidden="true"
    />
  );
}

function WebsiteNav({ locale = "en" }: { locale?: WebsiteLocale }) {
  const navLinks = [
    { label: locale === "ar" ? "المنتجات" : "Products", to: locale === "ar" ? "/ar" : "/" },
    { label: locale === "ar" ? "الأسعار" : "Pricing", to: "/pricing" },
    { label: locale === "ar" ? "القصة" : "Story", to: localizeMarketingPath("/story", locale) },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#eadfce] bg-[#fffaf4]/92 backdrop-blur-xl dark:border-[#2a2018] dark:bg-[#0c0a09]/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to={locale === "ar" ? "/ar" : "/"} className={cn("flex items-center gap-2 rounded-zaki-sm text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]", linkFocusClass)}>
          <CenterLogo className="size-7 text-zaki-brand" />
          <span>ZAKI</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-zaki-secondary md:flex dark:text-[#c9b8a4]">
          {navLinks.map((link) => (
            <Link key={link.to} className={cn("rounded-zaki-sm hover:text-zaki-primary dark:hover:text-[#efe6d9]", linkFocusClass)} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/spaces"
            className={cn("hidden rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm font-semibold text-zaki-secondary hover:text-zaki-primary sm:inline-flex dark:border-[#2a2018] dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]", linkFocusClass)}
          >
            {locale === "ar" ? "جرّب Spaces" : "Try Spaces"}
          </Link>
          <Link
            to="/pricing?plan=complete&source=website_nav"
            className={cn("inline-flex items-center gap-2 rounded-zaki-md bg-[#231a13] px-3 py-2 text-sm font-semibold text-white hover:bg-[#3a2a1f] dark:bg-[#efe6d9] dark:text-[#0c0a09] dark:hover:bg-white", linkFocusClass)}
          >
            Complete
            <DirectionalArrow locale={locale} className="size-4" />
          </Link>
          <Link
            to={locale === "ar" ? "/" : "/ar"}
            className={cn("hidden rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm font-semibold text-zaki-secondary hover:text-zaki-primary lg:inline-flex dark:border-[#2a2018] dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]", linkFocusClass)}
          >
            {locale === "ar" ? "English" : "العربية"}
          </Link>
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 text-sm font-medium text-zaki-secondary [scrollbar-width:none] dark:text-[#c9b8a4] md:hidden sm:px-6">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            className={cn("shrink-0 rounded-zaki-md border border-[#eadfce] bg-white px-3 py-2 hover:text-zaki-primary dark:border-[#2a2018] dark:bg-[#14100d] dark:hover:text-[#efe6d9]", linkFocusClass)}
            to={link.to}
          >
            {link.label}
          </Link>
        ))}
        <Link
          className={cn("shrink-0 rounded-zaki-md border border-[#eadfce] bg-white px-3 py-2 hover:text-zaki-primary dark:border-[#2a2018] dark:bg-[#14100d] dark:hover:text-[#efe6d9]", linkFocusClass)}
          to={locale === "ar" ? "/" : "/ar"}
        >
          {locale === "ar" ? "English" : "العربية"}
        </Link>
      </nav>
    </header>
  );
}

function WebsiteFooter({ locale = "en" }: { locale?: WebsiteLocale }) {
  return (
    <footer className="border-t border-[#eadfce] bg-[#fff8f0] px-4 py-8 text-sm text-zaki-secondary dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#c9b8a4]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CenterLogo className="size-6 text-zaki-brand" />
          <span className="font-semibold text-zaki-primary dark:text-[#efe6d9]">ZAKI</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to={localizeMarketingPath("/story", locale)} className={cn("rounded-zaki-sm hover:text-zaki-primary dark:hover:text-[#efe6d9]", linkFocusClass)}>{locale === "ar" ? "القصة" : "Story"}</Link>
          <Link to={localizeMarketingPath("/faq", locale)} className={cn("rounded-zaki-sm hover:text-zaki-primary dark:hover:text-[#efe6d9]", linkFocusClass)}>{locale === "ar" ? "الأسئلة" : "FAQ"}</Link>
          <Link to={localizeMarketingPath("/contact", locale)} className={cn("rounded-zaki-sm hover:text-zaki-primary dark:hover:text-[#efe6d9]", linkFocusClass)}>{locale === "ar" ? "تواصل" : "Contact"}</Link>
          <Link to="/legal" className={cn("rounded-zaki-sm hover:text-zaki-primary dark:hover:text-[#efe6d9]", linkFocusClass)}>{locale === "ar" ? "القانوني" : "Legal"}</Link>
          <Link to="/help" className={cn("rounded-zaki-sm hover:text-zaki-primary dark:hover:text-[#efe6d9]", linkFocusClass)}>{locale === "ar" ? "المساعدة" : "Help"}</Link>
          <Link to="/pricing" className={cn("rounded-zaki-sm hover:text-zaki-primary dark:hover:text-[#efe6d9]", linkFocusClass)}>{locale === "ar" ? "الأسعار" : "Pricing"}</Link>
        </div>
      </div>
    </footer>
  );
}

function ProductMiniCard({ product, locale = "en" }: { product: Product; locale?: WebsiteLocale }) {
  const Icon = product.icon;
  return (
    <Link
      to={localizeProductPath(product.slug, locale)}
      className={cn("group rounded-zaki-2xl border border-[#eadfce] bg-white p-5 shadow-zaki-sm transition hover:-translate-y-0.5 hover:shadow-zaki-lg dark:border-[#2a2018] dark:bg-[#14100d]", linkFocusClass)}
    >
      <div className={cn("inline-flex size-10 items-center justify-center rounded-zaki-md border", product.accent)}>
        <Icon className="size-5" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
            {product.eyebrow}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">
            {product.name}
          </h3>
        </div>
        <span className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{product.price}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{product.summary}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-zaki-brand">
        {locale === "ar" ? "تفاصيل المنتج" : "Deep dive"}
        <DirectionalArrow locale={locale} className="size-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function WebsiteShell({ children, locale = "en" }: { children: ReactNode; locale?: WebsiteLocale }) {
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale === "ar" ? "ar" : "en"} className="min-h-screen bg-[#fffaf4] text-zaki-primary dark:bg-[#0c0a09] dark:text-[#efe6d9]">
      <WebsiteNav locale={locale} />
      {children}
      <WebsiteFooter locale={locale} />
    </div>
  );
}

function productPreviewImage(slug: ProductSlug) {
  if (slug === "spaces") return "/marketing/spaces-preview.png";
  if (slug === "learn") return "/marketing/learn-preview.png";
  if (slug === "agent") return "/marketing/agent-preview.png";
  return "/marketing/pricing-preview.png";
}

function productPreviewDimensions(slug: ProductSlug) {
  if (slug === "spaces") return { width: 1280, height: 900 };
  if (slug === "complete") return { width: 1360, height: 920 };
  return { width: 1280, height: 800 };
}

function AgentProofSection({ locale = "en" }: { locale?: WebsiteLocale }) {
  const isArabic = locale === "ar";
  const proof = isArabic
    ? [
        ["91.7%", "أول نتيجة LoCoMo لنظام الذاكرة. نعرضها كإشارة جودة، لا كادعاء نهائي."],
        ["Memory import", "اجلب الذاكرة من ChatGPT أو Claude أو Gemini حتى تبدأ ZAKI بسياقك الحقيقي."],
        ["Agent controls", "جلسات، ذاكرة، متابعات، موافقات أدوات، وخزنة أسرار بدل دردشة عامة فقط."],
      ]
    : [
        ["91.7%", "A concrete memory-system signal from our first benchmark run, with more evaluations to follow."],
        ["Memory import", "Bring useful context from ChatGPT, Claude, or Gemini so switching does not mean starting from zero."],
        ["Agent controls", "Sessions, memory, scheduled follow-ups, tool approvals, and secrets handling make Agent feel like a work system, not another chat box."],
      ];
  const spec = isArabic
    ? [
        ["ذاكرة", "حفظ تفاصيل مفيدة، نافذة تراجع، مراجعة التعارضات، وبحث داخل الذاكرة."],
        ["الجلسات", "سياق مؤقت للجلسة مع قدرة على التلخيص والتصدير وإدارة الجلسات."],
        ["الأدوات", "أذونات قبل تنفيذ أدوات حساسة، ووضع مراقبة للقراءة فقط."],
        ["الأسرار", "خزنة أسرار للاتصالات التي تحتاج مفاتيح أو بيانات حساسة."],
      ]
    : [
        ["Memory", "Helpful details, undo windows, conflict review, and searchable personal memory."],
        ["Sessions", "Temporary session context with session export, compaction, and management surfaces."],
        ["Tools", "Approval gates before sensitive tool actions, plus observe-only mode when you want restraint."],
        ["Secrets", "A secrets vault for integrations that need sensitive credentials or runtime material."],
      ];

  return (
    <section className="border-y border-[#eadfce] bg-white px-4 py-12 dark:border-[#2a2018] dark:bg-[#14100d] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
            {isArabic ? "إثبات وتقنية" : "Proof and technical shape"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
            {isArabic ? "اجلب ذاكرتك. حافظ على زخم العمل." : "Bring your memory. Keep the work moving."}
          </h2>
          <p className="mt-4 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
            {isArabic
              ? "المستخدم الجاد يحتاج سببًا للهجرة: ذاكرة قابلة للنقل، جلسات منظمة، أدوات بإذن، وإشارة أداء حقيقية لنظام الذاكرة."
              : "A serious user needs a reason to switch: portable memory, structured sessions, permissioned tools, and a real proof point for the memory system."}
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            {proof.map(([title, body]) => (
              <article key={title} className="rounded-zaki-2xl border border-[#eadfce] bg-[#fffaf4] p-5 dark:border-[#2a2018] dark:bg-[#0c0a09]">
                <h3 className="text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
              </article>
            ))}
          </div>
          <div className="overflow-hidden rounded-zaki-2xl border border-[#eadfce] bg-white dark:border-[#2a2018] dark:bg-[#14100d]">
            <div className="grid md:grid-cols-2">
              {spec.map(([title, body]) => (
                <div key={title} className="border-b border-[#eadfce] p-5 last:border-b-0 dark:border-[#2a2018] md:border-r md:last:border-r-0">
                  <p className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LearnProofSection({ locale = "en" }: { locale?: WebsiteLocale }) {
  const isArabic = locale === "ar";
  const workflows = isArabic
    ? [
        ["Deep Solve", "حل مسائل متعددة الخطوات مع تخطيط وتحقيق ومراجعة."],
        ["Deep Research", "تقسيم الموضوع وبحثه وتحويله إلى تقرير أو مسار تعلم."],
        ["Quiz + Question Bank", "توليد أسئلة، حفظها، ومراجعة الأخطاء لاحقًا."],
        ["Visualize", "تحويل المفاهيم إلى رسوم، مخططات، أو صفحات شرح تفاعلية."],
        ["Co-Writer", "مساحة كتابة متعددة الوثائق تستخدم معرفتك ودفاترك."],
        ["Knowledge + notebooks", "ملفات معرفة، دفاتر، كتب تفاعلية، وذاكرة تعلم شخصية."],
      ]
    : [
        ["Deep Solve", "Multi-step problem solving with planning, investigation, answer, and verification."],
        ["Deep Research", "Break a topic down, research it, and produce reports or learning paths."],
        ["Quiz + Question Bank", "Generate practice, keep questions, and revisit weak spots later."],
        ["Visualize", "Turn concepts into diagrams, charts, or interactive explanation pages."],
        ["Co-Writer", "A multi-document writing surface that can use your knowledge and notebooks."],
        ["Knowledge + notebooks", "Knowledge bases, notebooks, living books, and personal learning memory."],
      ];

  return (
    <section className="border-y border-[#eadfce] bg-white px-4 py-12 dark:border-[#2a2018] dark:bg-[#14100d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
            {isArabic ? "لماذا Learn يستحق صفحة مستقلة" : "Why Learn deserves its own product"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
            {isArabic ? "Learn يحول المادة إلى نظام دراسة." : "Learn turns material into a study system."}
          </h2>
          <p className="mt-4 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
            {isArabic
              ? "الطالب أو الباحث لا يحتاج إجابة فقط. يحتاج شرحًا، تدريبًا، دفاتر، بحثًا، تصورًا بصريًا، وطريقة للعودة إلى نقاط الضعف."
              : "Students and knowledge workers do not only need an answer. They need explanation, practice, notebooks, research, visual understanding, and a way back to weak spots."}
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map(([title, body]) => (
            <article key={title} className="rounded-zaki-2xl border border-[#eadfce] bg-[#fffaf4] p-5 dark:border-[#2a2018] dark:bg-[#0c0a09]">
              <h3 className="text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WebsiteHomePage({ locale = "en" }: { locale?: WebsiteLocale }) {
  const products = getProducts(locale);
  const isArabic = locale === "ar";
  const differentiators = isArabic
    ? [
        {
          icon: Brain,
          title: "استمرارية تشعر بها",
          body:
            "ZAKI مصمم حول ما يجب أن يبقى بين الجلسات: التفضيلات، القرارات، سياق العمل، والخطوة التالية.",
        },
        {
          icon: Shield,
          title: "ذاكرة بحدود واضحة",
          body:
            "Spaces المجهولة تبقى بلا ذاكرة. الذاكرة المدفوعة يمكن استيرادها ومراجعتها والبحث فيها وإدارتها.",
        },
        {
          icon: Timer,
          title: "متابعة بعد الإجابة",
          body:
            "Agent يضيف التخطيط والمتابعات المجدولة وموافقات الأدوات والتنفيذ متعدد الخطوات للعمل الذي يحتاج أن يستمر.",
        },
        {
          icon: Lock,
          title: "التعلم له سطحه الخاص",
          body:
            "Learn ليس مطالبة تعليمية فقط. هو حل مسائل وبحث واختبارات ودفاتر وكتابة وملفات معرفة وشرح مرئي.",
        },
      ]
    : DIFFERENTIATORS;
  return (
    <WebsiteShell locale={locale}>
      <section className="border-b border-[#eadfce] bg-[linear-gradient(180deg,#fffaf4_0%,#fff3e8_100%)] dark:border-[#2a2018] dark:bg-[linear-gradient(180deg,#0c0a09_0%,#14100d_100%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#a89684]">
              <Zap className="size-3.5 text-zaki-brand" />
              {isArabic ? "AI يتذكر ويتابع ويعلّم" : "AI that remembers, teaches, and follows through"}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] text-zaki-primary sm:text-5xl lg:text-6xl dark:text-[#efe6d9]">
              {isArabic ? "لا يجب أن يختفي عملك عندما تنتهي المحادثة." : "Your AI work should not disappear when the chat ends."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zaki-secondary sm:text-lg dark:text-[#c9b8a4]">
              {isArabic
                ? "ابدأ مجانًا وبدون تسجيل في Spaces. عندما يصبح العمل مهمًا، فعّل الذاكرة مع Agent، حوّل المادة إلى فهم داخل Learn، أو اختر Complete لكل الأسطح مع Spaces غير محدودة."
                : "Start free, without registration, in Spaces. When the work becomes important, turn on continuity with Agent, turn material into study with Learn, or choose Complete for every surface with uncapped Spaces."}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/spaces"
                className={cn("inline-flex items-center justify-center gap-2 rounded-zaki-md bg-[#e10600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b90505]", linkFocusClass)}
              >
                {isArabic ? "جرّب Spaces مجانًا" : "Try Spaces free"}
                <DirectionalArrow locale={locale} className="size-4" />
              </Link>
              <Link
                to="/pricing?plan=complete&source=website_hero"
                className={cn("inline-flex items-center justify-center gap-2 rounded-zaki-md border border-zaki-strong bg-white px-5 py-3 text-sm font-semibold text-zaki-primary hover:bg-zaki-hover dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#efe6d9] dark:hover:bg-[#1d1712]", linkFocusClass)}
              >
                {isArabic ? "شاهد الخطط" : "See plans"}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-zaki-2xl border border-[#eadfce] bg-white shadow-[0_24px_70px_rgba(42,28,12,0.18)] dark:border-[#2a2018] dark:bg-[#14100d]">
              <img
                src="/marketing/spaces-preview.png"
                alt="ZAKI Spaces product interface preview"
                width={1280}
                height={900}
                className="aspect-[16/11] w-full object-cover object-left-top"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Spaces", "Free"],
                ["Agent", "$29"],
                ["Learn", "$19"],
                ["Complete", "$39"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-zaki-lg border border-[#eadfce] bg-white px-4 py-3 dark:border-[#2a2018] dark:bg-[#14100d]">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-[#a89684]">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#eadfce] bg-white px-4 py-5 dark:border-[#2a2018] dark:bg-[#14100d] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
            ["Spaces", isArabic ? "ابدأ بدون تسجيل" : "Start without signup"],
            ["Agent", isArabic ? "ذاكرة ومتابعة" : "Memory and follow-through"],
            ["Learn", isArabic ? "فهم وتدريب" : "Understand and practice"],
            ["Complete", isArabic ? "$39 للحلقة الكاملة" : "$39 for the full loop"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 border-b border-[#eadfce] py-2 last:border-b-0 dark:border-[#2a2018] sm:border-b-0 sm:border-r sm:pr-4 sm:last:border-r-0">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-[#a89684]">{label}</span>
              <span className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
              {isArabic ? "المنتجات" : "Products"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
              {isArabic ? "اختر أصغر منتج ينجز المهمة." : "Pick the smallest product that does the job."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
              {isArabic
                ? "ابدأ من أصغر مساحة مفيدة، ثم ترقَّ فقط عندما يحتاج العمل إلى ذاكرة أو عمق أو النظام الكامل."
                : "Start with the smallest useful surface, then upgrade only when the work needs memory, depth, or the full system."}
            </p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductMiniCard key={product.slug} product={product} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
              {isArabic ? "لماذا ZAKI" : "Why ZAKI"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
              {isArabic ? "الفرق هو ما يبقى بين الجلسات." : "The difference is what survives between sessions."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
              {isArabic
                ? "الدردشة العامة جيدة للسؤال الأول. ZAKI مصمم لما بعد ذلك: مساحة منظمة، ذاكرة قابلة للإدارة، تعلم يتحول إلى تدريب، ووكيل يستطيع المتابعة."
                : "Generic chat is good for the first answer. ZAKI is built for what happens after: organized spaces, manageable memory, study that turns into practice, and an agent that can follow through."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {differentiators.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-zaki-lg border border-[#d9e2dc] bg-[#f8fbf9] p-4 dark:border-[#22342d] dark:bg-[#0f1714]">
                <Icon className="size-5 text-[#1f6c54]" />
                <h3 className="mt-4 text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#eadfce] bg-white px-4 py-12 dark:border-[#2a2018] dark:bg-[#14100d] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
              {isArabic ? "النموذج التجاري" : "Commercial model"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
              {isArabic ? "المجاني يعطي قيمة. المدفوع يفتح الاستمرارية." : "Free gives value. Paid turns on continuity."}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [isArabic ? "Spaces المجهولة" : "Anonymous Spaces", isArabic ? "10 رسائل يوميًا، بلا تسجيل وبلا ذاكرة دائمة." : "10 messages per day, no registration, no durable memory."],
              [isArabic ? "تجربة Agent" : "Agent preview", isArabic ? "10 رسائل أسبوعيًا لتجربة الذاكرة والمتابعة قبل الدفع." : "10 weekly preview messages to test memory and follow-through before paying."],
              [isArabic ? "تجربة Learn" : "Learn preview", isArabic ? "10 رسائل أسبوعيًا لتجربة الشرح والتدريب والبحث." : "10 weekly preview messages to test explanation, practice, and research."],
              ["Complete", isArabic ? "كل المنتج: Agent و Learn و Spaces غير محدودة مع ذاكرة." : "The whole product: Agent, Learn, and uncapped Spaces with memory."],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3 rounded-zaki-lg border border-[#eadfce] bg-[#fffaf4] p-4 dark:border-[#2a2018] dark:bg-[#0c0a09]">
                <Check className="mt-0.5 size-4 shrink-0 text-zaki-brand" />
                <div>
                  <h3 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
              {isArabic ? "إثبات المنتج" : "Product proof"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
              {isArabic ? "أسطح منتج حقيقية ومسار ترقية واضح." : "Real product surfaces, clear upgrade paths."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
              {isArabic
                ? "استكشف Spaces المجانية و Learn المدفوع و Agent المدفوع وخطة Complete من خلال لقطات واضحة للأسطح الأساسية."
                : "See the actual product surfaces: free Spaces, paid Learn, paid Agent, and the Complete plan."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {([
              ["Spaces", "/marketing/spaces-preview.png", localizeProductPath("spaces", locale), 1280, 900],
              ["Learn", "/marketing/learn-preview.png", localizeProductPath("learn", locale), 1280, 800],
              ["Agent", "/marketing/agent-preview.png", localizeProductPath("agent", locale), 1280, 800],
              ["Pricing", "/marketing/pricing-preview.png", "/pricing", 1360, 920],
            ] satisfies Array<[string, string, string, number, number]>).map(([label, src, href, width, height]) => (
              <Link key={label} to={href} className={cn("group overflow-hidden rounded-zaki-2xl border border-[#eadfce] bg-white shadow-zaki-sm transition hover:-translate-y-0.5 hover:shadow-zaki-lg dark:border-[#2a2018] dark:bg-[#14100d]", linkFocusClass)}>
                <img
                  src={src}
                  alt={`${label} interface preview`}
                  width={width}
                  height={height}
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover object-left-top"
                />
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{label}</span>
                  <DirectionalArrow locale={locale} className="size-4 text-zaki-brand transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#eadfce] bg-white px-4 py-12 dark:border-[#2a2018] dark:bg-[#14100d] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
              {isArabic ? "أدلة ومقارنات" : "Guides and comparisons"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
              {isArabic ? "أدلة تساعدك تختار المنتج المناسب." : "Guides that help you choose the right product."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
              {isArabic
                ? "الصفحات المستعادة تشرح متى تستخدم كل منتج، وكيف يختلف Spaces عن الدردشة العامة، وكيف يجب أن يشعر العمل العربي-الإنجليزي داخل ZAKI."
                : "The restored pages explain when to use each product, how Spaces compares to generic chat, and how bilingual work should feel in ZAKI."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {((isArabic ? [
              ["Spaces مقابل ChatGPT", "/vs-chatgpt"],
              ["Agent مقابل Spaces", "/zaki-vs-spaces"],
              ["أفضل مساعد AI عربي", "/best-arabic-ai-assistant"],
              ["كيف يعمل ZAKI و Spaces", "/how-to/how-zaki-and-spaces-work"],
              ["في ماذا تستخدم Spaces", "/how-to/what-to-use-spaces-for"],
              ["اكتب إيميلات عربية أفضل", "/how-to/write-arabic-emails-ai"],
            ] : [
              ["Spaces vs ChatGPT", "/vs-chatgpt"],
              ["Agent vs Spaces", "/zaki-vs-spaces"],
              ["Best Arabic AI assistant", "/best-arabic-ai-assistant"],
              ["How ZAKI and Spaces work", "/how-to/how-zaki-and-spaces-work"],
              ["What to use Spaces for", "/how-to/what-to-use-spaces-for"],
              ["Write better Arabic emails", "/how-to/write-arabic-emails-ai"],
            ]) satisfies Array<[string, string]>).map(([label, href]) => (
              <Link key={href} to={href} className={cn("flex items-center justify-between gap-3 rounded-zaki-lg border border-[#eadfce] bg-[#fffaf4] px-4 py-3 text-sm font-semibold text-zaki-primary hover:bg-[#fff3e8] dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#efe6d9] dark:hover:bg-[#1d1712]", linkFocusClass)}>
                {label}
                <DirectionalArrow locale={locale} className="size-4 shrink-0 text-zaki-brand" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            ["91.7%", isArabic ? "أول نتيجة LoCoMo لنظام ذاكرة ZAKI." : "First LoCoMo benchmark run for ZAKI’s memory system."],
            ["10/day", isArabic ? "حصة Spaces المجهولة، بلا ذاكرة عمدًا." : "Anonymous Spaces quota, intentionally memory-free."],
            ["$39", isArabic ? "Complete يشمل Agent و Learn و Spaces غير محدودة مع ذاكرة." : "Complete includes Agent, Learn, and uncapped Spaces with memory."],
          ].map(([stat, body]) => (
            <article key={stat} className="rounded-zaki-2xl border border-[#eadfce] bg-white p-6 dark:border-[#2a2018] dark:bg-[#14100d]">
              <div className="text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">{stat}</div>
              <p className="mt-3 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#eadfce] bg-[#231a13] px-4 py-12 text-white dark:border-[#2a2018] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d8c7b7]">{isArabic ? "ابدأ هنا" : "Start here"}</p>
            <h2 className="mt-2 text-3xl font-semibold">{isArabic ? "ابدأ بمساحة مجانية. ترقَّ عندما تريد أن يتذكر ZAKI العمل ويتابعه." : "Start with a free Space. Upgrade when you want ZAKI to remember and continue the work."}</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/spaces" className={cn("inline-flex items-center justify-center gap-2 rounded-zaki-md bg-white px-5 py-3 text-sm font-semibold text-[#231a13] hover:bg-[#fff3e8]", linkFocusClass)}>
              {isArabic ? "جرّب Spaces مجانًا" : "Try Spaces free"}
              <DirectionalArrow locale={locale} className="size-4" />
            </Link>
            <Link to="/pricing" className={cn("inline-flex items-center justify-center rounded-zaki-md border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10", linkFocusClass)}>
              {isArabic ? "قارن الخطط" : "Compare plans"}
            </Link>
          </div>
        </div>
      </section>
    </WebsiteShell>
  );
}

export function WebsiteProductPage({ locale = "en" }: { locale?: WebsiteLocale }) {
  const { productId } = useParams();
  const products = getProducts(locale);
  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  const product = productBySlug.get(String(productId || "") as ProductSlug) || productBySlug.get("complete")!;
  const previewDimensions = productPreviewDimensions(product.slug);
  const Icon = product.icon;
  const isArabic = locale === "ar";

  return (
    <WebsiteShell locale={locale}>
      <section className="border-b border-[#eadfce] bg-[linear-gradient(180deg,#fffaf4_0%,#fff3e8_100%)] px-4 py-12 dark:border-[#2a2018] dark:bg-[linear-gradient(180deg,#0c0a09_0%,#14100d_100%)] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className={cn("inline-flex size-12 items-center justify-center rounded-zaki-md border", product.accent)}>
              <Icon className="size-6" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
              {product.eyebrow}
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-[1.08] text-zaki-primary sm:text-5xl dark:text-[#efe6d9]">
              {product.name}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-zaki-secondary dark:text-[#c9b8a4]">
              {product.headline}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zaki-secondary dark:text-[#c9b8a4]">
              {product.summary}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to={product.href}
                className={cn("inline-flex items-center justify-center gap-2 rounded-zaki-md bg-[#e10600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b90505]", linkFocusClass)}
              >
                {product.cta}
                <DirectionalArrow locale={locale} className="size-4" />
              </Link>
              <Link
                to="/pricing"
                className={cn("inline-flex items-center justify-center rounded-zaki-md border border-zaki-strong bg-white px-5 py-3 text-sm font-semibold text-zaki-primary hover:bg-zaki-hover dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#efe6d9]", linkFocusClass)}
              >
                {isArabic ? "قارن الخطط" : "Compare plans"}
              </Link>
            </div>
          </div>
          <div className="grid content-start gap-4">
            <div className="rounded-zaki-2xl border border-[#eadfce] bg-white p-5 shadow-zaki-lg dark:border-[#2a2018] dark:bg-[#14100d]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">{isArabic ? "الخطة" : "Plan"}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-zaki-primary dark:text-[#efe6d9]">{product.price}</h2>
                </div>
                <Lock className="size-5 text-zaki-brand" />
              </div>
              <ul className="mt-5 space-y-3">
                {product.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
                    <Check className="mt-1 size-4 shrink-0 text-zaki-brand" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-zaki-2xl border border-[#eadfce] bg-white shadow-zaki-md dark:border-[#2a2018] dark:bg-[#14100d]">
              <img
                src={productPreviewImage(product.slug)}
                alt={`${product.name} product preview`}
                width={previewDimensions.width}
                height={previewDimensions.height}
                loading="lazy"
                className="aspect-[16/10] w-full object-cover object-left-top"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {product.sections.map((section) => (
            <article key={section.title} className="rounded-zaki-2xl border border-[#eadfce] bg-white p-5 dark:border-[#2a2018] dark:bg-[#14100d]">
              <div className="mb-4 inline-flex size-9 items-center justify-center rounded-zaki-md border border-[#eadfce] bg-[#fff8f0] dark:border-[#2a2018] dark:bg-[#0c0a09]">
                <MessageSquare className="size-4 text-zaki-brand" />
              </div>
              <h2 className="text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      {product.slug === "agent" ? <AgentProofSection locale={locale} /> : null}
      {product.slug === "learn" ? <LearnProofSection locale={locale} /> : null}

      <section className="border-t border-[#eadfce] bg-white px-4 py-12 dark:border-[#2a2018] dark:bg-[#14100d] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
              {isArabic ? "الخطوة التالية" : "Next step"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
              {isArabic ? "اختر مسار المنتج الذي يناسب العمل." : "Choose the product path that matches the job."}
            </h2>
          </div>
          <Link
            to="/pricing"
            className={cn("inline-flex items-center justify-center gap-2 rounded-zaki-md bg-[#e10600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b90505]", linkFocusClass)}
          >
            {isArabic ? "عرض الأسعار" : "View pricing"}
            <DirectionalArrow locale={locale} className="size-4" />
          </Link>
        </div>
      </section>
    </WebsiteShell>
  );
}
