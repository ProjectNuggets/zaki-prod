import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ZakiBootstrapCard,
  getZakiBootstrapCardStorageKey,
} from "./ZakiBootstrapCard";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        "zakiBootstrapCard.eyebrow": "First exchange",
        "zakiBootstrapCard.title": "Give me the shape of the relationship first.",
        "zakiBootstrapCard.dismissAria": "Dismiss ZAKI first-contact note",
        "zakiBootstrapCard.arabic.headline":
          "I will ask in English too, but this setup comes first.",
        "zakiBootstrapCard.arabic.body":
          "Tell me who you are, who I am for you, and what we are working on.",
        "zakiBootstrapCard.english.label": "English translation",
        "zakiBootstrapCard.english.body":
          "I will ask in English too. Tell me who you are, who I am for you, and what we are working on. You can start in any language.",
        "zakiBootstrapCard.actions.continue": "Continue",
      };
      return dictionary[key] || key;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

describe("ZakiBootstrapCard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders for a first-time ZAKI user and persists dismissal", () => {
    render(<ZakiBootstrapCard active userId="nova@test.com" />);

    expect(screen.getByText("Give me the shape of the relationship first.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "I will ask in English too. Tell me who you are, who I am for you, and what we are working on. You can start in any language."
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      window.localStorage.getItem(getZakiBootstrapCardStorageKey("nova@test.com"))
    ).toBe("done");
    expect(
      screen.queryByText("Give me the shape of the relationship first.")
    ).not.toBeInTheDocument();
  });

  it("stays hidden after it was already completed for the user", () => {
    window.localStorage.setItem(
      getZakiBootstrapCardStorageKey("nova@test.com"),
      "done"
    );

    render(<ZakiBootstrapCard active userId="nova@test.com" />);

    expect(
      screen.queryByText("Give me the shape of the relationship first.")
    ).not.toBeInTheDocument();
  });
});
