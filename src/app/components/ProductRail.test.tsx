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

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => ({
    goHome: jest.fn(),
    goToSpaces: jest.fn(),
    goToZakiBot: jest.fn(),
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

  it("keeps future product spokes visible but disabled in normal navigation", () => {
    renderProductRail();

    expect(screen.getByTitle("Learn")).toBeDisabled();
    expect(screen.getByTitle("Hire")).toBeDisabled();
    expect(screen.getByTitle("Design")).toBeDisabled();
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
