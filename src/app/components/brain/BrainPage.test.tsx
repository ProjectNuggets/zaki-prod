import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── i18n: return defaultValue (with {{var}} interpolation) or the key ──
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      let out = (options?.defaultValue as string) ?? key;
      if (options) {
        for (const [k, v] of Object.entries(options)) {
          if (k === "defaultValue") continue;
          out = out.replace(new RegExp(`{{${k}}}`, "g"), String(v));
        }
      }
      return out;
    },
  }),
}));

// ── auth store: a signed-in user (overridable per test) ──
let mockUser: { id: number } | null = { id: 1 };
jest.mock("@/stores", () => ({
  useAuthStore: () => ({ user: mockUser }),
}));

// ── brain queries: graph + me are the only ones BrainPage calls directly ──
type GraphResult = {
  data?: {
    nodes: Array<{ id: string; kind?: string; summary?: string; display_label?: string }>;
    edges: Array<{ type?: string; weight?: number }>;
    total_nodes_in_corpus: number;
    semantic_degraded?: boolean;
  };
  isLoading: boolean;
  isError: boolean;
};
let mockGraph: GraphResult = { data: undefined, isLoading: true, isError: false };
jest.mock("@/queries", () => ({
  useBrainGraph: () => mockGraph,
  useBrainMe: () => ({ data: null }),
}));

// ── heavy / query-driven children stubbed; BrainFilterPanel stays real ──
// BrainGalaxyView pulls in three.js (WebGL) which jsdom can't load; stub it as
// a forwardRef so the Explore tab's ref wiring stays valid.
jest.mock("./galaxy/BrainGalaxyView", () => {
  const react = require("react");
  return {
    BrainGalaxyView: react.forwardRef(() =>
      react.createElement("div", { "data-testid": "brain-galaxy-view" }),
    ),
  };
});
// BrainHome fans out to several brain queries; stub it (the Home surface has its
// own model tests). Keeps the BrainPage suite focused on page structure.
jest.mock("./galaxy/BrainHome", () => ({
  BrainHome: () => <div data-testid="brain-home" />,
}));
jest.mock("./BrainTimelineView", () => ({
  BrainTimelineView: () => <div data-testid="brain-timeline-view" />,
}));
jest.mock("./BrainComposeModal", () => ({
  BrainComposeModal: () => null,
}));
jest.mock("./BrainOrphanRail", () => ({
  BrainOrphanRail: () => <div data-testid="brain-orphan-rail" />,
}));
jest.mock("./BrainCommunityLegend", () => ({
  BrainCommunityLegend: () => <div data-testid="brain-community-legend" />,
}));
jest.mock("./BrainTimeScrubber", () => ({
  BrainTimeScrubber: () => <div data-testid="brain-time-scrubber" />,
}));
jest.mock("./BrainInsightsStrip", () => ({
  BrainInsightsStrip: () => <div data-testid="brain-insights-strip" />,
}));
jest.mock("./BrainEmptyState", () => ({
  BrainEmptyState: () => <div data-testid="brain-empty-state" />,
}));
jest.mock("@/app/components/ui/skeleton", () => ({
  SkeletonBrainPage: () => <div data-testid="skeleton-brain-page" />,
}));

import { BrainPage } from "./BrainPage";

function renderPage(initialEntry = "/brain") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BrainPage />
    </MemoryRouter>,
  );
}

const POPULATED: GraphResult = {
  data: {
    nodes: [
      { id: "a", kind: "core", summary: "About you", display_label: "About you" },
      { id: "b", kind: "daily", summary: "Today", display_label: "Today" },
    ],
    edges: [],
    total_nodes_in_corpus: 1234,
    semantic_degraded: false,
  },
  isLoading: false,
  isError: false,
};

describe("BrainPage", () => {
  beforeEach(() => {
    mockUser = { id: 1 };
    mockGraph = { data: undefined, isLoading: true, isError: false };
  });

  it("shows the skeleton while the initial graph probe is loading", () => {
    mockGraph = { data: undefined, isLoading: true, isError: false };
    renderPage();
    expect(screen.getByTestId("skeleton-brain-page")).toBeInTheDocument();
  });

  it("shows the skeleton when there is no signed-in user (user-scoped surface)", () => {
    mockUser = null;
    mockGraph = { ...POPULATED };
    renderPage();
    expect(screen.getByTestId("skeleton-brain-page")).toBeInTheDocument();
  });

  it("surfaces a load-failure state on query error", () => {
    mockGraph = { data: undefined, isLoading: false, isError: true };
    renderPage();
    expect(screen.queryByTestId("brain-home-slot")).not.toBeInTheDocument();
    expect(screen.queryByTestId("brain-graph-slot")).not.toBeInTheDocument();
    expect(screen.getByText("brain.error.loadFailed")).toBeInTheDocument();
  });

  it("renders the empty state when the corpus has zero memories", () => {
    mockGraph = {
      data: { nodes: [], edges: [], total_nodes_in_corpus: 0 },
      isLoading: false,
      isError: false,
    };
    renderPage();
    expect(screen.getByTestId("brain-empty-state")).toBeInTheDocument();
  });

  it("labels the surface scope as the personal brain", () => {
    mockGraph = { ...POPULATED };
    renderPage();
    // The status strip names the active scope. (The scope-separation block was
    // removed from the filters rail.)
    expect(screen.getAllByText("Personal brain").length).toBeGreaterThan(0);
  });

  it("defaults to Home (overview + timeline), with Explore as the second tab", () => {
    mockGraph = { ...POPULATED };
    renderPage();
    expect(screen.getByTestId("brain-home-slot")).toBeInTheDocument();
    expect(screen.queryByTestId("brain-graph-slot")).not.toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]); // Explore tab → the 3D graph shell
    expect(screen.getByTestId("brain-graph-slot")).toBeInTheDocument();
  });

  it("honors the explicit Explore URL state", () => {
    mockGraph = { ...POPULATED };
    renderPage("/brain?tab=explore");
    expect(screen.getByTestId("brain-graph-slot")).toBeInTheDocument();
    expect(screen.queryByTestId("brain-home-slot")).not.toBeInTheDocument();
  });

  it("exposes an honest account-level governance deep-link to Settings (Settings-link ready)", () => {
    mockGraph = { ...POPULATED };
    renderPage();
    const link = screen.getByTestId("brain-manage-memory-link");
    expect(link).toHaveAttribute("href", "/settings#settings-memory-data");
  });
});
