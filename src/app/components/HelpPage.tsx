import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CircleAlert, LifeBuoy, ShieldCheck, Wallet } from "lucide-react";

const HELP_COPY = {
  en: {
    badge: "Support",
    title: "Need help?",
    intro:
      "Fast paths for access, billing, memory, and stream reliability. Use this page before launch issues escalate.",
    cards: [
      {
        key: "incident",
        title: "Incident report",
        body: "Include exact error text, affected workspace/thread, and time.",
      },
      {
        key: "billing",
        title: "Billing and access",
        body: "Plan state and access-code entitlements can differ by account lifecycle.",
      },
      {
        key: "security",
        title: "Security/compliance",
        body: "Privacy and legal requests are handled via the compliance contact channel.",
      },
    ],
    faqTitle: "FAQs",
    faqs: [
      {
        key: "access",
        title: "Access code says expired",
        body: "Open Pricing, redeem a fresh code, then refresh the chat view. If it still fails, contact support with your account email and code campaign.",
      },
      {
        key: "stream",
        title: "Chat stream failed or stopped",
        body: "Check connection stability, then retry from the same thread. If failures repeat, include timestamp, workspace/thread, and any request reference shown in the error toast.",
      },
      {
        key: "billing",
        title: "Subscription and billing controls",
        body: "Use Settings -> Plan & Billing to manage plan changes, cancellation, and account lifecycle controls. Billing portal availability depends on deployment configuration.",
      },
      {
        key: "memory",
        title: "Memory not visible or conflict not clear",
        body: "Open Memory from profile, review anything that needs attention, and resolve conflicts. Personal memory follows your account, while Space files and instructions stay scoped to the Space. If a memory notice appears but the item is missing, report the exact prompt and timestamp.",
      },
    ],
    contactTitle: "Contact support",
    contactBody:
      "For launch blockers or account incidents, email support with diagnostic details.",
    emailSubject: "ZAKI support request",
    emailTemplate: [
      "Issue summary:",
      "Workspace/thread:",
      "Expected result:",
      "Actual result:",
      "Timestamp + timezone:",
      "Screenshots / network details:",
    ],
  },
  ar: {
    badge: "الدعم",
    title: "هل تحتاج مساعدة؟",
    intro:
      "مسارات سريعة لمشكلات الوصول والفوترة والذاكرة واستقرار البث. استخدم هذه الصفحة قبل تصعيد مشكلات الإطلاق.",
    cards: [
      {
        key: "incident",
        title: "بلاغ عطل",
        body: "أرسل نص الخطأ كما ظهر، والمساحة أو المحادثة المتأثرة، والتوقيت.",
      },
      {
        key: "billing",
        title: "الفوترة والوصول",
        body: "قد تختلف حالة الخطة وامتيازات رموز الوصول حسب دورة حياة الحساب.",
      },
      {
        key: "security",
        title: "الأمان والامتثال",
        body: "طلبات الخصوصية والامتثال القانوني تُعالج عبر قناة الامتثال المخصصة.",
      },
    ],
    faqTitle: "الأسئلة الشائعة",
    faqs: [
      {
        key: "access",
        title: "رمز الوصول يظهر كمنتهي",
        body: "افتح صفحة التسعير، فعّل رمزًا جديدًا، ثم حدّث واجهة الدردشة. إذا استمرت المشكلة، تواصل مع الدعم مع بريد الحساب واسم الحملة الخاصة بالرمز.",
      },
      {
        key: "stream",
        title: "بث المحادثة توقف أو فشل",
        body: "تحقق من استقرار الاتصال ثم أعد المحاولة من نفس المحادثة. إذا تكرر الفشل، أرسل التوقيت والمساحة أو المحادثة وأي مرجع طلب ظهر في رسالة الخطأ.",
      },
      {
        key: "billing",
        title: "الاشتراك وأدوات الفوترة",
        body: "استخدم الإعدادات -> الخطة والفوترة لإدارة تغيير الخطة أو الإلغاء أو ضوابط دورة حياة الحساب. توافر بوابة الفوترة يعتمد على إعدادات النشر.",
      },
      {
        key: "memory",
        title: "الذاكرة غير ظاهرة أو التعارض غير واضح",
        body: "افتح الذاكرة من الملف الشخصي، وراجع ما يحتاج انتباهك، ثم احسم التعارضات. الذاكرة الشخصية ترافق حسابك، بينما تبقى ملفات وتعليمات المساحة داخل المساحة نفسها. إذا ظهر إشعار ذاكرة ولم تجد العنصر، أرسل النص الدقيق والتوقيت.",
      },
    ],
    contactTitle: "تواصل مع الدعم",
    contactBody:
      "في حال وجود عوائق إطلاق أو حوادث تخص الحساب، أرسل بريدًا للدعم مع التفاصيل التشخيصية.",
    emailSubject: "طلب دعم ZAKI",
    emailTemplate: [
      "ملخص المشكلة:",
      "المساحة/المحادثة:",
      "النتيجة المتوقعة:",
      "النتيجة الفعلية:",
      "التوقيت + المنطقة الزمنية:",
      "لقطات الشاشة / تفاصيل الشبكة:",
    ],
  },
} as const;

