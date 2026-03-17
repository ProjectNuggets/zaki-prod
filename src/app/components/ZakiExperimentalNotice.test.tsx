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
        "zakiExperimentalNotice.badge": "Open beta",
        "zakiExperimentalNotice.title":
          "ZAKI is our beta for persistent personal intelligence",
        "zakiExperimentalNotice.intro":
          "This space is where we test a longer-term relationship with your AI: memory continuity, visible work phases, and context that carries across sessions.",
        "zakiExperimentalNotice.whyExperimentalTitle": "Why it is experimental",
        "zakiExperimentalNotice.whyExperimentalBody":
          "We are learning from real usage in public, so behavior, limits, and availability may shift while we refine the product.",
        "zakiExperimentalNotice.expectationsTitle": "What to expect right now",
        "zakiExperimentalNotice.expectationsBody":
          "Free access is limited, resets daily, and may vary with traffic or prompt complexity while the beta is still early.",
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

    expect(
      screen.getByText("ZAKI is our beta for persistent personal intelligence")
    ).toBeInTheDocument();
    expect(screen.getByText("Why it is experimental")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      "https://www.chatzaki.com/zaki-bot/"
    );
  });

  it("stays hidden after dismissal for the rest of the session", () => {
    const { rerender } = render(<ZakiExperimentalNotice active />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(window.sessionStorage.getItem(ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY)).toBe("1");
    expect(
      screen.queryByText("ZAKI is our beta for persistent personal intelligence")
    ).not.toBeInTheDocument();

    rerender(<ZakiExperimentalNotice active />);
    expect(
      screen.queryByText("ZAKI is our beta for persistent personal intelligence")
    ).not.toBeInTheDocument();
  });

  it("does not render when inactive", () => {
    render(<ZakiExperimentalNotice active={false} />);

    expect(
      screen.queryByText("ZAKI is our beta for persistent personal intelligence")
    ).not.toBeInTheDocument();
  });
});
