import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryCaptureToast } from "./MemoryCaptureToast";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === "memory.savedSingle") return "Memory updated";
      if (key === "memory.savedMultiple") return `Saved ${options?.count ?? 0} memories`;
      if (key === "memory.updatedSingle") return "Memory updated";
      if (key === "memory.savedHelper") return "You can undo it now or open memory any time.";
      if (key === "memory.importedTitle") return `I now remember ${options?.count ?? 0} details from your import`;
      if (key === "memory.importedHelper") {
        return `${options?.saved ?? 0} new · ${options?.updated ?? 0} updated · ${options?.known ?? 0} known`;
      }
      if (key === "memory.undo") return "Undo";
      if (key === "memory.undoRetry") return "Retry undo";
      if (key === "memory.open") return "Open memory";
      if (key === "memory.dismiss") return "Dismiss";
      if (key === "memory.undoPartialError") return `${options?.count ?? 0} memory could not be undone.`;
      return key;
    },
  }),
}));

describe("MemoryCaptureToast", () => {
  const position = { left: 0, width: 320, bottom: 16 };

  it("shows the saved-multiple title when several memories were saved", () => {
    render(
      <MemoryCaptureToast
        position={position}
        savedCount={3}
        onUndo={() => {}}
        onOpenMemory={() => {}}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText("Saved 3 memories")).toBeInTheDocument();
  });

  it("confirms the real absorption count for a memory import", () => {
    render(
      <MemoryCaptureToast
        position={position}
        source="import"
        savedCount={3}
        supersededCount={1}
        duplicateCount={2}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText("I now remember 5 details from your import")).toBeInTheDocument();
    expect(screen.getByText("2 new · 1 updated · 2 known")).toBeInTheDocument();

    const confirmation = screen.getByRole("status");
    const placement = confirmation.closest(".fixed");
    expect(confirmation.querySelector("button")).toBeNull();
    expect(confirmation.parentElement).toHaveClass("bg-zaki-raised/95", "dark:bg-[#141210]/95");
    expect(placement).toHaveClass("left-1/2", "top-1/2", "-translate-x-1/2", "-translate-y-1/2");
    expect(placement).not.toHaveStyle({ left: "0px", width: "320px", bottom: "16px" });
  });

  it("shows retry copy when undo has failed", () => {
    render(
      <MemoryCaptureToast
        position={position}
        savedCount={1}
        undoError="Undo failed. The memory is still saved."
        onUndo={() => {}}
        onOpenMemory={() => {}}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText("Undo failed. The memory is still saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry undo" })).toBeInTheDocument();
  });

  it("disables undo and open actions while processing", () => {
    const onDismiss = jest.fn();
    const onUndo = jest.fn();
    const onOpenMemory = jest.fn();

    render(
      <MemoryCaptureToast
        position={position}
        savedCount={1}
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

    expect(onUndo).not.toHaveBeenCalled();
    expect(onOpenMemory).not.toHaveBeenCalled();
  });

  it("restores interactivity after processing completes", () => {
    const onDismiss = jest.fn();
    const onUndo = jest.fn();
    const { rerender } = render(
      <MemoryCaptureToast
        position={position}
        savedCount={1}
        processing
        onUndo={onUndo}
        onDismiss={onDismiss}
      />
    );

    rerender(
      <MemoryCaptureToast
        position={position}
        savedCount={1}
        processing={false}
        onUndo={onUndo}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
