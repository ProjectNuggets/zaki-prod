import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { useAuthStore } from "@/stores/authStore";
import { PENDING_INTENT_KEY, PENDING_INTENT_STORAGE_FAILURE_EVENT } from "@/lib/pendingIntent";

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as Response;
}

jest.mock("react-i18next", () => ({
  initReactI18next: {
    type: "3rdParty",
    init: () => undefined,
  },
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "app.recovery.title": "Work could not be saved",
        "app.recovery.copyAndOpenSpaces": "Copy and open Spaces",
        "app.recovery.copyFailed": "Copy failed. Select the work and copy it manually.",
        "app.recovery.selectWork": "Select work",
        "app.recovery.openSpacesManually": "Open Spaces after copying",
      })[key] ?? key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

function renderAppAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<div>public home</div>} />
              <Route path="spaces" element={<div>anonymous spaces</div>} />
              <Route path="agent" element={<div>agent plan preview</div>} />
              <Route
                path="brain"
                element={
                  <div>
                    brain surface
                    <button type="button">brain action</button>
                  </div>
                }
              />
              <Route path="learn" element={<Navigate to="/" replace />} />
              <Route path="hire" element={<Navigate to="/" replace />} />
              <Route path="design" element={<div>design workspace</div>} />
              <Route path="minutes" element={<div>minutes workspace</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
}

