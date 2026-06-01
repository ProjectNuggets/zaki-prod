import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AgentArtifactCanvas } from "./AgentArtifactCanvas";

jest.mock("@/lib/api", () => ({
  downloadAgentExportFile: jest.fn(),
  exportAgentArtifact: jest.fn(),
  fetchAgentArtifact: jest.fn(),
  normalizeAgentArtifactShareUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  normalizeAgentExportDownloadUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  shareAgentArtifact: jest.fn(),
}));

const fetchAgentArtifactMock = jest.requireMock("@/lib/api").fetchAgentArtifact as jest.Mock;
const exportAgentArtifactMock = jest.requireMock("@/lib/api").exportAgentArtifact as jest.Mock;
const downloadAgentExportFileMock = jest.requireMock("@/lib/api").downloadAgentExportFile as jest.Mock;

describe("AgentArtifactCanvas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchAgentArtifactMock.mockResolvedValue({
      response: { ok: true },
      data: {
        id: "artifact-1",
        title: "Research report",
        type: "markdown",
        content: "# Research report\n\nThe generated document is ready.",
      },
    });
    exportAgentArtifactMock.mockResolvedValue({
      response: { ok: true },
      data: { download_url: "/api/agent/exports/research-report.pdf" },
    });
    downloadAgentExportFileMock.mockResolvedValue({ filename: "Research_report.pdf", bytes: 12 });
  });

  it("loads a readable artifact preview and downloads exports through the BFF URL", async () => {
    render(
      <AgentArtifactCanvas
        artifact={{
          id: "artifact-1",
          title: "Research report",
          type: "markdown",
          version: 2,
          updatedAt: 1_800_000_000_000,
        }}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(fetchAgentArtifactMock).toHaveBeenCalledWith("artifact-1");
      expect(screen.getByTestId("agent-artifact-canvas")).toHaveTextContent(
        "The generated document is ready."
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    await waitFor(() => {
      expect(exportAgentArtifactMock).toHaveBeenCalledWith("artifact-1", "pdf");
      expect(downloadAgentExportFileMock).toHaveBeenCalledWith(
        "/api/agent/exports/research-report.pdf",
        "Research_report.pdf"
      );
    });
  });
});
