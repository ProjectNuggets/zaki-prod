import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MinutesRoute } from "./MinutesRoute";

let mockToken = "";
let mockProductState = "enabled";
let mockRegistryOk = true;
let mockRegistryError = false;
const mockRegistryRefetch = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }),
}));
jest.mock("@/stores", () => ({ useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: mockToken }) }));
jest.mock("@/queries/useProducts", () => ({
  useProductRegistry: () => ({
    isLoading: false,
    isError: mockRegistryError,
    refetch: mockRegistryRefetch,
    data: {
      response: { ok: mockRegistryOk },
      data: { products: [{ productId: "minutes", state: mockProductState }] },
    },
  }),
}));
jest.mock("./MinutesPage", () => ({ MinutesPage: () => <div>minutes read page</div> }));

describe("MinutesRoute activation boundary", () => {
  beforeEach(() => {
    mockToken = "";
    mockProductState = "enabled";
    mockRegistryOk = true;
    mockRegistryError = false;
    mockRegistryRefetch.mockReset();
  });

  it("shows an anonymous introduction with a sign-in handoff even if the operator gate is enabled", () => {
    mockToken = "";
    mockProductState = "enabled";
    render(<MemoryRouter><MinutesRoute /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Your meetings, made reviewable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to open Minutes" })).toHaveAttribute("href", "/?next=%2Fminutes");
    expect(screen.queryByText("minutes read page")).not.toBeInTheDocument();
  });

  it("renders the read surface only for an authenticated registry-enabled user", () => {
    mockToken = "signed-session";
    mockProductState = "enabled";
    render(<MemoryRouter><MinutesRoute /></MemoryRouter>);
    expect(screen.getByText("minutes read page")).toBeInTheDocument();
  });

  it("renders a recoverable failure instead of coming-soon copy when the registry request fails", () => {
    mockToken = "signed-session";
    mockRegistryOk = false;
    render(<MemoryRouter><MinutesRoute /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Minutes access could not be checked" })).toBeInTheDocument();
    expect(screen.queryByText("This product is coming soon")).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(mockRegistryRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders a truthful unavailable state when Minutes is in maintenance", () => {
    mockToken = "signed-session";
    mockProductState = "maintenance";
    render(<MemoryRouter><MinutesRoute /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Minutes is temporarily unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("This product is coming soon")).not.toBeInTheDocument();
  });
});
