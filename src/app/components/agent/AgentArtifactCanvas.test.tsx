import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AgentArtifactCanvas } from "./AgentArtifactCanvas";

jest.mock("@/lib/api", () => ({
  downloadAgentExportFile: jest.fn(),
  exportAgentArtifact: jest.fn(),
  fetchAgentArtifact: jest.fn(),
  fetchAgentArtifactDiff: jest.fn(),
  fetchAgentArtifactHistory: jest.fn(),
  normalizeAgentArtifactShareUrl: (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return null;
    const match = value.trim().match(/^\/api\/v1\/share\/artifact\/([A-Za-z0-9_-]{8,})$/);
    return match ? `/api/agent/share/artifact/${match[1]}` : value.trim();
  },
  normalizeAgentExportDownloadUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  shareAgentArtifact: jest.fn(),
  updateAgentArtifact: jest.fn(),
}));

const fetchAgentArtifactMock = jest.requireMock("@/lib/api").fetchAgentArtifact as jest.Mock;
const fetchAgentArtifactHistoryMock = jest.requireMock("@/lib/api").fetchAgentArtifactHistory as jest.Mock;
const exportAgentArtifactMock = jest.requireMock("@/lib/api").exportAgentArtifact as jest.Mock;
const downloadAgentExportFileMock = jest.requireMock("@/lib/api").downloadAgentExportFile as jest.Mock;

describe("AgentArtifactCanvas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchAgentArtifactMock.mockResolvedValue({
      response: { ok: true },
      data: {
        artifact: {
          id: "artifact-1",
          title: "Research report",
          kind: "markdown",
          current_version: 2,
          share_code: "abc12345def67890",
        },
        version: 2,
        author: "agent",
        content: "# Research report\n\nThe generated document is ready.",
      },
    });
    fetchAgentArtifactHistoryMock.mockResolvedValue({
      response: { ok: true },
      data: {
        items: [
          {
            id: "artifact-1",
            title: "Research report",
            type: "markdown",
            version: 2,
            content: "# Research report",
            updated_at: 1_800_000_000,
          },
        ],
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
      expect(screen.getByRole("link", { name: "Open shared artifact" })).toHaveAttribute(
        "href",
        "/api/agent/share/artifact/abc12345def67890"
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

    fireEvent.click(screen.getByRole("button", { name: /Export PPTX/i }));

    await waitFor(() => {
      expect(exportAgentArtifactMock).toHaveBeenCalledWith("artifact-1", "pptx");
      expect(downloadAgentExportFileMock).toHaveBeenCalledWith(
        "/api/agent/exports/research-report.pdf",
        "Research_report.pptx"
      );
    });
  });
});
