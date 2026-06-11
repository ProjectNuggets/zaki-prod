import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { MemoryViewer } from "./MemoryViewer";
import { MEMORY_PANEL_REFRESH_EVENTS } from "@/lib/memoryEvents";
import {
  apiRequest,
  fetchMemoryPreferences,
  patchMemory,
  updateMemoryPreferences,
} from "@/lib/api";

// Counts how many times the saved-memories list endpoint has been fetched.
// This is the real refetch sentinel now that the activity-log timeline is gone.
function memoryListCalls() {
  return (apiRequest as jest.Mock).mock.calls.filter((call) =>
    String(call[0]).startsWith("/api/memory/list")
  ).length;
}

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
  fetchMemoryPreferences: jest.fn(),
  updateMemoryPreferences: jest.fn(),
  patchMemory: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number; value?: number }) => {
      if (key === "memoryViewer.notebook.title") return "What ZAKI currently knows";
      if (key === "memoryViewer.notebook.groups.preferences.title") return "Preferences";
      if (key === "memoryViewer.notebook.groups.recent_changes.title") return "Recent changes";
      if (key === "memoryViewer.tabs.memories") return `Saved memories (${options?.count ?? 0})`;
      if (key === "memoryViewer.panel.tabs.facts") return "Facts";
      if (key === "memoryViewer.panel.tabs.timeline") return "Timeline";
      if (key === "memoryViewer.notebook.groups.about_you.title") return "About you";
      if (key === "memoryViewer.notebook.groups.ongoing_work.title") return "Ongoing work";
      if (key === "memoryViewer.notebook.groups.relationships.title") return "Relationships";
      if (key === "memoryViewer.memories.emptyTitle") return "No memories yet";
      if (key === "memoryViewer.errors.fetchMemories") return "fetch memories failed";
      if (key === "memoryViewer.errors.loadMemories") return "load memories failed";
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
    (fetchMemoryPreferences as jest.Mock).mockReset();
    (updateMemoryPreferences as jest.Mock).mockReset();
    (patchMemory as jest.Mock).mockReset();
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
      return Promise.resolve(jsonResponse({}));
    });
    (fetchMemoryPreferences as jest.Mock).mockResolvedValue({
      response: jsonResponse({ policy: "balanced", source: "stored" }),
      data: { policy: "balanced", source: "stored" },
    });
    (updateMemoryPreferences as jest.Mock).mockResolvedValue({
      response: jsonResponse({ policy: "balanced", source: "stored" }),
      data: { policy: "balanced", source: "stored" },
    });
    (patchMemory as jest.Mock).mockResolvedValue({
      response: jsonResponse({ memory: null }),
      data: { memory: null },
    });
  });

  it("maps a non-timeline initialTab to the Facts view", async () => {
    render(<MemoryViewer userId="tester@example.com" initialTab="memories" />);

    await waitFor(() => {
      expect(screen.getByText("About you")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("tab", { name: /facts/i })
    ).toHaveAttribute("aria-selected", "true");
  });

  it("renders dossier summaries from saved memories in the Facts view", async () => {
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
      if (String(path).startsWith("/api/memory/list")) {
        return Promise.resolve(
          jsonResponse({
            memories: [
              {
                id: "m-1",
                content: "Prefers concise weekly plans",
                type: "preference",
                createdAt: "2026-03-23T10:00:00.000Z",
              },
            ],
            nextCursor: null,
            hasMore: false,
          })
        );
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<MemoryViewer userId="tester@example.com" initialTab="memories" />);

    await waitFor(() => {
      expect(screen.getByText("What ZAKI currently knows")).toBeInTheDocument();
    });

    // The preference is bucketed into the dossier's "Preferences" group.
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Prefers concise weekly plans")).toBeInTheDocument();
    // The activity-log "Recent changes" group is gone (timeline now = memories list).
    expect(screen.queryByText("Recent changes")).not.toBeInTheDocument();
  });

  it("does not render the orphan 'Raw records' header", async () => {
    render(<MemoryViewer userId="tester@example.com" initialTab="memories" />);

    // Facts is the default view; wait for the dossier to render.
    await waitFor(() => {
      expect(screen.getByText("About you")).toBeInTheDocument();
    });

    expect(screen.queryByText("memoryViewer.raw.title")).not.toBeInTheDocument();
    expect(screen.queryByText("memoryViewer.raw.body")).not.toBeInTheDocument();
  });

  it("does not render source/provenance chips on Timeline memory rows", async () => {
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
      if (String(path).startsWith("/api/memory/list")) {
        return Promise.resolve(
          jsonResponse({
            memories: [
              {
                id: "m-telegram",
                content: "Likes espresso in the morning",
                type: "preference",
                createdAt: "2026-03-23T10:00:00.000Z",
                source: "telegram_dm",
                role: "continuity",
                threadId: "abc-1234-5678-xyz",
              },
            ],
            nextCursor: null,
            hasMore: false,
          })
        );
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<MemoryViewer userId="tester@example.com" initialTab="memories" />);
    // Memory rows live in the Timeline view.
    fireEvent.click(await screen.findByRole("tab", { name: /timeline/i }));

    await waitFor(() => {
      expect(screen.getByText("Likes espresso in the morning")).toBeInTheDocument();
    });
    // The channel ("unknown") + thread source chips were removed from memory rows.
    expect(document.querySelectorAll('[data-testid="source-chip"]').length).toBe(0);
  });

  it("shows a binary On/Off and hides the removed scope cards + multi-mode toggle", async () => {
    render(<MemoryViewer userId="u@x.co" />);
    expect(await screen.findByRole("switch", { name: /memory/i })).toBeInTheDocument();
    expect(screen.queryByText(/ask_before_saving|save_less|save_more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Personal memory|Space context|session context/i)).not.toBeInTheDocument();
  });

  it("On/Off toggle persists policy=off", async () => {
    const api = await import("@/lib/api");
    render(<MemoryViewer userId="u@x.co" />);
    const sw = await screen.findByRole("switch", { name: /memory/i });
    fireEvent.click(sw);
    await waitFor(() => expect(api.updateMemoryPreferences).toHaveBeenCalledWith("off"));
  });

  it("refetches when refreshKey changes", async () => {
    const { rerender } = render(
      <MemoryViewer userId="u@x.co" refreshKey={0} />
    );
    await waitFor(() => expect(memoryListCalls()).toBeGreaterThan(0));
    const before = memoryListCalls();
    rerender(<MemoryViewer userId="u@x.co" refreshKey={1} />);
    await waitFor(() => expect(memoryListCalls()).toBeGreaterThan(before));
  });

  it("panel defaults to the Facts view with the dossier groups visible", async () => {
    render(<MemoryViewer userId="u@x.co" />);

    // Facts/Timeline segmented control is present.
    const factsTab = await screen.findByRole("tab", { name: /facts/i });
    const timelineTab = screen.getByRole("tab", { name: /timeline/i });
    expect(factsTab).toHaveAttribute("aria-selected", "true");
    expect(timelineTab).toHaveAttribute("aria-selected", "false");

    // Dossier groups (Facts) are visible.
    expect(screen.getByText("About you")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();

    // recent_changes group is NOT rendered as a dossier card in Facts.
    expect(screen.queryByText("Recent changes")).not.toBeInTheDocument();
  });

  it("clicking Timeline shows the saved-memories list and hides the Facts dossier", async () => {
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
      if (String(path).startsWith("/api/memory/list")) {
        return Promise.resolve(
          jsonResponse({
            memories: [
              {
                id: "m-espresso",
                content: "Likes espresso in the morning",
                type: "preference",
                createdAt: "2026-03-23T10:00:00.000Z",
              },
            ],
            nextCursor: null,
            hasMore: false,
          })
        );
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<MemoryViewer userId="u@x.co" />);

    // Facts dossier visible initially.
    expect(await screen.findByText("About you")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /timeline/i }));

    // Timeline now renders the saved-memories list (the editable memory card).
    await waitFor(() => {
      expect(
        screen.getByText("Likes espresso in the morning")
      ).toBeInTheDocument();
    });
    // The list's search input is present in the Timeline view.
    expect(
      screen.getByPlaceholderText("memoryViewer.memories.searchPlaceholder")
    ).toBeInTheDocument();

    // Facts dossier is hidden in Timeline view.
    expect(screen.queryByText("About you")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /timeline/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("never renders a Review tab/badge", async () => {
    render(<MemoryViewer userId="u@x.co" />);
    await screen.findByRole("tab", { name: /facts/i });
    expect(screen.queryByRole("button", { name: /review/i })).not.toBeInTheDocument();
    // Only Facts + Timeline tabs exist.
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("does not call removed review/conflict endpoints on load", async () => {
    render(<MemoryViewer userId="u@x.co" />);
    await waitFor(() => expect(memoryListCalls()).toBeGreaterThan(0));
    const paths = (apiRequest as jest.Mock).mock.calls.map((call) => String(call[0]));
    expect(paths.some((p) => p.includes("/api/memory/confirmations"))).toBe(false);
    expect(paths.some((p) => p.includes("/api/memory/conflicts"))).toBe(false);
  });

  it("episodic memories appear in Timeline but are excluded from Facts dossier", async () => {
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
      if (String(path).startsWith("/api/memory/list")) {
        return Promise.resolve(
          jsonResponse({
            memories: [
              {
                id: "m-fact-1",
                content: "Lives in Berlin",
                type: "fact",
                createdAt: "2026-03-23T10:00:00.000Z",
              },
              {
                id: "m-episodic-1",
                content: "I have been vibing with jazz",
                type: "episodic",
                createdAt: "2026-03-22T10:00:00.000Z",
              },
            ],
            nextCursor: null,
            hasMore: false,
          })
        );
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<MemoryViewer userId="tester@example.com" initialTab="memories" />);

    // Wait for Facts dossier to load.
    await waitFor(() => {
      expect(screen.getByText("About you")).toBeInTheDocument();
    });

    // Facts tab: episodic must NOT appear in the dossier.
    expect(screen.queryByText("I have been vibing with jazz")).not.toBeInTheDocument();
    // Facts tab: the plain fact should appear.
    expect(screen.getByText("Lives in Berlin")).toBeInTheDocument();

    // Switch to Timeline tab.
    fireEvent.click(screen.getByRole("tab", { name: /timeline/i }));

    // Timeline: episodic memory must appear.
    await waitFor(() => {
      expect(screen.getByText("I have been vibing with jazz")).toBeInTheDocument();
    });
  });
});

describe("MemoryViewer panel refresh wiring (anti-flicker regression)", () => {
  function RefreshHarness() {
    const [refreshKey, setRefreshKey] = useState(0);
    useEffect(() => {
      const bump = () => setRefreshKey((k) => k + 1);
      MEMORY_PANEL_REFRESH_EVENTS.forEach((evt) => window.addEventListener(evt, bump));
      return () => {
        MEMORY_PANEL_REFRESH_EVENTS.forEach((evt) => window.removeEventListener(evt, bump));
      };
    }, []);
    return <MemoryViewer userId="u@x.co" refreshKey={refreshKey} />;
  }

  // Regression: the legacy "zaki:memory-conflicts-count" event must NOT drive a
  // refetch. The panel no longer emits it, and it is excluded from the refresh
  // event list — keeping it inert guards against the old flashing-drawer loop.
  it("does NOT refetch when a stray conflicts-count event fires (no loop)", async () => {
    render(<RefreshHarness />);
    await waitFor(() => expect(memoryListCalls()).toBeGreaterThan(0));
    const before = memoryListCalls();
    act(() => {
      window.dispatchEvent(
        new CustomEvent("zaki:memory-conflicts-count", { detail: { count: 1 } })
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(memoryListCalls()).toBe(before);
  });

  it("DOES refetch on a real zaki:memory-changed event", async () => {
    render(<RefreshHarness />);
    await waitFor(() => expect(memoryListCalls()).toBeGreaterThan(0));
    const before = memoryListCalls();
    act(() => {
      window.dispatchEvent(new Event("zaki:memory-changed"));
    });
    await waitFor(() => expect(memoryListCalls()).toBeGreaterThan(before));
  });
});
