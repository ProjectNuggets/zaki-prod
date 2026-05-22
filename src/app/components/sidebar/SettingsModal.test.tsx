import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
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
}));

jest.mock("@/lib/productTelemetry", () => ({
  trackProductEvent: jest.fn(async () => undefined),
}));

const tMock = (key: string, options?: Record<string, unknown>) => {
  const dictionary: Record<string, string> = {
    "settingsModal.header.title": "Settings",
    "settingsModal.header.subtitle": "Profile, preferences, and data controls",
    "settingsModal.sections.profile": "Profile",
    "settingsModal.sections.preferences": "Preferences",
    "settingsModal.sections.planBilling": "Plan & Billing",
    "settingsModal.sections.productsAccess": "Products & Access",
    "settingsModal.sections.usage": "Usage",
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
    "settingsModal.usage.loading": "Loading usage...",
    "settingsModal.usage.pending": "Pending",
    "settingsModal.usage.unavailable": "Unavailable",
    "settingsModal.usage.memoryGoverned": "Memory policy",
    "settingsModal.usage.usedOfLimit": "{{used}} / {{limit}}",
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
    "settingsModal.productsAccess.states.available": "Available",
    "settingsModal.productsAccess.states.disabled": "Disabled",
    "settingsModal.productsAccess.states.planned": "Planned",
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
    "settingsModal.productsAccess.entryPoints.agent": "Agent home",
    "settingsModal.productsAccess.entryPoints.learn": "Learning",
    "settingsModal.productsAccess.entryPoints.hire": "Hire",
    "settingsModal.productsAccess.entryPoints.design": "Design",
    "settingsModal.productsAccess.entryPoints.brain": "Memory control plane",
    "settingsModal.productsAccess.entryPoints.cli": "CLI",
    "settingsModal.productsAccess.entryPoints.localApp": "Local app",
    "settingsModal.productsAccess.entryPoints.extensions": "Extensions",
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
  it("renders the platform usage summary as the global usage surface", () => {
    renderSettingsModal();

    const usage = screen.getByTestId("settings-platform-usage");
    const productsAccess = screen.getByTestId("settings-products-access");

    expect(usage).toBeInTheDocument();
    expect(screen.getByText("Usage")).toBeInTheDocument();
    expect(within(usage).getByText("Pro")).toBeInTheDocument();
    expect(within(usage).getByText("1,500 units")).toBeInTheDocument();
    expect(within(usage).getByText("5 hours")).toBeInTheDocument();
    expect(within(usage).getByText("ZAKI Spaces")).toBeInTheDocument();
    expect(within(usage).getByText("2 / 10")).toBeInTheDocument();
    expect(within(usage).getByText("ZAKI Agent")).toBeInTheDocument();
    expect(within(usage).getByText("7 · unlimited")).toBeInTheDocument();
    expect(within(usage).getByText("ZAKI Brain")).toBeInTheDocument();
    expect(within(usage).getByText("Memory policy")).toBeInTheDocument();
    expect(within(usage).queryByText("ZAKI Hire")).not.toBeInTheDocument();
    expect(productsAccess).toBeInTheDocument();
  });

  it("renders product ownership separately from usage meters", () => {
    renderSettingsModal();

    const productsAccess = screen.getByTestId("settings-products-access");

    expect(within(productsAccess).getByText("Products & Access")).toBeInTheDocument();
    expect(within(productsAccess).getByText("ZAKI Spaces")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Workspace memory")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Agent home")).toBeInTheDocument();
    expect(within(productsAccess).getByText("ZAKI Hire")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Hire memory")).toBeInTheDocument();
    expect(within(productsAccess).getByText("ZAKI Design")).toBeInTheDocument();
    expect(within(productsAccess).getByText("Design memory")).toBeInTheDocument();
    expect(within(productsAccess).getAllByText("Planned")).toHaveLength(2);
    expect(within(productsAccess).queryByText("ZAKI CLI")).not.toBeInTheDocument();
  });
});
