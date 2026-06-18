import { ArrowRight, CircleDot, LockKeyhole, SendHorizontal } from "lucide-react";
import type { Locale } from "../lib/content";
import { appHandoffUrl, productHandoffUrl, websiteProductHandoffs } from "../lib/appHandoff";
import { Reveal } from "./Reveal";

const laneLabels = {
  chat: { en: "Chat", ar: "الدردشة" },
  agent: { en: "Agent", ar: "الوكيل" },
  brain: { en: "Brain", ar: "الذاكرة" },
  learn: { en: "Learn", ar: "التعلّم" },
  design: { en: "Design", ar: "التصميم" },
  hire: { en: "Career", ar: "Career" },
} as const;

const localizedStatus = {
  Live: { en: "live", ar: "مباشر" },
  Included: { en: "included", ar: "مشمول" },
  "Private access": { en: "private access", ar: "وصول خاص" },
  Waitlist: { en: "waitlist", ar: "انتظار" },
} as const;

export function Hero({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const lanes = websiteProductHandoffs.map((product) => ({
    label: laneLabels[product.id][locale],
    state:
      localizedStatus[product.statusLabel as keyof typeof localizedStatus]?.[locale] ||
      product.statusLabel.toLowerCase(),
  }));
  const appHref = appHandoffUrl("/", "website_home_command", "dashboard");
  const signupHref = productHandoffUrl("agent");

  return (
    <section className="border-b border-zk-border px-5 pb-2 pt-3 md:px-8 md:pb-8 md:pt-8">
      <div className="mx-auto max-w-6xl">
        <Reveal variant="fade">
          <div className="grid min-h-[calc(100vh-14rem)] content-center gap-8 lg:min-h-[calc(100vh-13rem)]">
            <div className="grid border border-zk-border-strong bg-zk-bg lg:grid-cols-[minmax(0,1fr)_310px]">
              <div className="border-b border-zk-border lg:border-b-0 lg:border-e">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zk-border bg-[var(--zk-bg-sunken)] px-4 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-zk-text-tertiary md:px-5">
                  <span className="inline-flex items-center gap-2 text-zk-text">
                    <span className="size-1.5 bg-zk-success" />
                    {isArabic ? "جلسة مجهولة متاحة" : "Anonymous session online"}
                  </span>
                  <span>{isArabic ? "الخطة المجانية" : "Free weekly credits"}</span>
                  <span>{isArabic ? "لا إعداد مطلوب" : "No setup required"}</span>
                </div>

                <div className="px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
                  <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-zk-accent">
                    {isArabic ? "مركز أوامر زكي" : "ZAKI command entry"}
                  </p>
                  <h1 className="mt-4 max-w-[13ch] font-mono-ui text-[clamp(2.25rem,7vw,4.75rem)] leading-[0.98] tracking-normal text-zk-text">
                    {isArabic ? "ابدأ من أمر واحد." : "Start from one command."}
                  </h1>
                  <p className="mt-5 max-w-[64ch] text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
                    {isArabic
                      ? "اختر المسار، اكتب ما تريد، واجعل زكي يحوّل المحادثة إلى عمل يمكن متابعته عند تسجيل الدخول."
                      : "Pick a lane, write the work once, and let ZAKI carry the prompt into Chat or Agent when you sign in."}
                  </p>

                  <form action={appHandoffUrl("/spaces").split("?")[0]} method="get" className="mt-8 border border-zk-border-strong bg-zk-bg-raised">
                    <input type="hidden" name="source" value="website_home_command" />
                    <input type="hidden" name="intent" value="anonymous_command" />
                    <input type="hidden" name="product" value="spaces" />
                    <div className="grid grid-cols-3 border-b border-zk-border md:grid-cols-6">
                      {lanes.map((lane, index) => (
                        <button
                          key={lane.label}
                          type="button"
                          className={`min-h-11 border-b border-e border-zk-border px-3 py-2 text-start font-mono-ui text-[10px] uppercase tracking-[0.15em] transition-colors hover:bg-zk-surface-hover md:border-b-0 ${
                            index === 0 ? "bg-zk-surface text-zk-accent" : "text-zk-text-tertiary"
                          }`}
                          aria-pressed={index === 0}
                        >
                          <span className="block text-zk-text">{lane.label}</span>
                          <span className="mt-1 block text-[9px] text-zk-text-tertiary">{lane.state}</span>
                        </button>
                      ))}
                    </div>
                    <label htmlFor="home-command" className="sr-only">
                      {isArabic ? "اكتب أمرك لزكي" : "Write your command for ZAKI"}
                    </label>
                    <textarea
                      id="home-command"
                      name="prompt"
                      rows={5}
                      className="min-h-[104px] w-full resize-none border-0 bg-transparent px-4 py-4 font-mono-ui text-sm leading-7 text-zk-text outline-none placeholder:text-zk-text-tertiary md:min-h-[144px] md:px-5"
                      placeholder={
                        isArabic
                          ? "مثال: لخّص هذا المشروع وحدد أول ثلاث خطوات..."
                          : "Example: summarize this project and identify the first three steps..."
                      }
                    />
                    <div className="flex flex-col gap-3 border-t border-zk-border bg-[var(--zk-bg-sunken)] px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                      <div className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-zk-text-tertiary">
                        <span className="text-zk-text">{isArabic ? "الرصيد" : "Credits"}</span>
                        <span className="px-2 text-zk-text-ghost">/</span>
                        <span>{isArabic ? "مخصص أسبوعي مجاني" : "Free weekly allocation"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={signupHref}
                          className="inline-flex min-h-10 items-center gap-2 border border-zk-border-strong px-3 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-zk-text-secondary transition-colors hover:border-zk-text-tertiary hover:text-zk-text"
                        >
                          <LockKeyhole className="size-3.5" strokeWidth={1.5} />
                          {isArabic ? "احفظ العمل" : "Keep work"}
                        </a>
                        <button
                          type="submit"
                          className="inline-flex min-h-10 items-center gap-2 border border-zk-accent bg-zk-accent px-4 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-zk-accent-hover"
                        >
                          <SendHorizontal className="size-3.5" strokeWidth={1.5} />
                          {isArabic ? "ابدأ" : "Start run"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              <aside className="hidden bg-zk-bg-raised md:block">
                <div className="border-b border-zk-border px-4 py-3 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-zk-text-tertiary md:px-5">
                  {isArabic ? "حالة الدخول" : "Entry state"}
                </div>
                <div className="grid gap-0">
                  {[
                    [isArabic ? "المتاح الآن" : "Available now", isArabic ? "الدردشة و Agent و Brain" : "Chat, Agent, and Brain"],
                    [isArabic ? "بعد تسجيل الدخول" : "After sign in", isArabic ? "الحفظ، الرفع، التصدير" : "Save, upload, export"],
                    [isArabic ? "مسارات مقيّدة" : "Gated lanes", isArabic ? "Learn وCareer وصول خاص، Design انتظار" : "Learn and Career private access, Design waitlist"],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[24px_1fr] gap-3 border-b border-zk-border px-4 py-4 md:px-5">
                      <CircleDot className="mt-0.5 size-3.5 text-zk-accent" strokeWidth={1.5} />
                      <div>
                        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-zk-text-tertiary">{label}</p>
                        <p className="mt-1 text-sm leading-6 text-zk-text">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-5 md:px-5">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-zk-accent">
                    {isArabic ? "مسار مباشر" : "Direct path"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-zk-text-secondary">
                    {isArabic
                      ? "استخدم الدردشة فوراً. عندما تحتاج ذاكرة مستمرة أو ملفات أو تصدير، سجّل الدخول والمتابعة محفوظة."
                      : "Use Chat immediately. When you need persistent memory, files, or exports, sign in and continue with the same intent."}
                  </p>
                  <a
                    href={appHref}
                    className="mt-5 inline-flex min-h-10 items-center gap-2 border border-zk-border-strong px-3 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-zk-text transition-colors hover:border-zk-accent hover:text-zk-accent"
                  >
                    {isArabic ? "افتح زكي" : "Open ZAKI"}
                    <ArrowRight className="size-3.5" strokeWidth={1.5} />
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
