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
});
