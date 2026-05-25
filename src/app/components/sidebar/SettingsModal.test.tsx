import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsModal } from "./SettingsModal";

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  exportAccountData: jest.fn(),
  fetchGoogleOAuthStatus: jest.fn(async () => ({
    response: { ok: true },
    data: { enabled: true },
  })),
}));

jest.mock("@/lib/productTelemetry", () => ({
  trackProductEvent: jest.fn(async () => undefined),
}));

const tMock = (key: string, options?: Record<string, unknown>) => {
  const dictionary: Record<string, string> = {
    "settingsModal.header.title": "Settings",
    "settingsModal.header.subtitle": "Account, billing, usage, memory, and access controls",
    "settingsModal.nav.label": "Settings sections",
    "settingsModal.nav.account": "Account",
    "settingsModal.nav.connections": "Connections",
    "settingsModal.nav.billing": "Billing",
    "settingsModal.nav.products": "Products",
    "settingsModal.nav.usage": "Usage",
    "settingsModal.nav.memoryData": "Memory",
    "settingsModal.nav.developerAccess": "Developer",
    "settingsModal.nav.privacy": "Privacy",
    "settingsModal.sections.account": "Account",
    "settingsModal.sections.profile": "Profile",
    "settingsModal.sections.preferences": "Preferences",
    "settingsModal.sections.connections": "Connected accounts",
    "settingsModal.sections.billing": "Billing",
    "settingsModal.sections.planBilling": "Plan & Billing",
    "settingsModal.sections.productsAccess": "Products & Access",
    "settingsModal.sections.usage": "Usage",
    "settingsModal.sections.memoryData": "Memory & Data",
    "settingsModal.sections.developerAccess": "Developer Access",
    "settingsModal.sections.privacy": "Privacy",
    "settingsModal.sections.dataPrivacy": "Data & Privacy",
    "settingsModal.profile.displayName": "Display name",
    "settingsModal.profile.email": "Email",
    "settingsModal.preferences.theme": "Theme",
    "settingsModal.preferences.themeOptions.light": "Light",
    "settingsModal.preferences.themeOptions.dark": "Dark",
    "settingsModal.preferences.themeOptions.system": "System",
    "settings.language": "Language",
    "language.english": "English",
    "language.arabic": "Arabic",
    "settingsModal.connections.google": "Google",
    "settingsModal.connections.googleHelper": "Sign-in provider",
    "settingsModal.connections.checking": "Checking",
    "settingsModal.connections.available": "Available",
    "settingsModal.connections.notConfigured": "Not configured",
    "settingsModal.plan.currentPlan": "Current plan",
    "settingsModal.plan.status": "Status",
    "settingsModal.plan.statusValues.active": "active",
    "settingsModal.plan.statusValues.inactive": "inactive",
    "settingsModal.plan.viewPricing": "View pricing",
    "settingsModal.plan.managePlan": "Manage plan",
    "settingsModal.plan.upgrade": "Upgrade",
    "settingsModal.usage.plan": "Plan",
    "settingsModal.usage.weeklyAllowance": "Weekly allowance",
    "settingsModal.usage.weeklyAllowanceValue": "{{limit}} units",
    "settingsModal.usage.weeklyAllowancePending": "Policy pending",
    "settingsModal.usage.burstWindow": "Burst window",
    "settingsModal.usage.burstWindowValue": "{{hours}} hours",
    "settingsModal.usage.remainingOfLimit": "{{remaining}} / {{limit}} left",
    "settingsModal.usage.loading": "Loading usage...",
    "settingsModal.usage.pending": "Pending",
    "settingsModal.usage.unavailable": "Unavailable",
    "settingsModal.usage.memoryGoverned": "Memory policy",
    "settingsModal.usage.usedOfLimit": "{{used}} / {{limit}}",
    "settingsModal.usage.usedUnits": "{{used}} used",
    "settingsModal.usage.usedUnlimited": "{{used}} · unlimited",
    "settingsModal.usage.period.day": "Daily",
    "settingsModal.usage.period.week": "Weekly",
    "settingsModal.usage.period.none": "No reset period",
    "settingsModal.usage.resetPending": "Reset pending",
    "settingsModal.usage.helper":
      "This is the platform usage view. Agent-specific runtime usage remains inside Agent settings.",
    "settingsModal.productsAccess.subtitle":
      "Product availability, memory ownership, and entry surfaces stay separate from billing and usage meters.",
    "settingsModal.productsAccess.loading": "Loading product access...",
    "settingsModal.productsAccess.empty": "Product access has not been published yet.",
    "settingsModal.productsAccess.pending": "Pending",
    "settingsModal.productsAccess.helper":
      "Product state controls routing and availability. Billing entitlement and meter debits remain separate.",
    "settingsModal.productsAccess.fields.lifecycle": "Lifecycle",
    "settingsModal.productsAccess.fields.memory": "Memory scope",
    "settingsModal.productsAccess.fields.entryPoint": "Entry point",
    "settingsModal.productsAccess.states.enabled": "Enabled",
    "settingsModal.productsAccess.states.disabled": "Disabled",
    "settingsModal.productsAccess.states.maintenance": "Maintenance",
    "settingsModal.productsAccess.states.degraded": "Degraded",
    "settingsModal.productsAccess.states.hidden": "Hidden",
    "settingsModal.productsAccess.states.readOnly": "Read only",
    "settingsModal.productsAccess.lifecycle.current": "Current",
    "settingsModal.productsAccess.lifecycle.future": "Future",
    "settingsModal.productsAccess.lifecycle.unknown": "Unknown",
    "settingsModal.productsAccess.memoryScopes.personalBrain": "Personal brain",
    "settingsModal.productsAccess.memoryScopes.workspaceMemory": "Workspace memory",
    "settingsModal.productsAccess.memoryScopes.learnerMemory": "Learner memory",
    "settingsModal.productsAccess.memoryScopes.hireMemory": "Hire memory",
    "settingsModal.productsAccess.memoryScopes.designMemory": "Design memory",
    "settingsModal.productsAccess.memoryScopes.sessionMemory": "Session memory",
    "settingsModal.productsAccess.entryPoints.spaces": "Spaces / Chat",
    "settingsModal.productsAccess.entryPoints.agent": "Agent workbench",
    "settingsModal.productsAccess.entryPoints.learning": "Learning",
    "settingsModal.productsAccess.entryPoints.hire": "Hire",
    "settingsModal.productsAccess.entryPoints.design": "Design",
    "settingsModal.productsAccess.entryPoints.brain": "Memory control plane",
    "settingsModal.productsAccess.entryPoints.cli": "CLI",
    "settingsModal.productsAccess.entryPoints.localApp": "Local app",
    "settingsModal.productsAccess.entryPoints.extensions": "Extensions",
    "settingsModal.memoryData.openMemory": "Open memory controls",
    "settingsModal.privacy.exportAllData": "Export all data",
    "settingsModal.privacy.exportHelper": "Download your chats and files",
    "settingsModal.privacy.deleteAccount": "Delete account",
    "settingsModal.privacy.deleteWarning": "This action cannot be undone",
    "settingsModal.privacy.deletePrompt": "Type your email to confirm permanent account deletion.",
    "settingsModal.privacy.deletePermanently": "Delete permanently",
    "settingsModal.privacy.keepAccount": "Keep account",
    "settingsModal.footer.changesApplyImmediately": "Changes apply immediately",
    "settingsModal.footer.cancel": "Cancel",
    "settingsModal.footer.saveChanges": "Save changes",
    "sidebar.profile.planBadge.free": "Free",
    "sidebar.profile.planBadge.personal": "Personal",
    "sidebar.profile.planBadge.codeActive": "Access code",
  };
  const value = dictionary[key] || key;
  return value
    .replace("{{limit}}", String(options?.limit ?? ""))
    .replace("{{remaining}}", String(options?.remaining ?? ""))
    .replace("{{hours}}", String(options?.hours ?? ""))
    .replace("{{used}}", String(options?.used ?? ""))
    .replace("{{reset}}", String(options?.reset ?? ""));
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: {
      language: "en",
      changeLanguage: jest.fn(),
    },
  }),
}));

