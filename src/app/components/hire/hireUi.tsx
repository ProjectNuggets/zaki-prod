import type { ReactNode } from "react";
import {
  Activity,
  BriefcaseBusiness,
  Clock3,
  Upload,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  HireHealth,
  HireLead,
  HireLeadStatus,
  HireProfile,
  HireReadiness,
} from "@/lib/hireApi";

export type HireView = "dashboard" | "pipeline" | "profile" | "import" | "activity";

export type HireIdentityDraft = {
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  website_url: string;
  city: string;
};

export const HIRE_VIEWS: Array<{ view: HireView; label: string; icon: ReactNode }> = [
  { view: "dashboard", label: "dashboard", icon: <Activity className="size-4" /> },
  { view: "pipeline", label: "pipeline", icon: <BriefcaseBusiness className="size-4" /> },
  { view: "profile", label: "profile", icon: <User className="size-4" /> },
  { view: "import", label: "import", icon: <Upload className="size-4" /> },
  { view: "activity", label: "activity", icon: <Clock3 className="size-4" /> },
];

export const LEAD_STATUSES: HireLeadStatus[] = [
  "discovered",
  "evaluating",
  "tailoring",
  "approved",
  "applied",
  "interviewing",
  "rejected",
  "discarded",
];

export function normalizeHireView(value: string | null): HireView {
  const normalized = String(value || "dashboard").trim().toLowerCase();
  if (["pipeline", "profile", "import", "activity"].includes(normalized)) {
    return normalized as HireView;
  }
  return "dashboard";
}

export function leadId(lead: HireLead | null | undefined) {
  return String(lead?.job_id || lead?.id || "").trim();
}

export function normalizeLeads(payload: HireLead[] | { items?: HireLead[]; total?: number } | undefined) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function profileCandidate(profile: HireProfile | undefined) {
  const candidate = profile?.candidate || {};
  return {
    n: String(profile?.n || candidate.n || candidate.name || ""),
    s: String(profile?.s || candidate.s || candidate.summary || ""),
  };
}

export function profileIdentity(profile: HireProfile | undefined): HireIdentityDraft {
  return {
    email: String(profile?.identity?.email || ""),
    phone: String(profile?.identity?.phone || ""),
    linkedin_url: String(profile?.identity?.linkedin_url || ""),
    github_url: String(profile?.identity?.github_url || ""),
    website_url: String(profile?.identity?.website_url || ""),
    city: String(profile?.identity?.city || ""),
  };
}

export function profileSignalCount(profile: HireProfile | undefined) {
  if (!profile) return 0;
  const experience = profile.exp || profile.experience || [];
  return [
    profileCandidate(profile).n,
    profileCandidate(profile).s,
    profile.skills?.length,
    experience.length,
    profile.projects?.length,
    profile.education?.length,
    profile.certifications?.length,
    profile.achievements?.length,
  ].filter(Boolean).length;
}

export function statusTone(status: string | undefined) {
  const normalized = String(status || "unknown").toLowerCase();
  if (["approved", "applied", "interviewing", "accepted"].includes(normalized)) {
    return "zaki-hire-status-success";
  }
  if (["tailoring", "evaluating", "matched"].includes(normalized)) {
    return "zaki-hire-status-warn";
  }
  if (["rejected", "discarded"].includes(normalized)) {
    return "zaki-hire-status-danger";
  }
  return "zaki-hire-status-muted";
}

export function scoreTone(score: number | undefined) {
  const value = Number(score || 0);
  if (value >= 80) return "zaki-hire-score-high";
  if (value >= 60) return "zaki-hire-score-mid";
  return "zaki-hire-score-low";
}

export function shortDate(value: string | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function hostName(value: string | undefined) {
  if (!value) return "";
  try {
    return new URL(value).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function displayScore(score: number | undefined) {
  return Number.isFinite(Number(score)) ? String(Math.round(Number(score))) : "-";
}

export function hasGeneratedPackage(lead: HireLead | null | undefined) {
  return Boolean(lead?.resume_asset || lead?.cover_letter_asset || lead?.asset);
}

export function packageStateLabel(lead: HireLead | null | undefined) {
  if (!lead) return "No lead selected";
  if (hasGeneratedPackage(lead)) return "Package ready";
  if (String(lead.status || "").toLowerCase() === "tailoring") return "Generating";
  return "Not generated";
}

export function leadPrimarySignal(lead: HireLead | null | undefined) {
  return (
    lead?.match_points?.[0] ||
    lead?.reason ||
    lead?.signal_reason ||
    lead?.tech_stack?.slice(0, 2).join(", ") ||
    "Review fit evidence"
  );
}

export function isPositiveLeadStatus(status: string | undefined) {
  return ["approved", "applied", "interviewing", "accepted"].includes(String(status || "").toLowerCase());
}

export function needsReviewLead(lead: HireLead) {
  const status = String(lead.status || "").toLowerCase();
  return ["discovered", "evaluating", "matched", "tailoring"].includes(status);
}

export function isHealthy(health: HireHealth | undefined) {
  return ["alive", "ok", "ready", "healthy"].includes(String(health?.status || "").toLowerCase());
}

export type HireProductState =
  | "loading"
  | "operational"
  | "disabled"
  | "degraded"
  | "unavailable";

export function hireProductState(readiness: HireReadiness | undefined, loading = false, error?: unknown): HireProductState {
  if (loading && !readiness) return "loading";
  const status = String(readiness?.status || "").trim().toLowerCase();
  if (["degraded", "disabled"].includes(status)) {
    return status as HireProductState;
  }
  if (["not_configured", "activating"].includes(status)) return "disabled";
  if (readiness?.available === true) return "operational";
  if (error) return "degraded";
  return "unavailable";
}

export function hireReady(readiness: HireReadiness | undefined) {
  return hireProductState(readiness) === "operational";
}

export function readinessTone(readiness: HireReadiness | undefined, loading = false, error?: unknown) {
  const state = hireProductState(readiness, loading, error);
  if (state === "operational") return "zaki-hire-status-success";
  if (state === "disabled") {
    return "zaki-hire-status-warn";
  }
  if (state === "degraded" || state === "unavailable") return "zaki-hire-status-danger";
  return "zaki-hire-status-muted";
}

export function readinessLabel(readiness: HireReadiness | undefined, loading: boolean) {
  const state = hireProductState(readiness, loading);
  if (state === "loading") return "loading";
  if (state === "operational") return "operational";
  return state;
}

export function extractError(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

export function HireStatusChip({ status }: { status: string | undefined }) {
  return (
    <span className={cn("zaki-hire-status", statusTone(status))}>
      <span aria-hidden="true" className="zaki-hire-status-dot" />
      {status || "unknown"}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="zaki-hire-empty p-6">
      <p className="zaki-hire-label-strong">{title}</p>
      <p className="zaki-hire-text mt-2">{body}</p>
    </div>
  );
}
