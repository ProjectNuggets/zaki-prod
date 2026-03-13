import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryCaptureToast } from "./MemoryCaptureToast";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === "memory.savedSingle") return "Saved to memory";
      if (key === "memory.savedMultiple") return `Saved ${options?.count ?? 0} memories`;
      if (key === "memory.reviewNotice") return `${options?.count ?? 0} item needs review`;
      if (key === "memory.conflictNotice") return `${options?.count ?? 0} conflict needs review`;
      if (key === "memory.reviewPendingHelper") return `${options?.count ?? 0} item is waiting in review.`;
      if (key === "memory.reviewConflictsHelper") return `${options?.count ?? 0} conflict needs your decision.`;
      if (key === "memory.manageAnytime") return "You can review or delete memories anytime.";
      if (key === "memory.undo") return "Undo";
      if (key === "memory.undoRetry") return "Retry undo";
      if (key === "memory.review") return "Review";
      if (key === "memory.undoPartialError") return `${options?.count ?? 0} memory could not be undone.`;
      if (key === "memory.dismissAria") return "Dismiss memory rail";
      return key;
    },
  }),
}));

describe("MemoryCaptureToast", () => {
  const position = { left: 0, width: 320, bottom: 16 };

  it("shows retry copy when undo has failed", () => {
    render(
      <MemoryCaptureToast
        position={position}
        tone="saved"
        savedCount={1}
        reviewCount={0}
        conflictCount={0}
        undoError="Undo failed. The memory is still saved."
        onUndo={() => {}}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText("Undo failed. The memory is still saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry undo" })).toBeInTheDocument();
  });

  it("keeps review action available during partial undo failure", () => {
    const onReview = jest.fn();

    render(
      <MemoryCaptureToast
        position={position}
        tone="conflict"
        savedCount={1}
        reviewCount={0}
        conflictCount={2}
        partialUndoCount={1}
        undoError="1 memory could not be undone."
        onUndo={() => {}}
        onReview={onReview}
        onDismiss={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
