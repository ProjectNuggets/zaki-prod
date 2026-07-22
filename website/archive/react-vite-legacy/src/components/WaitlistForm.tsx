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

export function WaitlistForm({ locale, source = "website_bot" }: { locale: Locale; source?: string }) {
  const isArabic = locale === "ar";
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
          ? "تم تسجيلك. سنرسل لك تحديثات تحديثات زكي."
          : "You're in. We'll send you ZAKI Agent updates.",
    });
  }

  const selectClasses = "min-h-12 rounded-full border border-zk-border-strong bg-zk-surface px-4 py-3 text-sm text-zk-text outline-none transition-[border-color,box-shadow] duration-200 focus:border-zk-accent focus:shadow-[0_0_0_3px_rgba(241,2,2,0.12)]";

  const optionClasses = "bg-zk-surface text-zk-text";
  const mutedClasses = "text-zk-text-secondary";
  const accentClasses = "text-zk-accent";

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
            {isArabic ? "تحديثات الوصول القادم" : "future access updates"}
          </span>
          <span className="mt-1.5 block text-xs leading-5">
            {isArabic
              ? "نستخدم هذه البيانات فقط للتواصل حول تحديثات زكي."
              : "We use this only to contact you about ZAKI product access updates."}
          </span>
        </p>
        <Button type="submit" disabled={isLocked} className="shrink-0">
          {status.kind === "submitting"
            ? isArabic ? "جارٍ التسجيل..." : "Submitting..."
            : status.kind === "success"
              ? isArabic ? "تم التسجيل ✓" : "Registered ✓"
              : isArabic ? "تابع تحديثات زكي" : "Get ZAKI updates"}
        </Button>
      </div>
      {status.kind === "error" || status.kind === "success" ? (
        <p
          ref={statusRef}
          tabIndex={-1}
          aria-live="polite"
          className={
            status.kind === "error"
              ? "rounded-xl border border-zk-error/25 bg-zk-error/[0.06] px-4 py-3 text-sm text-zk-error focus:outline-none"
              : "rounded-xl border border-zk-success/20 bg-zk-success/[0.06] px-4 py-3 text-sm text-zk-success focus:outline-none"
          }
        >
          {status.text}
        </p>
      ) : null}
    </form>
  );
}
