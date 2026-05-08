import type { ProductTelemetrySource } from "./productTelemetry";
import { getConfiguredApiBase, getConfiguredLegacyApiBase } from "./runtimeEnv";
import { useAuthStore } from "@/stores/authStore";

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

export type MemoryActivity = {
  id: string;
  kind: "saved" | "review" | "conflict" | "edited" | "outdated";
  content: string;
  type: string;
  threadId?: string | null;
  source?: string | null;
  occurredAt: string;
};

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export function getApiBase() {
  const backendBase = getConfiguredApiBase();
  if (backendBase && backendBase.trim()) {
    return backendBase.replace(/\/+$/, "");
  }
  const envBase = getConfiguredLegacyApiBase();
  if (envBase && envBase.trim()) {
    return envBase.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function getBackendBase() {
  const envBase = getConfiguredApiBase();
  if (envBase && envBase.trim()) {
    return envBase.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

export async function getFreshAuthToken(): Promise<string | null> {
  return (await refreshAccessToken()) || getAuthToken();
}

export function setAuthToken(token: string) {
  useAuthStore.getState().setToken(token);
}

export function clearAuthToken() {
  useAuthStore.getState().setToken(null);
}

// Internal: calls POST /api/auth/refresh to rotate token.
// Returns the new access token string, or null on failure.
// IMPORTANT: Uses raw fetch — never call apiRequest here (prevents recursive loop).
// WR-02: module-level singleton collapses concurrent callers onto one in-flight request.
let _refreshPromise: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(buildApiUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      if (data.token) {
        useAuthStore.getState().setToken(data.token);
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
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

export async function apiRequest(
  path: string,
  options: ApiRequestOptions = {},
  _isRetry = false  // internal flag — prevents refresh loop
): Promise<Response> {
  const { skipAuth, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers ?? {});
  const token = getAuthToken();

  if (!skipAuth && token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (body && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...rest,
    credentials: "include", // send cookies on all requests
    headers: requestHeaders,
    body,
  });

  // FE-03: X-Zaki-Session-Upgrade — silently upgrade token in background.
  // Don't await; fire-and-forget so caller gets the response immediately.
  if (!skipAuth && response.headers.get("X-Zaki-Session-Upgrade") === "1") {
    void refreshAccessToken();
  }

  // FE-04: 401 retry — attempt one refresh then retry the original request.
  if (!skipAuth && response.status === 401 && !_isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryResponse = await apiRequest(path, options, true);
      // WR-01: if the retry also returns 401, the token is invalid — log out.
      if (retryResponse.status === 401 && typeof window !== "undefined") {
        useAuthStore.getState().logout();
        window.location.href = "/";
      }
      return retryResponse;
    }
    // Refresh failed — redirect to login
    if (typeof window !== "undefined") {
      useAuthStore.getState().logout();
      window.location.href = "/";
    }
  }

  return response;
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
    credentials: "include", // WR-03: send HttpOnly cookie on backend routes
    headers: requestHeaders,
    body,
  });
}

export async function backendAuthRequest(
  path: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { headers, ...rest } = options;
  const requestHeaders = new Headers(headers ?? {});
  const token = getAuthToken();
  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  const response = await backendRequest(path, { ...rest, headers: requestHeaders });
  // WR-03: 401 on backend routes — attempt one silent refresh then retry.
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(headers ?? {});
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      return backendRequest(path, { ...rest, headers: retryHeaders });
    }
    if (typeof window !== "undefined") {
      useAuthStore.getState().logout();
      window.location.href = "/";
    }
  }
  return response;
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

export async function fetchMemoryActivity(limit = 8) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  const response = await apiRequest(`/api/memory/activity?${params.toString()}`);
  let data: { activities?: MemoryActivity[] } | null = null;
  try {
    data = (await response.json()) as { activities?: MemoryActivity[] };
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

  let data: { valid?: boolean; token?: string | null; message?: string | null; error?: string | null } =
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
  const response = await backendAuthRequest("/api/profile", { method: "GET" });
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
  learningDailyPromptLimit?: number;
  learningDailyPromptBucket?: string;
  zakiBotDailyPromptLimit: number;
  zakiBotDailyPromptBucket: string;
  agentPerMinuteLimit: number;
};

export type AdminLearningAiStack = {
  llmProviderConfigured?: boolean;
  llmModelConfigured?: boolean;
  embeddingProviderConfigured?: boolean;
  embeddingModelConfigured?: boolean;
  searchProviderConfigured?: boolean;
  llmProvider?: string;
  llmModel?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
  searchProvider?: string;
};

export type AdminLearningDeploymentGate = {
  id: string;
  ok: boolean;
  message: string;
};

export type AdminLearningAiStackStatus = {
  operatorManaged?: boolean;
  status?: {
    ok?: boolean;
    enabled?: boolean;
    configured?: boolean;
    baseUrlConfigured?: boolean;
    internalTokenConfigured?: boolean;
    upstreamStatus?: number;
    requestTimeoutMs?: number;
    streamTimeoutMs?: number;
    maxRequestBytes?: number;
    requestId?: string;
  };
  aiStack?: AdminLearningAiStack;
  deploymentReadiness?: {
    ready?: boolean;
    generatedAt?: string;
    gates?: AdminLearningDeploymentGate[];
  };
};

export type AdminLearningAiStackTestService = "llm" | "embeddings" | "search";

export type AdminLearningAiStackTestResult = {
  service: AdminLearningAiStackTestService;
  ok: boolean;
  upstreamStatus?: number;
  success?: boolean;
  message?: string;
  model?: string;
  responseTimeMs?: number | null;
  error?: string | null;
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
  learningDailyPromptLimit?: number;
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

export async function getAdminLearningAiStack() {
  const response = await backendAuthRequest("/api/internal/learning/ai-stack", {
    method: "GET",
  });
  const data = await parseApiJson<{
    success?: boolean;
    operatorManaged?: boolean;
    status?: AdminLearningAiStackStatus["status"];
    aiStack?: AdminLearningAiStack;
    deploymentReadiness?: AdminLearningAiStackStatus["deploymentReadiness"];
    error?: string | null;
  }>(response);
  return { response, data };
}

export async function testAdminLearningAiStackService(service: AdminLearningAiStackTestService) {
  const response = await backendAuthRequest(
    `/api/internal/learning/ai-stack/test/${encodeURIComponent(service)}`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
  const data = await parseApiJson<{
    success?: boolean;
    result?: AdminLearningAiStackTestResult;
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
  can_start_chat_now?: boolean;
  minimum_required?: string[] | null;
  operator_configure_model_provider?: boolean;
  setup?: BotOnboardingSetup | null;
};

export type AgentOnboardingState = BotApiError & {
  completed?: boolean;
  completed_at_s?: number | null;
  can_start_chat_now?: boolean;
  minimum_required?: string[] | null;
  operator_configure_model_provider?: boolean;
  setup?: Record<string, unknown> | null;
};

export type BotSettingsProfile = BotApiError & {
  assistant_mode?: "fast" | "balanced" | "deep";
  group_activation?: "mention" | "always";
  proactive_updates?: boolean;
  voice_replies?: boolean;
  session_timeout_minutes?: number;
  autonomy?: "read_only" | "supervised" | "full";
};

export type BotSettingsPatch = {
  assistant_mode?: "fast" | "balanced" | "deep";
  group_activation?: "mention" | "always";
  proactive_updates?: boolean;
  voice_replies?: boolean;
  session_timeout_minutes?: number;
  autonomy?: "read_only" | "supervised" | "full";
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

export type AgentHeartbeatState = BotApiError & {
  enabled?: boolean;
  interval_minutes?: number;
  prompt?: string | null;
};

export type BotHeartbeatState = BotApiError & {
  enabled?: boolean;
  interval_minutes?: number;
  prompt?: string | null;
};

export type ThreadAutoTitleRequest = {
  userMessage: string;
  assistantMessage: string;
  currentLabel: string;
};

export type ThreadAutoTitleResponse = {
  status: "updated" | "skipped";
  reason?:
    | "not_default_label"
    | "insufficient_content"
    | "generation_failed"
    | "thread_not_found";
  thread?: {
    slug: string;
    name: string;
  };
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

export async function fetchBotHeartbeat() {
  const response = await backendAuthRequest("/v1/me/bot/heartbeat", { method: "GET" });
  const data = await parseApiJson<BotHeartbeatState>(response);
  return { response, data };
}

export async function updateBotHeartbeat(payload: { enabled: boolean }) {
  const response = await backendAuthRequest("/v1/me/bot/heartbeat", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<BotHeartbeatState>(response);
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

export async function autoTitleThread(
  workspaceSlug: string,
  threadSlug: string,
  payload: ThreadAutoTitleRequest
) {
  const response = await apiRequest(
    `/workspace/${encodeURIComponent(workspaceSlug)}/thread/${encodeURIComponent(threadSlug)}/auto-title`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  const data = await parseApiJson<ThreadAutoTitleResponse>(response);
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
  const data = await parseApiJson<AgentOnboardingState>(response);
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

export async function listAgentSecrets() {
  const response = await backendAuthRequest("/api/agent/secrets", {
    method: "GET",
  });
  const data = await parseApiJson<{ keys: string[] }>(response);
  return { response, data };
}

// ── Attachments: upload docs to the agent's workspace ──────────────

export type UploadAgentAttachmentResponse = {
  path: string; // e.g. "attachments/AddGrowth_LTS.pdf"
  bytes: number;
};

/**
 * Upload a file to the user's agent workspace. The agent can then read it
 * via the file_read tool using the returned relative path.
 *
 * Supported formats (extraction handled server-side in file_read):
 *   PDF  (pdftotext), DOCX/DOC/ODT/RTF/EPUB/PPTX/PPT/HTML (pandoc),
 *   XLSX/XLS/ODS (libreoffice → CSV), plus any plain-text file type.
 */
export async function uploadAgentAttachment(file: File) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  const content_b64 = btoa(binary);
  // Sanitize filename to the set the backend accepts: letters, digits,
  // dot, dash, underscore, space. Collapse anything else to underscore.
  const safe_name = file.name.replace(/[^A-Za-z0-9._\- ]/g, "_").slice(0, 200);
  const response = await backendAuthRequest("/api/agent/attachments", {
    method: "POST",
    body: JSON.stringify({ filename: safe_name, content_b64 }),
  });
  const data = await parseApiJson<UploadAgentAttachmentResponse>(response);
  return { response, data };
}

// ── Voice: STT and TTS ──────────────────────────────────────────────

export async function transcribeAudio(audioBase64: string, format = "webm") {
  const response = await backendAuthRequest("/api/agent/voice/transcribe", {
    method: "POST",
    body: JSON.stringify({ audio: audioBase64, format }),
  });
  const data = await parseApiJson<{ text: string }>(response);
  return { response, data };
}

export async function synthesizeSpeech(
  text: string,
  voice = "alloy",
  format = "mp3"
) {
  const response = await backendAuthRequest("/api/agent/voice/synthesize", {
    method: "POST",
    body: JSON.stringify({ text, voice, format }),
  });
  const data = await parseApiJson<{ audio: string; format: string }>(response);
  return { response, data };
}

export async function fetchAgentMe() {
  const response = await backendAuthRequest("/api/agent/me", { method: "GET" });
  const data = await parseApiJson<{ userId: string }>(response);
  return { response, data };
}

export async function fetchAgentHeartbeat() {
  const response = await backendAuthRequest("/api/agent/heartbeat", { method: "GET" });
  const data = await parseApiJson<AgentHeartbeatState>(response);
  return { response, data };
}

export async function updateAgentHeartbeat(payload: { enabled: boolean }) {
  const response = await backendAuthRequest("/api/agent/heartbeat", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<AgentHeartbeatState>(response);
  return { response, data };
}

export async function listAgentCron() {
  const response = await backendAuthRequest("/api/agent/cron", { method: "GET" });
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function createAgentCron(payload: Record<string, unknown> | unknown[]) {
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

// ---------------------------------------------------------------------------
// Agent Session CRUD (Phase 3.5)
// ---------------------------------------------------------------------------
// Session keys contain colons (agent:zaki-bot:user:42:thread:main) — do NOT
// encodeURIComponent them because nullalis matches raw path segments.
// Client-side validation mirrors the backend SESSION_KEY_SAFE_PATTERN.

const SESSION_KEY_RE = /^[a-zA-Z0-9:_.\-]+$/;

function assertSafeSessionKey(key: string): void {
  if (!key || key.length > 255 || !SESSION_KEY_RE.test(key)) {
    throw new Error(`Invalid session key: ${key.slice(0, 40)}`);
  }
}

export type AgentSession = {
  session_key: string;
  title?: string;
  created_at?: string | number;
  last_active?: string | number;
  message_count?: number;
  token_count?: number;
  context_window_used?: number;
  context_window_max?: number;
  context_pressure_percent?: number;
  live?: boolean;
  mode?: AgentSessionMode;
  last_channel?: string | null;
  pending_approval_count?: number;
  pending_approvals?: AgentPendingApproval[];
};

export type AgentSessionContext = {
  session_key: string;
  token_count: number;
  context_window_max: number;
  context_window_used_pct: number;
  context_pressure_percent?: number;
  message_count: number;
};

export type AgentSessionMode = "plan" | "execute" | "review";

export type BotSandboxBackend = "bubblewrap" | "firejail" | "docker";

export type AgentPendingApproval = {
  id?: string;
  tool?: string;
  reason?: string;
  risk_level?: string;
};

export type BotRuntimeStatusResponse = {
  sandbox?: {
    enabled?: boolean;
    backend?: BotSandboxBackend | null;
  } | null;
};

export type AgentSessionModeResponse = {
  ok?: boolean;
  mode?: AgentSessionMode;
  session_key?: string;
  error?: string | null;
  message?: string | null;
};

export type ContextDiagnosticsResponse = {
  active?: boolean;
  runtime?: boolean;
  reason?: string | null;
  error?: string | null;
  report?: {
    model?: string | null;
    context_pressure_percent?: number | null;
    context_window_used_pct?: number | null;
    token_estimate?: number | null;
    used_tokens?: number | null;
    context_window_tokens?: number | null;
    total_tokens?: number | null;
    history_messages?: number | null;
    history_trim_limit_messages?: number | null;
    history_trimmed?: number | null;
    token_compaction_triggered?: boolean | null;
    compaction_triggered?: boolean | null;
    token_compaction_threshold?: number | null;
    compaction_threshold_pct?: number | null;
    tools?: number | null;
    tools_loaded?: number | null;
    roles?: Record<string, number> | null;
    memory?: Record<string, unknown> | null;
    prompt?: Record<string, unknown> | null;
    retrieval?: Record<string, unknown> | null;
    continuity?: Record<string, unknown> | null;
    cache?: Record<string, unknown> | null;
    buckets?: Record<string, unknown> | null;
    runtime?: Record<string, unknown> | null;
    last_turn?: Record<string, unknown> | null;
  } | null;
};

export type MemoryDoctorResponse = {
  active?: boolean;
  runtime?: boolean;
  reason?: string | null;
  error?: string | null;
  report_text?: string | null;
};

export type AgentSessionApprovalPayload = {
  approved: boolean;
  approval_id?: string;
  tool?: string;
  reason?: string;
};

export async function listAgentSessions() {
  const response = await backendAuthRequest("/api/agent/sessions", { method: "GET" });
  const data = await parseApiJson<{ sessions: AgentSession[] }>(response);
  return { response, data };
}

export async function fetchAgentSession(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}`, {
    method: "GET",
  });
  const data = await parseApiJson<AgentSession>(response);
  return { response, data };
}

export async function deleteAgentSession(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}`, {
    method: "DELETE",
  });
  const data = await parseApiJson<{ ok: boolean }>(response);
  return { response, data };
}

export async function compactAgentSession(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/compact`, {
    method: "POST",
  });
  const data = await parseApiJson<{ ok: boolean; tokens_before?: number; tokens_after?: number }>(
    response
  );
  return { response, data };
}

export async function fetchAgentSessionContext(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/context`, {
    method: "GET",
  });
  const data = await parseApiJson<AgentSessionContext>(response);
  return { response, data };
}

export async function exportAgentSession(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/export`, {
    method: "GET",
  });
  const data = await parseApiJson<{ messages: Record<string, unknown>[] }>(response);
  return { response, data };
}

export async function fetchAgentSessionHistory(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/history`, {
    method: "GET",
  });
  const data = await parseApiJson<{ messages: Record<string, unknown>[] }>(response);
  return { response, data };
}

export async function setAgentSessionMode(
  sessionKey: string,
  mode: AgentSessionMode
) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/mode`, {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
  const data = await parseApiJson<AgentSessionModeResponse>(response);
  return { response, data };
}

export async function fetchBotRuntimeStatus() {
  const response = await backendRequest("/v1/me/bot/runtime", { method: "GET" });
  const data = await parseApiJson<BotRuntimeStatusResponse>(response);
  return { response, data };
}

export async function fetchContextDiagnostics() {
  const response = await backendAuthRequest("/api/me/diagnostics/context", {
    method: "GET",
  });
  const data = await parseApiJson<ContextDiagnosticsResponse>(response);
  return { response, data };
}

export async function fetchMemoryDoctor() {
  const response = await backendAuthRequest("/api/me/diagnostics/memory-doctor", {
    method: "GET",
  });
  const data = await parseApiJson<MemoryDoctorResponse>(response);
  return { response, data };
}

export async function approveAgentSession(
  sessionKey: string,
  payload: AgentSessionApprovalPayload
) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{ ok: boolean }>(response);
  return { response, data };
}

// ── /brain/graph ─────────────────────────────────────────────
export interface BrainGraphResponse {
  nodes: BrainGraphNode[];
  edges: BrainGraphEdge[];
  trimmed: boolean;
  total_skipped: number;
  total_nodes_in_corpus: number;
  semantic_degraded: boolean;
}

export interface BrainGraphNode {
  id: string;
  key?: string;
  kind: "core" | "daily" | "conversation" | string;
  created_at: number;
  session_id: string | null;
  summary: string;
  valid_to: number | null;
  importance_score?: number;
  // V1.7 fields
  importance?: number;
  display_label?: string;
  community_id?: number | null;
  community_name?: string | null;
  link_type?: BrainLinkType | string | null;
  source_snippet?: string | null;
}

export type BrainLinkType =
  | "preference"
  | "attribute"
  | "supersession"
  | "relationship"
  | "usage"
  | "synthesis"
  | "episode";

export const BRAIN_LINK_TYPES: BrainLinkType[] = [
  "preference",
  "attribute",
  "supersession",
  "relationship",
  "usage",
  "synthesis",
  "episode",
];

export type BrainGraphEdge =
  | { type: "session"; source: string; target: string; weight?: number; predicate?: string }
  | { type: "semantic"; source: string; target: string; weight: number; predicate?: string }
  | { type: "reference"; source: string; target: string; weight?: number; predicate?: string }
  | {
      type: "typed";
      source: string;
      target: string;
      // V1.11 (2026-05-07) — gateway now emits real per-edge confidence
      // (LLM extractor's certainty, 0..1) and weight (vote count from
      // re-extractions / community detection). Layout uses these as the
      // relevance signal: tight pull on confident, multi-attestation
      // edges; loose pull on weak ones.
      confidence?: number;
      weight?: number;
      predicate?: string;
      label?: string;
    };

// ── /brain/timeline ──────────────────────────────────────────
export interface BrainTimelineResponse {
  entries: BrainTimelineEntry[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface BrainTimelineEntry {
  id: string;
  key: string;
  kind: "core" | "daily" | "conversation" | string;
  created_at: number;
  session_id: string | null;
  summary: string;
  valid_to: number | null;
}

// ── /brain/compose ───────────────────────────────────────────
export interface BrainComposeRequest {
  title: string;
  content: string;
  references: string[];
  category?: "core" | "daily" | "conversation";
  key?: string;
}

export interface BrainComposeResponse {
  key: string;
  synthesized_by: "user";
  references_count: number;
  category: string;
  composed_at: number;
}

export interface BrainSearchResponse {
  results: BrainGraphNode[];
}

export interface BrainMemoryDetail {
  id: string;
  key?: string;
  kind: "core" | "daily" | "conversation" | string;
  created_at: number;
  session_id: string | null;
  summary: string;
  content?: string;
  valid_to: number | null;
  importance_score?: number;
  confidence_score?: number;
  source?: {
    timestamp: number;
    snippet?: string | null;
  } | null;
  linked_memories?: Array<{
    id?: string;
    link_type: string;
    summary: string;
  }>;
  valid_history?: Array<{
    content: string;
    valid_from: number;
    valid_to: number | null;
  }>;
}

function appendBrainQueryParams(
  path: string,
  params: Record<string, string | number | undefined>
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export interface BrainGraphFetchOpts {
  since?: number;
  max_nodes?: number;
  node_kinds?: string;
  search?: string;
  link_types?: string;
  exclude_orphans?: boolean;
}

export async function fetchBrainGraph(
  userId: string,
  opts?: BrainGraphFetchOpts
): Promise<BrainGraphResponse> {
  void userId;
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/brain/graph", {
      since: opts?.since,
      max_nodes: opts?.max_nodes,
      node_kinds: opts?.node_kinds,
      search: opts?.search,
      link_types: opts?.link_types,
      exclude_orphans:
        opts?.exclude_orphans === undefined ? undefined : String(opts.exclude_orphans),
    }),
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/graph ${response.status}`);
  return parseApiJson<BrainGraphResponse>(response);
}

// ── /brain/local-graph ────────────────────────────────────────
export interface BrainLocalGraphNode {
  id?: string;
  key: string;
  kind: string;
  hop_distance: number;
  score?: number;
  summary: string;
  valid_to: number | null;
  session_id?: string | null;
  link_type?: string | null;
  importance?: number;
  display_label?: string;
  community_id?: number | null;
  community_name?: string | null;
}

export interface BrainLocalGraphEdge {
  source: string;
  target: string;
  predicate?: string;
  weight?: number;
  link_type?: string | null;
}

export interface BrainLocalGraphResponse {
  center_key: string;
  depth: number;
  nodes: BrainLocalGraphNode[];
  edges: BrainLocalGraphEdge[];
  stats: { nodes: number; edges: number };
}

export async function fetchBrainLocalGraph(
  userId: string,
  opts: { center_key: string; depth?: number; max_nodes?: number }
): Promise<BrainLocalGraphResponse> {
  void userId;
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/brain/local-graph", {
      center_key: opts.center_key,
      depth: opts.depth,
      max_nodes: opts.max_nodes,
    }),
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/local-graph ${response.status}`);
  return parseApiJson<BrainLocalGraphResponse>(response);
}

// ── /brain/orphans ────────────────────────────────────────────
export interface BrainOrphan {
  id: string;
  key?: string;
  kind: string;
  created_at: number;
  session_id: string | null;
  summary: string;
  valid_to: number | null;
  link_type?: string | null;
}

export interface BrainOrphansResponse {
  orphans: BrainOrphan[];
  stats: { orphans: number; limit: number };
}

export async function fetchBrainOrphans(
  userId: string,
  opts?: { limit?: number }
): Promise<BrainOrphansResponse> {
  void userId;
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/brain/orphans", { limit: opts?.limit }),
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/orphans ${response.status}`);
  return parseApiJson<BrainOrphansResponse>(response);
}

// ── /brain/diff ───────────────────────────────────────────────
export interface BrainDiffEntry {
  id?: string;
  key: string;
  kind: string;
  summary: string;
  valid_to?: number | null;
  created_at?: number;
}

export interface BrainDiffResponse {
  window: { from: number; to: number; date: string; window_days: number };
  births: BrainDiffEntry[];
  deaths: BrainDiffEntry[];
  stats: { births: number; deaths: number };
}

export async function fetchBrainDiff(
  userId: string,
  opts: { date: string; window_days?: number }
): Promise<BrainDiffResponse> {
  void userId;
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/brain/diff", {
      date: opts.date,
      window_days: opts.window_days,
    }),
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/diff ${response.status}`);
  return parseApiJson<BrainDiffResponse>(response);
}

// ── /brain/communities ────────────────────────────────────────
export interface BrainCommunity {
  community_id: number;
  member_count: number;
  generated_at: number | null;
  name: string;
  name_source: "llm" | "fallback" | string;
}

export interface BrainCommunitiesResponse {
  communities: BrainCommunity[];
  stats: { communities: number };
}

export interface BrainCommunitiesRecomputeResponse {
  stats: {
    edges_loaded: number;
    nodes_in_lpa: number;
    communities_found: number;
    members_assigned: number;
    llm_calls_succeeded: number;
    llm_calls_failed: number;
    fallback_names_written: number;
  };
}

export async function fetchBrainCommunities(
  userId: string
): Promise<BrainCommunitiesResponse> {
  void userId;
  const response = await backendAuthRequest("/api/agent/brain/communities", {
    method: "GET",
  });
  if (!response.ok) throw new Error(`brain/communities ${response.status}`);
  return parseApiJson<BrainCommunitiesResponse>(response);
}

export class BrainRecomputeConflictError extends Error {
  constructor() {
    super("recompute_in_progress");
    this.name = "BrainRecomputeConflictError";
  }
}

export async function postBrainCommunitiesRecompute(
  userId: string
): Promise<BrainCommunitiesRecomputeResponse> {
  void userId;
  const response = await backendAuthRequest(
    "/api/agent/brain/communities/recompute",
    { method: "POST", body: JSON.stringify({}) }
  );
  if (response.status === 409) throw new BrainRecomputeConflictError();
  if (!response.ok) throw new Error(`brain/communities/recompute ${response.status}`);
  return parseApiJson<BrainCommunitiesRecomputeResponse>(response);
}

export async function fetchBrainTimeline(
  userId: string,
  opts?: { cursor?: string; limit?: number; kind?: string; to?: number }
): Promise<BrainTimelineResponse> {
  void userId;
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/brain/timeline", {
      cursor: opts?.cursor,
      limit: opts?.limit,
      kind: opts?.kind,
      to: opts?.to,
    }),
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/timeline ${response.status}`);
  return parseApiJson<BrainTimelineResponse>(response);
}

export async function postBrainCompose(
  userId: string,
  body: BrainComposeRequest
): Promise<BrainComposeResponse> {
  void userId;
  const response = await backendAuthRequest("/api/agent/brain/compose", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`brain/compose ${response.status}`);
  return parseApiJson<BrainComposeResponse>(response);
}

export async function fetchBrainSearch(
  userId: string,
  q: string
): Promise<BrainSearchResponse> {
  void userId;
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/brain/search", { q }),
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/search ${response.status}`);
  return parseApiJson<BrainSearchResponse>(response);
}

// Audit (2026-05-08) — backend Day 1 #6 changed the response shape from
// flat fields to a wrapper { memory, edges, events }. This adapter
// flattens it back to the BrainMemoryDetail interface so DetailPanel
// keeps working without a per-call refactor. Synthesizes linked_memories
// from the edges array; valid_history stays empty until backend exposes
// the supersede event payload (event_log doesn't currently surface
// valid_from / valid_to ranges per version — filed as a follow-up).
type BrainMemoryWrappedResponse = {
  memory?: {
    key?: string;
    content?: string;
    summary?: string;
    category?: string;
    kind?: string;
    session_id?: string | null;
    valid_to?: number | null;
    created_at?: number;
    archived?: boolean;
    metadata?: {
      confidence?: number;
      importance?: number;
      [k: string]: unknown;
    } | null;
    link_type?: string | null;
    source?: {
      timestamp?: number;
      session_id?: string | null;
      snippet?: string | null;
    } | null;
  };
  edges?: Array<{
    source_key?: string;
    target_key?: string;
    predicate?: string;
    weight?: number;
    confidence?: number;
    link_type?: string;
  }>;
  events?: Array<{
    id?: string;
    event_type?: string;
    created_at?: number;
    payload?: Record<string, unknown>;
  }>;
};

function adaptBrainMemoryResponse(
  raw: unknown,
  fallbackKey: string,
): BrainMemoryDetail {
  // Detect wrapped vs legacy flat shape so we tolerate both.
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!("memory" in obj)) {
    return raw as BrainMemoryDetail;
  }
  const r = obj as BrainMemoryWrappedResponse;
  const m = r.memory ?? {};
  const events = r.events ?? [];
  const edges = r.edges ?? [];
  const firstUpsertCreatedAt =
    events.find((e) => e.event_type === "upsert")?.created_at;
  const linked: BrainMemoryDetail["linked_memories"] = edges.map((e) => ({
    id: e.target_key,
    link_type: e.link_type || e.predicate || "related",
    summary: e.predicate || e.link_type || "linked",
  }));
  return {
    id: m.key ?? fallbackKey,
    key: m.key ?? fallbackKey,
    kind: (m.kind ?? m.category ?? "") as BrainMemoryDetail["kind"],
    created_at: m.created_at ?? firstUpsertCreatedAt ?? 0,
    session_id: m.session_id ?? null,
    summary: m.summary ?? m.content ?? "",
    content: m.content ?? m.summary ?? "",
    valid_to: m.valid_to ?? null,
    importance_score:
      (m.metadata && typeof m.metadata.importance === "number")
        ? m.metadata.importance
        : undefined,
    confidence_score:
      (m.metadata && typeof m.metadata.confidence === "number")
        ? m.metadata.confidence
        : undefined,
    source: m.source
      ? {
          timestamp: m.source.timestamp ?? firstUpsertCreatedAt ?? 0,
          snippet: m.source.snippet ?? null,
        }
      : null,
    linked_memories: linked,
    valid_history: [],
  };
}

export interface BrainMeResponse {
  key: string;
  kind: string;
  summary: string;
  valid_to: number | null;
}

// Audit (2026-05-08) — backend Day 1 #2 ships /brain/me as the canonical
// "this is the user" anchor. Response shape mirrors the wrapped memory
// pattern: { memory: { key, kind, summary, valid_to } }. This adapter
// flattens it to a stable BrainMeResponse interface so the FE can
// pivot when the underlying picker heuristic changes server-side.
export async function fetchBrainMe(userId: string): Promise<BrainMeResponse | null> {
  void userId;
  const response = await backendAuthRequest("/api/agent/brain/me", {
    method: "GET",
  });
  if (!response.ok) return null;
  const raw = (await parseApiJson<unknown>(response)) as {
    memory?: { key?: string; kind?: string; summary?: string; valid_to?: number | null };
  } | null;
  const m = raw?.memory;
  if (!m?.key) return null;
  return {
    key: m.key,
    kind: m.kind ?? "core",
    summary: m.summary ?? "",
    valid_to: m.valid_to ?? null,
  };
}

export async function fetchBrainMemory(
  userId: string,
  key: string
): Promise<BrainMemoryDetail> {
  void userId;
  const response = await backendAuthRequest(
    `/api/agent/brain/memory/${encodeURIComponent(key)}`,
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/memory ${response.status}`);
  const raw = await parseApiJson<unknown>(response);
  return adaptBrainMemoryResponse(raw, key);
}
