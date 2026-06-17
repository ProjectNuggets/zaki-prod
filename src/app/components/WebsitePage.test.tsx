import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { WebsiteHomePage, WebsiteProductPage } from "./WebsitePage";

describe("WebsitePage", () => {
  it("presents the core product model with future spokes parked", () => {
    render(
      <MemoryRouter>
        <WebsiteHomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Your AI work should not disappear when the chat ends/i })).toBeInTheDocument();
    expect(screen.getAllByText("ZAKI Chat").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZAKI Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZAKI Brain").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZAKI Learn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZAKI Design").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ZAKI Career").length).toBeGreaterThan(0);
    expect(screen.getByText(/10 messages per day/i)).toBeInTheDocument();
    expect(screen.getByText(/test memory and follow-through/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn, Design, and Career stay parked/i)).toBeInTheDocument();
    expect(screen.queryByText("ZAKI Complete")).not.toBeInTheDocument();
    expect(screen.queryByText(/beta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/student/i)).not.toBeInTheDocument();
  });

  it("renders ZAKI Learn as coming soon without paid routing", () => {
    render(
      <MemoryRouter initialEntries={["/products/learn"]}>
        <Routes>
          <Route path="/products/:productId" element={<WebsiteProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "ZAKI Learn" })).toBeInTheDocument();
    expect(screen.getAllByText("Soon").length).toBeGreaterThan(0);
    expect(screen.getByText(/Learning workflows are parked/i)).toBeInTheDocument();
    expect(screen.getByText(/not being presented as paid public access/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.queryByText("$19/mo")).not.toBeInTheDocument();
  });

  it("renders Design and Career product pages as coming soon", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/products/design"]}>
        <Routes>
          <Route path="/products/:productId" element={<WebsiteProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "ZAKI Design" })).toBeInTheDocument();
    expect(screen.getByText(/Design will launch after the service/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open dashboard/i })).toHaveAttribute("href", "/");

    unmount();

    render(
      <MemoryRouter initialEntries={["/products/hire"]}>
        <Routes>
          <Route path="/products/:productId" element={<WebsiteProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "ZAKI Career" })).toBeInTheDocument();
    expect(screen.getByText(/user-side job search/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open dashboard/i })).toHaveAttribute("href", "/");
  });

  it("renders the Arabic landing page with RTL layout and language routing", () => {
    const { container } = render(
      <MemoryRouter>
        <WebsiteHomePage locale="ar" />
      </MemoryRouter>
    );

    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /لا يجب أن يختفي عملك/i })).toBeInTheDocument();
    expect(screen.getByText("AI يبدأ فورًا ويتذكر عند الحاجة")).toBeInTheDocument();
    const englishLinks = screen.getAllByRole("link", { name: "English" });
    expect(englishLinks.length).toBeGreaterThan(0);
    expect(englishLinks[0]).toHaveAttribute("href", "/");
  });

  it("renders the Arabic ZAKI Learn page as coming soon", () => {
    render(
      <MemoryRouter initialEntries={["/ar/products/learn"]}>
        <Routes>
          <Route path="/ar/products/:productId" element={<WebsiteProductPage locale="ar" />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "ZAKI Learn" })).toBeInTheDocument();
    expect(screen.getAllByText("قريبًا").length).toBeGreaterThan(0);
    expect(screen.getByText(/مسارات التعلم متوقفة/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /افتح لوحة التحكم/i })).toHaveAttribute("href", "/");
  });
});
