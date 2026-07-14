import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
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
    t: (key: string) => key,
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
            <Route path="brain" element={<div>brain surface</div>} />
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
