import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
            <Route path="learn" element={<div>learn workspace</div>} />
            <Route path="hire" element={<div>hire workspace</div>} />
            <Route path="design" element={<div>design workspace</div>} />
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

  it("honors an explicit auth intent on the public home route", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt("/?auth=login&error=google_oauth_failed");

    expect(await screen.findByRole("button", { name: /continue/i })).toBeInTheDocument();
    expect(screen.queryByText("public home")).not.toBeInTheDocument();
  });

  it.each([
    ["/learn", "learn workspace"],
    ["/hire", "hire workspace"],
    ["/design", "design workspace"],
  ])("lets gated product routes render without an auth cliff at %s", async (path, label) => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    renderAppAt(path);

    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
  });
});
