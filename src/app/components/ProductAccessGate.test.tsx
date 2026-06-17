import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductAccessGate } from "./ProductAccessGate";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: Record<string, unknown>) => String(options?.defaultValue ?? _key),
  }),
}));

function renderGate(productId: "design" | "hire" | "learning", title: string) {
  return render(
    <MemoryRouter>
      <ProductAccessGate productId={productId} title={title} mode="coming_soon" />
    </MemoryRouter>
  );
}

describe("ProductAccessGate", () => {
  it("keeps enabled registry products gated as coming soon", () => {
    renderGate("design", "ZAKI Design");

    expect(screen.getByTestId("product-gate-design")).toHaveAttribute(
      "data-product-gate",
      "coming_soon"
    );
    expect(screen.getByRole("heading", { name: "This product is coming soon" })).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByText("Launch state: coming soon")).toBeInTheDocument();
    expect(screen.getByText("Dashboard, Agent, Chat, Brain, Settings")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open dashboard/ })).toHaveAttribute("href", "/");
  });
});
