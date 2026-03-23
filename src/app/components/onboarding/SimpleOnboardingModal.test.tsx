import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { SimpleOnboardingModal } from "./SimpleOnboardingModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const dictionary: Record<string, string> = {
        "onboarding.simple.eyebrow": "Getting started",
        "onboarding.simple.title": `Start clean, ${String(options?.userName ?? "Nova")}`,
        "onboarding.simple.subtitle": "Two quick notes before you begin.",
        "onboarding.simple.dismissAria": "Close onboarding",
        "onboarding.simple.progress": `Step ${String(options?.current ?? 1)} of ${String(options?.total ?? 2)}`,
        "onboarding.simple.skip": "Skip",
        "onboarding.simple.back": "Back",
        "onboarding.simple.next": "Next",
        "onboarding.simple.createSpace": "Create a space",
        "onboarding.simple.steps.model.title": "ZAKI holds the relationship. Spaces hold the work.",
        "onboarding.simple.steps.model.body": "Model body",
        "onboarding.simple.steps.model.note": "Model note",
        "onboarding.simple.steps.spaces.title": "Each Space keeps its own context.",
        "onboarding.simple.steps.spaces.body": "Spaces body",
        "onboarding.simple.steps.spaces.note": "Spaces note",
      };
      return dictionary[key] || key;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

describe("SimpleOnboardingModal", () => {
  const onDismiss = jest.fn();
  const onComplete = jest.fn();
  const onCreateSpace = jest.fn();

  beforeEach(() => {
    onDismiss.mockReset();
    onComplete.mockReset();
    onCreateSpace.mockReset();
  });

  it("shows the simplified first step and advances to the second", () => {
    render(
      <SimpleOnboardingModal
        isOpen
        userName="Nova"
        onDismiss={onDismiss}
        onComplete={onComplete}
        onCreateSpace={onCreateSpace}
      />
    );

    expect(
      screen.getByText("ZAKI holds the relationship. Spaces hold the work.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Each Space keeps its own context.")).toBeInTheDocument();
  });

  it("lets users skip without creating a space", () => {
    render(
      <SimpleOnboardingModal
        isOpen
        userName="Nova"
        onDismiss={onDismiss}
        onComplete={onComplete}
        onCreateSpace={onCreateSpace}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onCreateSpace).not.toHaveBeenCalled();
  });

  it("completes and launches create space from the second step", () => {
    render(
      <SimpleOnboardingModal
        isOpen
        userName="Nova"
        onDismiss={onDismiss}
        onComplete={onComplete}
        onCreateSpace={onCreateSpace}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Create a space" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onCreateSpace).toHaveBeenCalledTimes(1);
  });
});