describe("App route hydration", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.defineProperty(window, "opener", { configurable: true, value: null });
    fetchMock = jest.fn();
    Object.defineProperty(global, "fetch", {
      writable: true,
      configurable: true,
      value: fetchMock,
    });
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: true,
      isLoading: true,
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("checks the refresh cookie before rendering an anonymous-allowed route", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt("/spaces");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/refresh"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        })
      );
    });
    expect(await screen.findByText("anonymous spaces")).toBeInTheDocument();
  });

  it("fails closed when boot refresh is revoked instead of reusing an in-memory bearer", async () => {
    useAuthStore.setState({
      token: "revoked-account-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: true,
      isLoading: true,
    });
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ a: "Account A title" }));
    window.sessionStorage.setItem("zaki:draft:main", "Account A draft");
    fetchMock.mockResolvedValue(makeResponse({ error: "refresh_revoked" }, 401));

    renderAppAt("/brain");

    expect(await screen.findByPlaceholderText("Email address")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(window.localStorage.getItem("zaki:session-titles")).toBeNull();
    expect(window.sessionStorage.getItem("zaki:draft:main")).toBeNull();
  });

  it("retains account A browser state when a cold sibling tab verifies the same account", async () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: true,
      isLoading: true,
    });
    window.localStorage.setItem("zaki:account-storage-principal:v1", "id:account-a");
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account A title" }));
    window.localStorage.setItem("zaki:pinned-threads", JSON.stringify(["account-a-thread"]));
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        return Promise.resolve(makeResponse({ token: "account-a-token" }));
      }
      if (url.includes("/api/profile")) {
        return Promise.resolve(
          makeResponse({
            success: true,
            user: { id: "account-a", username: "a@example.com", fullName: "Account A" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true, policyVersion: "2027-01-01.v2" }));
    });

    renderAppAt("/brain");

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe("account-a-token");
    });
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
      "id:account-a"
    );
    expect(window.localStorage.getItem("zaki:session-titles")).toBe(
      JSON.stringify({ main: "Account A title" })
    );
    expect(window.localStorage.getItem("zaki:pinned-threads")).toBe(
      JSON.stringify(["account-a-thread"])
    );
  });

  it("rejects a late account A boot refresh after a sibling tab publishes account B", async () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: true,
      isLoading: true,
    });
    window.localStorage.setItem("zaki:account-storage-principal:v1", "id:account-a");
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account A title" }));
    let resolveRefresh: (response: Response) => void = () => undefined;
    const delayedRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) return delayedRefresh;
      if (url.includes("/api/profile")) {
        return Promise.resolve(
          makeResponse({
            success: true,
            user: { id: "account-a", username: "a@example.com", fullName: "Account A" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true, policyVersion: "2027-01-01.v2" }));
    });

    renderAppAt("/brain");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/refresh"),
        expect.objectContaining({ method: "POST" })
      );
    });

    // Tab B has already cleared A-owned persistence, committed its own data,
    // and published B as the shared-storage owner before A's old refresh ends.
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account B title" }));
    window.localStorage.setItem("zaki:account-storage-principal:v1", "id:account-b");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "zaki:account-storage-principal:v1",
          newValue: "id:account-b",
        })
      );
      resolveRefresh(makeResponse({ token: "account-a-token" }));
    });

    expect(await screen.findByPlaceholderText("Email address")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
      "id:account-b"
    );
    expect(window.localStorage.getItem("zaki:session-titles")).toBe(
      JSON.stringify({ main: "Account B title" })
    );
  });

  it("does not erase account B persistence when stale account A hydration fails before its storage event is handled", async () => {
    useAuthStore.setState({
      token: "account-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: true,
      isLoading: true,
    });
    // B's write can race ahead of delivery of the asynchronous StorageEvent in
    // this tab. A failed A profile lookup must still leave B's ownership intact.
    window.localStorage.setItem("zaki:account-storage-principal:v1", "id:account-b");
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account B title" }));
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        return Promise.resolve(makeResponse({ token: "replacement-account-a-token" }));
      }
      if (url.includes("/api/profile")) {
        return Promise.resolve(makeResponse({ success: false }, 401));
      }
      return Promise.resolve(makeResponse({ success: true }));
    });

    renderAppAt("/brain");

    expect(await screen.findByPlaceholderText("Email address")).toBeInTheDocument();
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
      "id:account-b"
    );
    expect(window.localStorage.getItem("zaki:session-titles")).toBe(
      JSON.stringify({ main: "Account B title" })
    );
  });

  it("fails closed in an account A tab when a sibling tab publishes account B ownership", async () => {
    useAuthStore.setState({
      token: "account-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ a: "Account A title" }));
    window.sessionStorage.setItem("zaki:draft:main", "Account A draft");
    fetchMock.mockResolvedValue(
      makeResponse({
        token: "fresh-account-a-token",
        success: true,
        user: { id: "account-a", username: "a@example.com" },
      })
    );

    renderAppAt("/brain");
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
        "id:account-a"
      );
    });

    // B wrote its own persistent state before publishing ownership. A must
    // clear only its tab-local state when the storage event arrives.
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account B title" }));
    window.localStorage.setItem("zaki:account-storage-principal:v1", "id:account-b");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "zaki:account-storage-principal:v1",
          newValue: "id:account-b",
        })
      );
    });

    expect(await screen.findByPlaceholderText("Email address")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(window.localStorage.getItem("zaki:session-titles")).toBe(
      JSON.stringify({ main: "Account B title" })
    );
    expect(window.sessionStorage.getItem("zaki:draft:main")).toBeNull();
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
      "id:account-b"
    );
  });

  it("clears account A state before ordinary logout then account B credential login", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      token: "account-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ a: "Account A title" }));
    window.localStorage.setItem("zaki:pinned-threads", JSON.stringify(["account-a-thread"]));
    window.sessionStorage.setItem("zaki:draft:main", "Account A draft");

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        return Promise.resolve(makeResponse({ token: "fresh-account-a-token" }));
      }
      if (url.endsWith("/login")) {
        return Promise.resolve(makeResponse({ valid: true, token: "account-b-token" }));
      }
      if (url.includes("/api/profile")) {
        const authorization = new Headers(init?.headers).get("Authorization");
        const isAccountB = authorization === "Bearer account-b-token";
        return Promise.resolve(
          makeResponse({
            success: true,
            user: isAccountB
              ? { id: "account-b", username: "b@example.com", fullName: "Account B" }
              : { id: "account-a", username: "a@example.com", fullName: "Account A" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true, enabled: true, policyVersion: "2027-01-01.v2" }));
    });

    const rendered = renderAppAt("/brain");
    rendered.queryClient.setQueryData(["account-a-private"], { title: "Account A query" });
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
        "id:account-a"
      );
    });

    act(() => {
      useAuthStore.getState().logout();
    });

    expect(await screen.findByPlaceholderText("Email address")).toBeInTheDocument();
    expect(rendered.queryClient.getQueryData(["account-a-private"])).toBeUndefined();
    expect(window.localStorage.getItem("zaki:session-titles")).toBeNull();
    expect(window.localStorage.getItem("zaki:pinned-threads")).toBeNull();
    expect(window.sessionStorage.getItem("zaki:draft:main")).toBeNull();

    await user.type(screen.getByPlaceholderText("Email address"), "b@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    expect(useAuthStore.getState()).toMatchObject({
      token: "account-b-token",
      user: { id: "account-b", username: "b@example.com" },
    });
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
      "id:account-b"
    );
  });

  it("renders the anonymous command dashboard route on bare home", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt("/");

    expect(await screen.findByText("public home")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
  });

  it("notifies the preserved-work window when Google popup authentication completes", async () => {
    const postMessage = jest.fn();
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });
    const closeSpy = jest.spyOn(window, "close").mockImplementation(() => undefined);
    useAuthStore.setState({
      token: "google-popup-token",
      user: { id: "user-1", username: "google@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "google-popup-token" }),
    } as Response);

    renderAppAt("/?oauthPopup=google");

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        { type: "zaki:google-oauth-popup-complete" },
        window.location.origin
      );
    });
    expect(closeSpy).toHaveBeenCalled();
  });

  it("uses a successful Google popup only to notify its opener without changing shared account ownership", async () => {
    const postMessage = jest.fn();
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });
    jest.spyOn(window, "close").mockImplementation(() => undefined);
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: true,
      isLoading: true,
    });
    window.localStorage.setItem("zaki:account-storage-principal:v1", "id:account-a");
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account A title" }));
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        return Promise.resolve(makeResponse({ token: "account-b-token" }));
      }
      if (url.includes("/api/profile")) {
        return Promise.resolve(
          makeResponse({
            success: true,
            user: { id: "account-b", username: "b@example.com", fullName: "Account B" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true }));
    });

    renderAppAt("/?oauthPopup=google");

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        { type: "zaki:google-oauth-popup-complete" },
        window.location.origin
      );
    });
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
      "id:account-a"
    );
    expect(window.localStorage.getItem("zaki:session-titles")).toBe(
      JSON.stringify({ main: "Account A title" })
    );
  });

  it("notifies the preserved-work window when Google popup authentication fails", async () => {
    const postMessage = jest.fn();
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });
    const closeSpy = jest.spyOn(window, "close").mockImplementation(() => undefined);
    useAuthStore.setState({
      token: "stale-google-popup-token",
      user: { id: "user-1", username: "google@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    fetchMock.mockResolvedValue(makeResponse({ token: "stale-google-popup-token" }));

    renderAppAt("/?oauthPopup=google&error=google_oauth_cancelled");

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        {
          type: "zaki:google-oauth-popup-failed",
          error: "google_oauth_cancelled",
        },
        window.location.origin
      );
    });
    expect(closeSpy).toHaveBeenCalled();
  });

  // WP-F (spec F5) — /agent used to be missing from isAnonymousAllowedPath, so an anonymous
  // deep link hit a full-screen LOGIN WALL. The tier matrix promises "Agent: anonymous =
  // preview only", so the route must RESOLVE.
  it("resolves /agent for an anonymous visitor instead of bouncing to login", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt("/agent");

    // The Agent surface renders. No login wall.
    expect(await screen.findByText("agent plan preview")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  // WP-F is scoped to Agent. Brain is a real surface whose anonymous story (F8) is a separate
  // P1 decision — it must still gate, and this is the test that keeps WP-F from quietly
  // widening into it.
  it("still gates /brain for an anonymous visitor", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt("/brain");

    await waitFor(() => {
      expect(screen.queryByText("brain surface")).not.toBeInTheDocument();
    });
  });

  it("keeps the active surface mounted behind a blocking reauthentication dialog", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      token: "expired-token",
      user: { id: "user-1", username: "user@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: "fresh-token",
        success: true,
        user: { id: "user-1", username: "user@example.com" },
      }),
    } as Response);

    renderAppAt("/brain");
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    const underlyingAction = screen.getByRole("button", { name: "brain action" });
    underlyingAction.focus();

    const authRequired = new CustomEvent("zaki:auth-required", {
      cancelable: true,
      detail: { loginUrl: "/?auth=login&next=%2Fbrain" },
    });
    act(() => {
      window.dispatchEvent(authRequired);
    });

    expect(authRequired.defaultPrevented).toBe(true);
    const dialog = screen.getByRole("dialog", { name: /session expired/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("brain surface")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByPlaceholderText("Email address")).toHaveFocus());
    expect(underlyingAction.closest('[aria-hidden="true"]')).not.toBeNull();

    for (let index = 0; index < 12; index += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("starts a fresh surface instead of giving account B account A's preserved work", async () => {
    const user = userEvent.setup();
    const popup = {
      close: jest.fn(),
      focus: jest.fn(),
    } as unknown as Window;
    jest.spyOn(window, "open").mockReturnValue(popup);
    useAuthStore.setState({
      token: "expired-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "agent",
        taskKind: "plan",
        prompt: "Account A private draft",
        returnTo: "/agent",
        createdAt: new Date().toISOString(),
      })
    );
    window.sessionStorage.setItem("zaki:draft:main", "Account A session draft");
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account A private title" }));
    window.localStorage.setItem("zaki:pinned-threads", JSON.stringify(["account-a-thread"]));
    window.localStorage.setItem("zaki:reactions:account-a-thread", JSON.stringify({ m1: "up" }));
    window.localStorage.setItem("zaki:agentDeletedSessionKeys", JSON.stringify(["account-a-session"]));
    window.localStorage.setItem("zaki.learn.pendingDraft", JSON.stringify({ text: "Account A lesson" }));
    window.localStorage.setItem("zaki.learn.sessionId.chat", "account-a-learning-session");
    window.localStorage.setItem("zaki:locale", "ar");
    window.localStorage.setItem("zaki.responseFormattingConfig", JSON.stringify({ concise: true }));

    let refreshCalls = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(
          makeResponse(
            refreshCalls === 1
              ? { token: "account-a-token" }
              : { token: "account-b-token" }
          )
        );
      }
      if (url.includes("/api/auth/google/status")) {
        return Promise.resolve(makeResponse({ success: true, enabled: true }));
      }
      if (url.includes("/api/legal/consent-status")) {
        return Promise.resolve(makeResponse({ success: true, policyVersion: "2027-01-01.v2" }));
      }
      if (url.includes("/api/profile")) {
        const authorization = new Headers(init?.headers).get("Authorization");
        const isAccountB = authorization === "Bearer account-b-token";
        return Promise.resolve(
          makeResponse({
            success: true,
            user: isAccountB
              ? { id: "account-b", username: "b@example.com", fullName: "Account B" }
              : { id: "account-a", username: "a@example.com", fullName: "Account A" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true }));
    });

    renderAppAt("/brain");
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent("zaki:auth-required", { cancelable: true }));
    });
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));

    act(() => {
      window.dispatchEvent(
        new CustomEvent(PENDING_INTENT_STORAGE_FAILURE_EVENT, {
          detail: {
            productId: "agent",
            prompt: "Account A recovery prompt",
            returnTo: "/agent",
          },
        })
      );
    });
    expect(screen.getByRole("alertdialog", { name: /work could not be saved/i })).toHaveTextContent(
      "Account A recovery prompt"
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "zaki:google-oauth-popup-complete" },
          origin: window.location.origin,
          source: popup,
        })
      );
    });

    expect(await screen.findByText("public home")).toBeInTheDocument();
    expect(screen.queryByText("brain surface")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(PENDING_INTENT_KEY)).toBeNull();
    expect(window.sessionStorage.getItem("zaki:draft:main")).toBeNull();
    expect(window.localStorage.getItem("zaki:session-titles")).toBeNull();
    expect(window.localStorage.getItem("zaki:pinned-threads")).toBeNull();
    expect(window.localStorage.getItem("zaki:reactions:account-a-thread")).toBeNull();
    expect(window.localStorage.getItem("zaki:agentDeletedSessionKeys")).toBeNull();
    expect(window.localStorage.getItem("zaki.learn.pendingDraft")).toBeNull();
    expect(window.localStorage.getItem("zaki.learn.sessionId.chat")).toBeNull();
    expect(window.localStorage.getItem("zaki:locale")).toBe("ar");
    expect(window.localStorage.getItem("zaki.responseFormattingConfig")).toBe(
      JSON.stringify({ concise: true })
    );
    expect(screen.queryByRole("alertdialog", { name: /work could not be saved/i })).not.toBeInTheDocument();
    expect(useAuthStore.getState().user).toMatchObject({ id: "account-b" });
  });

  it("clears account A in-memory state when account B ownership arrives before the local candidate commit", async () => {
    const user = userEvent.setup();
    const popup = {
      close: jest.fn(),
      focus: jest.fn(),
    } as unknown as Window;
    jest.spyOn(window, "open").mockReturnValue(popup);
    useAuthStore.setState({
      token: "expired-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    window.sessionStorage.setItem("zaki:draft:main", "Account A session draft");

    let refreshCalls = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(
          makeResponse({ token: refreshCalls === 1 ? "account-a-token" : "account-b-token" })
        );
      }
      if (url.includes("/api/auth/google/status")) {
        return Promise.resolve(makeResponse({ success: true, enabled: true }));
      }
      if (url.includes("/api/legal/consent-status")) {
        return Promise.resolve(makeResponse({ success: true, policyVersion: "2027-01-01.v2" }));
      }
      if (url.includes("/api/profile")) {
        const authorization = new Headers(init?.headers).get("Authorization");
        const isAccountB = authorization === "Bearer account-b-token";
        return Promise.resolve(
          makeResponse({
            success: true,
            user: isAccountB
              ? { id: "account-b", username: "b@example.com", fullName: "Account B" }
              : { id: "account-a", username: "a@example.com", fullName: "Account A" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true }));
    });

    const rendered = renderAppAt("/brain");
    rendered.queryClient.setQueryData(["account-a-private"], { title: "Account A query" });
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
        "id:account-a"
      );
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("zaki:auth-required", { cancelable: true }));
    });
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));

    // A sibling tab has already reset A's shared persistence and published B,
    // but this tab has not processed that StorageEvent yet.
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account B title" }));
    window.localStorage.setItem("zaki:account-storage-principal:v1", "id:account-b");
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "zaki:google-oauth-popup-complete" },
          origin: window.location.origin,
          source: popup,
        })
      );
    });

    await waitFor(() => {
      expect(useAuthStore.getState().user).toMatchObject({ id: "account-b" });
    });
    expect(rendered.queryClient.getQueryData(["account-a-private"])).toBeUndefined();
    expect(window.sessionStorage.getItem("zaki:draft:main")).toBeNull();
    expect(window.localStorage.getItem("zaki:session-titles")).toBe(
      JSON.stringify({ main: "Account B title" })
    );
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
      "id:account-b"
    );
  });

  it("fails closed when candidate account B cannot be verified after OAuth rotates the cookie", async () => {
    const user = userEvent.setup();
    const popup = {
      close: jest.fn(),
      focus: jest.fn(),
    } as unknown as Window;
    jest.spyOn(window, "open").mockReturnValue(popup);
    useAuthStore.setState({
      token: "expired-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "agent",
        taskKind: "plan",
        prompt: "Account A private draft",
        returnTo: "/agent",
        createdAt: new Date().toISOString(),
      })
    );
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account A title" }));
    window.sessionStorage.setItem("zaki:draft:main", "Account A draft");

    let refreshCalls = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(
          makeResponse({ token: refreshCalls === 1 ? "account-a-token" : "account-b-token" })
        );
      }
      if (url.includes("/api/auth/google/status")) {
        return Promise.resolve(makeResponse({ success: true, enabled: true }));
      }
      if (url.includes("/api/legal/consent-status")) {
        return Promise.resolve(makeResponse({ success: true, policyVersion: "2027-01-01.v2" }));
      }
      if (url.includes("/api/auth/logout")) {
        return Promise.resolve(makeResponse({ success: true }));
      }
      if (url.includes("/api/profile")) {
        const authorization = new Headers(init?.headers).get("Authorization");
        if (authorization === "Bearer account-b-token") {
          return Promise.resolve(makeResponse({ success: false }, 401));
        }
        return Promise.resolve(
          makeResponse({
            success: true,
            user: { id: "account-a", username: "a@example.com", fullName: "Account A" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true }));
    });

    const rendered = renderAppAt("/brain");
    rendered.queryClient.setQueryData(["account-a-private"], { title: "Account A query" });
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
        "id:account-a"
      );
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("zaki:auth-required", { cancelable: true }));
    });
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "zaki:google-oauth-popup-complete" },
          origin: window.location.origin,
          source: popup,
        })
      );
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).includes("/api/auth/logout"))
      ).toBe(true);
    });
    await waitFor(() => {
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
    });
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(rendered.queryClient.getQueryData(["account-a-private"])).toBeUndefined();
    expect(window.localStorage.getItem(PENDING_INTENT_KEY)).toBeNull();
    expect(window.localStorage.getItem("zaki:session-titles")).toBeNull();
    expect(window.sessionStorage.getItem("zaki:draft:main")).toBeNull();
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBeNull();
  });

  it("does not erase a newer account C when stale candidate account B verification fails", async () => {
    const user = userEvent.setup();
    const popup = {
      close: jest.fn(),
      focus: jest.fn(),
    } as unknown as Window;
    jest.spyOn(window, "open").mockReturnValue(popup);
    useAuthStore.setState({
      token: "expired-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    window.sessionStorage.setItem("zaki:draft:main", "Account A draft");

    let refreshCalls = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(
          makeResponse({ token: refreshCalls === 1 ? "account-a-token" : "account-b-token" })
        );
      }
      if (url.includes("/api/auth/google/status")) {
        return Promise.resolve(makeResponse({ success: true, enabled: true }));
      }
      if (url.includes("/api/legal/consent-status")) {
        return Promise.resolve(makeResponse({ success: true, policyVersion: "2027-01-01.v2" }));
      }
      if (url.includes("/api/auth/logout")) {
        return Promise.resolve(makeResponse({ success: true }));
      }
      if (url.includes("/api/profile")) {
        const authorization = new Headers(init?.headers).get("Authorization");
        if (authorization === "Bearer account-b-token") {
          return Promise.resolve(makeResponse({ success: false }, 401));
        }
        return Promise.resolve(
          makeResponse({
            success: true,
            user: { id: "account-a", username: "a@example.com", fullName: "Account A" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true }));
    });

    const rendered = renderAppAt("/brain");
    rendered.queryClient.setQueryData(["account-a-private"], { title: "Account A query" });
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
        "id:account-a"
      );
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("zaki:auth-required", { cancelable: true }));
    });
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));

    // Another tab has completed C while B's popup verification is still queued
    // in this tab. The stale B failure must not revoke C's shared session.
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account C title" }));
    window.localStorage.setItem("zaki:account-storage-principal:v1", "id:account-c");
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "zaki:google-oauth-popup-complete" },
          origin: window.location.origin,
          source: popup,
        })
      );
    });

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
    });
    expect(rendered.queryClient.getQueryData(["account-a-private"])).toBeUndefined();
    expect(window.sessionStorage.getItem("zaki:draft:main")).toBeNull();
    expect(window.localStorage.getItem("zaki:session-titles")).toBe(
      JSON.stringify({ main: "Account C title" })
    );
    expect(window.localStorage.getItem("zaki:account-storage-principal:v1")).toBe(
      "id:account-c"
    );
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).includes("/api/auth/logout"))
    ).toBe(false);
  });

  it("keeps account A's surface and draft when reauthentication returns account A", async () => {
    const user = userEvent.setup();
    const popup = {
      close: jest.fn(),
      focus: jest.fn(),
    } as unknown as Window;
    jest.spyOn(window, "open").mockReturnValue(popup);
    useAuthStore.setState({
      token: "expired-a-token",
      user: { id: "account-a", username: "a@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "agent",
        taskKind: "plan",
        prompt: "Account A private draft",
        returnTo: "/agent",
        createdAt: new Date().toISOString(),
      })
    );
    window.sessionStorage.setItem("zaki:draft:main", "Account A session draft");
    window.localStorage.setItem("zaki:session-titles", JSON.stringify({ main: "Account A private title" }));

    let refreshCalls = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(
          makeResponse(
            refreshCalls === 1
              ? { token: "account-a-token" }
              : { token: "replacement-a-token" }
          )
        );
      }
      if (url.includes("/api/auth/google/status")) {
        return Promise.resolve(makeResponse({ success: true, enabled: true }));
      }
      if (url.includes("/api/legal/consent-status")) {
        return Promise.resolve(makeResponse({ success: true, policyVersion: "2027-01-01.v2" }));
      }
      if (url.includes("/api/profile")) {
        const authorization = new Headers(init?.headers).get("Authorization");
        const isAccountB = authorization === "Bearer account-b-token";
        return Promise.resolve(
          makeResponse({
            success: true,
            user: isAccountB
              ? { id: "account-b", username: "b@example.com", fullName: "Account B" }
              : { id: "account-a", username: "a@example.com", fullName: "Account A" },
          })
        );
      }
      return Promise.resolve(makeResponse({ success: true }));
    });

    renderAppAt("/brain");
    expect(await screen.findByText("brain surface")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent("zaki:auth-required", { cancelable: true }));
    });
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "zaki:google-oauth-popup-complete" },
          origin: window.location.origin,
          source: popup,
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /session expired/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText("brain surface")).toBeInTheDocument();
    expect(window.localStorage.getItem(PENDING_INTENT_KEY)).not.toBeNull();
    expect(window.sessionStorage.getItem("zaki:draft:main")).toBe("Account A session draft");
    expect(window.localStorage.getItem("zaki:session-titles")).toBe(
      JSON.stringify({ main: "Account A private title" })
    );
    expect(useAuthStore.getState()).toMatchObject({
      token: "replacement-a-token",
      user: { id: "account-a" },
    });
  });

  it("shows unsaved work and offers one-step copy recovery into Spaces", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      token: "valid-token",
      user: { id: "user-1", username: "user@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: "fresh-token",
        success: true,
        user: { id: "user-1", username: "user@example.com" },
      }),
    } as Response);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderAppAt("/agent");
    expect(await screen.findByText("agent plan preview")).toBeInTheDocument();
    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    skipLink.focus();
    act(() => {
      window.dispatchEvent(
        new CustomEvent("zaki:pending-intent-storage-failed", {
          detail: {
            productId: "agent",
            prompt: "Recover this unsaved plan",
            returnTo: "/agent",
          },
        })
      );
    });

    const dialog = screen.getByRole("alertdialog", { name: /work could not be saved/i });
    expect(dialog).toHaveTextContent("Recover this unsaved plan");
    const recoveryAction = screen.getByRole("button", { name: /copy and open spaces/i });
    await waitFor(() => expect(recoveryAction).toHaveFocus());
    expect(skipLink.closest('[aria-hidden="true"]')).not.toBeNull();
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.click(recoveryAction);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Recover this unsaved plan"));
    expect(await screen.findByText("anonymous spaces")).toBeInTheDocument();
    await waitFor(() => expect(skipLink).toHaveFocus());
  });

  it.each(["unavailable", "rejected"] as const)(
    "offers a keyboard-operable manual recovery when Clipboard API is %s",
    async (clipboardState) => {
      const user = userEvent.setup();
      useAuthStore.setState({
        token: "valid-token",
        user: { id: "user-1", username: "user@example.com" },
        isHydrating: false,
        isLoading: false,
      });
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          token: "fresh-token",
          success: true,
          user: { id: "user-1", username: "user@example.com" },
        }),
      } as Response);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value:
          clipboardState === "rejected"
            ? { writeText: jest.fn().mockRejectedValue(new Error("denied")) }
            : undefined,
      });

      renderAppAt("/agent");
      act(() => {
        window.dispatchEvent(
          new CustomEvent("zaki:pending-intent-storage-failed", {
            detail: {
              productId: "agent",
              prompt: "Manually recover this plan",
              returnTo: "/agent",
            },
          })
        );
      });

      await user.click(screen.getByRole("button", { name: /copy and open spaces/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(/copy failed/i);
      expect(
        screen.getByRole("button", { name: "Select work" })
      ).toHaveFocus();

      const recoveryText = screen.getByRole("textbox", {
        name: /app.recovery.workLabel/i,
      });
      await user.click(screen.getByRole("button", { name: "Select work" }));
      expect(recoveryText).toHaveFocus();
      expect(recoveryText).toHaveProperty("selectionStart", 0);
      expect(recoveryText).toHaveProperty(
        "selectionEnd",
        "Manually recover this plan".length
      );

      await user.click(screen.getByRole("button", { name: "Open Spaces after copying" }));
      expect(await screen.findByText("anonymous spaces")).toBeInTheDocument();
    }
  );

  it("honors an explicit auth intent on the public home route", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt("/?auth=login&error=google_oauth_failed");

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText("public home")).not.toBeInTheDocument();
  });

  it.each(["/?next=%2Fagent", "/?next=%2Fspaces"])(
    "keeps safe next handoff URLs on the auth screen at %s",
    async (path) => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

      renderAppAt(path);

      expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByText("public home")).not.toBeInTheDocument();
    }
  );

  it("does not treat a root next value as an auth handoff", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt("/?next=%2F");

    expect(await screen.findByText("public home")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it.each([
    ["/design", "design workspace"],
    ["/minutes", "minutes workspace"],
  ])("lets visible gated product routes render without an auth cliff at %s", async (path, label) => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt(path);

    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
  });

  it.each(["/learn", "/hire"])("lets hidden product routes redirect home without an auth cliff at %s", async (path) => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt(path);

    expect(await screen.findByText("public home")).toBeInTheDocument();
    expect(screen.queryByText(/workspace/)).not.toBeInTheDocument();
  });
});
