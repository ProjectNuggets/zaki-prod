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
    renderGate("design", "ZAKI Design", "private_beta");

    expect(screen.getByTestId("product-gate-design")).toHaveAttribute(
      "data-product-gate",
      "private_beta"
    );
    expect(screen.getByRole("heading", { name: "This product is gated for private access" })).toBeInTheDocument();
    expect(screen.getByText("Private access")).toBeInTheDocument();
    expect(screen.getByText("Launch state: private access")).toBeInTheDocument();
    expect(screen.getByText("Agent, Chat/Spaces, Design, Minutes")).toBeInTheDocument();
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

  it("labels coming-soon products without exposing app access", () => {
    renderGate("minutes", "ZAKI Minutes", "coming_soon");

    expect(screen.getByTestId("product-gate-minutes")).toHaveAttribute(
      "data-product-gate",
      "coming_soon"
    );
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});
