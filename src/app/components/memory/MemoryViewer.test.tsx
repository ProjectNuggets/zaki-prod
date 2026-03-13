import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryViewer } from "./MemoryViewer";
import { apiRequest } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number; value?: number }) => {
      if (key === "memoryViewer.tabs.memories") return `Memories (${options?.count ?? 0})`;
      if (key === "memoryViewer.tabs.pending") return `Pending (${options?.count ?? 0})`;
      if (key === "memoryViewer.tabs.conflicts") return `Conflicts (${options?.count ?? 0})`;
      if (key === "memoryViewer.pending.emptyTitle") return "Nothing needs review";
      if (key === "memoryViewer.conflicts.emptyTitle") return "No conflicts";
      if (key === "memoryViewer.memories.emptyTitle") return "No memories yet";
      if (key === "memoryViewer.pending.loading") return "Loading review";
      if (key === "memoryViewer.conflicts.loading") return "Loading conflicts";
      if (key === "memoryViewer.errors.fetchMemories") return "fetch memories failed";
      if (key === "memoryViewer.errors.fetchPending") return "fetch pending failed";
      if (key === "memoryViewer.errors.fetchConflicts") return "fetch conflicts failed";
      if (key === "memoryViewer.errors.loadMemories") return "load memories failed";
      if (key === "memoryViewer.errors.loadPending") return "load pending failed";
      if (key === "memoryViewer.errors.loadConflicts") return "load conflicts failed";
      return key;
    },
    i18n: {
      language: "en",
      dir: () => "ltr",
    },
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response;
}

describe("MemoryViewer", () => {
  beforeEach(() => {
    (apiRequest as jest.Mock).mockReset();
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
      if (String(path).startsWith("/api/memory/list")) {
        return Promise.resolve(
          jsonResponse({
            memories: [],
            nextCursor: null,
            hasMore: false,
          })
        );
      }
      if (path === "/api/memory/confirmations") {
        return Promise.resolve(jsonResponse({ confirmations: [] }));
      }
      if (path === "/api/memory/conflicts") {
        return Promise.resolve(jsonResponse({ conflicts: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });
  });

  it("opens directly to the pending tab when requested", async () => {
    render(<MemoryViewer userId="tester@example.com" initialTab="pending" />);

    await waitFor(() => {
      expect(screen.getByText("Nothing needs review")).toBeInTheDocument();
    });
  });

  it("switches to a later requested tab on rerender", async () => {
    const { rerender } = render(
      <MemoryViewer userId="tester@example.com" initialTab="memories" />
    );

    await waitFor(() => {
      expect(screen.getByText("No memories yet")).toBeInTheDocument();
    });

    rerender(<MemoryViewer userId="tester@example.com" initialTab="conflicts" />);

    await waitFor(() => {
      expect(screen.getByText("No conflicts")).toBeInTheDocument();
    });
  });
});
