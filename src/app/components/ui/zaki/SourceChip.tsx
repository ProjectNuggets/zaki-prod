import { CalendarClock, Globe, Image as ImageIcon, Send, Shield, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SourceChannel =
  | "telegram"
  | "web"
  | "api"
  | "session"
  | "image"
  | "unknown";

export type MemoryRole = "continuity" | "audit" | "index" | "user";

export interface SourceChipProps {
  channel?: SourceChannel | string | null;
  lane?: string | null;
  role?: MemoryRole | string | null;
  at?: string | null;
  imageRef?: string | null;
  locale?: string;
  className?: string;
}

interface ChannelMeta {
  icon: LucideIcon;
  label: string;
  tone: string;
}

const CHANNEL_META: Record<SourceChannel, ChannelMeta> = {
  telegram: {
    icon: Send,
    label: "Telegram",
    tone: "border-[#cfe6f7] bg-[#eaf5fc] text-[#2f5f84] dark:border-[#1f3a55] dark:bg-[#132232] dark:text-[#b5d6ef]",
  },
  web: {
    icon: Globe,
    label: "Web",
    tone: "border-[#dce4ef] bg-[#eef2f8] text-[#3c4a66] dark:border-[#2c3240] dark:bg-[#161a22] dark:text-[#c1cbdd]",
  },
  api: {
    icon: Zap,
    label: "API",
    tone: "border-[#e2ddf3] bg-[#f2effa] text-[#574a8f] dark:border-[#35305a] dark:bg-[#1e1b32] dark:text-[#cbc3f3]",
  },
  session: {
    icon: Sparkles,
    label: "Session close",
    tone: "border-[#f0d6cf] bg-[#fbefeb] text-[#9f3f32] dark:border-[#5a2e27] dark:bg-[#2a1613] dark:text-[#ffb8aa]",
  },
  image: {
    icon: ImageIcon,
    label: "Image",
    tone: "border-[#d5eedd] bg-[#ecf9f0] text-[#2f7352] dark:border-[#284433] dark:bg-[#162b21] dark:text-[#9fd7bc]",
  },
  unknown: {
    icon: Globe,
    label: "Unknown",
    tone: "border-zaki-subtle bg-zaki-hover text-zaki-muted dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#c9b8a4]",
  },
};

const ROLE_LABELS: Record<MemoryRole, string> = {
  continuity: "Continuity",
  audit: "Audit",
  index: "Index",
  user: "User",
};

function normalizeChannel(
  channel?: SourceChannel | string | null
): SourceChannel {
  const raw = String(channel || "").toLowerCase().trim();
  if (!raw) return "unknown";
  if (raw.startsWith("telegram")) return "telegram";
  if (raw === "web" || raw === "app" || raw === "webapp") return "web";
  if (raw === "api") return "api";
  if (raw === "session_end" || raw === "session") return "session";
  if (raw === "image" || raw.startsWith("image")) return "image";
  if (raw === "telegram_dm" || raw === "telegram_group") return "telegram";
  return "unknown";
}

function formatTimeShort(value?: string | null, locale?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = Date.now();
  const delta = now - parsed.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (delta < 60_000) return "just now";
  if (delta < day) {
    return parsed.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return parsed.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

function formatLaneLabel(lane?: string | null) {
  if (!lane) return null;
  const trimmed = String(lane).trim();
  if (!trimmed) return null;
  if (trimmed === "main") return "main";
  if (trimmed.startsWith("thread:")) {
    const topic = trimmed.slice("thread:".length);
    if (!topic) return "thread";
    return `thread · ${topic.slice(0, 20)}`;
  }
  return trimmed.slice(0, 24);
}

const CHIP_BASE =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]";

/**
 * Provenance chip row used on memories and messages.
 *
 * W3.1/W3.2 trust-critical display: shows channel, lane, role, and captured-at
 * on every entry so the user can see where a memory or message came from. No
 * hidden "advanced" toggle.
 */
export function SourceChip({
  channel,
  lane,
  role,
  at,
  imageRef,
  locale,
  className,
}: SourceChipProps) {
  const normalized = normalizeChannel(channel);
  const meta = CHANNEL_META[normalized];
  const ChannelIcon = meta.icon;
  const laneLabel = formatLaneLabel(lane);
  const timeLabel = formatTimeShort(at, locale);
  const roleLabel =
    role && ROLE_LABELS[role as MemoryRole] ? ROLE_LABELS[role as MemoryRole] : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        className
      )}
      data-testid="source-chip"
      data-channel={normalized}
      data-lane={lane || ""}
      data-role={role || ""}
    >
      <span className={cn(CHIP_BASE, meta.tone)} title={`Source: ${meta.label}`}>
        <ChannelIcon className="size-3" />
        {meta.label}
      </span>
      {laneLabel ? (
        <span
          className={cn(
            CHIP_BASE,
            "border-zaki-subtle bg-zaki-hover text-zaki-muted dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#c9b8a4]"
          )}
          title={`Lane: ${lane}`}
        >
          {laneLabel}
        </span>
      ) : null}
      {roleLabel ? (
        <span
          className={cn(
            CHIP_BASE,
            "border-[#e2ddf3] bg-[#f2effa] text-[#574a8f] dark:border-[#35305a] dark:bg-[#1e1b32] dark:text-[#cbc3f3]"
          )}
          title={`Role: ${roleLabel}`}
        >
          <Shield className="size-3" />
          {roleLabel}
        </span>
      ) : null}
      {imageRef ? (
        <span
          className={cn(
            CHIP_BASE,
            "border-[#d5eedd] bg-[#ecf9f0] text-[#2f7352] dark:border-[#284433] dark:bg-[#162b21] dark:text-[#9fd7bc]"
          )}
          title={`Image source: ${imageRef}`}
        >
          <ImageIcon className="size-3" />
          from image
        </span>
      ) : null}
      {timeLabel ? (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium text-zaki-muted"
          title={at || undefined}
        >
          <CalendarClock className="size-3" />
          {timeLabel}
        </span>
      ) : null}
    </div>
  );
}

export { normalizeChannel, formatLaneLabel, formatTimeShort };
