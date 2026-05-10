import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { WebsiteHomePage, WebsiteProductPage } from "./WebsitePage";

describe("WebsitePage", () => {
  it("presents the new product model without stale beta or student copy", () => {
    render(
      <MemoryRouter>
        <WebsiteHomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Your AI work should not disappear when the chat ends/i })).toBeInTheDocument();
    expect(screen.getAllByText("Spaces").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZAKI Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZAKI Learn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZAKI Complete").length).toBeGreaterThan(0);
    expect(screen.getByText(/10 messages per day/i)).toBeInTheDocument();
    expect(screen.getByText(/test memory and follow-through/i)).toBeInTheDocument();
    expect(screen.getByText(/test explanation, practice, and research/i)).toBeInTheDocument();
    expect(screen.queryByText(/beta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/student/i)).not.toBeInTheDocument();
  });

  it("renders a deep-dive page for ZAKI Learn with paid routing", () => {
    render(
      <MemoryRouter initialEntries={["/products/learn"]}>
        <Routes>
          <Route path="/products/:productId" element={<WebsiteProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "ZAKI Learn" })).toBeInTheDocument();
    expect(screen.getByText("$19/mo")).toBeInTheDocument();
    expect(screen.getByText(/turns source material into explanations/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Choose Learn/i })).toHaveAttribute(
      "href",
      "/pricing?plan=learn&autostart=1&source=website_product_learn"
    );
  });

  it("renders the Arabic landing page with RTL layout and language routing", () => {
    const { container } = render(
      <MemoryRouter>
        <WebsiteHomePage locale="ar" />
      </MemoryRouter>
    );

    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /لا يجب أن يختفي عملك/i })).toBeInTheDocument();
    expect(screen.getByText("AI يتذكر ويتابع ويعلّم")).toBeInTheDocument();
    const englishLinks = screen.getAllByRole("link", { name: "English" });
    expect(englishLinks.length).toBeGreaterThan(0);
    expect(englishLinks[0]).toHaveAttribute("href", "/");
  });

  it("renders the Arabic ZAKI Learn page with Arabic paid routing", () => {
    render(
      <MemoryRouter initialEntries={["/ar/products/learn"]}>
        <Routes>
          <Route path="/ar/products/:productId" element={<WebsiteProductPage locale="ar" />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "ZAKI Learn" })).toBeInTheDocument();
    expect(screen.getByText(/حوّل المادة إلى فهم وتدريب/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Deep Solve/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /اختر Learn/i })).toHaveAttribute(
      "href",
      "/pricing?plan=learn&autostart=1&source=website_product_learn_ar"
    );
  });
});
