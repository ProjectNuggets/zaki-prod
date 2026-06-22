import { describe, expect, it } from "@jest/globals";
import {
  PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS,
  getAgentArtifactExportAvailability,
  getAgentArtifactExportFormatLabel,
} from "./agentArtifactSurface";

describe("agentArtifactSurface", () => {
  it("publishes only PDF as a user-facing export format", () => {
    expect(PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS).toEqual(["pdf"]);
    expect(getAgentArtifactExportFormatLabel("pdf")).toBe("PDF");
  });

  it("does not infer document export support from titles", () => {
    expect(
      getAgentArtifactExportAvailability(
        { id: "a1", title: "PDF board report", type: "markdown" },
        "pdf"
      )
    ).toEqual({ supported: true });
    expect(
      getAgentArtifactExportAvailability(
        { id: "a1", title: "Board report", type: "markdown" },
        "xlsx"
      )
    ).toEqual({
      supported: false,
      reason: "XLSX export is available for spreadsheet or tabular artifacts.",
    });
    expect(
      getAgentArtifactExportAvailability(
        { id: "a1", title: "Board report", type: "spreadsheet" },
        "xlsx"
      )
    ).toEqual({ supported: true });
  });

  it("disables formats only when explicit artifact metadata says so", () => {
    expect(
      getAgentArtifactExportAvailability(
        {
          id: "a1",
          supported_formats: ["html"],
        },
        "pdf"
      )
    ).toEqual({
      supported: false,
      reason: "PDF export is not available for this artifact.",
    });
    expect(
      getAgentArtifactExportAvailability(
        {
          id: "a2",
          title: "Board report",
          type: "markdown",
          supported_formats: ["html", "pdf", "docx"],
          export_unavailable_reasons: {
            xlsx: "XLSX export is not enabled for this artifact.",
          },
        },
        "xlsx"
      )
    ).toEqual({
      supported: false,
      reason: "XLSX export is not enabled for this artifact.",
    });
    expect(
      getAgentArtifactExportAvailability(
        {
          id: "a3",
          export_availability: {
            pptx: { supported: false, reason: "Deck renderer disabled." },
          },
        },
        "pptx"
      )
    ).toEqual({ supported: false, reason: "Deck renderer disabled." });
  });
});