jest.mock("@/queries", () => ({
  useEntitlements: () => ({
    data: {
      data: {
        plan: { tier: "personal", status: "active", cancelAtPeriodEnd: false },
        access: { active: false, expiresAt: null, campaign: null },
        effective: {
          tier: "personal",
          status: "active",
          source: "subscription",
          premium: true,
        },
      },
    },
  }),
  useBillingConfig: () => ({
    data: {
      data: {
        configured: {
          checkoutEnabled: true,
          portalEnabled: true,
          cancelEnabled: true,
        },
      },
    },
  }),
  usePlatformUsageSummary: () => ({
    data: {
      data: {
        success: true,
        plan: { id: "pro", label: "Pro", source: "subscription", premium: true },
        allowance: {
          weekly: { configured: true, limit: 1500 },
          burst: { windowHours: 5 },
        },
        products: {
          spaces: {
            productId: "spaces",
            label: "ZAKI Spaces",
            available: true,
            lifecycle: "current",
            memoryScope: "workspace_memory",
            quota: {
              surface: "app_chat",
              period: "day",
              limit: 10,
              used: 2,
              remaining: 8,
              resetAt: "2026-05-20T00:00:00.000Z",
            },
          },
          agent: {
            productId: "agent",
            label: "ZAKI Agent",
            available: true,
            lifecycle: "current",
            memoryScope: "personal_brain",
            quota: {
              surface: "zaki_bot",
              period: "week",
              unlimited: true,
              used: 7,
              resetAt: "2026-05-25T00:00:00.000Z",
            },
          },
          learn: {
            productId: "learn",
            label: "ZAKI Learn",
            available: true,
            lifecycle: "current",
            memoryScope: "learner_memory",
            quota: {
              surface: "learning",
              period: "week",
              limit: 20,
              used: 5,
              remaining: 15,
            },
          },
          hire: {
            productId: "hire",
            label: "ZAKI Hire",
            available: false,
            lifecycle: "future",
            memoryScope: "hire_memory",
            quota: {
              metered: false,
              status: "planned_not_launched",
            },
          },
          design: {
            productId: "design",
            label: "ZAKI Design",
            available: false,
            lifecycle: "future",
            memoryScope: "design_memory",
            quota: {
              metered: false,
              status: "planned_not_launched",
            },
          },
          cli: {
            productId: "cli",
            label: "ZAKI CLI",
            available: false,
            lifecycle: "future",
            memoryScope: "personal_brain",
            quota: {
              metered: false,
              status: "planned_not_launched",
            },
          },
          brain: {
            productId: "brain",
            label: "ZAKI Brain",
            available: true,
            lifecycle: "current",
            memoryScope: "personal_brain",
            quota: {
              metered: false,
              status: "governed_by_memory_policy",
            },
          },
        },
      },
    },
    isLoading: false,
  }),
  useMeterStatus: () => ({
    data: {
      data: {
        success: true,
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
          spaces: {
            id: "spaces",
            state: "enabled",
            weekly: { used: 2, receipts: 1, resetAt: "2026-05-25T00:00:00.000Z" },
          },
          agent: {
            id: "agent",
            state: "enabled",
            weekly: { used: 7, receipts: 2, resetAt: "2026-05-25T00:00:00.000Z" },
          },
          learning: {
            id: "learning",
            state: "enabled",
            weekly: { used: 5, receipts: 1, resetAt: "2026-05-25T00:00:00.000Z" },
          },
          hire: {
            id: "hire",
            state: "disabled",
            weekly: { used: 0, receipts: 0, resetAt: "2026-05-25T00:00:00.000Z" },
          },
          design: {
            id: "design",
            state: "disabled",
            weekly: { used: 0, receipts: 0, resetAt: "2026-05-25T00:00:00.000Z" },
          },
        },
      },
    },
    isLoading: false,
  }),
  useProductRegistry: () => ({
    data: {
      data: {
        success: true,
        products: [
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
            productId: "learning",
            legacyProductId: "learn",
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
          {
            productId: "local_app",
            label: "ZAKI Local App",
            productKind: "client",
            state: "hidden",
            lifecycle: "future",
            visibleInSettings: false,
            route: null,
            entryPoint: "Local app",
            memoryScope: "personal_brain",
          },
          {
            productId: "extensions",
            label: "ZAKI Extensions",
            productKind: "client",
            state: "hidden",
            lifecycle: "future",
            visibleInSettings: false,
            route: null,
            entryPoint: "Extensions",
            memoryScope: "personal_brain",
          },
        ],
      },
    },
    isLoading: false,
  }),
  useCancelSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

function renderSettingsModal() {
  return render(
    <MemoryRouter>
      <SettingsModal
        isOpen
        onClose={() => {}}
        displayName="Nova"
        email="nova@example.com"
        onDisplayNameChange={() => {}}
        themePreference="system"
        onThemeChange={() => {}}
        onSave={() => {}}
        onAccountDeleted={() => {}}
      />
    </MemoryRouter>
  );
}

describe("SettingsModal", () => {
  it("renders the settings control plane as MECE sections", async () => {
    renderSettingsModal();

    const account = screen.getByTestId("settings-account");
    const connections = screen.getByTestId("settings-connections");
    const billing = screen.getByTestId("settings-billing");
    const products = screen.getByTestId("settings-products-access");
    const usage = screen.getByTestId("settings-platform-usage");
    const memoryData = screen.getByTestId("settings-memory-data");
    const developerAccess = screen.getByTestId("settings-developer-access");
    const privacy = screen.getByTestId("settings-privacy");

    expect(screen.getByRole("navigation", { name: "Settings sections" })).toBeInTheDocument();
    for (const label of [
      "Account",
      "Connections",
      "Billing",
      "Products",
      "Usage",
      "Memory",
      "Developer",
      "Privacy",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }

    expect(within(account).getByText("Display name")).toBeInTheDocument();
    expect(within(account).getByText("Theme")).toBeInTheDocument();
    expect(within(billing).getByText("Current plan")).toBeInTheDocument();
    expect(products).toBeInTheDocument();
    expect(usage).toBeInTheDocument();

    await waitFor(() => {
      expect(within(connections).getByText("Available")).toBeInTheDocument();
    });
    expect(within(connections).getByText("Google")).toBeInTheDocument();

    expect(within(memoryData).getByText("Personal brain")).toBeInTheDocument();
    expect(within(memoryData).getByText("Workspace memory")).toBeInTheDocument();
    expect(within(memoryData).getByText("Learner memory")).toBeInTheDocument();
    expect(within(memoryData).getByText("Hire memory")).toBeInTheDocument();
    expect(within(memoryData).getByText("Design memory")).toBeInTheDocument();
    expect(within(memoryData).getByText("Open memory controls")).toBeInTheDocument();
    expect(within(memoryData).getByText("Export all data")).toBeInTheDocument();

    expect(within(developerAccess).getByText("ZAKI CLI")).toBeInTheDocument();
    expect(within(developerAccess).getByText("ZAKI Local App")).toBeInTheDocument();
    expect(within(developerAccess).getByText("ZAKI Extensions")).toBeInTheDocument();

    expect(within(privacy).getByText("Delete account")).toBeInTheDocument();
    expect(within(privacy).queryByText("Export all data")).not.toBeInTheDocument();
  });

  it("renders the platform usage summary as the global usage surface", async () => {
    renderSettingsModal();

    const usage = screen.getByTestId("settings-platform-usage");
    const productsAccess = screen.getByTestId("settings-products-access");

    expect(usage).toBeInTheDocument();
    expect(within(usage).getByText("Usage")).toBeInTheDocument();
    expect(within(usage).getByText("Pro")).toBeInTheDocument();
    expect(within(usage).getByText("1,420 / 1,500 left")).toBeInTheDocument();
    expect(within(usage).getByText("80 / 100 left")).toBeInTheDocument();
    expect(within(usage).getByText("ZAKI Spaces")).toBeInTheDocument();
    expect(within(usage).getByText("2 used")).toBeInTheDocument();
    expect(within(usage).getByText("ZAKI Agent")).toBeInTheDocument();
    expect(within(usage).getByText("7 used")).toBeInTheDocument();
    expect(within(usage).getByText("ZAKI Learn")).toBeInTheDocument();
    expect(within(usage).getByText("5 used")).toBeInTheDocument();
    expect(within(usage).getByText("ZAKI Hire")).toBeInTheDocument();
    expect(within(usage).getByText("ZAKI Design")).toBeInTheDocument();
    expect(within(usage).queryByText("ZAKI Brain")).not.toBeInTheDocument();
    expect(within(usage).queryByText("Memory policy")).not.toBeInTheDocument();
    expect(productsAccess).toBeInTheDocument();
    await waitFor(() => {
      expect(within(screen.getByTestId("settings-connections")).getByText("Available")).toBeInTheDocument();
    });
  });

  it("renders product ownership separately from usage meters", async () => {
    renderSettingsModal();

    const productsAccess = screen.getByTestId("settings-products-access");

    expect(within(productsAccess).getByText("Products & Access")).toBeInTheDocument();
    expect(within(productsAccess).getByText("ZAKI Spaces")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Workspace memory")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Agent workbench")).toBeInTheDocument();
    expect(within(productsAccess).getByText("ZAKI Hire")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Hire memory")).toBeInTheDocument();
    expect(within(productsAccess).getByText("ZAKI Design")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Design memory")).toBeInTheDocument();
    expect(within(productsAccess).getByText("ZAKI Brain")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Memory control plane")).toBeInTheDocument();
    expect(within(productsAccess).getAllByText("Disabled")).toHaveLength(2);
    expect(within(productsAccess).queryByText("ZAKI CLI")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(within(screen.getByTestId("settings-connections")).getByText("Available")).toBeInTheDocument();
    });
  });
});
