import "@testing-library/jest-dom";
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("renders when active and not yet dismissed in the session", () => {
    render(<ZakiExperimentalNotice active />);

    expect(screen.getByText("ZAKI is powerful by design.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "11K+ vetted skills available through hub.decision.ai. ZAKI can discover, download, and execute them when needed."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      "https://www.chatzaki.com/zaki-bot/"
    );
  });

  it("stays hidden after dismissal for the rest of the session", () => {
    const { rerender } = render(<ZakiExperimentalNotice active />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(window.sessionStorage.getItem(ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY)).toBe("1");
    expect(screen.queryByText("ZAKI is powerful by design.")).not.toBeInTheDocument();

    rerender(<ZakiExperimentalNotice active />);
    expect(screen.queryByText("ZAKI is powerful by design.")).not.toBeInTheDocument();
  });

  it("does not render when inactive", () => {
    render(<ZakiExperimentalNotice active={false} />);

    expect(screen.queryByText("ZAKI is powerful by design.")).not.toBeInTheDocument();
  });
});
