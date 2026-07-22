import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MobileHeader } from "./MobileHeader";

const toggleMobileSidebar = jest.fn();
const changeLanguage = jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined);

jest.mock("@/stores", () => ({
  useUIStore: (selector?: (state: { toggleMobileSidebar: () => void }) => unknown) => {
    const state = { toggleMobileSidebar };
    return selector ? selector(state) : state;
  },
  useNavigationStore: (
    selector?: (state: { threadId: string | null }) => unknown
  ) => {
    const state = { threadId: "main" };
    return selector ? selector(state) : state;
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
    i18n: { language: "en", changeLanguage },
  }),
}));

describe("MobileHeader", () => {
  it("opens the Agent mobile inspector from the sliders control", () => {
    const handler = jest.fn();
    window.addEventListener("zaki:open-agent-mobile-inspector", handler);

    try {
      render(
        <MemoryRouter initialEntries={["/agent"]}>
          <MobileHeader />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole("button", { name: "Open agent panel" }));
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("zaki:open-agent-mobile-inspector", handler);
    }
  });

  it("lets an anonymous visitor switch the mobile interface to Arabic", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <MobileHeader />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Switch to Arabic" }));

    expect(changeLanguage).toHaveBeenCalledWith("ar");
  });
});
