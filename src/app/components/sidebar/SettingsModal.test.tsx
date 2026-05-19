import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
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
            quota: {
              surface: "learning",
              period: "week",
              limit: 20,
              used: 5,
              remaining: 15,
            },
          },
          brain: {
            productId: "brain",
            label: "ZAKI Brain",
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

    expect(screen.getByTestId("settings-platform-usage")).toBeInTheDocument();
    expect(screen.getByText("Usage")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("1,500 units")).toBeInTheDocument();
    expect(screen.getByText("5 hours")).toBeInTheDocument();
    expect(screen.getByText("ZAKI Spaces")).toBeInTheDocument();
    expect(screen.getByText("2 / 10")).toBeInTheDocument();
    expect(screen.getByText("ZAKI Agent")).toBeInTheDocument();
    expect(screen.getByText("7 · unlimited")).toBeInTheDocument();
    expect(screen.getByText("ZAKI Brain")).toBeInTheDocument();
    expect(screen.getByText("Memory policy")).toBeInTheDocument();
  });
});
