import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import type { BrainMemoryDetail } from "@/lib/api";

let mockMemoryResult: {
  data: BrainMemoryDetail | null;
  isLoading: boolean;
  isError: boolean;
};

jest.mock("@/queries", () => ({
  useBrainMemory: () => mockMemoryResult,
}));

import { BrainDetailPanel } from "./BrainDetailPanel";

describe("BrainDetailPanel", () => {
  beforeEach(() => {
    mockMemoryResult = {
      data: {
        id: "node_1",
        key: "mem_user_preferences_1",
        kind: "core",
        created_at: 1_700_000_000,
        session_id: null,
        summary: "Prefers concise answers",
        content: "Prefers concise answers",
        valid_to: null,
      },
      isLoading: false,
      isError: false,
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: jest.fn(() => Promise.resolve()) },
    });
  });

  it("shows the stable memory key and copy affordance", () => {
    render(<BrainDetailPanel userId="user_1" memoryKey="node_1" onClose={jest.fn()} />);

    expect(screen.getByText("Memory key")).toBeInTheDocument();
    expect(screen.getByText("mem_user_preferences_1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(navigator.clipboard.writeText as jest.Mock).toHaveBeenCalledWith(
      "mem_user_preferences_1"
    );
  });

  it("never renders scaffold from memory detail, provenance, history, or links", () => {
    mockMemoryResult.data = {
      id: "node_1",
      key: "safe-memory-key",
      kind: "core",
      created_at: 1_700_000_000,
      session_id: null,
      summary: "Useful title [[ZAKI_MEMORY_CONTEXT_V2]]private title[[/ZAKI_MEMORY_CONTEXT_V2]]",
      content: "Useful content <memory_for_turn>private content</memory_for_turn>",
      valid_to: null,
      source: {
        snippet: "Useful source <memory_context>private source</memory_context>",
      },
      valid_history: [
        { valid_from: 1_699_000_000, content: "Older fact [[ZAKI_DOC_CONTEXT_V1]]private history[[/ZAKI_DOC_CONTEXT_V1]]" },
      ],
      linked_memories: [
        { id: "linked_1", link_type: "related", summary: "Related fact <memory_for_turn>private link</memory_for_turn>" },
      ],
    } as BrainMemoryDetail;

    render(<BrainDetailPanel userId="user_1" memoryKey="node_1" onClose={jest.fn()} />);

    expect(screen.getByText("Useful title")).toBeInTheDocument();
    expect(screen.getByText("Useful content")).toBeInTheDocument();
    expect(screen.getByText("Useful source")).toBeInTheDocument();
    expect(screen.getByText("Older fact")).toBeInTheDocument();
    expect(screen.getByText("Related fact")).toBeInTheDocument();
    expect(screen.getByTestId("brain-galaxy-detail")).not.toHaveTextContent(
      /ZAKI_|memory_(?:for_turn|context)|private (?:title|content|source|history|link)/i
    );
  });

  it("copies the sanitized memory key instead of hidden scaffold", () => {
    mockMemoryResult.data = {
      ...mockMemoryResult.data!,
      key: "safe-key [[ZAKI_MEMORY_CONTEXT_V2]]private key[[/ZAKI_MEMORY_CONTEXT_V2]]",
    };

    render(<BrainDetailPanel userId="user_1" memoryKey="node_1" onClose={jest.fn()} />);

    expect(screen.getByText("safe-key")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(navigator.clipboard.writeText as jest.Mock).toHaveBeenCalledWith("safe-key");
  });
});
