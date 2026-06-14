import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { SpaceSettingsSheet } from "./SpaceSettingsSheet";

const tMock = (key: string, options?: Record<string, unknown>) => {
  const dictionary: Record<string, string> = {
    "sidebar.spaceSettingsSubtitle": "Space settings",
    "settingsModal.footer.cancel": "Cancel",
    "settingsModal.footer.saveChanges": "Save changes",
    "sidebar.sharedContext": "Shared context",
    "sidebar.sharedContextSubtitle": "Instructions and documents for this Space",
    "sidebar.instructionsTitle": "Instructions",
    "sidebar.instructionsBody": "How should ZAKI answer in this Space?",
    "sidebar.knowledgeFilesTitle": "Knowledge files",
    "sidebar.knowledgeFilesBody": "Add files to this Space",
    "sidebar.filesBadge": "{{count}} files",
    "sidebar.workspaceFilesTitle": "Workspace files",
    "sidebar.removeAction": "Remove",
    "sidebar.removingAction": "Removing",
    "sidebar.workspaceFilesEmpty": "No files yet",
    "sidebar.dangerZone": "Danger zone",
    "sidebar.dangerZoneBody": "Permanent Space actions",
  };
  return (dictionary[key] || String(options?.defaultValue ?? key)).replace(
    "{{count}}",
    String(options?.count ?? "")
  );
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: {
      language: "en",
    },
  }),
}));

function renderSheet(overrides = {}) {
  const onSave = jest.fn();
  const onUploadFiles = jest.fn();
  const onRemoveFile = jest.fn();
  const onDelete = jest.fn();
  render(
    <SpaceSettingsSheet
      isOpen
      space={{
        id: "research",
        title: "Research Room",
        description: "Long-running research",
        icon: "R",
        color: "#d24430",
        instructions: "Prefer cited answers.",
        pinnedFiles: [
          {
            name: "strategy.pdf",
            type: "application/pdf",
            size: 1200,
            status: "embedded",
            location: "documents/strategy.pdf",
          },
        ],
        ...overrides,
      }}
      onClose={jest.fn()}
      onSave={onSave}
      onUploadFiles={onUploadFiles}
      onRemoveFile={onRemoveFile}
      onDelete={onDelete}
      removingDocumentKey={null}
      fileStatusTone={{
        embedded: { chip: "embedded", label: "Embedded" },
        processing: { chip: "processing", label: "Processing" },
        failed: { chip: "failed", label: "Failed" },
      }}
    />
  );
  return { onSave, onUploadFiles, onRemoveFile, onDelete };
}

describe("SpaceSettingsSheet", () => {
  it("edits local Space identity, instructions, files, and delete controls in-product", () => {
    const { onSave, onUploadFiles, onRemoveFile } = renderSheet();

    fireEvent.change(screen.getByLabelText("Space name"), {
      target: { value: "Research Lab" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Evidence workspace" },
    });
    fireEvent.change(screen.getByLabelText("Icon"), {
      target: { value: "RL" },
    });
    fireEvent.change(screen.getByLabelText("Color"), {
      target: { value: "#2266aa" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Prefer numbered citations." },
    });

    const uploadButton = screen.getByText("Knowledge files").closest("button");
    expect(uploadButton).not.toBeNull();
    fireEvent.click(uploadButton as HTMLButtonElement);
    expect(onUploadFiles).toHaveBeenCalledTimes(1);

    expect(screen.getByText("strategy.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemoveFile).toHaveBeenCalledWith(
      expect.objectContaining({ location: "documents/strategy.pdf" })
    );

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith({
      title: "Research Lab",
      description: "Evidence workspace",
      icon: "RL",
      color: "#2266aa",
      instructions: "Prefer numbered citations.",
    });

    expect(screen.queryByText("Memory controls")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete space" })).toBeInTheDocument();
  });
});
