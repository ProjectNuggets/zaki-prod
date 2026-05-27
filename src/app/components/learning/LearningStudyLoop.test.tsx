import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  LearningNextActionRow,
  LearningStudyPlanHome,
  LearningStudySetupPanel,
  STUDY_PROFILE_STORAGE_KEY,
  readLearningStudyProfile,
  writeLearningStudyProfile,
  type LearningStudyProfile,
} from "./LearningStudyLoop";

const profile: LearningStudyProfile = {
  course: "Calculus II",
  examDate: "2026-06-15",
  topics: "series, integrals",
  goal: "Pass the final",
  weakTopics: "series",
  weeklyHours: "6",
  difficulty: "medium",
  preferredStyle: "practice",
};

describe("Learning study loop V2 contract", () => {
  it("renders the collapsed study setup as dense V2 workflow chrome", () => {
    const onOpenChange = jest.fn();

    render(
      <LearningStudySetupPanel
        profile={profile}
        savedProfile={profile}
        open={false}
        onOpenChange={onOpenChange}
        onChange={jest.fn()}
        onSave={jest.fn()}
        onBuildPlan={jest.fn()}
        notebooksCount={2}
      />
    );

    expect(screen.getByText("Calculus II")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toHaveClass("v2-btn");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("keeps study setup actions focused on learner preferences", () => {
    const onSave = jest.fn();
    const onBuildPlan = jest.fn();

    render(
      <LearningStudySetupPanel
        profile={profile}
        savedProfile={profile}
        open
        onOpenChange={jest.fn()}
        onChange={jest.fn()}
        onSave={onSave}
        onBuildPlan={onBuildPlan}
        notebooksCount={1}
      />
    );

    expect(screen.getByText("Study setup")).toBeInTheDocument();
    expect(screen.queryByText(/billing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/OAuth/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save setup" }));
    fireEvent.click(screen.getByRole("button", { name: "Build study plan" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onBuildPlan).toHaveBeenCalledTimes(1);
  });

  it("renders the first empty state as the real study-plan workflow", () => {
    const onOpenSetup = jest.fn();
    const onBuildPlan = jest.fn();

    render(
      <LearningStudyPlanHome
        plan={null}
        onBuildPlan={onBuildPlan}
        onOpenSetup={onOpenSetup}
        onStartTask={jest.fn()}
        onCompleteTask={jest.fn()}
      />
    );

    expect(screen.getByText("Start with a plan")).toBeInTheDocument();
    expect(screen.getByText(/course, exam date, weak topics/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure setup" })).toHaveClass("v2-btn");
    fireEvent.click(screen.getByRole("button", { name: "Build study plan" }));
    expect(onBuildPlan).toHaveBeenCalledTimes(1);
  });

  it("keeps learner profile storage under the Learn namespace", () => {
    window.localStorage.clear();
    writeLearningStudyProfile(profile);

    expect(STUDY_PROFILE_STORAGE_KEY).toMatch(/^zaki\.learn\./);
    expect(window.localStorage.getItem(STUDY_PROFILE_STORAGE_KEY)).toContain("Calculus II");
    expect(window.localStorage.getItem("zaki.agent.studyProfile.v1")).toBeNull();
    expect(readLearningStudyProfile().course).toBe("Calculus II");
  });

  it("exposes post-answer actions without enabling notebook save when no notebook exists", () => {
    const onAction = jest.fn();
    render(<LearningNextActionRow canSave={false} onAction={onAction} />);

    expect(screen.getByRole("button", { name: "Save to notebook" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Make quiz" }));
    expect(onAction).toHaveBeenCalledWith("quiz");
  });
});