export function HelpPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const isRtl = locale === "ar";
  const copy = HELP_COPY[locale];
  const supportEmail = "info@novanuggets.com";
  const subject = useMemo(() => encodeURIComponent(copy.emailSubject), [copy.emailSubject]);
  const body = useMemo(
    () => encodeURIComponent(copy.emailTemplate.join("\n")),
    [copy.emailTemplate]
  );

  return (
    <div
      className="h-full overflow-y-auto zaki-scrollbar-fade px-6 py-10"
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
    >
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="rounded-[26px] border border-zaki-subtle bg-[linear-gradient(145deg,#fffdf9_0%,#fff7ed_62%,#f5e8d8_100%)] px-6 py-6 shadow-[0px_24px_56px_rgba(15,15,15,0.08)] dark:border-[#2a2018] dark:bg-[linear-gradient(150deg,#1a140f_0%,#130f0c_58%,#0c0a09_100%)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:border-[#2a2018] dark:bg-[#1d1712] dark:text-zaki-dark-muted">
            <LifeBuoy className="size-3.5" />
            {copy.badge}
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            {copy.intro}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zaki-subtle bg-white px-4 py-4 dark:border-[#2a2018] dark:bg-[#15110d]">
            <div className="inline-flex size-9 items-center justify-center rounded-xl bg-zaki-hover text-zaki-brand dark:bg-[#21170f]">
              <CircleAlert className="size-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">{copy.cards[0].title}</p>
            <p className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              {copy.cards[0].body}
            </p>
          </div>
          <div className="rounded-2xl border border-zaki-subtle bg-white px-4 py-4 dark:border-[#2a2018] dark:bg-[#15110d]">
            <div className="inline-flex size-9 items-center justify-center rounded-xl bg-zaki-hover text-zaki-accent dark:bg-[#132019]">
              <Wallet className="size-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">{copy.cards[1].title}</p>
            <p className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              {copy.cards[1].body}
            </p>
          </div>
          <div className="rounded-2xl border border-zaki-subtle bg-white px-4 py-4 dark:border-[#2a2018] dark:bg-[#15110d]">
            <div className="inline-flex size-9 items-center justify-center rounded-xl bg-zaki-hover text-zaki-secondary dark:bg-[#221a13]">
              <ShieldCheck className="size-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">{copy.cards[2].title}</p>
            <p className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              {copy.cards[2].body}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zaki-subtle bg-white px-5 py-5 dark:border-[#2a2018] dark:bg-[#15110d]">
          <h2 className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">{copy.faqTitle}</h2>
          <div className="mt-4 space-y-3">
            {copy.faqs.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-zaki-subtle bg-zaki-base/70 px-4 py-3 dark:border-[#2a2018] dark:bg-[#1b1511]"
              >
                <p className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">{item.title}</p>
                <p className="mt-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zaki-subtle bg-white px-5 py-5 dark:border-[#2a2018] dark:bg-[#15110d]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted">
            {copy.contactTitle}
          </h2>
          <p className="mt-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            {copy.contactBody}
          </p>
          <a
            className="mt-3 inline-flex items-center rounded-full border border-zaki-subtle bg-zaki-hover px-4 py-2 text-sm font-semibold text-zaki-primary hover:bg-zaki-elevated dark:border-[#2a2018] dark:bg-[#201812] dark:text-zaki-dark-primary dark:hover:bg-[#271d16]"
            href={`mailto:${supportEmail}?subject=${subject}&body=${body}`}
          >
            {supportEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
