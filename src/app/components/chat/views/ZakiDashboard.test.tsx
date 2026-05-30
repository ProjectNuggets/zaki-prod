import "@testing-library/jest-dom";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ZakiDashboard } from "./ZakiDashboard";
import { useAuthStore } from "@/stores";

const mockNavigate = jest.fn();
const mockUseProductRegistry = jest.fn();
const mockUseMeterStatus = jest.fn();
const mockUseAnonymousMeterStatus = jest.fn();
const mockUseZakiSessions = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom") as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("@/queries", () => ({
  useProductRegistry: () => mockUseProductRegistry(),
  useMeterStatus: () => mockUseMeterStatus(),
  useAnonymousMeterStatus: (enabled?: boolean) => mockUseAnonymousMeterStatus(enabled),
  useZakiSessions: (enabled?: boolean) => mockUseZakiSessions(enabled),
}));

const tMock = (key: string, options?: Record<string, unknown>) => {
  const dictionary: Record<string, string> = {
    "home.guestName": "there",
    "zakiDashboard.eyebrow": "Command center",
    "zakiDashboard.title": "ZAKI, {{name}}",
    "zakiDashboard.subtitle": "Launch products and inspect plan usage.",
    "zakiDashboard.agentPrompt": "Choose my next step.",
    "zakiDashboard.identity.signedIn": "Signed-in account",
    "zakiDashboard.identity.anonymous": "Anonymous free session",
    "zakiDashboard.status.online": "Online",
    "zakiDashboard.status.syncing": "Syncing",
    "zakiDashboard.status.plan": "Plan",
    "zakiDashboard.status.weeklyReset": "Weekly reset",
    "zakiDashboard.status.identity": "Identity",
    "zakiDashboard.status.agentLive": "Agent live · #{{id}}",
    "zakiDashboard.actions.askAgent": "Ask Agent",
    "zakiDashboard.actions.openAgent": "Open Agent",
    "zakiDashboard.actions.openChat": "Open Chat",
    "zakiDashboard.hero.title": "Hi, {{name}}.",
    "zakiDashboard.hero.remaining": "{{remaining}} left.",
    "zakiDashboard.tags.plan": "Plan",
    "zakiDashboard.tags.products": "Open products",
    "zakiDashboard.tags.memory": "Memory scopes",
    "zakiDashboard.meter.label": "Platform meter",
    "zakiDashboard.meter.plan": "Plan",
    "zakiDashboard.meter.weekly": "Weekly allowance",
    "zakiDashboard.meter.rolling": "{{hours}}h window",
    "zakiDashboard.meter.loading": "Loading",
    "zakiDashboard.meter.pending": "Pending",
    "zakiDashboard.meter.free": "Free",
    "zakiDashboard.meter.units": "units",
    "zakiDashboard.meter.used": "Used",
    "zakiDashboard.meter.remaining": "Remaining",
    "zakiDashboard.meter.remainingOfLimit": "{{remaining}} / {{limit}} left",
    "zakiDashboard.meter.usedOfLimit": "{{used}} / {{limit}} used",
    "zakiDashboard.meter.usedUnits": "{{used}} used",
    "zakiDashboard.meter.resets": "Resets {{reset}}",
    "zakiDashboard.meter.resetPending": "Reset pending",
    "zakiDashboard.products.title": "Products",
    "zakiDashboard.products.subtitle": "Central routing and state.",
    "zakiDashboard.products.availableCount": "{{count}} / {{total}} open",
    "zakiDashboard.products.loading": "Loading products...",
    "zakiDashboard.products.empty": "No products published yet.",
    "zakiDashboard.products.memory": "Memory",
    "zakiDashboard.products.usage": "Weekly usage",
    "zakiDashboard.products.state": "State",
    "zakiDashboard.products.surface": "Surface",
    "zakiDashboard.products.open": "Open",
    "zakiDashboard.products.openAria": "Open {{product}}",
    "zakiDashboard.products.notAvailable": "Not available",
    "zakiDashboard.products.notAvailableAria": "{{product}} is not available",
    "zakiDashboard.products.names.agent": "Agent",
    "zakiDashboard.products.names.spaces": "Chat",
    "zakiDashboard.products.names.brain": "Brain",
    "zakiDashboard.products.names.learning": "Learn",
    "zakiDashboard.products.names.hire": "Hire",
    "zakiDashboard.products.names.design": "Design",
    "zakiDashboard.products.tags.live": "Live",
    "zakiDashboard.products.tags.privateBeta": "Private beta",
    "zakiDashboard.products.tags.waitlist": "Waitlist",
    "zakiDashboard.products.tags.controlPlane": "Control plane",
    "zakiDashboard.products.tags.degraded": "Degraded",
    "zakiDashboard.products.tags.readOnly": "Read only",
    "zakiDashboard.products.tags.maintenance": "Maintenance",
    "zakiDashboard.products.descriptions.agent": "Personal agent.",
    "zakiDashboard.products.descriptions.spaces": "Workspace chat.",
    "zakiDashboard.products.descriptions.brain": "Memory graph.",
    "zakiDashboard.products.descriptions.learning": "Study surface.",
    "zakiDashboard.products.descriptions.hire": "Hiring workflow.",
    "zakiDashboard.products.descriptions.design": "Design surface.",
    "zakiDashboard.memory.title": "Memory scopes",
    "zakiDashboard.memory.subtitle": "Every product writes to a known memory owner.",
    "zakiDashboard.memory.pending": "Pending",
    "zakiDashboard.memory.loading": "Memory scopes are loading.",
    "zakiDashboard.memory.open": "Open memory controls",
    "zakiDashboard.memory.scopeCount": "{{count}} scopes",
    "zakiDashboard.memory.productUnit": "products",
    "zakiDashboard.activeWork.title": "Active work · Agent",
    "zakiDashboard.activeWork.source": "Runtime",
    "zakiDashboard.activeWork.loading": "Loading active work.",
    "zakiDashboard.activeWork.empty": "No active agent work.",
    "zakiDashboard.activeWork.untitled": "Untitled session",
    "zakiDashboard.activeWork.pendingApproval": "{{title}} · {{count}} approval waiting",
    "zakiDashboard.activeWork.liveSession": "{{title}} · streaming",
    "zakiDashboard.activeWork.recentSession": "{{title}} · recent",
    "zakiDashboard.activeWork.sessionMeta": "{{messages}} messages · {{mode}}",
    "zakiDashboard.activeWork.noMode": "standard",
    "zakiDashboard.commercial.title": "Commercial release spine is central.",
    "zakiDashboard.commercial.copy": "Meter and memory are central.",
    "zakiDashboard.commercial.plans": "See plans",
    "zakiDashboard.commercial.memory": "Open Brain",
    "zakiDashboard.readiness.title": "Commercial plumbing",
    "zakiDashboard.readiness.subtitle": "V2 foundation.",
    "zakiDashboard.readiness.registry": "Product registry drives launch cards",
    "zakiDashboard.readiness.meter": "Central meter drives plan usage",
    "zakiDashboard.readiness.routing": "Routes honor product state",
    "zakiDashboard.readiness.memory": "Memory is scoped by product",
    "settingsModal.productsAccess.states.enabled": "Enabled",
    "settingsModal.productsAccess.states.disabled": "Disabled",
    "settingsModal.productsAccess.states.maintenance": "Maintenance",
    "settingsModal.productsAccess.states.degraded": "Degraded",
    "settingsModal.productsAccess.states.hidden": "Hidden",
    "settingsModal.productsAccess.states.readOnly": "Read only",
    "settingsModal.productsAccess.memoryScopes.personalBrain": "Personal brain",
    "settingsModal.productsAccess.memoryScopes.workspaceMemory": "Workspace memory",
    "settingsModal.productsAccess.memoryScopes.learnerMemory": "Learner memory",
    "settingsModal.productsAccess.memoryScopes.hireMemory": "Hire memory",
    "settingsModal.productsAccess.memoryScopes.designMemory": "Design memory",
    "settingsModal.productsAccess.memoryScopes.sessionMemory": "Session memory",
  };
  const value = dictionary[key] || key;
  return value
    .replace("{{name}}", String(options?.name ?? ""))
    .replace("{{hours}}", String(options?.hours ?? ""))
    .replace("{{remaining}}", String(options?.remaining ?? ""))
    .replace("{{limit}}", String(options?.limit ?? ""))
    .replace("{{used}}", String(options?.used ?? ""))
    .replace("{{reset}}", String(options?.reset ?? ""))
    .replace("{{count}}", String(options?.count ?? ""))
    .replace("{{total}}", String(options?.total ?? ""))
    .replace("{{product}}", String(options?.product ?? ""))
    .replace("{{id}}", String(options?.id ?? ""))
    .replace("{{title}}", String(options?.title ?? ""))
    .replace("{{messages}}", String(options?.messages ?? ""))
    .replace("{{mode}}", String(options?.mode ?? ""));
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: {
      language: "en",
      dir: () => "ltr",
    },
  }),
}));

