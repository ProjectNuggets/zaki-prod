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

function renderGate(
  productId: "design" | "hire" | "learning",
  title: string,
  mode: "coming_soon" | "private_beta" | "waitlist"
) {
  return render(
    <MemoryRouter>
      <ProductAccessGate productId={productId} title={title} mode={mode} />
    </MemoryRouter>
  );
}

describe("ProductAccessGate", () => {
  it("labels private-access products separately from coming soon", () => {
    renderGate("learning", "ZAKI Learn", "private_beta");

    expect(screen.getByTestId("product-gate-learning")).toHaveAttribute(
      "data-product-gate",
      "private_beta"
    );
    expect(screen.getByRole("heading", { name: "This product is gated for private access" })).toBeInTheDocument();
    expect(screen.getByText("Private access")).toBeInTheDocument();
    expect(screen.getByText("Launch state: private access")).toBeInTheDocument();
    expect(screen.getByText("Dashboard, Agent, Chat, Brain, Settings")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open dashboard/ })).toHaveAttribute("href", "/");
  });

  it("labels waitlist products without exposing app access", () => {
    renderGate("design", "ZAKI Design", "waitlist");

    expect(screen.getByTestId("product-gate-design")).toHaveAttribute(
      "data-product-gate",
      "waitlist"
    );
    expect(screen.getByRole("heading", { name: "This product is on the waitlist" })).toBeInTheDocument();
    expect(screen.getByText("Waitlist")).toBeInTheDocument();
    expect(screen.getByText("Launch state: waitlist")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open dashboard/ })).toHaveAttribute("href", "/");
  });
});
