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
    return match ? `/artifact/${match[1]}` : value.trim();
  },
  normalizeAgentExportDownloadUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  revokeAgentArtifactShare: jest.fn(),
  shareAgentArtifact: jest.fn(),
  updateAgentArtifact: jest.fn(),
}));

const fetchAgentArtifactMock = jest.requireMock("@/lib/api").fetchAgentArtifact as jest.Mock;
const fetchAgentArtifactHistoryMock = jest.requireMock("@/lib/api").fetchAgentArtifactHistory as jest.Mock;
const exportAgentArtifactMock = jest.requireMock("@/lib/api").exportAgentArtifact as jest.Mock;
const downloadAgentExportFileMock = jest.requireMock("@/lib/api").downloadAgentExportFile as jest.Mock;
const revokeAgentArtifactShareMock = jest.requireMock("@/lib/api").revokeAgentArtifactShare as jest.Mock;
const updateAgentArtifactMock = jest.requireMock("@/lib/api").updateAgentArtifact as jest.Mock;

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
    revokeAgentArtifactShareMock.mockResolvedValue({
      response: { ok: true },
      data: { ok: true },
    });
    updateAgentArtifactMock.mockResolvedValue({
      response: { ok: true },
      data: {
        artifact: {
          id: "artifact-1",
          title: "Research report",
          kind: "markdown",
          current_version: 3,
        },
        content: "# Research report\n\nUpdated body.",
      },
    });
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
        "/artifact/abc12345def67890"
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

    expect(screen.queryByRole("button", { name: /Export PPTX/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Export DOCX/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Export HTML/i })).not.toBeInTheDocument();
  });

  it("saves canvas edits with a readable change summary", async () => {
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
      expect(screen.getByTestId("agent-artifact-canvas")).toHaveTextContent(
        "The generated document is ready."
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /^Edit$/i }));
    fireEvent.change(screen.getByLabelText("Artifact content"), {
      target: { value: "# Research report\n\nUpdated body." },
    });
    expect(screen.getByTestId("agent-artifact-edit-preview")).toHaveTextContent("Updated body.");
    fireEvent.change(screen.getByLabelText("Change summary"), {
      target: { value: "Tightened the report body" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save version" }));

    await waitFor(() => {
      expect(updateAgentArtifactMock).toHaveBeenCalledWith("artifact-1", {
        content: "# Research report\n\nUpdated body.",
        change_summary: "Tightened the report body",
      });
    });
  });

  it("drafts an agent revision request for the current artifact", async () => {
    const onRequestAgentEdit = jest.fn();
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
        onRequestAgentEdit={onRequestAgentEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("agent-artifact-canvas")).toHaveTextContent(
        "The generated document is ready."
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Ask ZAKI" }));

    expect(onRequestAgentEdit).toHaveBeenCalledTimes(1);
    const draft = onRequestAgentEdit.mock.calls[0]?.[0] as string;
    expect(draft).toContain("update the same artifact, not a new one");
    expect(draft).toContain("Artifact id: artifact-1");
    expect(draft).toContain("Current version: v2");
    expect(draft).toContain("call artifact_update with a complete replacement content body");
    expect(draft).toContain("Make the revision share-ready");
    expect(draft).toContain("The generated document is ready.");
  });

  it("treats Versions as a real workspace mode", async () => {
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
      expect(screen.getByTestId("agent-artifact-canvas")).toHaveTextContent(
        "The generated document is ready."
      );
    });

    expect(screen.queryByTestId("agent-artifact-history")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Versions" }));

    expect(screen.getByTestId("agent-artifact-history")).toBeInTheDocument();
    expect(screen.getByTestId("agent-artifact-history-mode")).toHaveTextContent(
      "Version workspace"
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.queryByTestId("agent-artifact-history")).not.toBeInTheDocument();
  });

  it("renders HTML artifacts in a sandboxed preview frame", async () => {
    fetchAgentArtifactMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        artifact: {
          id: "artifact-1",
          title: "Landing page",
          kind: "html",
          current_version: 1,
        },
        content:
          '<!doctype html><html><body><main><h1>Launch brief</h1><button>Share</button></main></body></html>',
      },
    });

    render(
      <AgentArtifactCanvas
        artifact={{
          id: "artifact-1",
          title: "Landing page",
          type: "html",
          version: 1,
          updatedAt: 1_800_000_000_000,
        }}
        onClose={() => {}}
      />
    );

    const frame = await screen.findByTestId("agent-artifact-frame-preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("Launch brief"));
    expect(screen.queryByText("<!doctype html>")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Edit$/i }));
    fireEvent.change(screen.getByLabelText("Artifact content"), {
      target: {
        value:
          '<!doctype html><html><body><main><h1>Edited launch page</h1><button>Publish</button></main></body></html>',
      },
    });

    const editFrame = screen.getByTestId("agent-artifact-edit-frame-preview");
    expect(editFrame).toHaveAttribute("sandbox", "");
    expect(editFrame).toHaveAttribute("srcdoc", expect.stringContaining("Edited launch page"));
  });

  it("revokes a public artifact share link from the delivery rail", async () => {
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
      expect(screen.getByRole("link", { name: "Open shared artifact" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Stop sharing" }));

    await waitFor(() => {
      expect(revokeAgentArtifactShareMock).toHaveBeenCalledWith("artifact-1");
      expect(screen.queryByRole("link", { name: "Open shared artifact" })).not.toBeInTheDocument();
      expect(screen.getByText("Create a public link")).toBeInTheDocument();
    });
  });
});