const registryProducts = [
  {
    productId: "agent",
    label: "ZAKI Agent",
    productKind: "product",
    state: "enabled",
    lifecycle: "current",
    visibleInSettings: true,
    route: "/agent",
    entryPoint: "Agent workbench",
    memoryScope: "personal_brain",
  },
  {
    productId: "spaces",
    label: "ZAKI Spaces",
    productKind: "product",
    state: "enabled",
    lifecycle: "current",
    visibleInSettings: true,
    route: "/spaces",
    entryPoint: "Spaces / Chat",
    memoryScope: "workspace_memory",
  },
  {
    productId: "learning",
    label: "ZAKI Learn",
    productKind: "product",
    state: "enabled",
    lifecycle: "current",
    visibleInSettings: true,
    route: "/learn",
    entryPoint: "Learning",
    memoryScope: "learner_memory",
  },
  {
    productId: "hire",
    label: "ZAKI Hire",
    productKind: "product",
    state: "disabled",
    lifecycle: "future",
    visibleInSettings: true,
    route: "/hire",
    entryPoint: "Hire",
    memoryScope: "hire_memory",
  },
  {
    productId: "design",
    label: "ZAKI Design",
    productKind: "product",
    state: "disabled",
    lifecycle: "future",
    visibleInSettings: true,
    route: "/design",
    entryPoint: "Design",
    memoryScope: "design_memory",
  },
  {
    productId: "brain",
    label: "ZAKI Brain",
    productKind: "control_plane",
    state: "enabled",
    lifecycle: "current",
    visibleInSettings: true,
    route: "/brain",
    entryPoint: "Memory control plane",
    memoryScope: "personal_brain",
  },
  {
    productId: "cli",
    label: "ZAKI CLI",
    productKind: "client",
    state: "hidden",
    lifecycle: "future",
    visibleInSettings: false,
    route: null,
    entryPoint: "CLI",
    memoryScope: "personal_brain",
  },
];

