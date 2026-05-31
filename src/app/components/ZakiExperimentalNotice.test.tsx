import "@testing-library/jest-dom";
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  ZakiExperimentalNotice,
  ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY,
} from "./ZakiExperimentalNotice";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        "zakiExperimentalNotice.eyebrow": "Experimental",
        "zakiExperimentalNotice.title": "ZAKI is powerful by design.",
        "zakiExperimentalNotice.intro":
          "Ask ZAKI about anything. It will try to find a way forward, not just answer back.",
        "zakiExperimentalNotice.capability":
          "11K+ vetted skills available through hub.decision.ai. ZAKI can discover, download, and execute them when needed.",
        "zakiExperimentalNotice.footer":
          "This stays experimental because the tool is ambitious, the behavior is still evolving, and we benchmark it as we shape it in public.",
        "zakiExperimentalNotice.dismissAria": "Dismiss ZAKI experimental notice",
        "zakiExperimentalNotice.actions.continue": "Continue",
        "zakiExperimentalNotice.actions.learnMore": "Learn more",
      };
      return dictionary[key] || key;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

describe("ZakiExperimentalNotice", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  function renderNotice(active = true) {
    return render(
      <MemoryRouter>
        <ZakiExperimentalNotice active={active} />
      </MemoryRouter>
    );
  }

  it("renders when active and not yet dismissed in the session", () => {
    renderNotice();

    expect(screen.getByText("ZAKI is powerful by design.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "11K+ vetted skills available through hub.decision.ai. ZAKI can discover, download, and execute them when needed."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      "/agent"
    );
  });

  it("stays hidden after dismissal for the rest of the session", () => {
    const { rerender } = renderNotice();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(window.sessionStorage.getItem(ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY)).toBe("1");
    expect(screen.queryByText("ZAKI is powerful by design.")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ZakiExperimentalNotice active />
      </MemoryRouter>
    );
    expect(screen.queryByText("ZAKI is powerful by design.")).not.toBeInTheDocument();
  });

  it("does not render when inactive", () => {
    renderNotice(false);

    expect(screen.queryByText("ZAKI is powerful by design.")).not.toBeInTheDocument();
  });
});
