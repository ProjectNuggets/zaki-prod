import { useEffect, useRef, useState } from "react";
import type { Locale } from "../lib/content";
import { submitWaitlist } from "../lib/waitlist";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const roles = {
  en: ["Founder / operator", "Researcher", "Creator / writer", "Student", "Builder / engineer"],
  ar: ["مؤسس / مشغّل", "باحث", "صانع محتوى / كاتب", "طالب", "بنّاء / مهندس"],
};

type WaitlistUiState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; duplicate: false; text: string }
  | { kind: "success"; duplicate: true; text: string }
  | { kind: "error"; text: string };

export function WaitlistForm({ locale, source = "website_bot", variant = "light" }: { locale: Locale; source?: string; variant?: "light" | "dark" }) {
  const isArabic = locale === "ar";
  const isDark = variant === "dark";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(roles[locale][0]);
  const [useCase, setUseCase] = useState("");
  const [status, setStatus] = useState<WaitlistUiState>({ kind: "idle" });
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const isLocked = status.kind === "submitting" || status.kind === "success";

  useEffect(() => {
    if (status.kind === "idle") return;
    statusRef.current?.focus();
  }, [status]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "submitting" });
    const response = await submitWaitlist({ email, name, role, useCase, locale, source });
    if (!response.success) {
      setStatus({
        kind: "error",
        text: isArabic ? "تعذر تسجيل الطلب الآن. حاول مرة أخرى." : "Unable to register right now. Please try again.",
      });
      return;
    }
    setStatus({
      kind: "success",
      duplicate: Boolean(response.duplicate),
      text: response.duplicate
        ? isArabic
          ? "هذا البريد مسجل بالفعل. سنبقيك على اطلاع."
          : "This email is already registered. We'll keep you updated."
        : isArabic
          ? "تم تسجيلك. سنرسل لك تحديثات بيتا زكي."
          : "You're in. We'll send you ZAKI beta updates.",
    });
  }

  const selectClasses = isDark
    ? "min-h-12 rounded-pill border border-line-dark-strong bg-white/[0.04] px-4 py-3 text-sm text-bot-text outline-none transition-[border-color,box-shadow] duration-200 focus:border-bot-accent focus:shadow-[0_0_0_3px_rgba(255,77,46,0.12)]"
    : "min-h-12 rounded-pill border border-line-strong bg-chat-surface px-4 py-3 text-sm text-chat-text outline-none transition-[border-color,box-shadow] duration-200 focus:border-chat-accent focus:shadow-[0_0_0_3px_rgba(210,68,48,0.10)]";

  const optionClasses = isDark ? "bg-[#1c1c1c] text-bot-text" : "bg-white text-chat-text";
  const mutedClasses = isDark ? "text-bot-muted" : "text-chat-muted";
  const accentClasses = isDark ? "text-bot-accent" : "text-chat-accent";

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">{isArabic ? "البريد الإلكتروني" : "Email"}</span>
          <Input
            type="email"
            required
            value={email}
            disabled={isLocked}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">{isArabic ? "الاسم" : "Name"}</span>
          <Input
            value={name}
            disabled={isLocked}
            onChange={(event) => setName(event.target.value)}
            placeholder={isArabic ? "اختياري" : "Optional"}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">{isArabic ? "الدور" : "Role"}</span>
        <select
          value={role}
          disabled={isLocked}
          onChange={(event) => setRole(event.target.value)}
          className={selectClasses}
        >
          {roles[locale].map((option) => (
            <option key={option} value={option} className={optionClasses}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">{isArabic ? "كيف ستستخدم زكي؟" : "Primary use case"}</span>
        <Textarea
          value={useCase}
          disabled={isLocked}
          onChange={(event) => setUseCase(event.target.value)}
          placeholder={isArabic ? "ما الذي تريد من زكي أن يقوم به؟" : "What do you want ZAKI to help you operate?"}
        />
      </label>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <p className={`text-sm leading-6 ${mutedClasses}`}>
          <span className={`font-mono-ui text-[11px] uppercase tracking-[0.2em] ${accentClasses}`}>
            {isArabic ? "5 رسائل / 24 ساعة" : "5 messages / 24h"}
          </span>
          <span className="mt-1.5 block text-xs leading-5">
            {isArabic
              ? "نستخدم هذه البيانات فقط للتواصل حول بيتا زكي."
              : "We use this only to contact you about ZAKI beta access."}
          </span>
        </p>
        <Button type="submit" disabled={isLocked} className="shrink-0">
          {status.kind === "submitting"
            ? isArabic ? "جارٍ التسجيل..." : "Submitting..."
            : status.kind === "success"
              ? isArabic ? "تم التسجيل ✓" : "Registered ✓"
              : isArabic ? "انضم إلى بيتا زكي" : "Join ZAKI Beta"}
        </Button>
      </div>
      {status.kind === "error" || status.kind === "success" ? (
        <p
          ref={statusRef}
          tabIndex={-1}
          aria-live="polite"
          className={
            status.kind === "error"
              ? "rounded-pill border border-[rgba(182,69,53,0.22)] bg-[rgba(182,69,53,0.06)] px-4 py-3 text-sm text-[#e05545] focus:outline-none"
              : "rounded-pill border border-[rgba(38,103,74,0.20)] bg-[rgba(38,103,74,0.06)] px-4 py-3 text-sm text-[#3a9e6b] focus:outline-none"
          }
        >
          {status.text}
        </p>
      ) : null}
    </form>
  );
}
