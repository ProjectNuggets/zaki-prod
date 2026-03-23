import type { ProductTelemetrySource } from "./productTelemetry";
const TOKEN_KEY = "zaki.auth.token";

export type MemoryCaptureResponse = {
  saved: Array<{
    id: string;
    content: string;
    type: string;
    state: "saved_reversible";
    undoUntil: string;
  }>;
  review: Array<{
    id: string;
    content: string;
    type: string;
    state: "needs_review";
    reason: string;
  }>;
  duplicates: Array<{
    content: string;
    type: string;
  }>;
  conflicts: Array<{
    id: string;
    content: string;
    type: string;
    conflictingContent?: string;
  }>;
  skipped: Array<{
    content: string;
    type: string;
    reason: string;
    stage?: "extraction" | "quality_filter" | "policy" | "duplicate_guard";
    detail?: string;
  }>;
};

export type MemoryPolicy =
  | "balanced"
  | "ask_before_saving"
  | "save_less"
  | "save_more";

export type MemoryPreferencesResponse = {
  policy: MemoryPolicy;
  source?: "default" | "stored";
  updatedAt?: string | null;
};

export type MemoryPatch = {
  content?: string;
  type?: string;
  status?: "active" | "outdated";
};

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export function getApiBase() {
  const backendBase = (import.meta as { env?: Record<string, string> }).env
    ?.VITE_ZAKI_BACKEND_URL;
  if (backendBase && backendBase.trim()) {
    return backendBase.replace(/\/+$/, "");
  }
  const envBase = (import.meta as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL;
  if (envBase && envBase.trim()) {
    return envBase.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function getBackendBase() {
  const envBase = (import.meta as { env?: Record<string, string> }).env
    ?.VITE_ZAKI_BACKEND_URL;
  if (envBase && envBase.trim()) {
    return envBase.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${base}${normalizedPath.slice(4)}`;
  }
  return `${base}${normalizedPath}`;
}

export async function apiRequest(path: string, options: ApiRequestOptions = {}) {
  const { skipAuth, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers ?? {});
  const token = getAuthToken();

  if (!skipAuth && token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (body && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return fetch(buildApiUrl(path), {
    ...rest,
    headers: requestHeaders,
    body,
  });
}

export async function backendRequest(
  path: string,
  options: ApiRequestOptions = {}
) {
  const base = getBackendBase();
  if (!base) {
    throw new Error("Backend URL not configured.");
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url =
    base.endsWith("/api") && normalizedPath.startsWith("/api/")
      ? `${base}${normalizedPath.slice(4)}`
      : `${base}${normalizedPath}`;
  const { headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers ?? {});

  if (body && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...rest,
    headers: requestHeaders,
    body,
  });
}

export async function backendAuthRequest(
  path: string,
  options: ApiRequestOptions = {}
) {
  const { headers, ...rest } = options;
  const requestHeaders = new Headers(headers ?? {});
  const token = getAuthToken();
  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  return backendRequest(path, { ...rest, headers: requestHeaders });
}

export async function captureMemory({
  message,
  threadId,
}: {
  message: string;
  threadId?: string | null;
}) {
  const response = await apiRequest("/api/memory/capture", {
    method: "POST",
    body: JSON.stringify({
      message,
      threadId: threadId ?? null,
    }),
  });

  let data: MemoryCaptureResponse | null = null;
  try {
    data = (await response.json()) as MemoryCaptureResponse;
  } catch {
    data = null;
  }

  return { response, data };
}

export async function fetchMemoryPreferences() {
  const response = await apiRequest("/api/memory/preferences");
  let data: MemoryPreferencesResponse | null = null;
  try {
    data = (await response.json()) as MemoryPreferencesResponse;
  } catch {
    data = null;
  }
  return { response, data };
}

export async function updateMemoryPreferences(policy: MemoryPolicy) {
  const response = await apiRequest("/api/memory/preferences", {
    method: "PATCH",
    body: JSON.stringify({ policy }),
  });
  let data: MemoryPreferencesResponse | null = null;
  try {
    data = (await response.json()) as MemoryPreferencesResponse;
  } catch {
    data = null;
  }
  return { response, data };
}

export async function patchMemory(memoryId: string, patch: MemoryPatch) {
  const response = await apiRequest(`/api/memory/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  let data: { memory?: unknown; error?: string; duplicateId?: string | null } | null = null;
  try {
    data = (await response.json()) as {
      memory?: unknown;
      error?: string;
      duplicateId?: string | null;
    };
  } catch {
    data = null;
  }
  return { response, data };
}

export async function requestLogin({
  username,
  password,
  legalConsentAccepted,
  legalPolicyVersion,
}: {
  username?: string;
  password: string;
  legalConsentAccepted?: boolean;
  legalPolicyVersion?: string;
}) {
  const payload: Record<string, string | boolean> = { password };
  if (username) payload.username = username;
  if (typeof legalConsentAccepted === "boolean") {
    payload.legalConsentAccepted = legalConsentAccepted;
  }
  if (legalPolicyVersion) {
    payload.legalPolicyVersion = legalPolicyVersion;
  }

  const response = await backendRequest("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  let data: { valid?: boolean; token?: string | null; message?: string | null } =
    {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }

  return { response, data };
}

export async function requestPublicSignup({
  email,
  password,
  name,
  dateOfBirth,
  legalConsentAccepted,
  legalPolicyVersion,
}: {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  legalConsentAccepted?: boolean;
  legalPolicyVersion?: string;
}) {
  const payload: Record<string, string | boolean> = {
    email,
    password,
    name,
    dateOfBirth,
  };
  if (typeof legalConsentAccepted === "boolean") {
    payload.legalConsentAccepted = legalConsentAccepted;
  }
  if (legalPolicyVersion) {
    payload.legalPolicyVersion = legalPolicyVersion;
  }

  const response = await backendRequest("/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  let data: {
    success?: boolean;
    error?: string | null;
    message?: string | null;
    verificationLink?: string;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }

  return { response, data };
}

export async function requestPasswordReset(email: string) {
  const response = await backendRequest("/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  let data: { success?: boolean; error?: string | null; message?: string | null } =
    {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }

  return { response, data };
}

export async function confirmPasswordReset({
  token,
  password,
}: {
  token: string;
  password: string;
}) {
  const response = await backendRequest("/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

  let data: { success?: boolean; error?: string | null; message?: string | null } =
    {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }

  return { response, data };
}

export async function fetchCurrentUser() {
  const response = await apiRequest("/system/refresh-user");
  const data = (await response.json()) as {
    success?: boolean;
    user?: { username?: string; role?: string; id?: number | string; fullName?: string | null } | null;
    message?: string | null;
  };
  return { response, data };
}

export async function fetchProfile() {
  const response = await backendAuthRequest("/api/profile", { method: "GET" });
  const data = (await response.json()) as {
    success?: boolean;
    user?: { username?: string; fullName?: string | null } | null;
  };
  return { response, data };
}

export type LegalConsentStatus = {
  success?: boolean;
  authenticated?: boolean;
  policyVersion?: string;
  hasConsent?: boolean;
  isCurrent?: boolean;
  requiresReconsent?: boolean;
  consentVersion?: string | null;
  consentedAt?: string | null;
  error?: string | null;
};

export async function fetchLegalConsentStatus(useAuth = false) {
  const response = useAuth
    ? await backendAuthRequest("/api/legal/consent-status", { method: "GET" })
    : await backendRequest("/api/legal/consent-status", { method: "GET" });
  let data: LegalConsentStatus = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function submitLegalReconsent(legalPolicyVersion: string) {
  const response = await backendAuthRequest("/api/legal/re-consent", {
    method: "POST",
    body: JSON.stringify({
      legalConsentAccepted: true,
      legalPolicyVersion,
    }),
  });
  let data: LegalConsentStatus = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function updateProfile(fullName: string) {
  const response = await backendAuthRequest("/api/profile", {
    method: "PATCH",
    body: JSON.stringify({ fullName }),
  });
  const data = (await response.json()) as {
    success?: boolean;
    user?: { username?: string; fullName?: string | null } | null;
    error?: string | null;
  };
  return { response, data };
}

export async function fetchEntitlements() {
  const response = await backendAuthRequest("/api/entitlements", { method: "GET" });
  let data: {
    success?: boolean;
    plan?: {
      tier?: string;
      status?: string;
      priceId?: string | null;
      interval?: "monthly" | "yearly" | null;
      currentPeriodEnd?: string | null;
      cancelAtPeriodEnd?: boolean;
    };
    access?: {
      active?: boolean;
      readOnly?: boolean;
      expiresAt?: string | null;
      campaign?: string | null;
    };
    effective?: {
      tier?: string;
      status?: string;
      source?: "free" | "subscription" | "access_code";
      premium?: boolean;
    };
    features?: Record<string, boolean>;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function fetchBillingConfig() {
  const response = await backendAuthRequest("/api/billing/config", { method: "GET" });
  let data: {
    success?: boolean;
    configured?: {
      provider?: string;
      requestedProvider?: string;
      checkoutProviders?: Array<{
        key?: string;
        label?: string;
        enabled?: boolean;
      }>;
      pricingAvailability?: {
        student?: {
          monthly?: boolean;
          yearly?: boolean;
        };
        personal?: {
          monthly?: boolean;
          yearly?: boolean;
        };
      };
      stripeEnabled?: boolean;
      checkoutEnabled?: boolean;
      portalEnabled?: boolean;
      cancelEnabled?: boolean;
      webhookEnabled?: boolean;
      accessCodePurchaseEnabled?: boolean;
      pricingCatalog?: {
        student?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        personal?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        access?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
      };
      missing?: string[];
    };
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function createCheckoutSession(
  plan: "student" | "personal",
  provider?: "stripe" | "paddle" | "creem",
  interval: "monthly" | "yearly" = "monthly",
  context?: {
    source?: ProductTelemetrySource;
  }
) {
  const response = await backendAuthRequest("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({
      plan,
      interval,
      ...(provider ? { provider } : {}),
      ...(context ? { context } : {}),
    }),
  });
  let data: { success?: boolean; url?: string | null; error?: string | null } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function createAccessCodePurchaseCheckoutSession(context?: {
  source?: ProductTelemetrySource;
}) {
  const response = await backendAuthRequest("/api/access-code/purchase/checkout", {
    method: "POST",
    body: JSON.stringify({
      ...(context ? { context } : {}),
    }),
  });
  let data: { success?: boolean; url?: string | null; error?: string | null } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function resendPurchasedAccessCodeEmail(sessionId: string) {
  const response = await backendAuthRequest("/api/access-code/purchase/resend", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
  let data: {
    success?: boolean;
    status?: "sent" | "already_sent" | "processing";
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function createBillingPortal() {
  const response = await backendAuthRequest("/api/billing/portal", {
    method: "POST",
  });
  let data: { success?: boolean; url?: string | null; error?: string | null } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function cancelBillingSubscription() {
  const response = await backendAuthRequest("/api/billing/cancel", {
    method: "POST",
  });
  let data: {
    success?: boolean;
    alreadyScheduled?: boolean;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | null;
    status?: string;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function syncBillingSubscription() {
  const response = await backendAuthRequest("/api/billing/sync", {
    method: "POST",
    body: JSON.stringify({}),
  });
  let data: {
    success?: boolean;
    updated?: boolean;
    tier?: string;
    status?: string;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function redeemAccessCode(code: string, authToken?: string) {
  const response = authToken
    ? await backendRequest("/api/access-code/redeem", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ code }),
      })
    : await backendAuthRequest("/api/access-code/redeem", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
  let data: {
    success?: boolean;
    accessExpiresAt?: string | null;
    campaign?: string | null;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export type AdminAccessCode = {
  id: string;
  code: string;
  campaign: string;
  durationDays: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  remainingRedemptions: number | null;
  active: boolean;
  expiresAt: string | null;
  createdAt: string | null;
};

export type AdminMember = {
  email: string;
  role: "super_admin" | "admin";
  isSuperAdmin: boolean;
  active: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminStudentVerificationUser = {
  email: string;
  studentVerified: boolean;
  studentVerifiedAt: string | null;
};

export type AdminRateLimitSettings = {
  appChatDailyPromptLimit: number;
  appChatDailyPromptBucket: string;
  zakiBotDailyPromptLimit: number;
  zakiBotDailyPromptBucket: string;
  agentPerMinuteLimit: number;
};

export async function listAdminMembers() {
  const response = await backendAuthRequest("/api/admin/admins", {
    method: "GET",
  });
  let data: {
    success?: boolean;
    actor?: {
      email?: string;
      role?: "super_admin" | "admin";
      isSuperAdmin?: boolean;
    };
    items?: AdminMember[];
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function addAdminMember(email: string) {
  const response = await backendAuthRequest("/api/admin/admins", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  let data: {
    success?: boolean;
    member?: AdminMember;
    message?: string | null;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function removeAdminMember(email: string) {
  const response = await backendAuthRequest(
    `/api/admin/admins/${encodeURIComponent(email)}`,
    {
      method: "DELETE",
    }
  );
  let data: {
    success?: boolean;
    member?: AdminMember;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function getAdminStudentVerification(email: string) {
  const query = new URLSearchParams({ email });
  const response = await backendAuthRequest(
    `/api/admin/student-verification?${query.toString()}`,
    {
      method: "GET",
    }
  );
  let data: {
    success?: boolean;
    user?: AdminStudentVerificationUser;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function updateAdminStudentVerification(email: string, verified: boolean) {
  const response = await backendAuthRequest("/api/admin/student-verification", {
    method: "POST",
    body: JSON.stringify({ email, verified }),
  });
  let data: {
    success?: boolean;
    user?: AdminStudentVerificationUser;
    message?: string | null;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function getAdminRateLimits() {
  const response = await backendAuthRequest("/api/admin/rate-limits", {
    method: "GET",
  });
  const data = await parseApiJson<{
    success?: boolean;
    settings?: AdminRateLimitSettings;
    error?: string | null;
  }>(response);
  return { response, data };
}

export async function updateAdminRateLimits(payload: {
  appChatDailyPromptLimit?: number;
  zakiBotDailyPromptLimit?: number;
  agentPerMinuteLimit?: number;
}) {
  const response = await backendAuthRequest("/api/admin/rate-limits", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{
    success?: boolean;
    settings?: AdminRateLimitSettings;
    error?: string | null;
  }>(response);
  return { response, data };
}

export type AdminAccessCodeListParams = {
  search?: string;
  campaign?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
};

export type AdminAccessCodeCreatePayload = {
  campaign: string;
  count: number;
  durationDays?: number;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  active?: boolean;
};

export type AdminAccessCodeUpdatePayload = {
  campaign?: string;
  durationDays?: number;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  active?: boolean;
};

export async function listAdminAccessCodes(params: AdminAccessCodeListParams = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.campaign) query.set("campaign", params.campaign);
  if (typeof params.active === "boolean") query.set("active", String(params.active));
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));

  const queryString = query.toString();
  const path = queryString
    ? `/api/admin/access-codes?${queryString}`
    : "/api/admin/access-codes";
  const response = await backendAuthRequest(path, { method: "GET" });
  let data: {
    success?: boolean;
    total?: number;
    limit?: number;
    offset?: number;
    items?: AdminAccessCode[];
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function createAdminAccessCodes(payload: AdminAccessCodeCreatePayload) {
  const response = await backendAuthRequest("/api/admin/access-codes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  let data: {
    success?: boolean;
    count?: number;
    codes?: AdminAccessCode[];
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function updateAdminAccessCode(
  codeId: string,
  payload: AdminAccessCodeUpdatePayload
) {
  const response = await backendAuthRequest(
    `/api/admin/access-codes/${encodeURIComponent(codeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  let data: {
    success?: boolean;
    code?: AdminAccessCode;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function exportAccountData() {
  const response = await backendAuthRequest("/api/account/export", {
    method: "GET",
  });
  let data: {
    success?: boolean;
    export?: unknown;
    error?: string | null;
  } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

export async function deleteAccount(confirmEmail: string) {
  const response = await backendAuthRequest("/api/account/delete", {
    method: "POST",
    body: JSON.stringify({ confirmEmail }),
  });
  let data: { success?: boolean; message?: string | null; error?: string | null } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

async function parseApiJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export type UsageQuotaSurface = "app_chat" | "zaki_bot";
export type BotErrorCode =
  | "temporary_contention"
  | "unauthorized"
  | "forbidden"
  | "invalid_telegram_token"
  | "provision_failed"
  | "settings_update_failed"
  | "usage_unavailable";

export type BotApiError = {
  error?: BotErrorCode | string | null;
  message?: string | null;
  retryable?: boolean;
  request_id?: string;
};

export type BotProvisionStatus = {
  status: string;
};

export type BotOnboardingSetup = Record<string, unknown>;

export type BotOnboardingState = BotApiError & {
  completed?: boolean;
  completed_at_s?: number | null;
  setup?: BotOnboardingSetup | null;
};

export type BotSettingsProfile = BotApiError & {
  assistant_mode?: "fast" | "balanced" | "deep";
  group_activation?: "mention" | "always";
  proactive_updates?: boolean;
  voice_replies?: boolean;
  session_timeout_minutes?: number;
};

export type BotSettingsPatch = {
  assistant_mode?: "fast" | "balanced" | "deep";
  group_activation?: "mention" | "always";
  proactive_updates?: boolean;
  voice_replies?: boolean;
  session_timeout_minutes?: number;
};

export type BotTelegramConnectPayload = {
  bot_token?: string;
  webhook_url?: string;
  webhook_base_url?: string;
  webhook_secret_token?: string;
  account_id?: string;
  chat_id?: string;
  allow_from?: string[];
  drop_pending_updates?: boolean;
};

export type BotTelegramConnectionState = BotApiError & {
  status?: "connected" | "disconnected";
  channel?: "telegram";
};

export type BotUsageSummary = BotApiError & {
  state?: string;
  requests_day?: number;
  tokens_day?: number;
  tokens_month?: number;
};

export async function fetchUsageQuota(surface: UsageQuotaSurface = "app_chat") {
  const params = new URLSearchParams({ surface });
  const response = await backendAuthRequest(`/api/usage/quota?${params.toString()}`, {
    method: "GET",
  });
  const data = await parseApiJson<{
    success?: boolean;
    unlimited?: boolean;
    limit?: number | null;
    used?: number;
    remaining?: number | null;
    resetAt?: string;
    bucket?: string;
    surface?: UsageQuotaSurface;
    error?: string | null;
  }>(response);
  return { response, data };
}

export async function provisionBot(payload: Record<string, unknown> = {}) {
  const response = await backendAuthRequest("/v1/me/bot/provision", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<BotProvisionStatus & BotApiError>(response);
  return { response, data };
}

export async function fetchBotOnboarding() {
  const response = await backendAuthRequest("/v1/me/bot/onboarding", { method: "GET" });
  const data = await parseApiJson<BotOnboardingState>(response);
  return { response, data };
}

export async function updateBotOnboarding(payload: { completed: boolean }) {
  const response = await backendAuthRequest("/v1/me/bot/onboarding", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<BotOnboardingState>(response);
  return { response, data };
}

export async function fetchBotSettings() {
  const response = await backendAuthRequest("/v1/me/bot/settings", { method: "GET" });
  const data = await parseApiJson<BotSettingsProfile>(response);
  return { response, data };
}

export async function updateBotSettings(payload: BotSettingsPatch) {
  const response = await backendAuthRequest("/v1/me/bot/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<BotSettingsProfile>(response);
  return { response, data };
}

export async function connectBotTelegram(payload: BotTelegramConnectPayload) {
  const response = await backendAuthRequest("/v1/me/bot/telegram/connect", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<BotTelegramConnectionState>(response);
  return { response, data };
}

export async function disconnectBotTelegram() {
  const response = await backendAuthRequest("/v1/me/bot/telegram/disconnect", {
    method: "POST",
    body: JSON.stringify({}),
  });
  const data = await parseApiJson<BotTelegramConnectionState>(response);
  return { response, data };
}

export async function fetchBotUsage() {
  const response = await backendAuthRequest("/v1/me/bot/usage", { method: "GET" });
  const data = await parseApiJson<BotUsageSummary>(response);
  return { response, data };
}

export async function provisionAgent(payload: Record<string, unknown> = {}) {
  const response = await backendAuthRequest("/api/agent/provision", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function fetchAgentOnboarding() {
  const response = await backendAuthRequest("/api/agent/onboarding", { method: "GET" });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function saveAgentOnboarding(payload: Record<string, unknown>) {
  const response = await backendAuthRequest("/api/agent/onboarding", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function getAgentSecret(key: string) {
  const response = await backendAuthRequest(`/api/agent/secrets/${encodeURIComponent(key)}`, {
    method: "GET",
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function putAgentSecret(key: string, value: unknown) {
  const response = await backendAuthRequest(`/api/agent/secrets/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function deleteAgentSecret(key: string) {
  const response = await backendAuthRequest(`/api/agent/secrets/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export type ConnectAgentTelegramPayload = {
  bot_token?: string;
  webhook_url?: string;
  webhook_base_url?: string;
  webhook_secret_token?: string;
  account_id?: string;
  chat_id?: string;
  allow_from?: string[];
  drop_pending_updates?: boolean;
};

export async function connectAgentTelegram(payload: ConnectAgentTelegramPayload) {
  const response = await backendAuthRequest("/api/agent/channels/telegram/connect", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function disconnectAgentTelegram() {
  const response = await backendAuthRequest("/api/agent/channels/telegram/disconnect", {
    method: "DELETE",
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function fetchAgentHeartbeat() {
  const response = await backendAuthRequest("/api/agent/heartbeat", { method: "GET" });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function updateAgentHeartbeat(payload: Record<string, unknown>) {
  const response = await backendAuthRequest("/api/agent/heartbeat", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function listAgentCron() {
  const response = await backendAuthRequest("/api/agent/cron", { method: "GET" });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function createAgentCron(payload: Record<string, unknown>) {
  const response = await backendAuthRequest("/api/agent/cron", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function updateAgentCron(id: string, payload: Record<string, unknown>) {
  const response = await backendAuthRequest(`/api/agent/cron/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function deleteAgentCron(id: string) {
  const response = await backendAuthRequest(`/api/agent/cron/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function fetchAgentHistory(
  spaceId = "zaki-bot",
  threadId = "main",
  mode: "merged" | "app" = "merged"
) {
  const response = await backendAuthRequest(
    `/api/agent/history?spaceId=${encodeURIComponent(spaceId)}&threadId=${encodeURIComponent(threadId)}&mode=${encodeURIComponent(mode)}`,
    { method: "GET" }
  );
  const data = await parseApiJson<{
    history?: Array<{
      id?: string;
      role?: "user" | "assistant";
      content?: string;
      createdAt?: string;
    }>;
    historyMode?: "merged" | "app";
    source?: string;
    warning?: string;
    error?: string | null;
  }>(response);
  return { response, data };
}

export async function fetchAgentDiagnostics() {
  const response = await backendAuthRequest("/api/agent/diagnostics", { method: "GET" });
  const data = await parseApiJson<{
    userId?: string;
    agentBackendEnabled?: boolean;
    nullclawBaseConfigured?: boolean;
    historyModeDefault?: string;
    upstreamHealth?: {
      ok?: boolean;
      status?: number;
      latencyMs?: number | null;
      reason?: string;
    };
    upstreamReady?: {
      ok?: boolean;
      status?: number;
      latencyMs?: number | null;
      reason?: string;
    };
    upstreamSummary?: {
      provider?: string | null;
      stateBackend?: string | null;
      schedulerBackend?: string | null;
      degraded?: boolean | null;
      providerDataSource?: string | null;
    } | null;
    upstreamControlPlane?: Record<string, unknown> | null;
    lastAgentStreamError?: {
      at?: string;
      class?: string;
      message?: string;
    } | null;
    error?: string | null;
  }>(response);
  return { response, data };
}
