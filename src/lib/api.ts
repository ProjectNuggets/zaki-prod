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
    superseded?: boolean;
  }>;
  duplicates: Array<{
    content: string;
    type: string;
  }>;
  superseded: Array<{
    memoryId: string;
    content: string;
    type: string;
  }>;
  skipped: Array<{
    content: string;
    type: string;
    reason: string;
    stage?: "extraction" | "quality_filter" | "policy" | "store" | "duplicate_guard";
    detail?: string;
  }>;
};

export type MemoryPolicy = "balanced" | "off";

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
  kind: "saved" | "superseded" | "edited" | "outdated";
  content: string;
  type: string;
  threadId?: string | null;
  source?: string | null;
  occurredAt: string;
};

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
  redirectOnAuthFailure?: boolean;
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
  const legacyBase = getConfiguredLegacyApiBase();
  if (legacyBase && legacyBase.trim()) {
    return legacyBase.replace(/\/+$/, "");
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

export function buildLoginRedirectUrl(returnTo?: string) {
  const url = new URL("/?auth=login", "https://zaki.local");
  let currentLocation = "";
  if (typeof window !== "undefined") {
    const currentSearch = new URLSearchParams(window.location.search || "");
    const currentNext = currentSearch.get("next");
    currentLocation =
      currentSearch.has("auth") && currentNext
        ? currentNext
        : `${window.location.pathname || "/"}${window.location.search || ""}${
            window.location.hash || ""
          }`;
  }
  const rawReturnTo = returnTo || currentLocation;
  const normalizedReturnTo = String(rawReturnTo || "").trim();
  if (
    normalizedReturnTo &&
    normalizedReturnTo !== "/" &&
    !normalizedReturnTo.startsWith("http://") &&
    !normalizedReturnTo.startsWith("https://") &&
    !normalizedReturnTo.startsWith("//")
  ) {
    const parsedReturnTo = new URL(
      normalizedReturnTo.startsWith("/") ? normalizedReturnTo : `/${normalizedReturnTo}`,
      "https://zaki.local"
    );
    parsedReturnTo.searchParams.delete("auth");
    url.searchParams.set(
      "next",
      `${parsedReturnTo.pathname}${parsedReturnTo.search}${parsedReturnTo.hash}`
    );
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

type LoginRedirectDispatcher = (url: string) => void;
let loginRedirectDispatcherForTests: LoginRedirectDispatcher | null = null;

export function __setLoginRedirectDispatcherForTests(
  dispatcher: LoginRedirectDispatcher | null
) {
  loginRedirectDispatcherForTests = dispatcher;
}

export function redirectToLogin(returnTo?: string) {
  const target = buildLoginRedirectUrl(returnTo);
  if (loginRedirectDispatcherForTests) {
    loginRedirectDispatcherForTests(target);
    return target;
  }
  if (typeof window !== "undefined") {
    window.location.href = target;
  }
  return target;
}

export async function apiRequest(
  path: string,
  options: ApiRequestOptions = {},
  _isRetry = false  // internal flag — prevents refresh loop
): Promise<Response> {
  const { skipAuth, redirectOnAuthFailure = true, headers, body, ...rest } = options;
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
        if (!redirectOnAuthFailure) return retryResponse;
        useAuthStore.getState().logout();
        redirectToLogin();
      }
      return retryResponse;
    }
    // Refresh failed — redirect to login
    if (!redirectOnAuthFailure) return response;
    if (typeof window !== "undefined") {
      useAuthStore.getState().logout();
      redirectToLogin();
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
  const { redirectOnAuthFailure = true, headers, ...rest } = options;
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
      const retryResponse = await backendRequest(path, { ...rest, headers: retryHeaders });
      if (retryResponse.status === 401) {
        if (!redirectOnAuthFailure) return retryResponse;
        if (typeof window !== "undefined") {
          useAuthStore.getState().logout();
          redirectToLogin();
        }
      }
      return retryResponse;
    }
    if (!redirectOnAuthFailure) return response;
    if (typeof window !== "undefined") {
      useAuthStore.getState().logout();
      redirectToLogin();
    }
  }
  return response;
}

export type SpacesAnonymousWorkClaimPayload = {
  workId?: string | null;
  prompt?: string;
  replyPreview?: string;
  title?: string;
  threadId?: string | null;
  route?: string | null;
};

export type SpacesAnonymousWorkClaimResponse = {
  success?: boolean;
  workspaceSlug?: string;
  threadSlug?: string | null;
  route?: string;
  imported?: boolean;
  retryable?: boolean;
  code?: string;
  error?: string;
};

