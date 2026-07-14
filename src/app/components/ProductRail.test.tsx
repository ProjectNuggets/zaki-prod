import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ProductRail } from "./ProductRail";
import { requestLogout } from "@/lib/api";
import { useAuthStore, useNavigationStore } from "@/stores";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: Record<string, unknown>) => String(options?.defaultValue ?? _key),
  }),
}));

const mockGoHome = jest.fn();
const mockGoToSpaces = jest.fn();
const mockGoToZakiBot = jest.fn();

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => ({
    goHome: mockGoHome,
    goToSpaces: mockGoToSpaces,
    goToZakiBot: mockGoToZakiBot,
  }),
}));

jest.mock("@/queries/useProducts", () => ({
  useProductRegistry: () => ({
    data: {
      data: {
        products: [],
      },
    },
  }),
}));

jest.mock("@/lib/api", () => ({
  requestLogout: jest.fn(async () => ({
    response: { ok: true },
    data: { success: true },
  })),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.hash}
      {location.search}
    </output>
  );
}

function renderProductRail(initialEntry = "/agent") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ProductRail />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ProductRail quick settings", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: "token",
      user: { id: "user-1", username: "nova@example.com", fullName: "Nova" },
      isHydrating: false,
      isLoading: false,
    });
    useNavigationStore.setState({ sidebarMode: "zaki" });
    (requestLogout as jest.MockedFunction<typeof requestLogout>).mockClear();
    mockGoHome.mockClear();
    mockGoToSpaces.mockClear();
    mockGoToZakiBot.mockClear();
  });

  it("opens a compact settings menu from the rail settings icon", () => {
    renderProductRail();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("menu", { name: "Quick settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Account/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Plan & usage/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Agent defaults/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Channels/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Memory & privacy/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "All settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("names the chat lane 'Spaces' and never labels it 'Chat'", () => {
    renderProductRail();

    // WP-K: ONE canonical name per lane. The rail used to say "Chat" while the
    // Sidebar said "Spaces" for the very same lane.
    expect(screen.getByTitle("Spaces")).toBeEnabled();
    expect(screen.queryByTitle("Chat")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Spaces"));
    expect(mockGoToSpaces).toHaveBeenCalledTimes(1);
  });

  it("shows the four release spokes and hides the retired Learn/Career spokes", () => {
    renderProductRail();

    expect(screen.queryByTitle("Learn")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Career")).not.toBeInTheDocument();
    expect(screen.getByTitle("Agent")).toBeEnabled();
    expect(screen.getByTitle("Spaces")).toBeEnabled();
    expect(screen.getByTitle("Brain")).toBeEnabled();
  });

  it("navigates coming-soon spokes to their gate pages instead of being inert", () => {
    // Spec §A2 bans dead controls. Design/Minutes used to be `disabled: true` with an
    // empty action — clicking them did literally nothing. They must now navigate.
    const { unmount } = renderProductRail("/");

    const design = screen.getByTitle("Design — Coming soon");
    expect(design).toBeEnabled();
    fireEvent.click(design);
    expect(screen.getByTestId("location")).toHaveTextContent("/design");
    unmount();

    renderProductRail("/");

    const minutes = screen.getByTitle("Minutes — Coming soon");
    expect(minutes).toBeEnabled();
    fireEvent.click(minutes);
    expect(screen.getByTestId("location")).toHaveTextContent("/minutes");
  });

  it("routes anonymous Agent and Brain rail clicks through login with return paths", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    const { unmount } = renderProductRail("/");
    fireEvent.click(screen.getByTitle("Agent"));
    expect(screen.getByTestId("location")).toHaveTextContent("/?auth=login&next=%2Fagent");
    unmount();

    renderProductRail("/");
    fireEvent.click(screen.getByTitle("Brain"));
    expect(screen.getByTestId("location")).toHaveTextContent("/?auth=login&next=%2Fbrain");
  });

  it("shows a sign-in action instead of sign-out in the anonymous quick settings menu", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderProductRail("/");

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("menu", { name: "Quick settings" })).toHaveTextContent("Guest");
    expect(screen.queryByRole("menuitem", { name: /Sign out/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Sign in/ }));

    expect(screen.getByTestId("location")).toHaveTextContent("/?auth=login&next=%2Fsettings");
  });

  it("deep-links from quick settings to Plan & usage", () => {
    renderProductRail();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Plan & usage/ }));

    expect(screen.getByTestId("location")).toHaveTextContent("/settings#settings-billing");
  });

  it("uses the server logout route before clearing local auth", async () => {
    renderProductRail();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Sign out/ }));

    await waitFor(() => {
      expect(requestLogout).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(screen.getByTestId("location")).toHaveTextContent("/?auth=login");
    });
  });
});
