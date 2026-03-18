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

  it("disables dismiss, undo, and review actions while processing", () => {
    const onDismiss = jest.fn();
    const onUndo = jest.fn();
    const onReview = jest.fn();

    render(
      <MemoryCaptureToast
        position={position}
        tone="review"
        savedCount={1}
        reviewCount={1}
        conflictCount={0}
        processing
        onUndo={onUndo}
        onReview={onReview}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole("button", { name: "Dismiss memory rail" });
    const undoButton = screen.getByRole("button", { name: "Undo" });
    const reviewButton = screen.getByRole("button", { name: "Review" });

    expect(dismissButton).toBeDisabled();
    expect(undoButton).toBeDisabled();
    expect(reviewButton).toBeDisabled();

    fireEvent.click(dismissButton);
    fireEvent.click(undoButton);
    fireEvent.click(reviewButton);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
    expect(onReview).not.toHaveBeenCalled();
  });

  it("restores interactivity after processing completes", () => {
    const onDismiss = jest.fn();
    const onUndo = jest.fn();
    const onReview = jest.fn();
    const { rerender } = render(
      <MemoryCaptureToast
        position={position}
        tone="review"
        savedCount={1}
        reviewCount={1}
        conflictCount={0}
        processing
        onUndo={onUndo}
        onReview={onReview}
        onDismiss={onDismiss}
      />
    );

    rerender(
      <MemoryCaptureToast
        position={position}
        tone="review"
        savedCount={1}
        reviewCount={1}
        conflictCount={0}
        processing={false}
        onUndo={onUndo}
        onReview={onReview}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss memory rail" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
