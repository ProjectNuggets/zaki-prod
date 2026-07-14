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
  productId: "design" | "minutes",
  title: string,
  mode: "coming_soon" | "private_beta"
) {
  return render(
    <MemoryRouter>
      <ProductAccessGate productId={productId} title={title} mode={mode} />
    </MemoryRouter>
  );
}

describe("ProductAccessGate", () => {
  it("labels private-access products separately from coming soon", () => {
    renderGate("design", "ZAKI Design", "private_beta");

    expect(screen.getByTestId("product-gate-design")).toHaveAttribute(
      "data-product-gate",
      "private_beta"
    );
    expect(screen.getByRole("heading", { name: "This product is gated for private access" })).toBeInTheDocument();
    expect(screen.getByText("Private access")).toBeInTheDocument();
    expect(screen.getByText("Launch state: private access")).toBeInTheDocument();
    // The chat lane is named "Spaces" here too — no "Chat/Spaces" dual naming.
    expect(screen.getByText("Agent, Spaces, Design, Minutes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open dashboard/ })).toHaveAttribute("href", "/");
  });

  it("labels coming-soon products without exposing app access", () => {
    renderGate("minutes", "ZAKI Minutes", "coming_soon");

    expect(screen.getByTestId("product-gate-minutes")).toHaveAttribute(
      "data-product-gate",
      "coming_soon"
    );
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("uses 'Coming soon' for Design too — the 'Waitlist' synonym is gone", () => {
    // WP-K: Design and Minutes are the same launch state and must read identically.
    renderGate("design", "ZAKI Design", "coming_soon");

    expect(screen.getByTestId("product-gate-design")).toHaveAttribute(
      "data-product-gate",
      "coming_soon"
    );
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByText(/waitlist/i)).not.toBeInTheDocument();
  });
});
