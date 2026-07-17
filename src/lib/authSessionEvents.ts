/**
 * A browser-local signal that an authenticated in-memory session was cleared.
 *
 * The auth store deliberately owns no query cache or product stores. App owns
 * those account-scoped surfaces and listens for this event to clear them before
 * another principal can enter the same tab.
 */
export const AUTH_SESSION_CLEARED_EVENT = "zaki:auth-session-cleared";

export function notifyAuthSessionCleared() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
}
