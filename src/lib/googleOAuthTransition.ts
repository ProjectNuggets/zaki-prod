import { sanitizeLocalReturnTo } from "./localReturnTo";

export const GOOGLE_OAUTH_TRANSITION_QUERY = "zaki_oauth_transition";
export const GOOGLE_OAUTH_TRANSITION_STORAGE_KEY = "zaki:google-oauth-transition:v1";

// This mirrors the server-side Google state lifetime. The record is tab-scoped
// and consumed before the refreshed account is committed, so it cannot turn a
// later ordinary hydration into an account-switch authorization.
const GOOGLE_OAUTH_TRANSITION_TTL_MS = 10 * 60 * 1000;
const LOCAL_ORIGIN = "https://zaki.local";
// The backend accepts a 240-character OAuth return route. Reserve space for
// the opaque callback nonce while keeping the original route in session state.
const MAX_CALLBACK_PATH_LENGTH = 180;

type GoogleOAuthTransitionRecord = {
  nonce: string;
  storagePrincipal: string;
  returnTo: string;
  expiresAt: number;
};

export type GoogleOAuthTransition = Pick<
  GoogleOAuthTransitionRecord,
  "storagePrincipal" | "returnTo"
>;

function getSafeReturnTo(value: unknown, fallback = "/") {
  return sanitizeLocalReturnTo(value, {
    fallback,
    stripSearchParams: ["auth", "verified", GOOGLE_OAUTH_TRANSITION_QUERY],
    requireLeadingSlash: true,
  });
}

function createNonce() {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    return "";
  }
  return crypto.randomUUID();
}

function parseTransitionRecord(value: string | null): GoogleOAuthTransitionRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GoogleOAuthTransitionRecord>;
    const nonce = String(parsed.nonce || "").trim();
    const storagePrincipal = String(parsed.storagePrincipal || "").trim();
    const returnTo = getSafeReturnTo(parsed.returnTo, "");
    const expiresAt = Number(parsed.expiresAt);
    if (!nonce || !Number.isFinite(expiresAt) || !returnTo) return null;
    return { nonce, storagePrincipal, returnTo, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Records the account owner that deliberately started a full-page Google flow.
 * The short callback route is signed by the existing server OAuth state, while
 * the original post-login destination stays in same-tab session storage.
 */
export function beginGoogleOAuthTransition(returnTo: unknown, storagePrincipal: unknown) {
  const safeReturnTo = getSafeReturnTo(returnTo);
  if (typeof window === "undefined") return safeReturnTo;

  const nonce = createNonce();
  if (!nonce) return safeReturnTo;

  try {
    window.sessionStorage.setItem(
      GOOGLE_OAUTH_TRANSITION_STORAGE_KEY,
      JSON.stringify({
        nonce,
        storagePrincipal: String(storagePrincipal || "").trim(),
        returnTo: safeReturnTo,
        expiresAt: Date.now() + GOOGLE_OAUTH_TRANSITION_TTL_MS,
      } satisfies GoogleOAuthTransitionRecord)
    );

    const destination = new URL(safeReturnTo, LOCAL_ORIGIN);
    const callbackPath =
      destination.pathname.length <= MAX_CALLBACK_PATH_LENGTH ? destination.pathname : "/";
    const callbackRoute = new URL(callbackPath, LOCAL_ORIGIN);
    callbackRoute.searchParams.set(GOOGLE_OAUTH_TRANSITION_QUERY, nonce);
    return `${callbackRoute.pathname}${callbackRoute.search}`;
  } catch {
    // Without same-tab storage there is no safe transition proof. Preserve the
    // normal local destination and let hydration retain its fail-closed guard.
    return safeReturnTo;
  }
}

/**
 * Returns a fresh one-use OAuth transition proof only when the callback URL
 * carries its exact nonce. A stale/mismatched URL cannot consume a valid proof.
 */
export function consumeGoogleOAuthTransition(search: string): GoogleOAuthTransition | null {
  if (typeof window === "undefined") return null;

  const nonce = new URLSearchParams(search).get(GOOGLE_OAUTH_TRANSITION_QUERY)?.trim();
  if (!nonce) return null;

  let record: GoogleOAuthTransitionRecord | null = null;
  try {
    record = parseTransitionRecord(
      window.sessionStorage.getItem(GOOGLE_OAUTH_TRANSITION_STORAGE_KEY)
    );
  } catch {
    return null;
  }

  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    try {
      window.sessionStorage.removeItem(GOOGLE_OAUTH_TRANSITION_STORAGE_KEY);
    } catch {
      // A blocked storage implementation leaves hydration fail-closed.
    }
    return null;
  }
  if (record.nonce !== nonce) return null;

  try {
    window.sessionStorage.removeItem(GOOGLE_OAUTH_TRANSITION_STORAGE_KEY);
  } catch {
    // The proof has still been read; account ownership is rechecked at commit.
  }
  return { storagePrincipal: record.storagePrincipal, returnTo: record.returnTo };
}
