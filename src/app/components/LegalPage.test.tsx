import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LegalPage } from "./LegalPage";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

describe("LegalPage", () => {
  it("shows the current terms copy and a signup return path", () => {
    render(
      <MemoryRouter initialEntries={["/terms?from=signup"]}>
        <LegalPage slug="terms" />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to signup" })).toHaveAttribute(
      "href",
      "/?auth=signup"
    );
    expect(screen.getByText(/2026-06-17\.v2/)).toBeInTheDocument();
    expect(screen.getByText(/current ZAKI web app/i)).toBeInTheDocument();
    expect(screen.getByText(/5\) Third-party services, AI models/i)).toBeInTheDocument();
    expect(screen.queryByText(/9\) Third-party services, AI models/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ZAKI v0\.1/i)).not.toBeInTheDocument();
  });
});
