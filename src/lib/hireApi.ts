import { backendAuthRequest } from "@/lib/api";

export type HireJson = Record<string, unknown>;

export type HireLeadStatus =
  | "discovered"
  | "evaluating"
  | "tailoring"
  | "approved"
  | "applied"
  | "interviewing"
  | "rejected"
  | "accepted"
  | "discarded"
  | "matched"
  | "bidding"
  | "proposal_sent"
  | "awarded"
  | "completed";

export type HireLead = {
  job_id?: string;
  id?: string;
  title?: string;
  company?: string;
  url?: string;
  platform?: string;
  kind?: string;
  text?: string;
  description?: string;
  location?: string;
  status?: HireLeadStatus | string;
  score?: number;
  signal_score?: number;
  seniority_level?: string;
  reason?: string;
  signal_reason?: string;
  match_points?: string[];
  gaps?: string[];
  tech_stack?: string[];
  selected_projects?: string[];
  resume_asset?: string;
  cover_letter_asset?: string;
  asset?: string;
  outreach_reply?: string;
  outreach_dm?: string;
  outreach_email?: string;
  followup_due_at?: string;
  last_contacted_at?: string;
  source_meta?: HireJson;
  created_at?: string;
};

export type HireProfile = {
  n?: string;
  s?: string;
  candidate?: {
    n?: string;
    name?: string;
    s?: string;
    summary?: string;
  };
  identity?: {
    email?: string;
    phone?: string;
    linkedin_url?: string;
    github_url?: string;
    website_url?: string;
    city?: string;
  };
  skills?: Array<{ id?: string; n?: string; name?: string; cat?: string; category?: string }>;
  exp?: Array<{ id?: string; role?: string; co?: string; company?: string; period?: string; d?: string }>;
  experience?: Array<{ id?: string; role?: string; company?: string; period?: string; description?: string }>;
  projects?: Array<{ id?: string; title?: string; stack?: string; repo?: string; impact?: string }>;
  education?: unknown[];
  certifications?: unknown[];
  achievements?: unknown[];
};

export type HireTaskStatus = {
  scanning?: boolean;
  reevaluating?: boolean;
};

export type HireReadinessStatus =
  | "ready"
  | "disabled"
  | "not_configured"
  | "activating"
  | "unavailable"
  | "checking";

export type HireReadiness = {
  success?: boolean;
  surface?: "hire" | string;
  enabled?: boolean;
  configured?: boolean;
  available?: boolean;
  status?: HireReadinessStatus | string;
  message?: string;
  generatedAt?: string;
  requestId?: string;
  engine?: {
    online?: boolean;
    status?: string;
    scanning?: boolean;
    reevaluating?: boolean;
  };
  capabilities?: {
    dashboard?: boolean;
    pipeline?: boolean;
    profile?: boolean;
    imports?: boolean;
    sourceScan?: boolean;
    generation?: boolean;
    browserAutomation?: boolean;
    autoApply?: boolean;
  };
  operations?: {
    operatorManagedSettings?: boolean;
    userProviderSettingsExposed?: boolean;
    billingManagedCentrally?: boolean;
    quotaManagedCentrally?: boolean;
  };
};

export type HireHealth = {
  status?: string;
  uptime_seconds?: number;
  details_available?: boolean;
};

export type HireConsentAction = "form_read" | "apply_preview" | "auto_apply";

type HireRequestOptions = {
  method?: string;
  body?: HireJson;
  formData?: FormData;
  headers?: HeadersInit;
};

const HIRE_PATH_PATTERN = /^\/api\/hire(?:\/[A-Za-z0-9/_:.,~@?&=%+\-[\]]*)?$/;

export const hireKeys = {
  readiness: ["hire", "readiness"] as const,
  health: ["hire", "health"] as const,
  status: ["hire", "status"] as const,
  leads: ["hire", "leads"] as const,
  profile: ["hire", "profile"] as const,
};

function assertHireApiPath(path: string) {
  const normalized = String(path || "").trim();
  if (
    !normalized.startsWith("/api/hire") ||
    normalized.includes("://") ||
    normalized.includes("..") ||
    !HIRE_PATH_PATTERN.test(normalized)
  ) {
    throw new Error("Invalid Hire API path.");
  }
  return normalized;
}

async function parseHireResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function hireErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as HireJson;
  const raw = record.message ?? record.error ?? record.detail;
  if (Array.isArray(raw)) return raw.map((item) => String(item)).join(", ") || fallback;
  return raw ? String(raw) : fallback;
}

export async function hireRequest<T = unknown>(
  path: string,
  options: HireRequestOptions = {},
): Promise<T> {
  const body =
    options.formData ??
    (options.body === undefined ? undefined : JSON.stringify(options.body));
  const response = await backendAuthRequest(assertHireApiPath(path), {
    method: options.method ?? "GET",
    headers: options.headers,
    body,
  });
  const payload = await parseHireResponse(response);
  if (!response.ok) {
    throw new Error(hireErrorMessage(payload, `Hire request failed (${response.status})`));
  }
  return payload as T;
}

