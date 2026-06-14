import { describe, expect, it } from "@jest/globals";

import {
  buildLocalWorkspaceMetadataPayload,
  buildWorkspaceMutationPayload,
  extractWorkspaceFromUpstream,
  mergeWorkspaceMetadata,
} from "./workspace-settings-contract.js";

describe("workspace settings BFF contract", () => {
  it("forwards workspace name and instructions to the upstream engine payload", () => {
    expect(
      buildWorkspaceMutationPayload({
        title: " Research Room ",
        instructions: " Cite uploaded docs first. ",
      })
    ).toEqual({
      name: "Research Room",
      openAiPrompt: "Cite uploaded docs first.",
    });
  });

  it("prefers upstream route field names when both aliases are supplied", () => {
    expect(
      buildWorkspaceMutationPayload({
        name: "Ops",
        title: "Ignored title",
        openAiPrompt: "Use the support runbook.",
        instructions: "Ignored instructions",
        openAiTemp: "0.2",
        openAiHistory: "8",
      })
    ).toEqual({
      name: "Ops",
      openAiPrompt: "Use the support runbook.",
      openAiTemp: 0.2,
      openAiHistory: 8,
    });
  });

  it("preserves description, icon, and color as local workspace metadata", () => {
    expect(
      buildLocalWorkspaceMetadataPayload({
        description: " Customer-facing research ",
        icon: " R ",
        color: " #2266aa ",
      })
    ).toEqual({
      description: "Customer-facing research",
      icon: "R",
      color: "#2266aa",
    });
  });

  it("ignores unsupported-only workspace update fields", () => {
    const unsupported = {
      model: "gpt-4.1",
      router: "anythingllm",
      embeddingProvider: "local",
    };

    expect(buildWorkspaceMutationPayload(unsupported)).toEqual({});
    expect(buildLocalWorkspaceMetadataPayload(unsupported)).toEqual({});
  });

  it("merges local metadata over upstream workspace values without losing engine fields", () => {
    expect(
      mergeWorkspaceMetadata(
        {
          slug: "research-room",
          name: "Research Room",
          description: "Old description",
          icon: "O",
          color: "#111111",
          openAiPrompt: "Cite uploaded docs first.",
        },
        {
          description: "Customer-facing research",
          icon: "R",
          color: "#2266aa",
        }
      )
    ).toEqual({
      slug: "research-room",
      name: "Research Room",
      description: "Customer-facing research",
      icon: "R",
      color: "#2266aa",
      openAiPrompt: "Cite uploaded docs first.",
    });
  });

  it("extracts upstream workspace payloads from both supported response shapes", () => {
    expect(extractWorkspaceFromUpstream({ workspace: [{ slug: "alpha" }] })).toEqual({
      slug: "alpha",
    });
    expect(extractWorkspaceFromUpstream({ workspace: { slug: "beta" } })).toEqual({
      slug: "beta",
    });
  });
});