const signedInMeter = {
  success: true,
  identity: { type: "user", userId: "42" },
  plan: { tier: "pro", label: "Pro", source: "subscription" },
  rolling: {
    windowHours: 5,
    limit: 100,
    used: 20,
    remaining: 80,
    resetAt: "2026-05-20T12:00:00.000Z",
  },
  weekly: {
    limit: 1500,
    used: 80,
    remaining: 1420,
    resetAt: "2026-05-25T00:00:00.000Z",
  },
  products: {
    agent: { id: "agent", state: "enabled", weekly: { used: 7, receipts: 2 } },
    spaces: { id: "spaces", state: "enabled", weekly: { used: 2, receipts: 1 } },
    learning: { id: "learning", state: "enabled", weekly: { used: 5, receipts: 1 } },
    hire: { id: "hire", state: "disabled", weekly: { used: 0, receipts: 0 } },
    design: { id: "design", state: "disabled", weekly: { used: 0, receipts: 0 } },
  },
};

function setupQueries() {
  mockUseProductRegistry.mockReturnValue({
    data: { data: { success: true, products: registryProducts } },
    isLoading: false,
  });
  mockUseMeterStatus.mockReturnValue({
    data: { data: signedInMeter },
    isLoading: false,
  });
  mockUseAnonymousMeterStatus.mockReturnValue({
    data: {
      data: {
        success: true,
        identity: { type: "anonymous", anonymousSessionId: "anon-1" },
        plan: { tier: "free", label: "Free", source: "anonymous" },
        rolling: { windowHours: 5, limit: 10, used: 1, remaining: 9 },
        weekly: { limit: 100, used: 3, remaining: 97 },
        products: {},
      },
    },
    isLoading: false,
  });
  mockUseZakiSessions.mockImplementation((enabled?: boolean) => ({
    data: enabled
      ? [
          {
            session_key: "agent:4821",
            title: "Investor brief",
            last_active: "2026-05-20T12:00:00.000Z",
            message_count: 8,
            live: true,
            mode: "execute",
            pending_approval_count: 0,
          },
        ]
      : [],
    isLoading: false,
  }));
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ZakiDashboard onSendExample={jest.fn()} />
    </MemoryRouter>
  );
}

