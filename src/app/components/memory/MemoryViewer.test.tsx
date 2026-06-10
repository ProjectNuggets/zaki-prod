import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { MemoryViewer } from "./MemoryViewer";
import { MEMORY_PANEL_REFRESH_EVENTS } from "@/lib/memoryEvents";
import {
  apiRequest,
  fetchMemoryActivity,
  fetchMemoryPreferences,
  patchMemory,
  updateMemoryPreferences,
} from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
  fetchMemoryActivity: jest.fn(),
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
      if (key === "memoryViewer.notebook.activity.saved")
        return `Saved: ${(options as unknown as { content?: string })?.content ?? ""}`;
      if (key === "memoryViewer.notebook.recentSaved")
        return `Saved: ${(options as unknown as { content?: string })?.content ?? ""}`;
      if (key === "memoryViewer.tabs.memories") return `Saved memories (${options?.count ?? 0})`;
      if (key === "memoryViewer.tabs.pending") return `Needs review (${options?.count ?? 0})`;
      if (key === "memoryViewer.tabs.conflicts") return `Possible conflicts (${options?.count ?? 0})`;
      if (key === "memoryViewer.panel.tabs.facts") return "Facts";
      if (key === "memoryViewer.panel.tabs.timeline") return "Timeline";
      if (key === "memoryViewer.panel.review") return `Review ${options?.count ?? 0}`;
      if (key === "memoryViewer.panel.backToFacts") return "Back to Facts";
      if (key === "memoryViewer.notebook.groups.about_you.title") return "About you";
      if (key === "memoryViewer.notebook.groups.ongoing_work.title") return "Ongoing work";
      if (key === "memoryViewer.notebook.groups.relationships.title") return "Relationships";
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
    (fetchMemoryActivity as jest.Mock).mockReset();
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
      if (path === "/api/memory/confirmations") {
        return Promise.resolve(jsonResponse({ confirmations: [] }));
      }
      if (path === "/api/memory/conflicts") {
        return Promise.resolve(jsonResponse({ conflicts: [] }));
      }
      if (String(path).startsWith("/api/memory/activity")) {
        return Promise.resolve(jsonResponse({ activities: [] }));
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
    (fetchMemoryActivity as jest.Mock).mockResolvedValue({
      response: jsonResponse({ activities: [] }),
      data: { activities: [] },
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
      expect(screen.getAllByText("No memories yet").length).toBeGreaterThan(0);
    });

    rerender(<MemoryViewer userId="tester@example.com" initialTab="conflicts" />);

    await waitFor(() => {
      expect(screen.getByText("No conflicts")).toBeInTheDocument();
    });
  });

  it("renders notebook summaries from saved memories", async () => {
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
      if (path === "/api/memory/confirmations") {
        return Promise.resolve(jsonResponse({ confirmations: [] }));
      }
      if (path === "/api/memory/conflicts") {
        return Promise.resolve(jsonResponse({ conflicts: [] }));
      }
      if (String(path).startsWith("/api/memory/activity")) {
        return Promise.resolve(
          jsonResponse({
            activities: [
              {
                id: "activity-1",
                kind: "saved",
                content: "Prefers concise weekly plans",
                type: "preference",
                occurredAt: "2026-03-23T10:00:00.000Z",
              },
            ],
          })
        );
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<MemoryViewer userId="tester@example.com" initialTab="memories" />);

    await waitFor(() => {
      expect(screen.getByText("What ZAKI currently knows")).toBeInTheDocument();
    });

    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getAllByText("Prefers concise weekly plans").length).toBeGreaterThan(0);
    expect(screen.getByText("Recent changes")).toBeInTheDocument();
  });

  it("does not render the orphan 'Raw records' header", async () => {
    render(<MemoryViewer userId="tester@example.com" initialTab="memories" />);

    await waitFor(() => {
      expect(screen.getAllByText("No memories yet").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("memoryViewer.raw.title")).not.toBeInTheDocument();
    expect(screen.queryByText("memoryViewer.raw.body")).not.toBeInTheDocument();
  });

  it("renders a source chip on a pending item with a source thread", async () => {
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
      if (String(path).startsWith("/api/memory/list")) {
        return Promise.resolve(
          jsonResponse({ memories: [], nextCursor: null, hasMore: false })
        );
      }
      if (path === "/api/memory/confirmations") {
        return Promise.resolve(
          jsonResponse({
            confirmations: [
              {
                id: "pending-1",
                content: "Considering a move to Riyadh",
                type: "context",
                confidence_score: 0.82,
                created_at: "2026-03-23T10:00:00.000Z",
                source_thread_id: "abc-1234-5678-xyz",
              },
            ],
          })
        );
      }
      if (path === "/api/memory/conflicts") {
        return Promise.resolve(jsonResponse({ conflicts: [] }));
      }
      if (String(path).startsWith("/api/memory/activity")) {
        return Promise.resolve(jsonResponse({ activities: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<MemoryViewer userId="tester@example.com" initialTab="pending" />);

    await waitFor(() => {
      const chips = document.querySelectorAll('[data-testid="source-chip"]');
      expect(chips.length).toBeGreaterThanOrEqual(1);
    });

    const chip = document.querySelector('[data-testid="source-chip"]');
    expect(chip?.getAttribute("data-lane")).toContain("thread:");
  });

  it("shows a provenance chip (channel + lane) on every saved memory", async () => {
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
              {
                id: "m-web",
                content: "Working on quarterly review",
                type: "context",
                createdAt: "2026-03-22T10:00:00.000Z",
                metadata: { source: "web", lane: "main" },
              },
            ],
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
      if (String(path).startsWith("/api/memory/activity")) {
        return Promise.resolve(jsonResponse({ activities: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<MemoryViewer userId="tester@example.com" initialTab="memories" />);

    await waitFor(() => {
      const chips = document.querySelectorAll('[data-testid="source-chip"]');
      expect(chips.length).toBeGreaterThanOrEqual(2);
    });

    const chips = Array.from(
      document.querySelectorAll('[data-testid="source-chip"]')
    );
    const channels = chips.map((chip) => chip.getAttribute("data-channel"));
    expect(channels).toEqual(expect.arrayContaining(["telegram", "web"]));
  });

  it("panel variant shows a binary On/Off and hides scope cards + 5-mode toggle", async () => {
    render(<MemoryViewer userId="u@x.co" variant="panel" />);
    expect(await screen.findByRole("switch", { name: /memory/i })).toBeInTheDocument();
    expect(screen.queryByText(/ask_before_saving|save_less|save_more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Personal memory|Space context|session context/i)).not.toBeInTheDocument();
  });

  it("panel On/Off toggle persists policy=off", async () => {
    const api = await import("@/lib/api");
    render(<MemoryViewer userId="u@x.co" variant="panel" />);
    const sw = await screen.findByRole("switch", { name: /memory/i });
    fireEvent.click(sw);
    await waitFor(() => expect(api.updateMemoryPreferences).toHaveBeenCalledWith("off"));
  });

  it("refetches when refreshKey changes", async () => {
    const api = await import("@/lib/api");
    const spy = api.fetchMemoryActivity as jest.Mock;
    const { rerender } = render(
      <MemoryViewer userId="u@x.co" variant="panel" refreshKey={0} />
    );
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const before = spy.mock.calls.length;
    rerender(<MemoryViewer userId="u@x.co" variant="panel" refreshKey={1} />);
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(before));
  });

  it("panel defaults to the Facts view with the dossier groups visible", async () => {
    render(<MemoryViewer userId="u@x.co" variant="panel" />);

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

  it("clicking Timeline shows the activity log and hides the Facts dossier", async () => {
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
      if (String(path).startsWith("/api/memory/list")) {
        return Promise.resolve(
          jsonResponse({ memories: [], nextCursor: null, hasMore: false })
        );
      }
      if (path === "/api/memory/confirmations") {
        return Promise.resolve(jsonResponse({ confirmations: [] }));
      }
      if (path === "/api/memory/conflicts") {
        return Promise.resolve(jsonResponse({ conflicts: [] }));
      }
      if (String(path).startsWith("/api/memory/activity")) {
        return Promise.resolve(jsonResponse({ activities: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });
    (fetchMemoryActivity as jest.Mock).mockResolvedValue({
      response: jsonResponse({
        activities: [
          {
            id: "activity-1",
            kind: "saved",
            content: "Likes espresso",
            type: "preference",
            occurredAt: "2026-03-23T10:00:00.000Z",
          },
        ],
      }),
      data: {
        activities: [
          {
            id: "activity-1",
            kind: "saved",
            content: "Likes espresso",
            type: "preference",
            occurredAt: "2026-03-23T10:00:00.000Z",
          },
        ],
      },
    });

    render(<MemoryViewer userId="u@x.co" variant="panel" />);

    // Facts dossier visible initially.
    expect(await screen.findByText("About you")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /timeline/i }));

    await waitFor(() => {
      expect(screen.getByText(/Saved: Likes espresso/)).toBeInTheDocument();
    });

    // Facts dossier is hidden in Timeline view.
    expect(screen.queryByText("About you")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /timeline/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("hides the Review badge when there is nothing to review", async () => {
    render(<MemoryViewer userId="u@x.co" variant="panel" />);
    await screen.findByRole("tab", { name: /facts/i });
    expect(screen.queryByRole("button", { name: /review/i })).not.toBeInTheDocument();
  });

  it("shows the Review badge and review lists when there are pending or conflict items", async () => {
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
      if (String(path).startsWith("/api/memory/list")) {
        return Promise.resolve(
          jsonResponse({ memories: [], nextCursor: null, hasMore: false })
        );
      }
      if (path === "/api/memory/confirmations") {
        return Promise.resolve(
          jsonResponse({
            confirmations: [
              {
                id: "pending-1",
                content: "Considering a move to Riyadh",
                type: "context",
                confidence_score: 0.82,
                created_at: "2026-03-23T10:00:00.000Z",
              },
            ],
          })
        );
      }
      if (path === "/api/memory/conflicts") {
        return Promise.resolve(
          jsonResponse({
            conflicts: [
              {
                id: "conflict-1",
                new_content: "Now prefers tea",
                new_type: "preference",
                conflicting_content: "Prefers coffee",
                conflicting_type: "preference",
                created_at: "2026-03-23T10:00:00.000Z",
              },
            ],
            count: 1,
          })
        );
      }
      if (String(path).startsWith("/api/memory/activity")) {
        return Promise.resolve(jsonResponse({ activities: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<MemoryViewer userId="u@x.co" variant="panel" />);

    const reviewBadge = await screen.findByRole("button", { name: /review/i });
    expect(reviewBadge).toBeInTheDocument();

    fireEvent.click(reviewBadge);

    await waitFor(() => {
      expect(screen.getByText("Considering a move to Riyadh")).toBeInTheDocument();
    });
    expect(screen.getByText("Now prefers tea")).toBeInTheDocument();

    // Facts dossier is hidden while reviewing.
    expect(screen.queryByText("About you")).not.toBeInTheDocument();

    // There is a clear way back to Facts.
    fireEvent.click(screen.getByRole("button", { name: /back to facts/i }));
    await waitFor(() => {
      expect(screen.getByText("About you")).toBeInTheDocument();
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
    return <MemoryViewer userId="u@x.co" variant="panel" refreshKey={refreshKey} />;
  }

  // Regression: the panel emits "zaki:memory-conflicts-count" during its own load.
  // If that event drove a refetch (old bug), it looped -> the drawer flashed forever.
  it("does NOT refetch when the panel's own conflicts-count event fires (no loop)", async () => {
    const spy = fetchMemoryActivity as jest.Mock;
    render(<RefreshHarness />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const before = spy.mock.calls.length;
    act(() => {
      window.dispatchEvent(
        new CustomEvent("zaki:memory-conflicts-count", { detail: { count: 1 } })
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(spy.mock.calls.length).toBe(before);
  });

  it("DOES refetch on a real zaki:memory-changed event", async () => {
    const spy = fetchMemoryActivity as jest.Mock;
    render(<RefreshHarness />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const before = spy.mock.calls.length;
    act(() => {
      window.dispatchEvent(new Event("zaki:memory-changed"));
    });
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(before));
  });
});
