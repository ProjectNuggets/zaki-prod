import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { useAuthStore } from "@/stores/authStore";

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
  return render(
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
  );
}

describe("App route hydration", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
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
        json: async () => ({ token: "fresh-token" }),
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