describe("ZakiDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQueries();
    useAuthStore.setState({
      token: "signed-in-token",
      user: { id: 42, username: "nova@example.com", fullName: "Nova User" },
      isHydrating: false,
      isLoading: false,
    });
  });

  it("renders the signed-in command center from product registry and central meter", () => {
    renderDashboard();

    expect(screen.getByTestId("zaki-command-center")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hi, Nova User. 1,420 left." })).toBeInTheDocument();
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1,420").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("80 / 100 left")).toBeInTheDocument();
    expect(screen.getByText("Signed-in account")).toBeInTheDocument();

    expect(screen.getByTestId("zaki-product-card-agent")).toHaveTextContent("Agent");
    expect(screen.getByTestId("zaki-product-card-spaces")).toHaveTextContent("Chat");
    expect(screen.getByTestId("zaki-product-card-brain")).toHaveTextContent("Brain");
    expect(screen.getByTestId("zaki-product-card-learning")).toHaveTextContent("Learn");
    expect(screen.getByTestId("zaki-product-card-learning")).toHaveTextContent("Private beta");
    expect(screen.getByTestId("zaki-product-card-learning")).toHaveTextContent("Not available");
    expect(screen.getByTestId("zaki-product-card-hire")).toHaveTextContent("Not available");
    expect(screen.getByTestId("zaki-product-card-design")).toHaveTextContent("Not available");
    expect(screen.queryByText("ZAKI CLI")).not.toBeInTheDocument();
    expect(screen.getByTestId("zaki-dashboard-active-work")).toHaveTextContent("Investor brief · streaming");

    const memory = screen.getByTestId("zaki-dashboard-memory");
    expect(within(memory).getByText("Personal brain")).toBeInTheDocument();
    expect(within(memory).getByText("Workspace memory")).toBeInTheDocument();
    expect(within(memory).getByText("Learner memory")).toBeInTheDocument();
    expect(within(memory).getByText("Hire memory")).toBeInTheDocument();
    expect(within(memory).getByText("Design memory")).toBeInTheDocument();
  });

  it("uses the anonymous meter contract when there is no auth token", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    expect(mockUseAnonymousMeterStatus).toHaveBeenCalledWith(true);
    expect(screen.getByText("Anonymous free session")).toBeInTheDocument();
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getAllByText("97").length).toBeGreaterThan(0);
  });

  it("routes the Agent launcher to the product surface instead of the command center", () => {
    renderDashboard();

    const agentCard = screen.getByTestId("zaki-product-card-agent");
    fireEvent.click(within(agentCard).getByRole("button", { name: "Open Agent" }));

    expect(mockNavigate).toHaveBeenCalledWith("/agent");
  });
});
