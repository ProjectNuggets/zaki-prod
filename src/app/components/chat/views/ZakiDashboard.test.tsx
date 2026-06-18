import "@testing-library/jest-dom";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ZakiDashboard } from "./ZakiDashboard";
import { useAuthStore } from "@/stores";
import { ANONYMOUS_WORK_LEDGER_KEY, upsertAnonymousWorkItem } from "@/lib/anonymousWork";
import { PENDING_INTENT_KEY } from "@/lib/pendingIntent";

const mockNavigate = jest.fn();
const mockOpen = jest.fn();
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
    "zakiDashboard.command.eyebrow": "Start here",
    "zakiDashboard.command.title": "Tell ZAKI what you want to do.",
    "zakiDashboard.command.signedEyebrow": "Signed in · your work can carry forward",
    "zakiDashboard.command.guestEyebrow": "Guest session · start without setup",
    "zakiDashboard.command.signedTitlePrefix": "Let's ",
    "zakiDashboard.command.guestTitlePrefix": "Let's ",
    "zakiDashboard.command.signedCopy": "Choose the kind of help you need.",
    "zakiDashboard.command.guestCopy": "Ask immediately. ZAKI keeps weekly usage clear without making you count units.",
    "zakiDashboard.command.verbs.agent.signed": "move",
    "zakiDashboard.command.verbs.agent.guest": "plan",
    "zakiDashboard.command.verbs.brain.signed": "map",
    "zakiDashboard.command.verbs.brain.guest": "map",
    "zakiDashboard.command.verbs.learning.signed": "learn",
    "zakiDashboard.command.verbs.learning.guest": "study",
    "zakiDashboard.command.verbs.design.signed": "shape",
    "zakiDashboard.command.verbs.design.guest": "shape",
    "zakiDashboard.command.verbs.hire.signed": "advance",
    "zakiDashboard.command.verbs.hire.guest": "advance",
    "zakiDashboard.command.verbs.spaces.signed": "chat",
    "zakiDashboard.command.verbs.spaces.guest": "chat",
    "zakiDashboard.entry.website": "Website",
    "zakiDashboard.entry.signIn": "Sign in",
    "zakiDashboard.entry.signUp": "Sign up",
    "zakiDashboard.command.weeklyFreeCredit": "Weekly usage",
    "zakiDashboard.command.bestFor": "Best for",
    "zakiDashboard.command.memoryScope": "Memory scope",
    "zakiDashboard.command.selectedProduct": "{{product}} overview",
    "zakiDashboard.command.meter": "{{percent}}% of your weekly usage",
    "zakiDashboard.command.productStrip": "Choose product",
    "zakiDashboard.command.inputLabel": "Describe what you want ZAKI to do",
    "zakiDashboard.command.placeholder": "Ask {{product}} to start from your prompt...",
    "zakiDashboard.command.saveWork": "Save this work",
    "zakiDashboard.command.emptyHelper": "Type a prompt to start.",
    "zakiDashboard.command.creditHelper": "You're fine. ZAKI will update weekly usage after it responds.",
    "zakiDashboard.command.capacityWindowLow": "Current capacity window is low.",
    "zakiDashboard.command.agentCreditsLow": "Agent needs more weekly room before it can start.",
    "zakiDashboard.command.nearCapNudge": "You're at {{percent}}% this week — upgrade for more room.",
    "zakiDashboard.command.comingSoonHelper": "{{product}} is coming soon. Pick Chat, Agent, or Brain to start now.",
    "zakiDashboard.command.submitPreviewSave": "Preview first",
    "zakiDashboard.command.submitComingSoon": "{{product}} coming soon",
    "zakiDashboard.command.markers.free": "Free",
    "zakiDashboard.command.markers.preview": "Preview",
    "zakiDashboard.command.markers.save": "Save",
    "zakiDashboard.command.markers.beta": "Beta",
    "zakiDashboard.command.markers.waitlist": "Waitlist",
    "zakiDashboard.command.markers.comingSoon": "Coming soon",
    "zakiDashboard.command.creditsExhaustedTitle": "Weekly usage is full.",
    "zakiDashboard.command.creditsExhaustedCopy": "Keep your prompt here, then sign up, wait for reset, or choose a plan with more room.",
    "zakiDashboard.command.capacityWindowTitle": "Current capacity window is low.",
    "zakiDashboard.command.capacityWindowCopy": "Wait for the current window to refresh.",
    "zakiDashboard.command.saveAndSignup": "Save and sign up",
    "zakiDashboard.command.viewPlans": "View plans",
    "zakiDashboard.command.waitForReset": "Wait for reset",
    "zakiDashboard.command.waitForResetDate": "Wait for reset {{reset}}",
    "zakiDashboard.command.submitChat": "Start chat",
    "zakiDashboard.command.submitOpen": "Continue in {{product}}",
    "zakiDashboard.command.submitSignup": "Save and continue",
    "zakiDashboard.command.hints.agent": "Plan the next action.",
    "zakiDashboard.command.hints.brain": "Map pasted text.",
    "zakiDashboard.command.hints.learning": "Learn is coming soon.",
    "zakiDashboard.command.hints.design": "Design is coming soon.",
    "zakiDashboard.command.hints.hire": "Career is gated.",
    "zakiDashboard.command.hints.spaces": "Chat immediately.",
    "zakiDashboard.command.details.agent.bestFor": "Planning, follow-through, tool runs, and browser work.",
    "zakiDashboard.command.details.agent.memory": "Personal brain after sign-in.",
    "zakiDashboard.command.details.agent.truth": "Anonymous Agent starts as planning preview.",
    "zakiDashboard.command.details.spaces.bestFor": "Quick questions, drafting, and thinking out loud. No setup.",
    "zakiDashboard.command.details.spaces.memory": "Session only until you sign in.",
    "zakiDashboard.command.details.spaces.truth": "Chat runs now with weekly usage shown as a percentage.",
    "zakiDashboard.command.details.hire.bestFor": "Finding your next role, improving your CV, comparing fit, and preparing applications.",
    "zakiDashboard.command.details.hire.memory": "Career pipeline memory is not public yet.",
    "zakiDashboard.command.details.hire.truth": "Gated for private access. Use Chat or Agent today.",
    "zakiDashboard.command.details.design.bestFor": "Product direction and design project generation.",
    "zakiDashboard.command.details.design.memory": "Design project memory is not public yet.",
    "zakiDashboard.command.details.design.truth": "Coming soon. Use Chat or Agent today.",
    "zakiDashboard.command.details.learning.bestFor": "Study plans and guided practice.",
    "zakiDashboard.command.details.learning.memory": "Learner memory is not public yet.",
    "zakiDashboard.command.details.learning.truth": "Coming soon. Use Chat or Agent today.",
    "zakiDashboard.links.howItWorks": "How it works",
    "zakiDashboard.links.waysToBuy": "Plans",
    "zakiDashboard.links.fullPalette": "Product overview",
    "zakiDashboard.intro.kicker": "First run",
    "zakiDashboard.intro.title": "Start the work first. Choose an account when it matters.",
    "zakiDashboard.intro.progress": "Intro slides",
    "zakiDashboard.intro.goToSlide": "Go to slide {{index}}",
    "zakiDashboard.intro.slides.what.title": "What is ZAKI?",
    "zakiDashboard.intro.slides.what.body": "A command workspace.",
    "zakiDashboard.intro.slides.what.bullets.command": "Write the work once.",
    "zakiDashboard.intro.slides.what.bullets.route": "Choose the product lane.",
    "zakiDashboard.intro.slides.what.bullets.keep": "Keep local drafts.",
    "zakiDashboard.intro.slides.buy.title": "Activate the loop",
    "zakiDashboard.intro.slides.buy.body": "Try ZAKI as a guest with a clear weekly usage meter.",
    "zakiDashboard.intro.slides.buy.bullets.guest": "Guest: start immediately with weekly usage shown as a percentage.",
    "zakiDashboard.intro.slides.buy.bullets.account": "Account saves work.",
    "zakiDashboard.intro.slides.buy.bullets.plan": "Plan adds capacity.",
    "zakiDashboard.intro.slides.palette.title": "Visit the website when you want the full story",
    "zakiDashboard.intro.slides.palette.body": "The website is the narrative layer.",
    "zakiDashboard.intro.slides.palette.bullets.chat": "Launch core.",
    "zakiDashboard.intro.slides.palette.bullets.preview": "Truthful previews.",
    "zakiDashboard.intro.slides.palette.bullets.website": "Visit the website.",
    "zakiDashboard.intro.back": "Back",
    "zakiDashboard.intro.next": "Next",
    "zakiDashboard.intro.startTyping": "Enter dashboard",
    "zakiDashboard.intro.visitWebsite": "Visit website",
    "zakiDashboard.intro.startFreeChat": "Start free chat",
    "zakiDashboard.intro.createAccount": "Create account",
    "zakiDashboard.intro.openWebsite": "Open website",
    "zakiDashboard.anonymousWork.title": "Continue what you started",
    "zakiDashboard.anonymousWork.subtitle": "Same-browser history.",
    "zakiDashboard.anonymousWork.claimedTitle": "We kept your work",
    "zakiDashboard.anonymousWork.claimedSubtitle": "Your recent browser work is available after sign-in.",
    "zakiDashboard.anonymousWork.save": "Save this work",
    "zakiDashboard.support.label": "Dashboard telemetry",
    "zakiDashboard.support.session": "Session",
    "zakiDashboard.support.open": "open",
    "zakiDashboard.support.scopes": "scopes",
    "common.close": "Close",
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
    "zakiDashboard.meter.usagePercent": "{{percent}}% of your weekly usage",
    "zakiDashboard.meter.used": "Used",
    "zakiDashboard.meter.remaining": "Remaining",
    "zakiDashboard.meter.remainingOfLimit": "{{percent}}% of your weekly usage",
    "zakiDashboard.meter.usedOfLimit": "{{percent}}% of your weekly usage",
    "zakiDashboard.meter.usedUnits": "{{percent}}% of your weekly usage",
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
    "zakiDashboard.products.requestAccess": "Request access",
    "zakiDashboard.products.joinWaitlist": "Join waitlist",
    "zakiDashboard.products.openGateAria": "Open {{product}} access state",
    "zakiDashboard.products.notAvailable": "Not available",
    "zakiDashboard.products.notAvailableAria": "{{product}} is not available",
    "zakiDashboard.products.names.agent": "Agent",
    "zakiDashboard.products.names.spaces": "Chat",
    "zakiDashboard.products.names.brain": "Brain",
    "zakiDashboard.products.names.learning": "Learn",
    "zakiDashboard.products.names.hire": "Career",
    "zakiDashboard.products.names.design": "Design",
    "zakiDashboard.products.tags.live": "Live",
    "zakiDashboard.products.tags.privateBeta": "Private access",
    "zakiDashboard.products.tags.waitlist": "Waitlist",
    "zakiDashboard.products.tags.controlPlane": "Control plane",
    "zakiDashboard.products.tags.degraded": "Degraded",
    "zakiDashboard.products.tags.readOnly": "Read only",
    "zakiDashboard.products.tags.maintenance": "Maintenance",
    "zakiDashboard.products.descriptions.agent": "Personal agent.",
    "zakiDashboard.products.descriptions.spaces": "Workspace chat.",
    "zakiDashboard.products.descriptions.brain": "Memory graph.",
    "zakiDashboard.products.descriptions.learning": "Study surface.",
    "zakiDashboard.products.descriptions.hire": "Career support.",
    "zakiDashboard.products.descriptions.design": "Design surface.",
    "zakiDashboard.memory.title": "Memory scopes",
    "zakiDashboard.memory.subtitle": "Every product writes to a known memory owner.",
    "zakiDashboard.memory.pending": "Pending",
    "zakiDashboard.memory.loading": "Memory scopes are loading.",
    "zakiDashboard.memory.open": "Open memory",
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
    "zakiDashboard.activeWork.openSessionAria": "Open Agent session {{title}}",
    "zakiDashboard.memoryBridge.ariaLabel": "Memory import",
    "zakiDashboard.memoryBridge.kicker": "Memory bridge",
    "zakiDashboard.memoryBridge.title": "Bring your memory from ChatGPT/Claude",
    "zakiDashboard.memoryBridge.copy": "Paste a structured export once.",
    "zakiDashboard.memoryBridge.action": "Bring your memory from ChatGPT/Claude",
    "zakiDashboard.memoryBridge.dismiss": "Not now",
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
    "settingsModal.productsAccess.memoryScopes.hireMemory": "Career memory",
    "settingsModal.productsAccess.memoryScopes.designMemory": "Design memory",
    "settingsModal.productsAccess.memoryScopes.sessionMemory": "Session memory",
  };
  const value = dictionary[key] || key;
  return value
    .replace("{{name}}", String(options?.name ?? ""))
    .replace("{{hours}}", String(options?.hours ?? ""))
    .replace("{{remaining}}", String(options?.remaining ?? ""))
    .replace("{{percent}}", String(options?.percent ?? ""))
    .replace("{{limit}}", String(options?.limit ?? ""))
    .replace("{{used}}", String(options?.used ?? ""))
    .replace("{{percent}}", String(options?.percent ?? ""))
    .replace("{{reset}}", String(options?.reset ?? ""))
    .replace("{{count}}", String(options?.count ?? ""))
    .replace("{{total}}", String(options?.total ?? ""))
    .replace("{{product}}", String(options?.product ?? ""))
    .replace("{{index}}", String(options?.index ?? ""))
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
    route: "/products/agent",
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
    route: "/products/spaces",
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
    route: "/products/learn",
    entryPoint: "Learning",
    memoryScope: "learner_memory",
  },
  {
    productId: "hire",
    label: "ZAKI Career",
    productKind: "product",
    state: "disabled",
    lifecycle: "future",
    visibleInSettings: true,
    route: "/products/hire",
    entryPoint: "Career",
    memoryScope: "hire_memory",
  },
  {
    productId: "design",
    label: "ZAKI Design",
    productKind: "product",
    state: "disabled",
    lifecycle: "future",
    visibleInSettings: true,
    route: "/products/design",
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
    route: "/products/brain",
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
  availableNow: {
    agent: {
      requiredReserveUnits: 40,
      weeklyRemaining: 1420,
      rollingRemaining: 80,
      topupUnits: 0,
      effectiveRemaining: 80,
      limitingWindow: "rolling",
      constraint: null,
      shortfall: 0,
      available: true,
      resetAt: null,
    },
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

function renderDashboard(
  onSendExample = jest.fn(),
  props: Partial<React.ComponentProps<typeof ZakiDashboard>> = {},
) {
  return render(
    <MemoryRouter>
      <ZakiDashboard onSendExample={onSendExample} {...props} />
    </MemoryRouter>
  );
}

describe("ZakiDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window, "open", {
      configurable: true,
      value: mockOpen,
    });
    window.sessionStorage.clear();
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
    expect(screen.getByRole("heading", { name: "Let's move." })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hi, Nova User. 1,420 left." })).not.toBeInTheDocument();
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5% of your weekly usage").length).toBeGreaterThan(0);
    expect(screen.queryByText("1,420")).not.toBeInTheDocument();
    expect(screen.getAllByText("Signed-in account").length).toBeGreaterThan(0);

    expect(screen.getByTestId("zaki-dashboard-product-hint")).toHaveTextContent("Agent");
    expect(screen.getByTestId("zaki-dashboard-product-hint")).toHaveTextContent("Planning, follow-through");
    expect(screen.queryByTestId("zaki-dashboard-products")).not.toBeInTheDocument();
    expect(screen.queryByText("ZAKI CLI")).not.toBeInTheDocument();
  });

  it("orders command products for signed-in users by launch workflow", () => {
    renderDashboard();

    const tabs = within(screen.getByTestId("zaki-dashboard-command-strip"))
      .getAllByRole("tab")
      .map((tab) => tab.getAttribute("aria-label"));

    expect(tabs).toEqual(["Agent", "Brain", "Chat", "Design", "Learn", "Career"]);
  });

  it("routes signed-in command prompts to the selected product surface", () => {
    renderDashboard();

    fireEvent.change(screen.getByLabelText("Describe what you want ZAKI to do"), {
      target: { value: "Plan the launch sequence" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue in Agent" }));

    expect(mockNavigate).toHaveBeenCalledWith("/agent");
  });

  it("blocks signed-in Agent submit when current capacity is below the Agent reserve", () => {
    mockUseMeterStatus.mockReturnValue({
      data: {
        data: {
          ...signedInMeter,
          rolling: { windowHours: 5, limit: 40, used: 20, remaining: 20 },
          weekly: { limit: 1500, used: 80, remaining: 1420 },
          availableNow: {
            agent: {
              requiredReserveUnits: 40,
              weeklyRemaining: 1420,
              rollingRemaining: 20,
              topupUnits: 0,
              effectiveRemaining: 20,
              limitingWindow: "rolling",
              constraint: "rolling",
              shortfall: 20,
              available: false,
              resetAt: "2026-05-20T12:00:00.000Z",
            },
          },
        },
      },
      isLoading: false,
    });

    renderDashboard();

    fireEvent.change(screen.getByLabelText("Describe what you want ZAKI to do"), {
      target: { value: "Plan the launch sequence" },
    });

    expect(screen.getAllByText("Current capacity window is low.").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Continue in Agent" })).toBeDisabled();
    expect(screen.getByText("Wait for the current window to refresh.")).toBeInTheDocument();
  });

  it("keeps signed-in Agent submit enabled when current capacity satisfies reserve", () => {
    renderDashboard();

    fireEvent.change(screen.getByLabelText("Describe what you want ZAKI to do"), {
      target: { value: "Plan the launch sequence" },
    });

    expect(screen.getByRole("button", { name: "Continue in Agent" })).not.toBeDisabled();
  });

  it("shows a calm upgrade nudge near the weekly cap without raw units", () => {
    mockUseMeterStatus.mockReturnValue({
      data: {
        data: {
          ...signedInMeter,
          weekly: {
            limit: 8000,
            used: 6560,
            remaining: 1440,
            resetAt: "2026-05-25T00:00:00.000Z",
          },
        },
      },
      isLoading: false,
    });

    renderDashboard();

    expect(screen.getByText("82% of your weekly usage")).toBeInTheDocument();
    expect(screen.getByText("You're at 82% this week — upgrade for more room.")).toBeInTheDocument();
    expect(screen.queryByText("6,560")).not.toBeInTheDocument();
    expect(screen.queryByText("8,000")).not.toBeInTheDocument();
  });

  it("keeps signed-in Agent submit enabled when weekly is empty but effective capacity satisfies reserve", () => {
    mockUseMeterStatus.mockReturnValue({
      data: {
        data: {
          ...signedInMeter,
          rolling: { windowHours: 5, limit: 40, used: 0, remaining: 40 },
          weekly: { limit: 100, used: 100, remaining: 0, topupUnits: 40 },
          availableNow: {
            agent: {
              requiredReserveUnits: 40,
              weeklyRemaining: 0,
              rollingRemaining: 40,
              topupUnits: 40,
              effectiveRemaining: 40,
              limitingWindow: "weekly",
              constraint: null,
              shortfall: 0,
              available: true,
              resetAt: null,
            },
          },
        },
      },
      isLoading: false,
    });

    renderDashboard();

    fireEvent.change(screen.getByLabelText("Describe what you want ZAKI to do"), {
      target: { value: "Plan the launch sequence" },
    });

    expect(screen.getByRole("button", { name: "Continue in Agent" })).not.toBeDisabled();
    expect(screen.queryByText("Weekly usage is full.")).not.toBeInTheDocument();
  });

  it("offers signed-in first-run users a one-time memory bridge", () => {
    const onOpenMemoryImport = jest.fn();

    renderDashboard(jest.fn(), { onOpenMemoryImport });

    fireEvent.click(screen.getByRole("button", { name: "Bring your memory from ChatGPT/Claude" }));

    expect(onOpenMemoryImport).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("zaki:memory-bridge-offered:42")).toBe("1");
    expect(
      screen.queryByRole("button", { name: "Bring your memory from ChatGPT/Claude" })
    ).not.toBeInTheDocument();
  });

  it("does not repeat the memory bridge once the signed-in user has seen it", () => {
    window.localStorage.setItem("zaki:memory-bridge-offered:42", "1");

    renderDashboard(jest.fn(), { onOpenMemoryImport: jest.fn() });

    expect(
      screen.queryByRole("button", { name: "Bring your memory from ChatGPT/Claude" })
    ).not.toBeInTheDocument();
  });

  it("opens recent signed-in Agent sessions from the dashboard", () => {
    const onOpenSession = jest.fn();

    renderDashboard(jest.fn(), { onOpenSession });

    fireEvent.click(screen.getByRole("button", { name: /Open Agent session Investor brief/i }));

    expect(onOpenSession).toHaveBeenCalledWith("agent:4821");
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
    expect(screen.getAllByText("Anonymous free session").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3% of your weekly usage").length).toBeGreaterThan(0);
    expect(screen.queryByText("97")).not.toBeInTheDocument();
  });

  it("orders command products for anonymous users around immediate chat", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    const tabs = within(screen.getByTestId("zaki-dashboard-command-strip"))
      .getAllByRole("tab")
      .map((tab) => tab.getAttribute("aria-label"));

    expect(tabs).toEqual(["Chat", "Agent", "Brain", "Design", "Learn", "Career"]);
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Type a prompt to start.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save this work" })).not.toBeInTheDocument();
  });

  it("preserves typed anonymous prompts when using the sign-in entry point", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    fireEvent.click(screen.getByRole("tab", { name: "Brain" }));
    fireEvent.change(screen.getByLabelText("Describe what you want ZAKI to do"), {
      target: { value: "Map these notes after I sign in" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mockNavigate).toHaveBeenCalledWith("/?auth=login&next=%2Fbrain");
    const ledger = JSON.parse(window.localStorage.getItem(ANONYMOUS_WORK_LEDGER_KEY) || "{}");
    expect(ledger.items?.[0]).toMatchObject({
      productId: "brain",
      taskKind: "map",
      prompt: "Map these notes after I sign in",
      status: "draft",
    });
    const intent = JSON.parse(window.localStorage.getItem(PENDING_INTENT_KEY) || "{}");
    expect(intent).toMatchObject({
      productId: "brain",
      prompt: "Map these notes after I sign in",
      returnTo: "/brain",
    });
  });

  it("frames the Career product as a user career lane", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    fireEvent.click(screen.getByRole("tab", { name: "Career" }));

    const hint = screen.getByTestId("zaki-dashboard-product-hint");
    expect(hint).toHaveTextContent("Career is gated.");
    expect(hint).toHaveTextContent("improving your CV");
    expect(hint).toHaveTextContent("Gated for private access. Use Chat or Agent today.");
    expect(screen.getByRole("button", { name: "Career coming soon" })).toBeDisabled();
    expect(hint).not.toHaveTextContent("Job descriptions");
    expect(hint).not.toHaveTextContent("Candidate");
  });

  it("submits anonymous chat from the command dashboard with local work and pending intent", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });
    const onSendExample = jest.fn();

    renderDashboard(onSendExample);

    fireEvent.change(screen.getByLabelText("Describe what you want ZAKI to do"), {
      target: { value: "Let's test the platform flow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));

    expect(onSendExample).toHaveBeenCalledWith("Let's test the platform flow");
    const ledger = JSON.parse(window.localStorage.getItem(ANONYMOUS_WORK_LEDGER_KEY) || "{}");
    expect(ledger.items?.[0]).toMatchObject({
      productId: "spaces",
      taskKind: "chat",
      prompt: "Let's test the platform flow",
      status: "draft",
      meterRemaining: 97,
    });
    const intent = JSON.parse(window.localStorage.getItem(PENDING_INTENT_KEY) || "{}");
    expect(intent).toMatchObject({
      productId: "spaces",
      prompt: "Let's test the platform flow",
      returnTo: "/spaces",
    });
  });

  it("shows returning anonymous work and continues a saved space thread", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });
    upsertAnonymousWorkItem({
      productId: "spaces",
      taskKind: "chat",
      prompt: "Continue this product launch outline",
      title: "Launch outline",
      route: "/spaces/zaky/threads/thread-1",
      threadId: "thread-1",
      meterRemaining: 21,
      status: "succeeded",
    });

    renderDashboard();

    expect(screen.getByTestId("zaki-anonymous-work")).toHaveTextContent("Continue what you started");
    fireEvent.click(screen.getByText("Launch outline"));

    expect(mockNavigate).toHaveBeenCalledWith("/spaces/zaky/threads/thread-1");
  });

  it("claims returning anonymous work after sign-in and clears the local ledger", () => {
    upsertAnonymousWorkItem({
      productId: "agent",
      taskKind: "preview",
      prompt: "Plan my launch sequence",
      title: "Launch sequence",
      route: "/agent",
      threadId: null,
      meterRemaining: 12,
      status: "draft",
    });

    renderDashboard();

    expect(screen.getByTestId("zaki-anonymous-work")).toHaveTextContent("We kept your work");
    expect(screen.getByTestId("zaki-anonymous-work")).toHaveTextContent("Launch sequence");
    expect(window.localStorage.getItem(ANONYMOUS_WORK_LEDGER_KEY)).toBeNull();
  });

  it("keeps future spokes visible but coming soon without creating auth work", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    for (const product of ["Design", "Learn", "Career"]) {
      fireEvent.click(screen.getByRole("tab", { name: product }));
      fireEvent.change(screen.getByLabelText("Describe what you want ZAKI to do"), {
        target: { value: `Try ${product}` },
      });

      expect(screen.getByTestId("zaki-dashboard-product-hint")).toHaveTextContent("Coming soon");
      expect(screen.getByRole("button", { name: `${product} coming soon` })).toBeDisabled();
    }

    expect(screen.queryByRole("button", { name: "Save this work" })).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/?auth=signup"));
    expect(window.localStorage.getItem(ANONYMOUS_WORK_LEDGER_KEY)).toBeNull();
    expect(window.localStorage.getItem(PENDING_INTENT_KEY)).toBeNull();
  });

  it("keeps the prompt visible and offers choices when weekly usage is full", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });
    mockUseAnonymousMeterStatus.mockReturnValue({
      data: {
        data: {
          success: true,
          identity: { type: "anonymous", anonymousSessionId: "anon-empty" },
          plan: { tier: "free", label: "Free", source: "anonymous" },
          rolling: { windowHours: 5, limit: 10, used: 10, remaining: 0 },
          weekly: { limit: 100, used: 100, remaining: 0 },
          products: {},
        },
      },
      isLoading: false,
    });

    renderDashboard();

    const textarea = screen.getByLabelText("Describe what you want ZAKI to do");
    fireEvent.change(textarea, {
      target: { value: "Do not lose this exhausted-credit prompt" },
    });

    expect(screen.getByText("Weekly usage is full.")).toBeInTheDocument();
    expect(screen.getByText("100% of your weekly usage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start chat" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save and sign up" }));

    expect(textarea).toHaveValue("Do not lose this exhausted-credit prompt");
    expect(mockNavigate).toHaveBeenCalledWith("/?auth=signup&next=%2Fspaces");
  });

  it("shows and dismisses the first-run intro for anonymous users", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    expect(screen.getByTestId("zaki-dashboard-intro")).toHaveTextContent("Start the work first. Choose an account when it matters.");
    expect(screen.getByTestId("zaki-dashboard-intro-slide")).toHaveTextContent("What is ZAKI?");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Enter dashboard" }));

    expect(screen.queryByTestId("zaki-dashboard-intro")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("zaki:dashboard-v2-intro-dismissed")).toBe("1");
  });

  it("runs the intro as three slides and routes the website action", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    const slide = screen.getByTestId("zaki-dashboard-intro-slide");
    expect(slide).toHaveTextContent("What is ZAKI?");
    expect(slide).not.toHaveTextContent("Activate the loop");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(slide).toHaveTextContent("Activate the loop");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(slide).toHaveTextContent("Visit the website when you want the full story");
    fireEvent.click(screen.getByRole("button", { name: "Visit website" }));

    expect(mockOpen).toHaveBeenCalledWith("https://chatzaki.com/", "_blank", "noopener,noreferrer");
    expect(window.localStorage.getItem("zaki:dashboard-v2-intro-dismissed")).toBe("1");
  });

  it("wires the activation slide to the composer", async () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Start free chat" }));

    expect(screen.queryByTestId("zaki-dashboard-intro")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText("Describe what you want ZAKI to do")).toHaveFocus();
    });
    expect(window.localStorage.getItem("zaki:dashboard-v2-intro-dismissed")).toBe("1");
  });

  it("wires the activation slide to signup", () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isHydrating: false,
      isLoading: false,
    });

    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.queryByTestId("zaki-dashboard-intro")).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/?auth=signup");
    expect(window.localStorage.getItem("zaki:dashboard-v2-intro-dismissed")).toBe("1");
  });

  it("places the product explainer before the command input", () => {
    renderDashboard();

    const hint = screen.getByTestId("zaki-dashboard-product-hint");
    const textarea = screen.getByLabelText("Describe what you want ZAKI to do");

    expect(Boolean(hint.compareDocumentPosition(textarea) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it("labels the current website entry points and keeps How it works in the popup", () => {
    window.localStorage.setItem("zaki:dashboard-v2-intro-dismissed", "1");
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Website" }));
    expect(mockOpen).toHaveBeenCalledWith("https://chatzaki.com/", "_blank", "noopener,noreferrer");
    mockNavigate.mockClear();
    mockOpen.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "How it works" }));
    expect(screen.getByTestId("zaki-dashboard-intro")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Plans" }));
    expect(mockNavigate).toHaveBeenCalledWith("/pricing");

    fireEvent.click(screen.getByRole("button", { name: "Product overview" }));
    expect(mockOpen).toHaveBeenCalledWith("https://chatzaki.com/product", "_blank", "noopener,noreferrer");
  });
});
