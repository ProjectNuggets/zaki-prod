import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PinContextSheet } from "./PinContextSheet";
import type { BrainGraphNode, BrainMemoryDetail } from "@/lib/api";

jest.mock("@/queries/useBrainSearch", () => ({
  useBrainSearch: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  fetchBrainMemory: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      typeof options?.defaultValue === "string" ? options.defaultValue : key,
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const useBrainSearchMock = jest.requireMock("@/queries/useBrainSearch")
  .useBrainSearch as jest.Mock;
const fetchBrainMemoryMock = jest.requireMock("@/lib/api").fetchBrainMemory as jest.Mock;

const searchResult: BrainGraphNode = {
  id: "memory-1",
  key: "coffee-preference",
  kind: "core",
  created_at: 1,
  session_id: null,
  summary: "Useful summary",
  display_label: "Coffee preference",
  valid_to: null,
};

function renderSheet(onPin = jest.fn()) {
  render(
    <PinContextSheet
      isOpen
      onClose={jest.fn()}
      agentUserId="user-1"
      pins={[]}
      onPin={onPin}
      onUnpin={jest.fn()}
      limit={6}
    />,
  );
  return onPin;
}

describe("PinContextSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBrainSearchMock.mockReturnValue({
      data: { results: [searchResult] },
      isLoading: false,
    });
  });

  it("pins only user-facing detail content", async () => {
    const onPin = renderSheet();
    const detail: BrainMemoryDetail = {
      id: "memory-1",
      key: "coffee-preference",
      kind: "core",
      created_at: 1,
      session_id: null,
      summary: "Useful summary",
      content:
        "Coffee should be single-origin. [[ZAKI_MEMORY_CONTEXT_V2]]internal prompt fuel[[/ZAKI_MEMORY_CONTEXT_V2]]",
      valid_to: null,
    };
    fetchBrainMemoryMock.mockResolvedValue(detail);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "co" } });
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));

    await waitFor(() => {
      expect(onPin).toHaveBeenCalledWith({
        id: "memory-1",
        label: "Coffee preference",
        content: "Coffee should be single-origin.",
      });
    });
  });

  it("sanitizes the search-summary fallback when the detail fetch fails", async () => {
    useBrainSearchMock.mockReturnValue({
      data: {
        results: [
          {
            ...searchResult,
            summary:
              "Fallback summary <memory_for_turn>internal prompt fuel</memory_for_turn>",
            display_label:
              "[[ZAKI_MEMORY_CONTEXT_V2]]internal label[[/ZAKI_MEMORY_CONTEXT_V2]]",
          },
        ],
      },
      isLoading: false,
    });
    fetchBrainMemoryMock.mockRejectedValue(new Error("not found"));
    const onPin = renderSheet();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "co" } });
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));

    await waitFor(() => {
      expect(onPin).toHaveBeenCalledWith({
        id: "memory-1",
        label: "Fallback summary",
        content: "Fallback summary",
      });
    });
  });

  it("does not persist scaffold-only detail content", async () => {
    const onPin = renderSheet();
    fetchBrainMemoryMock.mockResolvedValue({
      id: "memory-1",
      key: "coffee-preference",
      kind: "core",
      created_at: 1,
      session_id: null,
      summary: "Useful summary",
      content: "<reflection>internal prompt fuel</reflection>",
      valid_to: null,
    } satisfies BrainMemoryDetail);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "co" } });
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));

    await waitFor(() => {
      expect(onPin).toHaveBeenCalledWith({
        id: "memory-1",
        label: "Coffee preference",
        content: undefined,
      });
    });
  });
});
