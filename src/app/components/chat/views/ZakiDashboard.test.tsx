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
    "zakiDashboard.actions.askAgent": "Ask Agent",
    "zakiDashboard.actions.openChat": "Open Chat",
    "zakiDashboard.meter.label": "Platform meter",
    "zakiDashboard.meter.plan": "Plan",
    "zakiDashboard.meter.weekly": "Weekly allowance",
    "zakiDashboard.meter.rolling": "{{hours}}h window",
    "zakiDashboard.meter.loading": "Loading",
    "zakiDashboard.meter.pending": "Pending",
    "zakiDashboard.meter.remainingOfLimit": "{{remaining}} / {{limit}} left",
    "zakiDashboard.meter.usedOfLimit": "{{used}} / {{limit}} used",
    "zakiDashboard.meter.usedUnits": "{{used}} used",
    "zakiDashboard.meter.resets": "Resets {{reset}}",
    "zakiDashboard.meter.resetPending": "Reset pending",
    "zakiDashboard.products.title": "Products",
    "zakiDashboard.products.subtitle": "Central routing and state.",
    "zakiDashboard.products.loading": "Loading products...",
    "zakiDashboard.products.empty": "No products published yet.",
    "zakiDashboard.products.memory": "Memory",
    "zakiDashboard.products.usage": "Weekly usage",
    "zakiDashboard.products.open": "Open",
    "zakiDashboard.products.notAvailable": "Not available",
    "zakiDashboard.products.descriptions.agent": "Personal agent.",
    "zakiDashboard.products.descriptions.spaces": "Workspace chat.",
    "zakiDashboard.products.descriptions.learning": "Study surface.",
    "zakiDashboard.products.descriptions.hire": "Hiring workflow.",
    "zakiDashboard.products.descriptions.design": "Design surface.",
    "zakiDashboard.memory.title": "Memory scopes",
    "zakiDashboard.memory.subtitle": "Every product writes to a known memory owner.",
    "zakiDashboard.memory.pending": "Pending",
    "zakiDashboard.memory.loading": "Memory scopes are loading.",
    "zakiDashboard.memory.open": "Open memory controls",
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
    .replace("{{reset}}", String(options?.reset ?? ""));
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
    expect(screen.getByRole("heading", { name: "ZAKI, Nova User" })).toBeInTheDocument();
    expect(within(screen.getByTestId("zaki-dashboard-meter")).getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("1,420 / 1,500 left")).toBeInTheDocument();
    expect(screen.getByText("80 / 100 left")).toBeInTheDocument();
    expect(screen.getByText("Signed-in account")).toBeInTheDocument();

    expect(screen.getByTestId("zaki-product-card-agent")).toHaveTextContent("ZAKI Agent");
    expect(screen.getByTestId("zaki-product-card-spaces")).toHaveTextContent("ZAKI Spaces");
    expect(screen.getByTestId("zaki-product-card-learning")).toHaveTextContent("ZAKI Learn");
    expect(screen.getByTestId("zaki-product-card-hire")).toHaveTextContent("Not available");
    expect(screen.getByTestId("zaki-product-card-design")).toHaveTextContent("Not available");
    expect(screen.queryByText("ZAKI CLI")).not.toBeInTheDocument();

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
    expect(within(screen.getByTestId("zaki-dashboard-meter")).getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("97 / 100 left")).toBeInTheDocument();
  });

  it("routes the Agent launcher to the product surface instead of the command center", () => {
    renderDashboard();

    const agentCard = screen.getByTestId("zaki-product-card-agent");
    fireEvent.click(within(agentCard).getByRole("button", { name: /open/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/agent");
  });
});