function leadPath(leadId: string, suffix = "") {
  return `/api/hire/leads/${encodeURIComponent(leadId)}${suffix}`;
}

function consentBody(action: HireConsentAction, body: HireJson = {}) {
  return {
    ...body,
    zakiHireConsent: {
      accepted: true,
      action,
    },
  };
}

function consentHeaders(action: HireConsentAction) {
  return {
    "X-Zaki-Hire-Consent": action,
  };
}

export function getHireHealth() {
  return hireRequest<HireHealth>("/api/hire/health");
}

export function getHireReadiness() {
  return hireRequest<HireReadiness>("/api/hire/readiness");
}

export function getHireStatus() {
  return hireRequest<HireTaskStatus>("/api/hire/status");
}

export function listHireLeads(params: {
  status?: string;
  minScore?: number;
  limit?: number;
} = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.minScore !== undefined) query.set("min_score", String(params.minScore));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return hireRequest<HireLead[] | { items?: HireLead[]; total?: number }>(`/api/hire/leads${suffix}`);
}

export function getHireProfile() {
  return hireRequest<HireProfile>("/api/hire/profile");
}

export function createHireManualLead(payload: { text: string; url: string }) {
  return hireRequest<HireLead>("/api/hire/leads/manual", {
    method: "POST",
    body: { ...payload, kind: "job" },
  });
}

export function updateHireLeadStatus(leadId: string, status: HireLeadStatus) {
  return hireRequest<{ ok?: boolean }>(leadPath(leadId, "/status"), {
    method: "PUT",
    body: { status },
  });
}

export function updateHireLeadFollowup(leadId: string, days = 5) {
  return hireRequest<HireLead>(leadPath(leadId, "/followup"), {
    method: "PUT",
    body: { days },
  });
}

export function generateHireLead(leadId: string) {
  return hireRequest<{ status?: string; lead?: HireLead; job_id?: string } | HireLead>(
    leadPath(leadId, "/generate"),
    { method: "POST", body: {} },
  );
}

export function startHireLeadPipeline(leadId: string) {
  return hireRequest<{ status?: string; job_id?: string; pipeline_job_id?: string }>(
    leadPath(leadId, "/pipeline/run"),
    { method: "POST", body: {} },
  );
}

export function startHireScan() {
  return hireRequest<{ status?: string }>("/api/hire/scan", { method: "POST", body: {} });
}

export function stopHireScan() {
  return hireRequest<{ status?: string }>("/api/hire/scan/stop", { method: "POST", body: {} });
}

export function reevaluateHireLeads() {
  return hireRequest<{ status?: string }>("/api/hire/leads/reevaluate", { method: "POST", body: {} });
}

export function scanHireFreeSources() {
  return hireRequest<{ status?: string; leads?: number; usage?: HireJson; errors?: string[] }>(
    "/api/hire/free-sources/scan",
    { method: "POST", body: {} },
  );
}

export function updateHireCandidate(payload: { n: string; s: string }) {
  return hireRequest<HireProfile>("/api/hire/profile/candidate", {
    method: "PUT",
    body: payload,
  });
}

export function updateHireIdentity(payload: NonNullable<HireProfile["identity"]>) {
  return hireRequest<HireProfile>("/api/hire/profile/identity", {
    method: "PUT",
    body: payload,
  });
}

export function ingestHireResume(payload: { raw: string; file?: File | null }) {
  const formData = new FormData();
  formData.set("raw", payload.raw);
  if (payload.file) formData.set("file", payload.file, payload.file.name);
  return hireRequest<HireProfile>("/api/hire/ingest", {
    method: "POST",
    formData,
  });
}

export function ingestHireGithub(payload: { username: string; maxRepos?: number }) {
  return hireRequest<unknown>("/api/hire/ingest/github", {
    method: "POST",
    body: {
      username: payload.username,
      max_repos: payload.maxRepos ?? 100,
    },
  });
}

export function ingestHirePortfolio(payload: { url: string; autoImport?: boolean }) {
  return hireRequest<unknown>("/api/hire/ingest/portfolio", {
    method: "POST",
    body: {
      url: payload.url,
      auto_import: payload.autoImport ?? true,
    },
  });
}

export function readHireLeadForm(leadId: string, url: string) {
  return hireRequest<unknown>(leadPath(leadId, "/form/read"), {
    method: "POST",
    headers: consentHeaders("form_read"),
    body: consentBody("form_read", { url }),
  });
}

export function previewHireApplication(leadId: string) {
  return hireRequest<unknown>(leadPath(leadId, "/apply/preview"), {
    method: "POST",
    headers: consentHeaders("apply_preview"),
    body: consentBody("apply_preview"),
  });
}

export function fireHireApplication(leadId: string) {
  return hireRequest<unknown>(`/api/hire/fire/${encodeURIComponent(leadId)}`, {
    method: "POST",
    headers: consentHeaders("auto_apply"),
    body: consentBody("auto_apply"),
  });
}