export async function claimAnonymousSpacesWork(
  payload: SpacesAnonymousWorkClaimPayload
) {
  const response = await apiRequest("/api/spaces/anonymous-work/claim", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as SpacesAnonymousWorkClaimResponse;
  return { response, data };
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

export async function deleteMemory(memoryId: string) {
  return apiRequest(`/api/memory/${encodeURIComponent(memoryId)}`, {
    method: "DELETE",
  });
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

export async function requestLogout() {
  const response = await backendRequest("/api/auth/logout", {
    method: "POST",
  });

  let data: { success?: boolean; error?: string | null } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }

  return { response, data };
}

export function buildGoogleOAuthStartUrl(returnTo?: string) {
  const fallbackReturnTo =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : "/spaces";
  const url = new URL(buildApiUrl("/api/auth/google/start"));
  url.searchParams.set("returnTo", returnTo || fallbackReturnTo);
  return url.toString();
}

export async function fetchGoogleOAuthStatus() {
  const response = await backendRequest("/api/auth/google/status", { method: "GET" });
  let data: { success?: boolean; enabled?: boolean } = {};
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
  turnstileToken,
}: {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  legalConsentAccepted?: boolean;
  legalPolicyVersion?: string;
  turnstileToken?: string | null;
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
  if (turnstileToken) {
    payload.turnstileToken = turnstileToken;
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
    commercial?: {
      planId?: "spaces_free" | "agent" | "learn" | "complete" | "legacy_personal" | "access_code";
      label?: string;
      source?: "free" | "subscription" | "access_code";
      grandfathered?: boolean;
      products?: {
        spaces?: {
          access?: boolean;
          authenticated?: boolean;
          memoryEligible?: boolean;
          uncapped?: boolean;
          quota?: "metered" | "uncapped";
        };
        agent?: {
          access?: boolean;
          preview?: boolean;
          weeklyFreeMessages?: number | null;
        };
        learn?: {
          access?: boolean;
          preview?: boolean;
          weeklyFreeActions?: number | null;
        };
        billing?: {
          paid?: boolean;
          wholeApp?: boolean;
          grandfathered?: boolean;
        };
      };
    };
    platform?: {
      policyVersion?: string;
      planLadder?: Array<"free" | "personal" | "pro" | "pro_max">;
      plan?: {
        id?: "free" | "personal" | "pro" | "pro_max";
        label?: string;
        source?: "free" | "subscription" | "access_code";
        premium?: boolean;
        legacyPlanId?: string | null;
        migration?: boolean;
      };
      usage?: {
        model?: "shared_weekly_allowance";
        weeklyAllowanceUnits?: number | null;
        weeklyAllowanceConfigured?: boolean;
        weeklyAllowancePeriod?: string;
        weeklyAllowanceAnchorPolicy?: string;
        weeklyAllowanceEntitlementStartedAt?: string | null;
        weeklyAllowanceResetPolicy?: string;
        weeklyAllowanceRollover?: boolean;
        burstWindowHours?: number;
        productQuotaMode?: "weighted_product_caps";
        numericLimitsFinalized?: boolean;
      };
      products?: Record<
        string,
        {
          label?: string;
          available?: boolean;
          lifecycle?: "current" | "future";
          quotaPolicyId?: string;
          memoryScope?: string;
        }
      >;
      memory?: {
        scopes?: string[];
        personalAuthority?: string;
        workspaceAuthority?: string;
        learnerAuthority?: string;
      };
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
  const token = getAuthToken();
  const response = token
    ? await backendAuthRequest("/api/billing/config", { method: "GET" })
    : await backendRequest("/api/billing/public-config", { method: "GET" });
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
        pro?: {
          monthly?: boolean;
          yearly?: boolean;
        };
        pro_max?: {
          monthly?: boolean;
          yearly?: boolean;
        };
        agent?: {
          monthly?: boolean;
          yearly?: boolean;
        };
        learn?: {
          monthly?: boolean;
          yearly?: boolean;
        };
        complete?: {
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
      topupCheckoutEnabled?: boolean;
      topupPacks?: Array<{
        id: string;
        label: string;
        units: number;
        stripePriceId?: string;
        unitAmount?: number | null;
        currency?: string | null;
        available: boolean;
      }>;
      pricingCatalog?: {
        student?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        personal?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        pro?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        pro_max?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        agent?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        learn?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        complete?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
          yearly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
        access?: {
          monthly?: { priceId?: string; unitAmount?: number | null; currency?: string | null } | null;
        };
      };
      platformPlanAllowances?: Record<
        "free" | "personal" | "pro" | "pro_max",
        {
          id?: string;
          label?: string;
          weeklyAllowanceUnits?: number | null;
          rollingAllowanceUnits?: number | null;
          burstWindowHours?: number | null;
        }
      >;
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
  plan: "student" | "personal" | "pro" | "pro_max",
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

export async function createTopupCheckoutSession(
  packId: string,
  context?: {
    source?: ProductTelemetrySource;
  }
) {
  const response = await backendAuthRequest("/api/billing/topups/checkout", {
    method: "POST",
    body: JSON.stringify({
      packId,
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
  appChatPromptPeriod?: "day" | "week" | string;
  learningDailyPromptLimit?: number;
  learningDailyPromptBucket?: string;
  learningPromptPeriod?: "day" | "week" | string;
  zakiBotDailyPromptLimit: number;
  zakiBotDailyPromptBucket: string;
  zakiBotPromptPeriod?: "day" | "week" | string;
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

async function parseRequiredApiJson<T>(response: Response, label: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${label} invalid JSON`);
  }
}

function assertBrainGraphResponse(data: BrainGraphResponse): BrainGraphResponse {
  if (!Array.isArray(data?.nodes) || !Array.isArray(data?.edges)) {
    throw new Error("brain/graph invalid response");
  }
  if (typeof data.total_nodes_in_corpus !== "number") {
    throw new Error("brain/graph missing total_nodes_in_corpus");
  }
  return data;
}

export type UsageQuotaSurface = "app_chat" | "zaki_bot" | "learning" | "hire";
export type PlatformUsageProductId =
  | "spaces"
  | "agent"
  | "learn"
  | "hire"
  | "design"
  | "brain"
  | "cli"
  | "local_app"
  | "extensions";
export type PlatformPlanId = "free" | "personal" | "pro" | "pro_max";
export type ProductRegistryProductId =
  | "spaces"
  | "agent"
  | "learning"
  | "hire"
  | "design"
  | "brain"
  | "cli"
  | "local_app"
  | "extensions";
export type ProductOperationalState =
  | "enabled"
  | "disabled"
  | "maintenance"
  | "degraded"
  | "hidden"
  | "readOnly";

export type ProductRegistryItem = {
  productId: ProductRegistryProductId;
  legacyProductId?: PlatformUsageProductId | null;
  label: string;
  productKind?: "product" | "control_plane" | "client" | string;
  state: ProductOperationalState;
  lifecycle?: "current" | "future" | string;
  visibleInSettings?: boolean;
  route?: string | null;
  entryPoint?: string | null;
  quotaPolicyId?: string | null;
  memoryScope?: string | null;
};

export type ProductRegistryResponse = {
  success?: boolean;
  contractVersion?: string;
  policyVersion?: string;
  generatedAt?: string;
  products?: ProductRegistryItem[];
  error?: string | null;
};

export type MeterWindowSnapshot = {
  period?: string | null;
  resetPolicy?: string | null;
  rollover?: boolean | null;
  anchorType?: string | null;
  anchorAt?: string | null;
  entitlementStartedAt?: string | null;
  planMeterGroup?: string | null;
  pendingFirstUse?: boolean;
  unusedUnitsExpireAt?: string | null;
  windowHours?: number;
  used?: number | null;
  receipts?: number;
  limit?: number | null;
  recurringRemaining?: number | null;
  topupUnits?: number | null;
  remaining?: number | null;
  source?: "wallet_unit_ledger" | "central_meter_receipts" | string;
  startedAt?: string | null;
  resetAt?: string | null;
};

export type MeterStatusProduct = {
  id?: ProductRegistryProductId;
  state?: ProductOperationalState;
  lifecycle?: "current" | "future" | string;
  route?: string | null;
  quotaPolicyId?: string | null;
  rolling?: MeterWindowSnapshot | null;
  weekly?: MeterWindowSnapshot | null;
  grantPolicy?: {
    allowed?: boolean;
    reason?: string | null;
    status?: number;
  };
};

export type MeterAvailableNow = {
  requiredReserveUnits?: number | null;
  weeklyRemaining?: number | null;
  rollingRemaining?: number | null;
  topupUnits?: number | null;
  effectiveRemaining?: number | null;
  limitingWindow?: "weekly" | "rolling" | string | null;
  constraint?: "weekly" | "rolling" | string | null;
  shortfall?: number | null;
  available?: boolean;
  resetAt?: string | null;
};

export type MeterStatusResponse = {
  success?: boolean;
  contractVersion?: string;
  productRegistryVersion?: string;
  platformPolicyVersion?: string;
  generatedAt?: string;
  identity?: {
    type?: "user" | "anonymous" | string;
    tenantId?: string;
    userId?: string | number | null;
    anonymousSessionId?: string | null;
  };
  plan?: {
    tier?: PlatformPlanId | string;
    label?: string;
    source?: string;
  };
  rolling?: MeterWindowSnapshot | null;
  weekly?: MeterWindowSnapshot | null;
  availableNow?: {
    agent?: MeterAvailableNow | null;
  } | null;
  products?: Partial<Record<ProductRegistryProductId, MeterStatusProduct>>;
  error?: string | null;
};

export type UsageQuotaSnapshot = {
  success?: boolean;
  unavailable?: boolean;
  unlimited?: boolean;
  limit?: number | null;
  used?: number;
  remaining?: number | null;
  resetAt?: string | null;
  bucket?: string | null;
  period?: "day" | "week" | string | null;
  surface?: UsageQuotaSurface | null;
  error?: string | null;
  metered?: boolean;
  status?: string | null;
};

export type PlatformUsageSummary = {
  success?: boolean;
  contractVersion?: string;
  platformPolicyVersion?: string;
  generatedAt?: string;
  plan?: {
    id?: PlatformPlanId;
    label?: string;
    source?: "free" | "subscription" | "access_code" | string;
    premium?: boolean;
    legacyPlanId?: string | null;
    migration?: boolean;
  };
  allowance?: {
    model?: "shared_weekly_allowance" | string;
    ledgerMode?: "legacy_surface_counters" | "central_meter_receipts" | "wallet_unit_ledger" | string;
    weekly?: {
      configured?: boolean;
      limit?: number | null;
      used?: number | null;
      remaining?: number | null;
      resetAt?: string | null;
      startedAt?: string | null;
      period?: string | null;
      anchorType?: string | null;
      anchorAt?: string | null;
      entitlementStartedAt?: string | null;
      planMeterGroup?: string | null;
      pendingFirstUse?: boolean;
      resetPolicy?: string | null;
      rollover?: boolean | null;
      unusedUnitsExpireAt?: string | null;
      source?: "wallet_unit_ledger" | "central_meter_receipts" | string;
    };
    burst?: {
      windowHours?: number;
      active?: boolean | null;
      remainingSeconds?: number | null;
      source?: string;
    };
    productQuotaMode?: "weighted_product_caps" | string;
    numericLimitsFinalized?: boolean;
  };
  products?: Partial<
    Record<
      PlatformUsageProductId,
      {
        productId?: PlatformUsageProductId;
        label?: string;
        available?: boolean;
        lifecycle?: "current" | "future" | string;
        memoryScope?: string;
        quota?: UsageQuotaSnapshot;
        learning?: unknown;
      }
    >
  >;
  memory?: {
    scopes?: string[];
    personalAuthority?: string;
    workspaceAuthority?: string;
    learnerAuthority?: string;
  } | null;
  error?: string | null;
};

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
  group_activation?: "mention" | "always";
  proactive_updates?: boolean;
  voice_replies?: boolean;
  session_timeout_minutes?: number;
  assistant_mode?: "fast" | "balanced" | "deep";
  autonomy?: "read_only" | "supervised" | "full";
  dream_enabled?: boolean;
  query_expansion_enabled?: boolean;
  selected_model?: string | null;
};

export type BotSettingsPatch = {
  group_activation?: "mention" | "always";
  proactive_updates?: boolean;
  voice_replies?: boolean;
  session_timeout_minutes?: number;
  assistant_mode?: "fast" | "balanced" | "deep";
  autonomy?: "read_only" | "supervised" | "full";
  dream_enabled?: boolean;
  query_expansion_enabled?: boolean;
  selected_model?: string | null;
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

export type AgentChannelId = "telegram" | "slack" | "discord" | "email";

export type AgentChannelBinding = {
  id: string;
  account_id: string;
  principal_key: string;
  scope_key: string;
  thread_key?: string | null;
};

export type AgentChannelBindingPayload = {
  account_id: string;
  principal_key: string;
  scope_key: string;
  thread_key?: string | null;
  peer_kind?: string | null;
  peer_id?: string | null;
  metadata_json?: string | null;
};

export type AgentChannelStatus = {
  id: AgentChannelId;
  label: string;
  live?: boolean;
  available?: boolean;
  status?: string;
  connected?: boolean;
  configured?: boolean;
  connect_supported?: boolean;
  disconnect_supported?: boolean;
  bindings_supported?: boolean;
  operator_managed_runtime?: boolean;
  required_secrets?: string[];
  configured_secrets?: string[];
  missing_secrets?: string[];
  instructions?: string[];
  bindings?: {
    status?: "ok" | "unavailable" | string;
    count?: number;
    items?: AgentChannelBinding[];
  };
};

export type AgentChannelsResponse = BotApiError & {
  channels?: AgentChannelStatus[];
  degraded?: boolean;
  errors?: string[];
};

export type AgentChannelBindingsResponse = BotApiError & {
  channel?: AgentChannelId | string;
  items?: AgentChannelBinding[];
};

export type AgentChannelBindingMutationResponse = BotApiError & {
  status?: string;
  id?: string;
};

export type AgentChannelControlId = AgentChannelId | "whatsapp";

export type AgentChannelControlStatus = {
  channel: AgentChannelControlId | string;
  label?: string;
  build_enabled?: boolean;
  operator_configured?: boolean;
  user_managed?: boolean;
  user_connected?: boolean;
  status?: "disabled_in_build" | "connected" | "partial" | "operator_managed" | "not_connected" | string;
  secret_refs?: Array<{
    key: string;
    label?: string;
    required?: boolean;
    present?: boolean;
  }>;
  config?: Record<string, string>;
  last_test?: {
    ok?: boolean;
    checked_at_s?: number;
    detail?: string;
  } | null;
  endpoints?: Record<string, string>;
};

export type AgentChannelControlResponse = BotApiError & {
  channels?: AgentChannelControlStatus[];
};

export type AgentProviderProfile = {
  id: string;
  label: string;
  provider_kind: string;
  base_url: string;
  auth_style: string;
  model_allowlist: string[];
  default_model?: string | null;
  policy_state?: "active" | "disabled" | "blocked" | string;
  secret_ref?: {
    key?: string;
    present?: boolean;
  };
  last_test?: {
    ok?: boolean;
    checked_at_s?: number;
    detail?: string;
  } | null;
  created_at_s?: number;
  updated_at_s?: number;
};

export type AgentProviderProfilePayload = {
  label?: string;
  provider_kind?: string;
  base_url?: string;
  auth_style?: "bearer" | "api_key_header" | "query_param";
  api_key?: string;
  model_allowlist?: string[];
  default_model?: string | null;
  policy_state?: "active" | "disabled";
};

export type AgentProviderProfilesResponse = BotApiError & {
  providers?: AgentProviderProfile[];
};

export type AgentExtensionDevice = {
  id?: string;
  device_id?: string;
  label?: string;
  status?: "active" | "revoked" | string;
  connection_state?: "connected" | "disconnected" | "never_connected" | "revoked" | string;
  paired_at_s?: number;
  last_seen_at_s?: number | null;
  last_command?: string | null;
  last_command_at_s?: number | null;
  last_error?: string | null;
  last_error_at_s?: number | null;
};

export type AgentExtensionDevicesResponse = BotApiError & {
  devices?: AgentExtensionDevice[];
};

export type AgentIntegrationsResponse = BotApiError & {
  integrations?: Array<{
    kind: "composio" | "openapi" | "mcp_client" | string;
    label: string;
    configured?: boolean;
    user_manageable?: boolean;
    managed_by?: string;
    count?: number;
    detail?: Record<string, unknown>;
    items?: Array<Record<string, unknown>>;
  }>;
};

export type AgentMemoryGovernanceResponse = BotApiError & {
  total?: number;
  pii?: {
    phone?: number;
    email?: number;
    all?: number;
  };
};

export type AgentMemoryPurgePiiResponse = BotApiError & {
  category?: "phone" | "email" | "all" | string;
  dry_run?: boolean;
  candidate_count?: number;
  deleted?: number | null;
  sample_keys?: string[];
  sample_truncated?: boolean;
};

export type AgentMemoryExportResponse = BotApiError & {
  user_id?: string;
  count?: number;
  exported_at_s?: number;
  memories?: unknown[];
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

/**
 * Agent session auto-title — same shape as the thread version, scoped
 * by sessionKey. Mirrors the thread-auto-title contract so the FE
 * pattern (in-flight ref + attempts cap + "skipped" reason set) is
 * shared between Spaces and ZAKI bot.
 */
export type AgentSessionAutoTitleRequest = {
  userMessage: string;
  assistantMessage: string;
  currentLabel: string;
};

export type AgentSessionAutoTitleResponse = {
  status: "updated" | "skipped";
  reason?:
    | "not_default_label"
    | "insufficient_content"
    | "generation_failed"
    | "session_not_found";
  session?: {
    key: string;
    title: string;
  };
};

export type AgentSessionRenameResponse = {
  status: "updated";
  session: {
    key: string;
    title: string;
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
    period?: "day" | "week" | string;
    surface?: UsageQuotaSurface;
    error?: string | null;
  }>(response);
  return { response, data };
}

export async function fetchPlatformUsageSummary() {
  const response = await backendAuthRequest("/api/usage/summary", {
    method: "GET",
  });
  const data = await parseApiJson<PlatformUsageSummary>(response);
  return { response, data };
}

export async function fetchProductRegistry() {
  const response = await apiRequest("/api/products/registry", {
    method: "GET",
    skipAuth: true,
  });
  const data = await parseApiJson<ProductRegistryResponse>(response);
  return { response, data };
}

export async function fetchMeterStatus() {
  const response = await backendAuthRequest("/api/meter/status", {
    method: "GET",
  });
  const data = await parseApiJson<MeterStatusResponse>(response);
  return { response, data };
}

export async function fetchAnonymousMeterStatus() {
  const response = await backendRequest("/api/meter/status", {
    method: "GET",
  });
  const data = await parseApiJson<MeterStatusResponse>(response);
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

export async function fetchAgentChannels() {
  const response = await backendAuthRequest("/api/agent/channels", { method: "GET" });
  const data = await parseApiJson<AgentChannelsResponse>(response);
  return { response, data };
}

export async function listAgentChannelBindings(channel: AgentChannelId) {
  const response = await backendAuthRequest(
    `/api/agent/channels/${encodeURIComponent(channel)}/bindings`,
    { method: "GET" }
  );
  const data = await parseApiJson<AgentChannelBindingsResponse>(response);
  return { response, data };
}

export async function upsertAgentChannelBinding(
  channel: AgentChannelId,
  payload: AgentChannelBindingPayload
) {
  const response = await backendAuthRequest(
    `/api/agent/channels/${encodeURIComponent(channel)}/bindings`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  const data = await parseApiJson<AgentChannelBindingMutationResponse>(response);
  return { response, data };
}

export async function deleteAgentChannelBinding(channel: AgentChannelId, bindingId: string) {
  const response = await backendAuthRequest(
    `/api/agent/channels/${encodeURIComponent(channel)}/bindings/${encodeURIComponent(bindingId)}`,
    { method: "DELETE" }
  );
  const data = await parseApiJson<AgentChannelBindingMutationResponse>(response);
  return { response, data };
}

export async function fetchAgentChannelControls() {
  const response = await backendAuthRequest("/api/agent/channel-control", { method: "GET" });
  const data = await parseApiJson<AgentChannelControlResponse>(response);
  return { response, data };
}

export async function connectAgentChannelControl(
  channel: AgentChannelControlId,
  payload: Record<string, string>
) {
  const response = await backendAuthRequest(
    `/api/agent/channel-control/${encodeURIComponent(channel)}/connect`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  const data = await parseApiJson<AgentChannelControlStatus & BotApiError>(response);
  return { response, data };
}

export async function testAgentChannelControl(channel: AgentChannelControlId) {
  const response = await backendAuthRequest(
    `/api/agent/channel-control/${encodeURIComponent(channel)}/test`,
    { method: "POST" }
  );
  const data = await parseApiJson<AgentChannelControlStatus & BotApiError>(response);
  return { response, data };
}

export async function disconnectAgentChannelControl(channel: AgentChannelControlId) {
  const response = await backendAuthRequest(
    `/api/agent/channel-control/${encodeURIComponent(channel)}/disconnect`,
    { method: "POST" }
  );
  const data = await parseApiJson<BotApiError & { status?: string; channel?: string }>(response);
  return { response, data };
}

export async function fetchAgentIntegrations() {
  const response = await backendAuthRequest("/api/agent/integrations", { method: "GET" });
  const data = await parseApiJson<AgentIntegrationsResponse>(response);
  return { response, data };
}

export async function fetchAgentProviderProfiles() {
  const response = await backendAuthRequest("/api/agent/providers", { method: "GET" });
  const data = await parseApiJson<AgentProviderProfilesResponse>(response);
  return { response, data };
}

export async function createAgentProviderProfile(payload: AgentProviderProfilePayload) {
  const response = await backendAuthRequest("/api/agent/providers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<AgentProviderProfile & BotApiError>(response);
  return { response, data };
}

export async function updateAgentProviderProfile(
  profileId: string,
  payload: AgentProviderProfilePayload
) {
  const response = await backendAuthRequest(
    `/api/agent/providers/${encodeURIComponent(profileId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  const data = await parseApiJson<AgentProviderProfile & BotApiError>(response);
  return { response, data };
}

export async function deleteAgentProviderProfile(profileId: string) {
  const response = await backendAuthRequest(
    `/api/agent/providers/${encodeURIComponent(profileId)}`,
    { method: "DELETE" }
  );
  const data = await parseApiJson<BotApiError & { status?: string; id?: string }>(response);
  return { response, data };
}

export async function testAgentProviderProfile(profileId: string) {
  const response = await backendAuthRequest(
    `/api/agent/providers/${encodeURIComponent(profileId)}/test`,
    { method: "POST" }
  );
  const data = await parseApiJson<AgentProviderProfile & BotApiError>(response);
  return { response, data };
}

export async function fetchAgentExtensionDevices() {
  const response = await backendAuthRequest("/api/agent/extension/devices", { method: "GET" });
  const data = await parseApiJson<AgentExtensionDevicesResponse>(response);
  return { response, data };
}

export async function pairAgentExtensionDevice(payload: { label?: string }) {
  const response = await backendAuthRequest("/api/agent/extension/devices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<AgentExtensionDevice & BotApiError>(response);
  return { response, data };
}

export async function revokeAgentExtensionDevice(deviceId: string) {
  const response = await backendAuthRequest(
    `/api/agent/extension/devices/${encodeURIComponent(deviceId)}/revoke`,
    { method: "POST" }
  );
  const data = await parseApiJson<BotApiError & { status?: string; device_id?: string }>(response);
  return { response, data };
}

export async function fetchAgentMemoryGovernance() {
  const response = await backendAuthRequest("/api/agent/memory/governance", { method: "GET" });
  const data = await parseApiJson<AgentMemoryGovernanceResponse>(response);
  return { response, data };
}

export async function purgeAgentMemoryPii(payload: {
  category: "phone" | "email" | "all";
  dry_run?: boolean;
}) {
  const response = await backendAuthRequest("/api/agent/memory/purge-pii", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<AgentMemoryPurgePiiResponse>(response);
  return { response, data };
}

export async function forgetAgentMemory(key: string) {
  const response = await backendAuthRequest("/api/agent/memory/forget", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
  const data = await parseApiJson<BotApiError & { key?: string; forgotten?: boolean }>(response);
  return { response, data };
}

export async function exportAgentMemory() {
  const response = await backendAuthRequest("/api/agent/memory/export", { method: "GET" });
  const data = await parseApiJson<AgentMemoryExportResponse>(response);
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

/**
 * Generate + persist a title for a ZAKI agent session after the first
 * user / assistant exchange. The BFF handler:
 *   - verifies access via the agent-session bearer
 *   - skips when the session already has a non-default title
 *   - generates 3-6 word title via the shared thread-auto-title helper
 *   - PATCHes the upstream nullalis session with the new title
 *
 * Returns the same {status, reason?, session?} contract the thread
 * version uses.
 */
export async function autoTitleAgentSession(
  sessionKey: string,
  payload: AgentSessionAutoTitleRequest,
) {
  const response = await backendAuthRequest(
    `/api/agent/sessions/${encodeURIComponent(sessionKey)}/auto-title`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  const data = await parseApiJson<AgentSessionAutoTitleResponse>(response);
  return { response, data };
}

export async function renameAgentSession(sessionKey: string, title: string) {
  assertSafeSessionKey(sessionKey);
  const response = await backendAuthRequest(
    `/api/agent/sessions/${encodeURIComponent(sessionKey)}/title`,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    },
  );
  const data = await parseApiJson<AgentSessionRenameResponse>(response);
  return { response, data };
}

export async function fetchBotUsage() {
  const response = await backendAuthRequest("/v1/me/bot/usage", { method: "GET" });
  const data = await parseApiJson<BotUsageSummary>(response);
  return { response, data };
}

export async function provisionAgent(payload: Record<string, unknown> = {}) {
  // Bounded: a hung/stalled request must settle so the caller's error+retry UI
  // and single-flight promise-ref cleanup always run (P0-1 stalled-request shape).
  const response = await backendAuthRequest("/api/agent/provision", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
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

export async function fetchAgentMe(options?: Pick<ApiRequestOptions, "redirectOnAuthFailure">) {
  const response = await backendAuthRequest("/api/agent/me", {
    method: "GET",
    redirectOnAuthFailure: options?.redirectOnAuthFailure,
  });
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

export async function listAgentCron(options?: Pick<ApiRequestOptions, "redirectOnAuthFailure">) {
  const response = await backendAuthRequest("/api/agent/cron", {
    method: "GET",
    redirectOnAuthFailure: options?.redirectOnAuthFailure,
  });
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
    code?: string | null;
    retryable?: boolean;
  }>(response);
  return { response, data };
}

// Operator/debug facade only. Normal Agent chat recovery uses Nullalis merged
// history and approval continuations; do not call this from user-facing flows.
export async function appendAgentHistoryMessage(payload: {
  spaceId?: string;
  threadId: string;
  sessionKey: string;
  role: "assistant";
  content: string;
}) {
  const response = await backendAuthRequest("/api/agent/history/append", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<{
    ok?: boolean;
    status?: "inserted" | "duplicate" | "skipped";
    message?: {
      id?: string;
      role?: "assistant";
      content?: string;
      createdAt?: string | null;
    };
    error?: string;
    code?: string;
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
// Session keys contain colons (agent:zaki-bot:user:42:thread:main). Encode them
// in BFF URLs; Express decodes the route param before proxying the canonical
// session key to Nullalis.
// Client-side validation mirrors the backend SESSION_KEY_SAFE_PATTERN.

const SESSION_KEY_RE = /^[a-zA-Z0-9:_.\-]+$/;

function assertSafeSessionKey(key: string): void {
  if (!key || key.length > 255 || !SESSION_KEY_RE.test(key)) {
    throw new Error(`Invalid session key: ${key.slice(0, 40)}`);
  }
}

function assertSafeAgentPathSegment(value: string, label: string): void {
  if (!value || value.length > 256 || /[\x00-\x1f\x7f/]/u.test(value)) {
    throw new Error(`Invalid ${label}: ${value.slice(0, 40)}`);
  }
}

export type AgentSession = {
  session_key: string;
  title?: string;
  created_at?: string | number;
  last_active?: string | number;
  message_count?: number;
  token_count?: number;
  token_estimate?: number;
  context_window_used?: number;
  context_window_max?: number;
  context_window_tokens?: number;
  context_pressure_percent?: number;
  live?: boolean;
  mode?: AgentSessionMode;
  last_channel?: string | null;
  pending_approval_count?: number;
  pending_approvals?: AgentPendingApproval[];
};

export type AgentContextCompaction = {
  nudge_percent?: number | null;
  pass_a_percent?: number | null;
  pass_c_percent?: number | null;
  recommended?: boolean | null;
};

export type AgentContextEstimator = {
  name?: string | null;
  version?: number | null;
  method?: string | null;
  chars_per_token?: number | null;
  includes?: string[] | null;
};

export type AgentContextProviderUsage = {
  available?: boolean | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  reasoning_tokens?: number | null;
  total_tokens?: number | null;
  cached_prompt_tokens?: number | null;
  cache_hit_percent?: number | null;
};

export type AgentContextLastTurnDelta = {
  bytes?: number | null;
  token_estimate?: number | null;
  pressure_points?: number | null;
  tool_mode?: "native_tool_calls" | "xml_fallback" | "mixed" | "no_tools" | string | null;
};

export type AgentContextLastTurn = {
  native_tool_call_count?: number | null;
  xml_fallback_call_count?: number | null;
  native_transcript_rendered?: boolean | null;
  bounded_result_count?: number | null;
  tool_mode?: "native_tool_calls" | "xml_fallback" | "mixed" | "no_tools" | string | null;
  [key: string]: unknown;
};

export type AgentContextPromptShape = {
  available?: boolean | null;
  tool_surface?: string | null;
  [key: string]: unknown;
};

export type AgentContextContributor = {
  index?: number | null;
  role?: string | null;
  source?: string | null;
  bytes?: number | null;
  token_estimate?: number | null;
};

export type AgentContextReport = {
  status?: "live" | string;
  session_key?: string;
  active?: boolean;
  live?: boolean;
  code?: string | null;
  reason?: string | null;
  sampled_at_ms?: number;
  model?: string | null;
  model_provider?: string | null;
  context_window_source?: "override" | "model_capability" | "default" | "unknown" | string;
  token_count?: number;
  tokens_used?: number;
  token_estimate?: number;
  used_tokens?: number | null;
  context_window_used?: number;
  context_window_max?: number;
  context_window_tokens?: number;
  total_tokens?: number | null;
  remaining_tokens?: number;
  usable_input_budget_tokens?: number;
  budget_pressure_percent?: number;
  token_total_reserve?: number | null;
  context_bytes?: {
    content?: number | null;
    reasoning?: number | null;
    total?: number | null;
  } | null;
  token_limit?: number;
  context_window_used_pct?: number;
  pressure_percent?: number;
  context_pressure_percent?: number;
  pressure_token_source?:
    | "provider_last_usage"
    | "provider_preflight"
    | "local_estimate"
    | string
    | null;
  local_token_estimate?: number | null;
  provider_prompt_tokens?: number | null;
  provider_cached_prompt_tokens?: number | null;
  estimator?: AgentContextEstimator | null;
  provider_usage_last_turn?: AgentContextProviderUsage | null;
  cache?: Record<string, unknown> | null;
  last_turn_delta?: AgentContextLastTurnDelta | null;
  top_context_contributors?: AgentContextContributor[] | null;
  prompt_shape?: AgentContextPromptShape | null;
  message_count?: number;
  history_len?: number;
  history_messages?: number;
  max_history?: number;
  history_trim_limit_messages?: number | null;
  history_trimmed?: number | null;
  token_compaction_threshold?: number | null;
  compaction_threshold_pct?: number | null;
  token_compaction_recommended_threshold?: number | null;
  token_auto_compaction_pass_a_threshold?: number | null;
  token_auto_compaction_pass_c_threshold?: number | null;
  token_compaction_recommended?: boolean | null;
  token_compaction_triggered?: boolean | null;
  compaction_triggered?: boolean | null;
  compaction?: AgentContextCompaction | null;
  tools?: number | null;
  tools_loaded?: number | null;
  roles?: Record<string, number> | null;
  memory?: Record<string, unknown> | null;
  prompt?: Record<string, unknown> | null;
  retrieval?: Record<string, unknown> | null;
  continuity?: Record<string, unknown> | null;
  buckets?: Record<string, unknown> | null;
  runtime?: Record<string, unknown> | null;
  last_turn?: AgentContextLastTurn | null;
  error?: string | null;
};

export type AgentSessionContext = AgentContextReport & {
  report?: AgentContextReport | null;
};

export type AgentTodoStatus = "pending" | "in_progress" | "completed" | "blocked";

export type AgentTodoItem = {
  id: number;
  title: string;
  status: AgentTodoStatus | string;
  depends_on?: number[];
  note?: string | null;
};

export type AgentTodoList = {
  list_id: string;
  title: string;
  items: AgentTodoItem[];
  status?: string | null;
  created_at?: string | number | null;
  updated_at?: string | number | null;
};

export type AgentSessionTodosResponse = {
  session_key?: string;
  current_list_id?: string | null;
  lists: AgentTodoList[];
  error?: string | null;
  message?: string | null;
};

export type AgentSessionTodoUpdatePayload = {
  status: AgentTodoStatus;
  note?: string;
};

export type AgentSessionTodoUpdateResponse = {
  session_key?: string;
  current_list_id?: string | null;
  list?: AgentTodoList;
  error?: string | null;
  message?: string | null;
};

export type AgentTaskPlanStep = {
  index: number;
  id?: string;
  title?: string;
  description?: string;
  status?: "pending" | "running" | "done" | "failed" | string;
  expected_tool?: string | null;
  actual_tool?: string | null;
  result_summary?: string | null;
  error_summary?: string | null;
};

export type AgentTaskPlan = {
  schema?: "nullalis.task_plan.v1" | string;
  plan_id?: string;
  session_key?: string;
  run_id?: string;
  summary?: string;
  current_step?: number;
  status?: "active" | "completed" | "failed" | "abandoned" | string;
  created_at_ms?: number;
  updated_at_ms?: number;
  revision?: number;
  supersedes_plan_id?: string | null;
  steps?: AgentTaskPlanStep[];
};

export type AgentSessionPlanResponse = {
  session_key?: string;
  active: boolean;
  plan: AgentTaskPlan | null;
  error?: string | null;
  message?: string | null;
};

export type AgentSessionMode = "plan" | "execute" | "review";

export type BotSandboxBackend = "bubblewrap" | "firejail" | "docker";

export type AgentPendingApproval = {
  approval_id?: string;
  id?: string | number;
  tool_call_id?: string | null;
  tool?: string;
  reason?: string;
  risk_level?: string;
  intent?: string | null;
  human_intent?: string | null;
  params?: unknown;
  args?: unknown;
  arguments?: unknown;
  allow_for_session?: boolean;
  allowForSession?: boolean;
  session_allow_safe?: boolean;
  sessionAllowSafe?: boolean;
  created_at?: string | number | null;
  expires_at?: string | number | null;
};

export type BotRuntimeStatusResponse = {
  sandbox?: {
    enabled?: boolean;
    backend?: BotSandboxBackend | null;
    initialized?: boolean;
    has_real_backend?: boolean;
  } | null;
};

export type AgentSessionModeResponse = {
  ok?: boolean;
  mode?: AgentSessionMode;
  session_key?: string;
  error?: string | null;
  message?: string | null;
};

export type AgentSessionCancelResponse = {
  status?: "cancellation_signalled" | string;
  session_key?: string;
  was_active?: boolean;
  error?: string | null;
  message?: string | null;
};

export type AgentSessionDeleteResponse = {
  ok?: boolean;
  status?: "deleted" | "not_found" | "in_use" | "unavailable" | "failed" | string;
  session_key?: string;
  canonical?: {
    status?: "deleted" | "not_found" | "in_use" | "unavailable" | "failed" | string;
    http_status?: number;
    error?: string;
  };
  projection?: {
    status?: "deleted" | "not_found" | "preserved" | "skipped" | string;
    reason?: string;
    threads_deleted?: number;
    messages_deleted?: number;
  };
  error?: string | null;
  message?: string | null;
  code?: string | null;
};

export type AgentExtensionDiagnosticsResponse = {
  user_id?: string;
  paired?: boolean;
  connected_at_unix?: number;
  last_command_at_unix?: number;
  last_command_tool?: string;
  last_command_result?: string;
  error?: string | null;
  message?: string | null;
};

export type ContextDiagnosticsResponse = {
  active?: boolean;
  runtime?: boolean;
  reason?: string | null;
  error?: string | null;
  report?: AgentContextReport | null;
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
  allow_for_session?: boolean;
};

export async function listAgentSessions() {
  const response = await backendAuthRequest("/api/agent/sessions", {
    method: "GET",
    redirectOnAuthFailure: false,
  });
  const data = await parseApiJson<{ sessions: AgentSession[] }>(response);
  return { response, data };
}

export async function fetchAgentSession(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}`, {
    method: "GET",
    redirectOnAuthFailure: false,
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
  const data = await parseApiJson<AgentSessionDeleteResponse>(response);
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
    redirectOnAuthFailure: false,
  });
  const data = await parseApiJson<AgentSessionContext>(response);
  return { response, data };
}

export async function fetchAgentSessionTodos(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/todos`, {
    method: "GET",
    redirectOnAuthFailure: false,
  });
  const data = await parseApiJson<AgentSessionTodosResponse>(response);
  return { response, data };
}

export async function updateAgentSessionTodoItem(
  sessionKey: string,
  listId: string,
  itemId: number | string,
  payload: AgentSessionTodoUpdatePayload
) {
  assertSafeSessionKey(sessionKey);
  assertSafeAgentPathSegment(listId, "todo list id");
  const normalizedItemId =
    typeof itemId === "number" && Number.isInteger(itemId) ? String(itemId) : String(itemId || "");
  if (!/^[1-9][0-9]*$/u.test(normalizedItemId)) {
    throw new Error(`Invalid todo item id: ${normalizedItemId.slice(0, 40)}`);
  }
  const encoded = encodeURIComponent(sessionKey);
  const encodedListId = encodeURIComponent(listId);
  const response = await backendAuthRequest(
    `/api/agent/sessions/${encoded}/todos/${encodedListId}/items/${normalizedItemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  const data = await parseApiJson<AgentSessionTodoUpdateResponse>(response);
  return { response, data };
}

export async function fetchAgentSessionPlan(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/plan`, {
    method: "GET",
    redirectOnAuthFailure: false,
  });
  const data = await parseApiJson<AgentSessionPlanResponse>(response);
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
    redirectOnAuthFailure: false,
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
  const response = await backendAuthRequest("/api/agent/diagnostics", { method: "GET" });
  const data = await parseApiJson<BotRuntimeStatusResponse>(response);
  return { response, data };
}

export async function fetchContextDiagnostics() {
  const response = await backendAuthRequest("/api/agent/diagnostics/context", {
    method: "GET",
  });
  const data = await parseApiJson<ContextDiagnosticsResponse>(response);
  return { response, data };
}

export async function fetchMemoryDoctor() {
  const response = await backendAuthRequest("/api/agent/diagnostics/memory-doctor", {
    method: "GET",
  });
  const data = await parseApiJson<MemoryDoctorResponse>(response);
  return { response, data };
}

export async function fetchAgentExtensionDiagnostics(
  options?: Pick<ApiRequestOptions, "redirectOnAuthFailure">
) {
  const response = await backendAuthRequest("/api/agent/diagnostics/extension", {
    method: "GET",
    redirectOnAuthFailure: options?.redirectOnAuthFailure,
  });
  const data = await parseApiJson<AgentExtensionDiagnosticsResponse>(response);
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
  const data = await parseApiJson<{
    ok?: boolean;
    status?: string;
    message?: string;
    error?: string;
    code?: string;
    // Set by the BFF when nullalis was unreachable and the bounded retry budget
    // was exhausted (HTTP 502 agent_unreachable). The UI uses this to render a
    // "retrying" state and offer a one-click retry of the SAME approval_id
    // instead of a hard error.
    retryable?: boolean;
    hint?: string;
  }>(response);
  return { response, data };
}

export async function cancelAgentSession(sessionKey: string) {
  assertSafeSessionKey(sessionKey);
  const encoded = encodeURIComponent(sessionKey);
  const response = await backendAuthRequest(`/api/agent/sessions/${encoded}/cancel`, {
    method: "POST",
  });
  const data = await parseApiJson<AgentSessionCancelResponse>(response);
  return { response, data };
}

export type AgentRuntimeStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "lost"
  | string;

export type AgentTask = {
  id?: string;
  task_id?: string;
  status?: AgentRuntimeStatus;
  title?: string;
  label?: string;
  session_key?: string;
  created_at?: string | number;
  updated_at?: string | number;
  started_at?: string | number | null;
  completed_at?: string | number | null;
  error?: string | null;
  [key: string]: unknown;
};

export type AgentJob = {
  id?: string;
  job_id?: string;
  status?: AgentRuntimeStatus;
  title?: string;
  label?: string;
  schedule?: string;
  next_run_at?: string | number | null;
  last_run_at?: string | number | null;
  created_at?: string | number;
  [key: string]: unknown;
};

export type AgentTrace = {
  run_id?: string;
  id?: string;
  session_key?: string;
  status?: AgentRuntimeStatus;
  started_at?: string | number;
  completed_at?: string | number | null;
  events?: Record<string, unknown>[];
  share_code?: string | null;
  public_url?: string | null;
  [key: string]: unknown;
};

export type AgentArtifact = {
  id?: string;
  artifact_id?: string;
  artifactId?: string;
  title?: string;
  type?: string;
  mime_type?: string;
  version?: string | number;
  session_key?: string;
  created_at?: string | number;
  updated_at?: string | number;
  share_code?: string | null;
  public_url?: string | null;
  content?: unknown;
  [key: string]: unknown;
};

export async function listAgentTasks(opts?: {
  status?: string;
  limit?: number;
  cursor?: string;
  redirectOnAuthFailure?: boolean;
}) {
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/tasks", {
      status: opts?.status,
      limit: opts?.limit,
      cursor: opts?.cursor,
    }),
    { method: "GET", redirectOnAuthFailure: opts?.redirectOnAuthFailure }
  );
  const data = await parseApiJson<{ tasks?: AgentTask[]; items?: AgentTask[] }>(response);
  return { response, data };
}

export async function fetchAgentTask(taskId: string) {
  const response = await backendAuthRequest(`/api/agent/tasks/${encodeURIComponent(taskId)}`, {
    method: "GET",
  });
  const data = await parseApiJson<AgentTask>(response);
  return { response, data };
}

export async function stopAgentTask(taskId: string) {
  const response = await backendAuthRequest(
    `/api/agent/tasks/${encodeURIComponent(taskId)}/stop`,
    { method: "POST" }
  );
  const data = await parseApiJson<{ ok?: boolean; status?: string; error?: string }>(response);
  return { response, data };
}

export async function listAgentJobs(opts?: {
  status?: string;
  limit?: number;
  cursor?: string;
  redirectOnAuthFailure?: boolean;
}) {
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/jobs", {
      status: opts?.status,
      limit: opts?.limit,
      cursor: opts?.cursor,
    }),
    { method: "GET", redirectOnAuthFailure: opts?.redirectOnAuthFailure }
  );
  const data = await parseApiJson<{ jobs?: AgentJob[]; items?: AgentJob[] }>(response);
  return { response, data };
}

export async function listAgentTraces(opts?: { limit?: number; cursor?: string }) {
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/traces", {
      limit: opts?.limit,
      cursor: opts?.cursor,
    }),
    { method: "GET" }
  );
  const data = await parseApiJson<{ traces?: AgentTrace[]; items?: AgentTrace[] }>(response);
  return { response, data };
}

export async function fetchAgentTrace(runId: string) {
  const response = await backendAuthRequest(`/api/agent/traces/${encodeURIComponent(runId)}`, {
    method: "GET",
  });
  const data = await parseApiJson<AgentTrace>(response);
  return { response, data };
}

export async function fetchAgentTraceEvents(runId: string) {
  const response = await backendAuthRequest(
    `/api/agent/traces/${encodeURIComponent(runId)}/events`,
    { method: "GET" }
  );
  const data = await parseApiJson<{ run_id?: string; id?: string; events?: unknown[]; error?: string }>(
    response
  );
  return { response, data };
}

export async function shareAgentTrace(runId: string) {
  const response = await backendAuthRequest(
    `/api/agent/traces/${encodeURIComponent(runId)}/share`,
    { method: "POST" }
  );
  const data = await parseApiJson<AgentTrace>(response);
  return { response, data };
}

export async function revokeAgentTraceShare(runId: string) {
  const response = await backendAuthRequest(
    `/api/agent/traces/${encodeURIComponent(runId)}/share`,
    { method: "DELETE" }
  );
  const data = await parseApiJson<{ ok?: boolean; error?: string }>(response);
  return { response, data };
}

export async function listAgentArtifacts(opts?: {
  limit?: number;
  cursor?: string;
  session_key?: string;
  redirectOnAuthFailure?: boolean;
}) {
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/artifacts", {
      limit: opts?.limit,
      cursor: opts?.cursor,
      session_key: opts?.session_key,
    }),
    { method: "GET", redirectOnAuthFailure: opts?.redirectOnAuthFailure }
  );
  const data = await parseApiJson<{ artifacts?: AgentArtifact[]; items?: AgentArtifact[] }>(
    response
  );
  return { response, data };
}

export async function fetchAgentArtifact(
  artifactId: string,
  options?: Pick<ApiRequestOptions, "redirectOnAuthFailure">
) {
  const response = await backendAuthRequest(
    `/api/agent/artifacts/${encodeURIComponent(artifactId)}`,
    { method: "GET", redirectOnAuthFailure: options?.redirectOnAuthFailure }
  );
  const data = await parseApiJson<AgentArtifact>(response);
  return { response, data };
}

export async function updateAgentArtifact(
  artifactId: string,
  payload: Record<string, unknown>
) {
  const response = await backendAuthRequest(
    `/api/agent/artifacts/${encodeURIComponent(artifactId)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  const data = await parseApiJson<AgentArtifact>(response);
  return { response, data };
}

export async function fetchAgentArtifactHistory(artifactId: string) {
  const response = await backendAuthRequest(
    `/api/agent/artifacts/${encodeURIComponent(artifactId)}/history`,
    { method: "GET" }
  );
  const data = await parseApiJson<{ versions?: AgentArtifact[]; history?: AgentArtifact[] }>(
    response
  );
  return { response, data };
}

export async function fetchAgentArtifactDiff(
  artifactId: string,
  fromVersion: string,
  toVersion: string
) {
  const response = await backendAuthRequest(
    `/api/agent/artifacts/${encodeURIComponent(artifactId)}/diff/${encodeURIComponent(fromVersion)}/${encodeURIComponent(toVersion)}`,
    { method: "GET" }
  );
  const data = await parseApiJson<Record<string, unknown>>(response);
  return { response, data };
}

export async function shareAgentArtifact(artifactId: string) {
  const response = await backendAuthRequest(
    `/api/agent/artifacts/${encodeURIComponent(artifactId)}/share`,
    { method: "POST" }
  );
  const data = await parseApiJson<AgentArtifact>(response);
  const shareUrl = normalizeAgentArtifactShareUrl(
    data.share_url ?? data.shareUrl ?? data.public_url ?? data.publicUrl ?? data.url
  );
  if (shareUrl) {
    data.share_url = shareUrl;
    data.public_url = shareUrl;
    data.url = shareUrl;
  }
  return { response, data };
}

export async function revokeAgentArtifactShare(artifactId: string) {
  const response = await backendAuthRequest(
    `/api/agent/artifacts/${encodeURIComponent(artifactId)}/share`,
    { method: "DELETE" }
  );
  const data = await parseApiJson<{ ok?: boolean; error?: string }>(response);
  return { response, data };
}

const AGENT_EXPORT_FILENAME_SAFE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const AGENT_SHARE_CODE_SAFE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/;

function normalizeAgentExportFilename(value: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const filename = decoded.trim();
  if (
    !AGENT_EXPORT_FILENAME_SAFE_PATTERN.test(filename) ||
    filename.includes("..") ||
    filename.startsWith(".")
  ) {
    return null;
  }
  return encodeURIComponent(filename);
}

function normalizeAgentShareCode(value: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const shareCode = decoded.trim();
  if (!AGENT_SHARE_CODE_SAFE_PATTERN.test(shareCode)) return null;
  return encodeURIComponent(shareCode);
}

export function normalizeAgentExportDownloadUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const rawPathish = (raw.split(/[?#]/, 1)[0] ?? "")
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
  const rawLooksLikeUpstreamExport =
    /^\/api\/v1\/users\/[^/]+\/exports(?:\/|$)/.test(rawPathish);
  const rawLooksLikeAgentExport = /^\/api\/agent\/exports(?:\/|$)/.test(rawPathish);
  try {
    const parsed = new URL(raw, "http://zaki.local");
    const match = parsed.pathname.match(/^\/api\/v1\/users\/[^/]+\/exports\/([^/?#]+)$/);
    if (match?.[1]) {
      const filename = normalizeAgentExportFilename(match[1]);
      return filename ? `/api/agent/exports/${filename}` : null;
    }
    if (
      rawLooksLikeUpstreamExport ||
      (parsed.pathname.startsWith("/api/v1/users/") && parsed.pathname.includes("/exports"))
    ) {
      return null;
    }
    if (parsed.pathname.startsWith("/api/agent/exports/")) {
      const filename = normalizeAgentExportFilename(
        parsed.pathname.slice("/api/agent/exports/".length)
      );
      return filename ? `/api/agent/exports/${filename}${parsed.search || ""}` : null;
    }
    if (rawLooksLikeAgentExport) return null;
  } catch {
    return null;
  }
  return null;
}

function filenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      const decoded = decodeURIComponent(encoded).trim();
      if (decoded) return decoded;
    } catch {
      // Fall through to the plain filename form.
    }
  }
  const plain = value.match(/filename="?([^";]+)"?/i)?.[1]?.trim();
  return plain || null;
}

function filenameFromExportUrl(value: string): string | null {
  try {
    const parsed = new URL(value, "http://zaki.local");
    const raw = parsed.pathname.split("/").pop() || "";
    const decoded = decodeURIComponent(raw).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

export async function downloadAgentExportFile(
  value: string,
  fallbackFilename?: string | null
) {
  const normalizedUrl = normalizeAgentExportDownloadUrl(value);
  if (!normalizedUrl) {
    throw new Error("invalid_download_url");
  }
  const response = await backendAuthRequest(normalizedUrl, { method: "GET" });
  if (!response.ok) {
    throw new Error(`download_failed:${response.status}`);
  }
  const blob = await response.blob();
  const filename =
    filenameFromContentDisposition(response.headers.get("content-disposition")) ||
    (fallbackFilename && fallbackFilename.trim()) ||
    filenameFromExportUrl(normalizedUrl) ||
    "zaki-artifact";

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const objectUrl = window.URL.createObjectURL(blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      const revoke = () => window.URL.revokeObjectURL(objectUrl);
      if (typeof window.setTimeout === "function") {
        window.setTimeout(revoke, 1000);
      } else {
        setTimeout(revoke, 1000);
      }
    }
  }

  return { response, filename, bytes: blob.size };
}

export function normalizeAgentArtifactShareUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const rawPathish = (raw.split(/[?#]/, 1)[0] ?? "")
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
  try {
    const parsed = new URL(raw, "http://zaki.local");
    const match =
      parsed.pathname.match(/^\/api\/v1\/share\/artifact\/([^/?#]+)$/) ||
      parsed.pathname.match(/^\/api\/agent\/share\/artifact\/([^/?#]+)$/) ||
      parsed.pathname.match(/^\/artifact\/([^/?#]+)$/);
    if (match?.[1]) {
      const shareCode = normalizeAgentShareCode(match[1]);
      return shareCode ? `/artifact/${shareCode}${parsed.search || ""}` : null;
    }
    if (
      /^\/api\/v1\/share\/artifact(?:\/|$)/.test(rawPathish) ||
      /^\/api\/agent\/share\/artifact(?:\/|$)/.test(rawPathish) ||
      /^\/artifact(?:\/|$)/.test(rawPathish)
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function exportAgentArtifact(artifactId: string, format: string) {
  const response = await backendAuthRequest(
    appendBrainQueryParams(`/api/agent/artifacts/${encodeURIComponent(artifactId)}/export`, {
      format,
    }),
    { method: "POST" }
  );
  const data = await parseApiJson<Record<string, unknown>>(response);
  const downloadUrl = normalizeAgentExportDownloadUrl(
    data.download_url ?? data.downloadUrl ?? data.url
  );
  if (downloadUrl) {
    data.download_url = downloadUrl;
    data.url = downloadUrl;
  }
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

export interface BrainDocument {
  id?: string;
  key?: string;
  title?: string;
  summary?: string;
  kind?: string;
  source?: string;
  created_at?: number | string;
  updated_at?: number | string;
  memory_count?: number;
  [key: string]: unknown;
}

export interface BrainDocumentsResponse {
  documents?: BrainDocument[];
  items?: BrainDocument[];
  next_cursor?: string | null;
  has_more?: boolean;
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
  semantic_min_weight?: number;
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
      semantic_min_weight: opts?.semantic_min_weight,
      exclude_orphans:
        opts?.exclude_orphans === undefined ? undefined : String(opts.exclude_orphans),
    }),
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/graph ${response.status}`);
  return assertBrainGraphResponse(
    await parseRequiredApiJson<BrainGraphResponse>(response, "brain/graph")
  );
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
  return parseRequiredApiJson<BrainLocalGraphResponse>(response, "brain/local-graph");
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
  return parseRequiredApiJson<BrainOrphansResponse>(response, "brain/orphans");
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
  return parseRequiredApiJson<BrainDiffResponse>(response, "brain/diff");
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
  return parseRequiredApiJson<BrainCommunitiesResponse>(response, "brain/communities");
}

export class BrainRecomputeConflictError extends Error {
  constructor() {
    super("recompute_in_progress");
    this.name = "BrainRecomputeConflictError";
  }
}

export class BrainApiError extends Error {
  status: number;
  endpoint: string;

  constructor(endpoint: string, status: number) {
    super(`${endpoint} ${status}`);
    this.name = "BrainApiError";
    this.endpoint = endpoint;
    this.status = status;
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
  return parseRequiredApiJson<BrainCommunitiesRecomputeResponse>(
    response,
    "brain/communities/recompute"
  );
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
  return parseRequiredApiJson<BrainTimelineResponse>(response, "brain/timeline");
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
  return parseRequiredApiJson<BrainComposeResponse>(response, "brain/compose");
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
  return parseRequiredApiJson<BrainSearchResponse>(response, "brain/search");
}

export async function fetchBrainDocuments(
  userId: string,
  opts?: { q?: string; kind?: string; limit?: number; cursor?: string }
): Promise<BrainDocumentsResponse> {
  void userId;
  const response = await backendAuthRequest(
    appendBrainQueryParams("/api/agent/brain/documents", {
      q: opts?.q,
      kind: opts?.kind,
      limit: opts?.limit,
      cursor: opts?.cursor,
    }),
    { method: "GET" }
  );
  if (!response.ok) throw new Error(`brain/documents ${response.status}`);
  return parseRequiredApiJson<BrainDocumentsResponse>(response, "brain/documents");
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
  const raw = (await parseRequiredApiJson<unknown>(response, "brain/me")) as {
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
  if (!response.ok) throw new BrainApiError("brain/memory", response.status);
  const raw = await parseRequiredApiJson<unknown>(response, "brain/memory");
  return adaptBrainMemoryResponse(raw, key);
}
