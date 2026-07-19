import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DesignRoute } from "./DesignRoute";

let mockToken = "";
let mockProductState = "enabled";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));
jest.mock("@/stores", () => ({
  useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: mockToken }),
}));
jest.mock("@/queries/useProducts", () => ({
  useProductRegistry: () => ({
    isLoading: false,
    data: {
      response: { ok: true },
      data: { products: [{ productId: "design", state: mockProductState }] },
    },
  }),
}));
jest.mock("./DesignPage", () => ({ DesignPage: () => <div>design product surface</div> }));

describe("DesignRoute activation boundary", () => {
  beforeEach(() => {
    mockToken = "";
    mockProductState = "enabled";
  });

  it("keeps anonymous visitors on the coming-soon gate even if the operator gate is enabled", () => {
    render(<MemoryRouter><DesignRoute /></MemoryRouter>);

    expect(screen.getByTestId("product-gate-design")).toHaveAttribute(
      "data-product-gate",
      "coming_soon"
    );
    expect(screen.queryByText("design product surface")).not.toBeInTheDocument();
  });

  it("renders the product surface for an authenticated registry-enabled user", () => {
    mockToken = "signed-session";
    render(<MemoryRouter><DesignRoute /></MemoryRouter>);

    expect(screen.getByText("design product surface")).toBeInTheDocument();
  });

  it("keeps authenticated users on the coming-soon gate while Design is disabled", () => {
    mockToken = "signed-session";
    mockProductState = "disabled";
    render(<MemoryRouter><DesignRoute /></MemoryRouter>);

    expect(screen.getByTestId("product-gate-design")).toHaveAttribute(
      "data-product-gate",
      "coming_soon"
    );
  });
});
