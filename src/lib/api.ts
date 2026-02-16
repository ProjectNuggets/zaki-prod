const TOKEN_KEY = "zaki.auth.token";

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
  const url = `${base}${normalizedPath}`;
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

export async function requestLogin({
  username,
  password,
}: {
  username?: string;
  password: string;
}) {
  const payload: Record<string, string> = { password };
  if (username) payload.username = username;

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
}: {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
}) {
  const response = await backendRequest("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name, dateOfBirth }),
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
      currentPeriodEnd?: string | null;
      cancelAtPeriodEnd?: boolean;
    };
    access?: {
      active?: boolean;
      readOnly?: boolean;
      expiresAt?: string | null;
      campaign?: string | null;
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

export async function createCheckoutSession(plan: "student" | "personal") {
  const response = await backendAuthRequest("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  let data: { success?: boolean; url?: string | null; error?: string | null } = {};
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
