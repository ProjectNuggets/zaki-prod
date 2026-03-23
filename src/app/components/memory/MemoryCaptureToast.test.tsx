import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryCaptureToast } from "./MemoryCaptureToast";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === "memory.savedSingle") return "Memory updated";
      if (key === "memory.savedMultiple") return `Saved ${options?.count ?? 0} memories`;
      if (key === "memory.reviewNotice") return "Something may be worth remembering";
      if (key === "memory.conflictNotice") return "A memory may conflict with what ZAKI already knows";
      if (key === "memory.reviewPendingHelper")
        return `${options?.count ?? 0} memories need review before ZAKI keeps them.`;
      if (key === "memory.reviewConflictsHelper")
        return `${options?.count ?? 0} possible conflicts need your decision.`;
      if (key === "memory.savedHelper") return "You can undo it now or open memory any time.";
      if (key === "memory.undo") return "Undo";
      if (key === "memory.undoRetry") return "Retry undo";
      if (key === "memory.review") return "Review";
      if (key === "memory.open") return "Open memory";
      if (key === "memory.dismiss") return "Dismiss";
      if (key === "memory.later") return "Later";
      if (key === "memory.undoPartialError") return `${options?.count ?? 0} memory could not be undone.`;
      if (key === "memory.dismissAria") return "Dismiss memory notice";
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
        onOpenMemory={() => {}}
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
    const onOpenMemory = jest.fn();

    render(
      <MemoryCaptureToast
        position={position}
        tone="saved"
        savedCount={1}
        reviewCount={0}
        conflictCount={0}
        processing
        onUndo={onUndo}
        onOpenMemory={onOpenMemory}
        onDismiss={onDismiss}
      />
    );

    const undoButton = screen.getByRole("button", { name: "Undo" });
    const openButton = screen.getByRole("button", { name: "Open memory" });

    expect(undoButton).toBeDisabled();
    expect(openButton).toBeDisabled();

    fireEvent.click(undoButton);
    fireEvent.click(openButton);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
    expect(onOpenMemory).not.toHaveBeenCalled();
  });

  it("restores interactivity after processing completes", () => {
    const onDismiss = jest.fn();
    const onReview = jest.fn();
    const { rerender } = render(
      <MemoryCaptureToast
        position={position}
        tone="conflict"
        savedCount={0}
        reviewCount={1}
        conflictCount={1}
        processing
        onReview={onReview}
        onDismiss={onDismiss}
      />
    );

    rerender(
      <MemoryCaptureToast
        position={position}
        tone="conflict"
        savedCount={0}
        reviewCount={1}
        conflictCount={1}
        processing={false}
        onReview={onReview}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
