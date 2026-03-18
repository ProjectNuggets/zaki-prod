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
        "zakiExperimentalNotice.eyebrow": "Experimental note",
        "zakiExperimentalNotice.badge": "Experimental branch",
        "zakiExperimentalNotice.areaLabel": "Repo intro",
        "zakiExperimentalNotice.title": "ZAKI is still experimental",
        "zakiExperimentalNotice.intro":
          "This is a different interaction model: state-of-the-art agent behavior with long-term persistent memory and continuity across sessions.",
        "zakiExperimentalNotice.footer":
          "It is marked experimental because the behavior is still new enough that we had to build our own benchmark for it at Nova Nuggets Labs before treating it as stable.",
        "zakiExperimentalNotice.repo.branch": "// branch: zaki/experimental-persistent-agents",
        "zakiExperimentalNotice.repo.origin": "// built at Nova Nuggets Labs",
        "zakiExperimentalNotice.repo.benchmark": "// in-house benchmark required",
        "zakiExperimentalNotice.repo.goal": "// long-term persistent memory in real use",
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

    expect(screen.getByText("ZAKI is still experimental")).toBeInTheDocument();
    expect(screen.getByText("// built at Nova Nuggets Labs")).toBeInTheDocument();
    expect(screen.getByText("// in-house benchmark required")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      "https://www.chatzaki.com/zaki-bot/"
    );
  });

  it("stays hidden after dismissal for the rest of the session", () => {
    const { rerender } = render(<ZakiExperimentalNotice active />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(window.sessionStorage.getItem(ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY)).toBe("1");
    expect(screen.queryByText("ZAKI is still experimental")).not.toBeInTheDocument();

    rerender(<ZakiExperimentalNotice active />);
    expect(screen.queryByText("ZAKI is still experimental")).not.toBeInTheDocument();
  });

  it("does not render when inactive", () => {
    render(<ZakiExperimentalNotice active={false} />);

    expect(screen.queryByText("ZAKI is still experimental")).not.toBeInTheDocument();
  });
});
