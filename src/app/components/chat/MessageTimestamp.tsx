import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type FormattedMessageTimestamp = {
  iso: string;
  shortLabel: string;
  fullLabel: string;
};

function parseDate(value?: string | number | null): Date | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isYesterday(date: Date, now: Date) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameDay(date, yesterday);
}

function clockLabel(date: Date, locale?: string) {
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMessageTimestamp(
  value?: string | number | null,
  locale?: string,
  now = new Date(),
): FormattedMessageTimestamp | null {
  const date = parseDate(value);
  if (!date) return null;

  const time = clockLabel(date, locale);
  const shortLabel = isSameDay(date, now)
    ? time
    : isYesterday(date, now)
      ? `Yesterday · ${time}`
      : date.getFullYear() === now.getFullYear()
        ? `${date.toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
          })} · ${time}`
        : `${date.toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })} · ${time}`;
  const fullLabel = date.toLocaleString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  return {
    iso: date.toISOString(),
    shortLabel,
    fullLabel,
  };
}

export function MessageTimestamp({
  value,
  role,
  locale,
}: {
  value?: string | number | null;
  role: "assistant" | "user";
  locale?: string;
}) {
  const now = useMemo(() => new Date(), []);
  const stamp = useMemo(
    () => formatMessageTimestamp(value, locale, now),
    [locale, now, value],
  );
  if (!stamp) return null;

  return (
    <time
      className={cn("zaki-message-timestamp", role === "user" && "zaki-message-timestamp--user")}
      dateTime={stamp.iso}
      title={stamp.fullLabel}
      aria-label={`Message sent ${stamp.fullLabel}`}
      data-testid="message-timestamp"
      tabIndex={0}
    >
      <span className="zaki-message-timestamp__short">{stamp.shortLabel}</span>
      <span className="zaki-message-timestamp__detail" aria-hidden="true">
        {stamp.fullLabel}
      </span>
    </time>
  );
}
