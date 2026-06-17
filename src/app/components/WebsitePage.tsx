import { Link, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Brain,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  LayoutGrid,
  Lock,
  MessageSquare,
  Palette,
  Shield,
  Timer,
  Zap,
} from "lucide-react";
import { CenterLogo } from "./icons";
import { cn } from "@/lib/utils";

type ProductSlug = "spaces" | "agent" | "brain" | "learn" | "design" | "hire";
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

function websiteAppPath(path: string, source: string, intent: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("source", source);
  params.set("intent", intent);
  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ""}`;
}

const PRODUCTS_EN: Product[] = [
  {
    slug: "spaces",
    name: "ZAKI Chat",
    eyebrow: "Free entry point",
    price: "$0",
    headline: "Start useful AI work before you sign up.",
    summary:
      "Open a focused workspace for a draft, translation, plan, decision, or research thread. It is free, fast, and intentionally memory-free until you decide the work should continue.",
    icon: LayoutGrid,
    accent: "bg-[#e9f5f1] text-[#1f6c54] border-[#b7ded0]",
    cta: "Start chat",
    href: websiteAppPath("/spaces", "website_product_spaces", "chat"),
    points: [
      "Anonymous daily quota: 10 messages per day.",
      "No durable memory while anonymous.",
      "Sign in when you want work and history to follow you.",
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
          "Anonymous Chat is deliberately simple: useful work now, no durable memory. Sign in when the work should persist across sessions.",
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
    href: websiteAppPath("/agent", "website_product_agent", "agent"),
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
    slug: "brain",
    name: "ZAKI Brain",
    eyebrow: "Memory control plane",
    price: "Included",
    headline: "See what ZAKI knows, where it came from, and what should change.",
    summary:
      "Brain is the visible memory layer for Agent and account continuity: search, inspect, govern, and understand the context ZAKI can carry forward.",
    icon: Brain,
    accent: "bg-[#eef7ff] text-[#235a7c] border-[#b9d8eb]",
    cta: "Open Brain",
    href: websiteAppPath("/brain", "website_product_brain", "memory"),
    points: [
      "Canonical personal memory surface.",
      "Works with signed-in account continuity.",
      "Best for reviewing, searching, and governing memory.",
    ],
    sections: [
      {
        title: "Memory should be visible",
        body:
          "Brain exists so memory is not a hidden side effect. The user can inspect what ZAKI is using and decide what should stay useful.",
      },
      {
        title: "Built for continuity",
        body:
          "Agent can carry work forward because Brain gives long-running context a visible home instead of burying it inside a chat thread.",
      },
      {
        title: "Governance before expansion",
        body:
          "Before more products write durable memory, Brain stays the place to prove source, scope, and user control.",
      },
    ],
  },
  {
    slug: "learn",
    name: "ZAKI Learn",
    eyebrow: "Coming soon",
    price: "Soon",
    headline: "Learning workflows are parked until the core platform is finished.",
    summary:
      "Learn will return as a proper study system. For V1, use Chat for quick study help or Agent to plan a learning path while we finish the core product.",
    icon: GraduationCap,
    accent: "bg-[#fff4d8] text-[#765716] border-[#efd27d]",
    cta: "Open dashboard",
    href: websiteAppPath("/", "website_product_learn", "dashboard"),
    points: [
      "Coming soon, not sold as public access.",
      "Use Chat or Agent today.",
      "Learner memory stays separate until launch.",
    ],
    sections: [
      {
        title: "Truthful staging",
        body:
          "Learn is not being presented as paid public access until its route, memory, entitlement, and E2E path are ready together.",
      },
      {
        title: "Use the core now",
        body:
          "Chat can answer immediate study questions. Agent can help plan a learning path or organize a study workflow.",
      },
      {
        title: "Memory boundary",
        body:
          "Learner memory remains separate from Brain and Agent memory until Learn is deliberately launched.",
      },
    ],
  },
  {
    slug: "design",
    name: "ZAKI Design",
    eyebrow: "Coming soon",
    price: "Soon",
    headline: "Design will launch after the service and project flow are ready.",
    summary:
      "For now, use Chat to shape a brief or Agent to plan design work. Full design projects remain gated until the backend, health checks, and project creation flow are proven.",
    icon: Palette,
    accent: "bg-[#fdebe6] text-[#9b3f2c] border-[#edb4a6]",
    cta: "Open dashboard",
    href: websiteAppPath("/", "website_product_design", "dashboard"),
    points: [
      "Coming soon, not public project access.",
      "Static briefs can start in Chat or Agent.",
      "Design memory stays separate until launch.",
    ],
    sections: [
      {
        title: "Preview language only",
        body:
          "The website can explain the direction, but normal navigation should not imply a working design studio is available.",
      },
      {
        title: "Project creation stays gated",
        body:
          "Full Design project creation waits for staging health, BFF readiness, and product registry truth to agree.",
      },
      {
        title: "Start with core products",
        body:
          "Use Chat for quick exploration or Agent for planning and follow-through while Design is being finished.",
      },
    ],
  },
  {
    slug: "hire",
    name: "ZAKI Career",
    eyebrow: "Coming soon",
    price: "Soon",
    headline: "Career help will be user-side job search, not employer recruiting.",
    summary:
      "Career will help with target roles, CV positioning, fit notes, applications, and interview preparation. It stays parked until the private job-search workflow is ready.",
    icon: BriefcaseBusiness,
    accent: "bg-[#f2f0fb] text-[#594b8a] border-[#d0c8ef]",
    cta: "Open dashboard",
    href: websiteAppPath("/", "website_product_hire", "dashboard"),
    points: [
      "Coming soon, not candidate workflow access.",
      "Use Chat for CV copy today.",
      "Use Agent to plan your job search.",
    ],
    sections: [
      {
        title: "User-side career lane",
        body:
          "Career is framed around the user finding a role, improving a CV, and preparing applications, not running employer-side hiring pipelines.",
      },
      {
        title: "No candidate PII path",
        body:
          "Public V1 should not expose candidate workflows, uploads, or pipeline memory until the privacy and beta paths are proven.",
      },
      {
        title: "Start safely",
        body:
          "Chat can help refine text today. Agent can plan the search without pretending the full Career product has launched.",
      },
    ],
  },
];

const PRODUCTS_AR: Product[] = [
  {
    slug: "spaces",
    name: "ZAKI Chat",
    eyebrow: "المدخل المجاني",
    price: "$0",
    headline: "ابدأ عملًا مفيدًا بالذكاء الاصطناعي قبل التسجيل.",
    summary:
      "افتح مساحة مركزة لمسودة أو ترجمة أو خطة أو قرار أو بحث. Spaces مجانية وسريعة وبلا ذاكرة دائمة حتى تقرر أن العمل يستحق الاستمرار.",
    icon: LayoutGrid,
    accent: "bg-[#e9f5f1] text-[#1f6c54] border-[#b7ded0]",
    cta: "ابدأ الدردشة",
    href: websiteAppPath("/spaces", "website_product_spaces_ar", "chat"),
    points: [
      "10 رسائل يوميًا للمستخدم المجهول.",
      "لا توجد ذاكرة دائمة بدون حساب.",
      "سجّل الدخول عندما تريد أن يتبعك العمل والتاريخ.",
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
          "الدردشة المجهولة بسيطة عمدًا: عمل مفيد الآن بلا ذاكرة دائمة. سجّل الدخول عندما تريد استمرار العمل بين الجلسات.",
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
    href: websiteAppPath("/agent", "website_product_agent_ar", "agent"),
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
    slug: "brain",
    name: "ZAKI Brain",
    eyebrow: "لوحة الذاكرة",
    price: "مشمول",
    headline: "اعرف ماذا يعرف ZAKI، ومن أين جاء السياق، وما الذي يجب تعديله.",
    summary:
      "Brain هو طبقة الذاكرة المرئية للوكيل واستمرارية الحساب: ابحث، راجع، افهم، واضبط السياق الذي يستطيع ZAKI حمله للأمام.",
    icon: Brain,
    accent: "bg-[#eef7ff] text-[#235a7c] border-[#b9d8eb]",
    cta: "افتح Brain",
    href: websiteAppPath("/brain", "website_product_brain_ar", "memory"),
    points: [
      "سطح الذاكرة الشخصية المركزي.",
      "يعمل مع استمرارية الحساب بعد تسجيل الدخول.",
      "أفضل لمراجعة الذاكرة والبحث فيها وحوكمتها.",
    ],
    sections: [
      {
        title: "الذاكرة يجب أن تكون مرئية",
        body:
          "Brain موجود حتى لا تصبح الذاكرة أثرًا جانبيًا مخفيًا. يستطيع المستخدم مراجعة ما يستخدمه ZAKI وتحديد ما يبقى مفيدًا.",
      },
      {
        title: "مصمم للاستمرارية",
        body:
          "يستطيع Agent حمل العمل للأمام لأن Brain يعطي السياق طويل المدى مكانًا مرئيًا بدل دفنه داخل محادثة.",
      },
      {
        title: "الحوكمة قبل التوسع",
        body:
          "قبل أن تكتب منتجات أكثر ذاكرة دائمة، يبقى Brain المكان الذي يثبت المصدر والنطاق وتحكم المستخدم.",
      },
    ],
  },
  {
    slug: "learn",
    name: "ZAKI Learn",
    eyebrow: "قريبًا",
    price: "قريبًا",
    headline: "مسارات التعلم متوقفة حتى يكتمل قلب المنصة.",
    summary:
      "سيعود Learn كنظام دراسة حقيقي. في V1 استخدم Chat للمساعدة السريعة أو Agent لتخطيط مسار تعلم حتى نكمل المنتج الأساسي.",
    icon: GraduationCap,
    accent: "bg-[#fff4d8] text-[#765716] border-[#efd27d]",
    cta: "افتح لوحة التحكم",
    href: websiteAppPath("/", "website_product_learn_ar", "dashboard"),
    points: [
      "قريبًا، وليس وصولًا عامًا مدفوعًا.",
      "استخدم Chat أو Agent اليوم.",
      "ذاكرة التعلم تبقى منفصلة حتى الإطلاق.",
    ],
    sections: [
      {
        title: "إطلاق صادق",
        body:
          "لا نعرض Learn كمنتج عام مدفوع حتى تتفق المسارات والذاكرة والصلاحيات واختبارات E2E معًا.",
      },
      {
        title: "استخدم القلب الآن",
        body:
          "يمكن لـ Chat الإجابة على أسئلة الدراسة الفورية. ويمكن لـ Agent تخطيط مسار تعلم أو تنظيم سير دراسة.",
      },
      {
        title: "حدود الذاكرة",
        body:
          "تبقى ذاكرة التعلم منفصلة عن Brain وذاكرة Agent حتى يتم إطلاق Learn بشكل مقصود.",
      },
    ],
  },
  {
    slug: "design",
    name: "ZAKI Design",
    eyebrow: "قريبًا",
    price: "قريبًا",
    headline: "سيتم إطلاق Design بعد جاهزية الخدمة وتدفق المشاريع.",
    summary:
      "الآن استخدم Chat لصياغة موجز أو Agent لتخطيط عمل التصميم. المشاريع الكاملة تبقى مغلقة حتى تثبت الخدمة والفحوصات وتدفق الإنشاء.",
    icon: Palette,
    accent: "bg-[#fdebe6] text-[#9b3f2c] border-[#edb4a6]",
    cta: "افتح لوحة التحكم",
    href: websiteAppPath("/", "website_product_design_ar", "dashboard"),
    points: [
      "قريبًا، وليس وصولًا عامًا للمشاريع.",
      "يمكن بدء الموجزات في Chat أو Agent.",
      "ذاكرة التصميم تبقى منفصلة حتى الإطلاق.",
    ],
    sections: [
      {
        title: "لغة معاينة فقط",
        body:
          "يمكن للموقع شرح الاتجاه، لكن التنقل العادي لا يجب أن يوحي بأن استوديو تصميم كامل متاح الآن.",
      },
      {
        title: "إنشاء المشاريع يبقى مغلقًا",
        body:
          "إنشاء مشاريع Design الكاملة ينتظر صحة الخدمة وجاهزية BFF واتفاق سجل المنتجات.",
      },
      {
        title: "ابدأ بالمنتجات الأساسية",
        body:
          "استخدم Chat للاستكشاف السريع أو Agent للتخطيط والمتابعة بينما ننهي Design.",
      },
    ],
  },
  {
    slug: "hire",
    name: "ZAKI Career",
    eyebrow: "قريبًا",
    price: "قريبًا",
    headline: "المسار المهني سيكون لمساعدة المستخدم في البحث عن عمل، لا لتوظيف المرشحين.",
    summary:
      "Career سيساعد في تحديد الوظائف المناسبة، تحسين السيرة، ملاحظات الملاءمة، التقديمات، والاستعداد للمقابلات. يبقى متوقفًا حتى يجهز تدفق البحث عن عمل الخاص.",
    icon: BriefcaseBusiness,
    accent: "bg-[#f2f0fb] text-[#594b8a] border-[#d0c8ef]",
    cta: "افتح لوحة التحكم",
    href: websiteAppPath("/", "website_product_hire_ar", "dashboard"),
    points: [
      "قريبًا، وليس وصولًا لسير مرشحين.",
      "استخدم Chat لتحسين نص السيرة اليوم.",
      "استخدم Agent لتخطيط بحثك عن عمل.",
    ],
    sections: [
      {
        title: "مسار مهني للمستخدم",
        body:
          "Career يركز على المستخدم الذي يبحث عن وظيفة، يحسن سيرته، ويستعد للتقديمات، لا على تشغيل عمليات توظيف للجهات.",
      },
      {
        title: "لا مسار بيانات مرشحين",
        body:
          "V1 العام لا يعرض سير مرشحين أو ملفات أو ذاكرة مسارات حتى تثبت الخصوصية ومسار البيتا.",
      },
      {
        title: "ابدأ بأمان",
        body:
          "يمكن لـ Chat تحسين النص اليوم. ويمكن لـ Agent تخطيط البحث بدون الإيحاء بأن Career الكامل أُطلق.",
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
    title: "Parked products stay honest",
    body:
      "Learn, Design, and Career stay visible as coming-soon lanes while V1 focuses on Chat, Agent, Brain, and Settings.",
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
    { label: locale === "ar" ? "الأسعار" : "Pricing", to: websiteAppPath("/pricing", "website_nav", "plans") },
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
            to={websiteAppPath("/spaces", "website_nav", "chat")}
            className={cn("hidden rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm font-semibold text-zaki-secondary hover:text-zaki-primary sm:inline-flex dark:border-[#2a2018] dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]", linkFocusClass)}
          >
            {locale === "ar" ? "ابدأ Chat" : "Start chat"}
          </Link>
          <Link
            to={websiteAppPath("/pricing", "website_nav", "plans")}
            className={cn("inline-flex items-center gap-2 rounded-zaki-md bg-[#231a13] px-3 py-2 text-sm font-semibold text-white hover:bg-[#3a2a1f] dark:bg-[#efe6d9] dark:text-[#0c0a09] dark:hover:bg-white", linkFocusClass)}
          >
            {locale === "ar" ? "الخطط" : "Plans"}
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
          <Link to={websiteAppPath("/pricing", "website_footer", "plans")} className={cn("rounded-zaki-sm hover:text-zaki-primary dark:hover:text-[#efe6d9]", linkFocusClass)}>{locale === "ar" ? "الأسعار" : "Pricing"}</Link>
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
  if (slug === "brain") return "/marketing/agent-preview.png";
  if (slug === "learn") return "/marketing/learn-preview.png";
  if (slug === "design" || slug === "hire") return "/marketing/pricing-preview.png";
  if (slug === "agent") return "/marketing/agent-preview.png";
  return "/marketing/pricing-preview.png";
}

function productPreviewDimensions(slug: ProductSlug) {
  if (slug === "spaces") return { width: 1280, height: 900 };
  if (slug === "design" || slug === "hire") return { width: 1360, height: 920 };
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
        ["الآن", "استخدم Chat للأسئلة الدراسية السريعة أو Agent لتخطيط مسار تعلم."],
        ["لاحقًا", "سيعود Learn عندما تتفق الذاكرة والصلاحيات وتجربة الدراسة واختبارات E2E."],
        ["الحد", "ذاكرة التعلم لا تختلط مع Brain أو ذاكرة Agent حتى الإطلاق."],
      ]
    : [
        ["Now", "Use Chat for quick study questions or Agent to plan a learning path."],
        ["Later", "Learn returns when memory, entitlement, study UX, and E2E are ready together."],
        ["Boundary", "Learner memory does not mix with Brain or Agent memory until launch."],
      ];

  return (
    <section className="border-y border-[#eadfce] bg-white px-4 py-12 dark:border-[#2a2018] dark:bg-[#14100d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#a89684]">
            {isArabic ? "لماذا Learn متوقف الآن" : "Why Learn is parked now"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
            {isArabic ? "نحافظ على الوعد أصغر من الحقيقة." : "Keep the promise smaller than the truth."}
          </h2>
          <p className="mt-4 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
            {isArabic
              ? "Learn لن يظهر كمنتج عام حتى يستطيع حفظ حالة المتعلم والعمل عليها بأمان. حتى ذلك الوقت، تبقى البداية في Chat أو Agent."
              : "Learn should not appear as a public product until it can safely hold learner state and act on it. Until then, start in Chat or Agent."}
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
          title: "المنتجات القادمة تبقى صادقة",
          body:
            "Learn وDesign وCareer تبقى ظاهرة كمسارات قادمة بينما يركز V1 على Chat وAgent وBrain والإعدادات.",
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
              {isArabic ? "AI يبدأ فورًا ويتذكر عند الحاجة" : "AI that starts now and remembers when it matters"}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] text-zaki-primary sm:text-5xl lg:text-6xl dark:text-[#efe6d9]">
              {isArabic ? "لا يجب أن يختفي عملك عندما تنتهي المحادثة." : "Your AI work should not disappear when the chat ends."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zaki-secondary sm:text-lg dark:text-[#c9b8a4]">
              {isArabic
                ? "ابدأ مجانًا وبدون تسجيل في Chat. عندما يصبح العمل مهمًا، فعّل الاستمرارية مع Agent وراجع الذاكرة في Brain. Learn وDesign وCareer قادمة لاحقًا."
                : "Start free, without registration, in Chat. When the work becomes important, turn on continuity with Agent and review memory in Brain. Learn, Design, and Career come later."}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to={websiteAppPath("/spaces", "website_hero", "chat")}
                className={cn("inline-flex items-center justify-center gap-2 rounded-zaki-md bg-[#e10600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b90505]", linkFocusClass)}
              >
                {isArabic ? "ابدأ Chat مجانًا" : "Start free chat"}
                <DirectionalArrow locale={locale} className="size-4" />
              </Link>
              <Link
                to={websiteAppPath("/pricing", "website_hero", "plans")}
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
                alt="ZAKI Chat product interface preview"
                width={1280}
                height={900}
                className="aspect-[16/11] w-full object-cover object-left-top"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Chat", "Free"],
                ["Agent", "Preview"],
                ["Brain", "Memory"],
                ["Next", "Soon"],
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
            ["Chat", isArabic ? "ابدأ بدون تسجيل" : "Start without signup"],
            ["Agent", isArabic ? "ذاكرة ومتابعة" : "Memory and follow-through"],
            ["Brain", isArabic ? "ذاكرة مرئية" : "Visible memory"],
            ["Next", isArabic ? "Learn وDesign وCareer قريبًا" : "Learn, Design, Career soon"],
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
              [isArabic ? "Chat المجهول" : "Anonymous Chat", isArabic ? "10 رسائل يوميًا، بلا تسجيل وبلا ذاكرة دائمة." : "10 messages per day, no registration, no durable memory."],
              [isArabic ? "تجربة Agent" : "Agent preview", isArabic ? "10 رسائل أسبوعيًا لتجربة الذاكرة والمتابعة قبل الدفع." : "10 weekly preview messages to test memory and follow-through before paying."],
              [isArabic ? "Brain" : "Brain", isArabic ? "ذاكرة الحساب المرئية عندما تريد حفظ العمل ومراجعته." : "Visible account memory when you want work to carry forward."],
              [isArabic ? "قادم لاحقًا" : "Coming later", isArabic ? "Learn وDesign وCareer تبقى متوقفة حتى تكتمل المسارات." : "Learn, Design, and Career stay parked until the flows are complete."],
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
                ? "استكشف Chat المجاني وAgent وBrain، مع مسار واضح للمنتجات القادمة."
                : "See the actual core surfaces: free Chat, Agent, Brain, and a clear path for coming-soon products."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {([
              ["Chat", "/marketing/spaces-preview.png", websiteAppPath("/spaces", "website_surface_chat", "chat"), 1280, 900],
              ["Agent", "/marketing/agent-preview.png", websiteAppPath("/agent", "website_surface_agent", "agent"), 1280, 800],
              ["Brain", "/marketing/agent-preview.png", websiteAppPath("/brain", "website_surface_brain", "memory"), 1280, 800],
              ["Pricing", "/marketing/pricing-preview.png", websiteAppPath("/pricing", "website_surface_pricing", "plans"), 1360, 920],
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
            ["10/day", isArabic ? "حصة Chat المجهول، بلا ذاكرة عمدًا." : "Anonymous Chat quota, intentionally memory-free."],
            ["Soon", isArabic ? "Learn وDesign وCareer مرئية لكنها غير مطروحة كمنتجات عامة بعد." : "Learn, Design, and Career are visible, but not sold as public products yet."],
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
            <h2 className="mt-2 text-3xl font-semibold">{isArabic ? "ابدأ بـ Chat مجانًا. ترقَّ عندما تريد أن يتذكر ZAKI العمل ويتابعه." : "Start with free Chat. Upgrade when you want ZAKI to remember and continue the work."}</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={websiteAppPath("/spaces", "website_final_cta", "chat")} className={cn("inline-flex items-center justify-center gap-2 rounded-zaki-md bg-white px-5 py-3 text-sm font-semibold text-[#231a13] hover:bg-[#fff3e8]", linkFocusClass)}>
              {isArabic ? "ابدأ Chat مجانًا" : "Start free chat"}
              <DirectionalArrow locale={locale} className="size-4" />
            </Link>
            <Link to={websiteAppPath("/pricing", "website_final_cta", "plans")} className={cn("inline-flex items-center justify-center rounded-zaki-md border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10", linkFocusClass)}>
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
  const product = productBySlug.get(String(productId || "") as ProductSlug) || productBySlug.get("spaces")!;
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
                to={websiteAppPath("/pricing", `website_product_${product.slug}`, "plans")}
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
            to={websiteAppPath("/pricing", `website_product_${product.slug}_footer`, "plans")}
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
