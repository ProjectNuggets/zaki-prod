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
        "zakiBootstrapCard.eyebrow": "First contact",
        "zakiBootstrapCard.title": "Before the conversation starts",
        "zakiBootstrapCard.dismissAria": "Dismiss ZAKI first-contact note",
        "zakiBootstrapCard.arabic.headline":
          "I will ask you in English too, but this is a short note before we begin.",
        "zakiBootstrapCard.arabic.body":
          "Do not worry, I speak any language.",
        "zakiBootstrapCard.english.label": "English translation",
        "zakiBootstrapCard.english.body":
          "My opening question will be: Who am I? Who are you? What are we working on?",
        "zakiBootstrapCard.repo.prep": "// bootstrap note",
        "zakiBootstrapCard.repo.languages":
          "// Arabic first, English next, any language welcome",
        "zakiBootstrapCard.repo.questions": "// who am I / who are you / what are we working on",
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

    expect(screen.getByText("Before the conversation starts")).toBeInTheDocument();
    expect(screen.getByText("// who am I / who are you / what are we working on")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      window.localStorage.getItem(getZakiBootstrapCardStorageKey("nova@test.com"))
    ).toBe("done");
    expect(
      screen.queryByText("Before the conversation starts")
    ).not.toBeInTheDocument();
  });

  it("stays hidden after it was already completed for the user", () => {
    window.localStorage.setItem(
      getZakiBootstrapCardStorageKey("nova@test.com"),
      "done"
    );

    render(<ZakiBootstrapCard active userId="nova@test.com" />);

    expect(
      screen.queryByText("Before the conversation starts")
    ).not.toBeInTheDocument();
  });
});
