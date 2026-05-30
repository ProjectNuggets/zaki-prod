// 2026-05-08 — Composer-level "Schedule a follow-up" dialog.
//
// Triggered from the plus menu in zaki bot mode. Lets the user pick a
// quick-time chip (in 1 hour / tomorrow 9am / weekdays 9am / custom)
// plus a prompt that ZAKI will run when the time fires. Submitting
// appends a job via the central cron BFF.

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SheetShell } from "@/app/components/ui/zaki";
import { cn } from "@/lib/utils";
import {
  scheduleAgentFollowUp,
  type FollowUpSchedule,
} from "@/queries/useAgentScheduledFollowUps";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Optional starting prompt (e.g. composer draft) so the user doesn't
   *  retype what they were about to send. */
  defaultPrompt?: string;
};

type QuickKey = "in1h" | "in4h" | "tomorrow9" | "weekdays9" | "weekly_mon9" | "custom";

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function defaultCustomDateTime(): string {
  // Default custom datetime to "tomorrow at 09:00" in local time, in
  // the input[type=datetime-local] format YYYY-MM-DDTHH:MM.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatPreviewLocal(date: Date, isRtl: boolean): string {
  return date.toLocaleString(isRtl ? "ar" : undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ScheduleFollowUpDialog({ isOpen, onClose, defaultPrompt = "" }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");

  const [quick, setQuick] = useState<QuickKey>("in1h");
  const [customDateTime, setCustomDateTime] = useState(defaultCustomDateTime());
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Capture the parent's prompt once at open so subsequent keystrokes
  // in the underlying composer don't clobber the user's edits in the
  // dialog (P2-05). Stash defaultPrompt in a ref to keep the effect
  // dependency stable.
  const defaultPromptRef = useRef(defaultPrompt);
  defaultPromptRef.current = defaultPrompt;
  useEffect(() => {
    if (isOpen) {
      setPrompt(defaultPromptRef.current || "");
      setName("");
      setQuick("in1h");
      setCustomDateTime(defaultCustomDateTime());
    }
  }, [isOpen]);

  const schedule: FollowUpSchedule | null = useMemo(() => {
    switch (quick) {
      case "in1h":
        return { kind: "in_minutes", minutes: 60 };
      case "in4h":
        return { kind: "in_minutes", minutes: 240 };
      case "tomorrow9": {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return { kind: "at_datetime", date: d };
      }
      case "weekdays9":
        return { kind: "weekdays", hour: 9, minute: 0 };
      case "weekly_mon9":
        return { kind: "weekly", dow: 1, hour: 9, minute: 0 };
      case "custom": {
        const parsed = customDateTime ? new Date(customDateTime) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) return null;
        if (parsed.getTime() <= Date.now()) return null;
        return { kind: "at_datetime", date: parsed };
      }
    }
  }, [quick, customDateTime]);

  const previewText = useMemo(() => {
    if (!schedule) return null;
    if (schedule.kind === "in_minutes") {
      const target = new Date(Date.now() + schedule.minutes * 60_000);
      return formatPreviewLocal(target, isRtl);
    }
    if (schedule.kind === "at_datetime") {
      return formatPreviewLocal(schedule.date, isRtl);
    }
    if (schedule.kind === "weekdays") {
      return t("scheduleFollowUp.preview.weekdays", {
        defaultValue: "Every weekday at {{time}}",
        time: `${pad(schedule.hour)}:${pad(schedule.minute)}`,
      });
    }
    if (schedule.kind === "weekly") {
      // Localize the weekday via Intl. Anchor on a known Sunday
      // (2024-01-07) and step `dow` days forward so the formatter sees
      // the right weekday in the active locale.
      const anchor = new Date(2024, 0, 7 + schedule.dow);
      const dayName = new Intl.DateTimeFormat(isRtl ? "ar" : undefined, {
        weekday: "long",
      }).format(anchor);
      return t("scheduleFollowUp.preview.weekly", {
        defaultValue: "Every {{day}} at {{time}}",
        day: dayName,
        time: `${pad(schedule.hour)}:${pad(schedule.minute)}`,
      });
    }
    return null;
  }, [schedule, isRtl, t]);

  const canSubmit = Boolean(prompt.trim()) && schedule !== null && !submitting;

  const onSubmit = async () => {
    if (!canSubmit || !schedule) return;
    setSubmitting(true);
    try {
      const compiled = await scheduleAgentFollowUp({
        schedule,
        prompt,
        name: name || null,
      });
      const targetLabel = compiled.firesAt
        ? formatPreviewLocal(compiled.firesAt, isRtl)
        : previewText || compiled.expression;
      toast.success(
        t("scheduleFollowUp.toast.success", {
          defaultValue: "Follow-up scheduled. {{when}}.",
          when: targetLabel,
        }),
      );
      onClose();
    } catch {
      toast.error(
        t("scheduleFollowUp.toast.error", {
          defaultValue: "Couldn't schedule the follow-up. Try again.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const quickOptions: { key: QuickKey; labelKey: string; defaultLabel: string }[] = [
    { key: "in1h", labelKey: "scheduleFollowUp.quick.in1h", defaultLabel: "In 1 hour" },
    { key: "in4h", labelKey: "scheduleFollowUp.quick.in4h", defaultLabel: "In 4 hours" },
    { key: "tomorrow9", labelKey: "scheduleFollowUp.quick.tomorrow9", defaultLabel: "Tomorrow 9am" },
    { key: "weekdays9", labelKey: "scheduleFollowUp.quick.weekdays9", defaultLabel: "Weekdays 9am" },
    { key: "weekly_mon9", labelKey: "scheduleFollowUp.quick.weeklyMon9", defaultLabel: "Mondays 9am" },
    { key: "custom", labelKey: "scheduleFollowUp.quick.custom", defaultLabel: "Custom date and time" },
  ];

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("scheduleFollowUp.title", { defaultValue: "Schedule a follow-up" })}
      subtitle={t("scheduleFollowUp.subtitle", {
        defaultValue: "ZAKI will run the prompt at the time you pick.",
      })}
      icon={<CalendarClock className="size-4" />}
      width="md"
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zaki-muted">
            {t("scheduleFollowUp.whenLabel", { defaultValue: "When" })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickOptions.map((opt) => {
              const selected = opt.key === quick;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "bg-zaki-brand text-white shadow-[0_8px_20px_rgba(241,2,2,0.18)]"
                      : "border border-zaki-strong bg-zaki-elevated text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary",
                  )}
                  onClick={() => setQuick(opt.key)}
                >
                  {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
                </button>
              );
            })}
          </div>
          {quick === "custom" ? (
            <div className="mt-2">
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210]"
              />
            </div>
          ) : null}
          {previewText ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs text-zaki-muted">
              <span>
                {t("scheduleFollowUp.firesAt", { defaultValue: "Fires:" })}{" "}
                <span className="text-zaki-secondary">{previewText}</span>
              </span>
              {schedule && (schedule.kind === "in_minutes" || schedule.kind === "at_datetime") ? (
                <span className="inline-flex items-center rounded-full border border-zaki-strong bg-zaki-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zaki-secondary">
                  {t("scheduleFollowUp.oneShotChip", { defaultValue: "One-time" })}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-zaki-strong bg-zaki-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zaki-secondary">
                  {t("scheduleFollowUp.recurringChip", { defaultValue: "Recurring" })}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-2 text-2xs text-zaki-warning">
              {t("scheduleFollowUp.invalid", {
                defaultValue: "Pick a future date and time.",
              })}
            </div>
          )}
          {schedule && (schedule.kind === "in_minutes" || schedule.kind === "at_datetime") ? (
            <div className="mt-1 text-2xs text-zaki-muted leading-snug">
              {t("scheduleFollowUp.oneShotHint", {
                defaultValue:
                  "Fires once. For a recurring task, ask ZAKI in chat: \"remind me every weekday at 9am to ...\".",
              })}
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zaki-muted">
            {t("scheduleFollowUp.promptLabel", { defaultValue: "Prompt" })}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder={t("scheduleFollowUp.promptPlaceholder", {
              defaultValue: "What should ZAKI do at that time?",
            })}
            className="w-full resize-none rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210]"
          />
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zaki-muted">
            {t("scheduleFollowUp.nameLabel", { defaultValue: "Name (optional)" })}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("scheduleFollowUp.namePlaceholder", {
              defaultValue: "Morning brief",
            })}
            className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zaki-strong px-4 py-2 text-xs text-zaki-primary transition-colors hover:bg-zaki-hover"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 rounded-full bg-zaki-brand px-4 py-2 text-xs font-medium text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {t("scheduleFollowUp.submit", { defaultValue: "Schedule" })}
          </button>
        </div>
      </div>
    </SheetShell>
  );
}
