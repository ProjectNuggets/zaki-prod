import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SettingsModal } from "./SettingsModal";
import { SettingsPage } from "../settings/SettingsPage";
import { useAuthStore, useUIStore } from "@/stores";
import {
  connectAgentChannelControl,
  createAgentProviderProfile,
  deleteAgentChannelBinding,
  disconnectAgentChannelControl,
  pairAgentExtensionDevice,
  putAgentSecret,
  testAgentChannelControl,
  updateBotSettings,
  updateMemoryPreferences,
  upsertAgentChannelBinding,
} from "@/lib/api";

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  exportAccountData: jest.fn(),
  fetchBotSettings: jest.fn(async () => ({
    response: { ok: true },
    data: {
      group_activation: "mention",
      proactive_updates: true,
      voice_replies: false,
      session_timeout_minutes: 30,
      assistant_mode: "balanced",
      dream_enabled: true,
      query_expansion_enabled: false,
      selected_model: null,
    },
  })),
  fetchMemoryPreferences: jest.fn(async () => ({
    response: { ok: true },
    data: { policy: "balanced", source: "stored", updatedAt: null },
  })),
  updateMemoryPreferences: jest.fn(async (policy) => ({
    response: { ok: true },
    data: { policy, source: "stored", updatedAt: null },
  })),
  fetchGoogleOAuthStatus: jest.fn(async () => ({
    response: { ok: true },
    data: { enabled: true },
  })),
  fetchAgentExtensionDiagnostics: jest.fn(async () => ({
    response: { ok: true },
    data: {
      paired: false,
      last_command_tool: "",
      last_command_result: "",
    },
  })),
  fetchAgentChannels: jest.fn(async () => ({
    response: { ok: true },
    data: {
      channels: [
        {
          id: "telegram",
          label: "Telegram",
          configured: true,
          connected: true,
          live: true,
          available: true,
          bindings_supported: true,
          required_secrets: ["telegram_bot_token"],
          configured_secrets: ["telegram_bot_token"],
          missing_secrets: [],
          bindings: { count: 0, items: [] },
        },
        {
          id: "slack",
          label: "Slack",
          configured: true,
          live: true,
          available: true,
          bindings_supported: true,
          operator_managed_runtime: true,
          required_secrets: ["slack_bot_token", "slack_app_token", "slack_signing_secret"],
          configured_secrets: [],
          missing_secrets: ["slack_bot_token", "slack_app_token", "slack_signing_secret"],
          bindings: {
            count: 1,
            items: [
              {
                id: "bnd_1",
                account_id: "main",
                principal_key: "U123",
                scope_key: "C123",
                thread_key: null,
              },
            ],
          },
        },
        {
          id: "discord",
          label: "Discord",
          live: true,
          available: true,
          bindings_supported: true,
          operator_managed_runtime: true,
          required_secrets: ["discord_bot_token"],
          configured_secrets: [],
          missing_secrets: ["discord_bot_token"],
          bindings: { count: 0, items: [] },
        },
        {
          id: "email",
          label: "Email",
          live: true,
          available: true,
          bindings_supported: true,
          operator_managed_runtime: true,
          required_secrets: ["email_smtp_password", "email_imap_password"],
          configured_secrets: [],
          missing_secrets: ["email_smtp_password", "email_imap_password"],
          bindings: { count: 0, items: [] },
        },
      ],
    },
  })),
  fetchAgentChannelControls: jest.fn(async () => ({
    response: { ok: true },
    data: {
      channels: [
        {
          channel: "slack",
          label: "Slack",
          build_enabled: true,
          operator_configured: true,
          user_managed: true,
          user_connected: true,
          status: "connected",
          secret_refs: [
            { key: "slack_bot_token", label: "Bot token", required: true, present: true },
            { key: "slack_signing_secret", label: "Signing secret", required: true, present: true },
          ],
          config: {},
          last_test: null,
        },
        {
          channel: "discord",
          label: "Discord",
          build_enabled: true,
          operator_configured: true,
          user_managed: true,
          user_connected: false,
          status: "not_connected",
          secret_refs: [
            { key: "discord_bot_token", label: "Bot token", required: true, present: false },
          ],
          config: {},
          last_test: null,
        },
        {
          channel: "email",
          label: "Email",
          build_enabled: true,
          operator_configured: true,
          user_managed: true,
          user_connected: false,
          status: "not_connected",
          secret_refs: [
            { key: "email_imap_password", label: "IMAP password", required: true, present: false },
            { key: "email_smtp_password", label: "SMTP password", required: true, present: false },
          ],
          config: {},
          last_test: null,
        },
        {
          channel: "whatsapp",
          label: "WhatsApp",
          build_enabled: true,
          operator_configured: false,
          user_managed: true,
          user_connected: false,
          status: "not_connected",
          secret_refs: [
            { key: "whatsapp_access_token", label: "Access token", required: true, present: false },
            { key: "whatsapp_verify_token", label: "Verify token", required: true, present: false },
          ],
          config: {},
          last_test: null,
        },
      ],
    },
  })),
  connectAgentChannelControl: jest.fn(async () => ({
    response: { ok: true },
    data: { channel: "slack", status: "connected" },
  })),
  testAgentChannelControl: jest.fn(async () => ({
    response: { ok: true },
    data: { channel: "slack", last_test: { ok: true, detail: "credentials_present" } },
  })),
  disconnectAgentChannelControl: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "disconnected", channel: "slack" },
  })),
  fetchAgentProviderProfiles: jest.fn(async () => ({
    response: { ok: true },
    data: { providers: [] },
  })),
  createAgentProviderProfile: jest.fn(async () => ({
    response: { ok: true },
    data: { id: "provider_1", label: "Local", secret_ref: { present: true } },
  })),
  testAgentProviderProfile: jest.fn(async () => ({
    response: { ok: true },
    data: { id: "provider_1", last_test: { ok: true } },
  })),
  deleteAgentProviderProfile: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "deleted", id: "provider_1" },
  })),
  updateAgentProviderProfile: jest.fn(async () => ({
    response: { ok: true },
    data: { id: "provider_1", label: "Local", secret_ref: { present: true } },
  })),
  fetchAgentExtensionDevices: jest.fn(async () => ({
    response: { ok: true },
    data: { devices: [] },
  })),
  pairAgentExtensionDevice: jest.fn(async () => ({
    response: { ok: true },
    data: { device_id: "device_1", label: "Work laptop" },
  })),
  revokeAgentExtensionDevice: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "revoked", device_id: "device_1" },
  })),
  fetchAgentIntegrations: jest.fn(async () => ({
    response: { ok: true },
    data: {
      integrations: [
        {
          kind: "composio",
          label: "Composio",
          configured: true,
          user_manageable: false,
          managed_by: "operator",
        },
      ],
    },
  })),
  fetchAgentMemoryGovernance: jest.fn(async () => ({
    response: { ok: true },
    data: { total: 12, pii: { phone: 1, email: 1, all: 2 } },
  })),
  purgeAgentMemoryPii: jest.fn(async () => ({
    response: { ok: true },
    data: {
      category: "all",
      dry_run: true,
      candidate_count: 2,
      deleted: null,
      sample_keys: [],
    },
  })),
  forgetAgentMemory: jest.fn(async () => ({
    response: { ok: true },
    data: { key: "mem_1", forgotten: true },
  })),
  exportAgentMemory: jest.fn(async () => ({
    response: { ok: true },
    data: { user_id: "1", count: 0, memories: [] },
  })),
  upsertAgentChannelBinding: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "upserted", id: "bnd_2" },
  })),
  deleteAgentChannelBinding: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "deleted" },
  })),
  listAgentSecrets: jest.fn(async () => ({
    response: { ok: true },
    data: { keys: ["telegram_bot_token"] },
  })),
  putAgentSecret: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "updated" },
  })),
  deleteAgentSecret: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "deleted" },
  })),
  updateBotSettings: jest.fn(async (payload) => ({
    response: { ok: true },
    data: {
      group_activation: payload?.group_activation ?? "mention",
      proactive_updates: payload?.proactive_updates ?? true,
      voice_replies: payload?.voice_replies ?? false,
      session_timeout_minutes: payload?.session_timeout_minutes ?? 30,
      assistant_mode: payload?.assistant_mode ?? "balanced",
      autonomy: payload?.autonomy ?? "full",
      dream_enabled: payload?.dream_enabled ?? true,
      query_expansion_enabled: payload?.query_expansion_enabled ?? false,
      selected_model: payload?.selected_model ?? null,
    },
  })),
  updateProfile: jest.fn(async () => ({
    response: { ok: true },
    data: { success: true, user: { username: "nova@example.com", fullName: "Nova" } },
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
    "settingsModal.nav.planUsage": "Plan & Usage",
    "settingsModal.nav.channels": "Channels",
    "settingsModal.nav.secrets": "Secrets",
    "settingsModal.nav.providers": "Providers",
    "settingsModal.nav.devices": "Devices",
    "settingsModal.nav.billing": "Plan & Usage",
    "settingsModal.nav.products": "Products",
    "settingsModal.nav.usage": "Usage",
    "settingsModal.nav.memoryData": "Memory",
    "settingsModal.nav.developerAccess": "Developer",
    "settingsModal.nav.privacy": "Privacy",
    "settingsModal.sections.account": "Account",
    "settingsModal.sections.profile": "Profile",
    "settingsModal.sections.preferences": "Preferences",
    "settingsModal.sections.connections": "Connected accounts",
    "settingsModal.sections.channels": "Channels",
    "settingsModal.sections.secrets": "Secrets & API keys",
    "settingsModal.sections.providers": "Models & providers",
    "settingsModal.sections.devices": "Browser extension & devices",
    "settingsModal.sections.billing": "Plan & Usage",
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
    "settingsModal.channels.agentTelegram.name": "Agent Telegram",
    "settingsModal.channels.agentTelegram.description":
      "Connect, disconnect, and rotate the Agent Telegram channel.",
    "settingsModal.channels.learningTutors.name": "Learning tutor channels",
    "settingsModal.channels.learningTutors.description":
      "Private-beta tutor channel schema is available through Learning.",
    "settingsModal.channels.loading": "Checking channels",
    "settingsModal.channels.count": "{{count}} launch channels",
    "settingsModal.channels.status.checking": "Checking",
    "settingsModal.channels.otherChannels.name": "Additional channels",
    "settingsModal.channels.otherChannels.description":
      "Teams, WhatsApp, Signal, Matrix, and other adapters stay hidden until their user-safe BFF contracts are exposed.",
    "settingsModal.channels.status.configured": "Configured",
    "settingsModal.channels.status.notConfigured": "Not configured",
    "settingsModal.channels.status.privateBeta": "Private beta",
    "settingsModal.channels.status.operatorManaged": "Operator managed",
    "settingsModal.channels.openAgentChannels": "Open channels",
    "settingsModal.channels.bindings.count": "{{count}} bindings",
    "settingsModal.channels.bindings.account": "Account",
    "settingsModal.channels.bindings.thread": "Thread optional",
    "settingsModal.channels.bindings.save": "Save binding",
    "settingsModal.channels.bindings.saving": "Saving",
    "settingsModal.channels.bindings.helper":
      "Bindings route inbound identities to your Agent without exposing channel secrets.",
    "settingsModal.channels.bindings.delete": "Delete binding",
    "settingsModal.channels.bindings.missing": "Account, principal, and scope are required.",
    "settingsModal.channels.bindings.saved": "Channel binding saved.",
    "settingsModal.channels.bindings.deleted": "Channel binding deleted.",
    "settingsModal.channels.bindings.saveError": "Unable to save channel binding.",
    "settingsModal.channels.bindings.deleteError": "Unable to delete channel binding.",
    "settingsModal.channels.secrets.configured": "{{count}} secrets stored",
    "settingsModal.channels.secrets.required": "Secrets required",
    "settingsModal.channels.secrets.vaultRefs": "Vault refs",
    "settingsModal.secrets.loading": "Loading secrets",
    "settingsModal.secrets.count": "{{count}} stored",
    "settingsModal.secrets.addOrRotate": "Add or rotate secret",
    "settingsModal.secrets.addOrRotateHelper":
      "Values are write-only after save; Settings shows metadata keys only.",
    "settingsModal.secrets.keyPlaceholder": "OPENAI_API_KEY",
    "settingsModal.secrets.valuePlaceholder": "Secret value",
    "settingsModal.secrets.save": "Save secret",
    "settingsModal.secrets.metadataOnly": "Metadata only",
    "settingsModal.secrets.delete": "Delete secret",
    "settingsModal.secrets.empty": "No secrets stored yet.",
    "settingsModal.providers.operatorDefault.name": "Agent model default",
    "settingsModal.providers.operatorDefault.description":
      "ZAKI chooses the production model route unless a controlled Agent model override is set.",
    "settingsModal.providers.openAiCompatible.name": "OpenAI-compatible provider",
    "settingsModal.providers.openAiCompatible.description":
      "BYOK provider profiles require a BFF profile/test contract before self-service launch.",
    "settingsModal.providers.openapiConnector.name": "OpenAPI connectors",
    "settingsModal.providers.openapiConnector.description":
      "User-managed connector credentials stay hidden until vault auth_ref support is ready.",
    "settingsModal.providers.status.contractNeeded": "Contract needed",
    "settingsModal.providers.status.operatorManaged": "Operator managed",
    "settingsModal.devices.loading": "Checking",
    "settingsModal.devices.paired": "Paired",
    "settingsModal.devices.notPaired": "Not paired",
    "settingsModal.devices.extension.name": "Browser extension",
    "settingsModal.devices.extension.description":
      "Per-user extension diagnostics are live; pairing and revocation UI remain gated.",
    "settingsModal.devices.extension.lastCommand": "Last extension command",
    "settingsModal.devices.extension.noCommand": "No command recorded",
    "settingsModal.plan.currentPlan": "Current plan",
    "settingsModal.plan.status": "Status",
    "settingsModal.plan.statusValues.active": "active",
    "settingsModal.plan.statusValues.inactive": "inactive",
    "settingsModal.plan.viewPricing": "View pricing",
    "settingsModal.plan.managePlan": "Manage plan",
    "settingsModal.plan.manageSubscription": "Manage subscription",
    "settingsModal.plan.viewSubscriptionOptions": "View subscription options",
    "settingsModal.plan.upgradeAgent": "Upgrade to Agent",
    "settingsModal.plan.upgradeComplete": "Upgrade to Complete",
    "settingsModal.plan.syncBilling": "Sync billing",
    "settingsModal.plan.recurringRemaining": "Recurring remaining",
    "settingsModal.plan.topupBalance": "Top-up balance",
    "settingsModal.plan.topups.title": "Unit top-ups",
    "settingsModal.plan.topups.helper":
      "Purchased units persist and are used after recurring allowance.",
    "settingsModal.plan.topups.unavailable": "Top-ups unavailable in this environment.",
    "settingsModal.plan.topups.disabled": "Top-ups unavailable",
    "settingsModal.plan.topups.buyPack": "Buy {{label}}{{priceLabel}}",
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
    "settingsModal.agentSettings.reasoningEffort.name": "Reasoning effort",
    "settingsModal.agentSettings.reasoningEffort.helper":
      "Default thinking depth for new Agent turns. Live per-turn controls stay in Agent.",
    "settingsModal.agentSettings.reasoningEffort.options.low": "Low reasoning",
    "settingsModal.agentSettings.reasoningEffort.options.medium": "Medium reasoning",
    "settingsModal.agentSettings.reasoningEffort.options.high": "High reasoning",
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
    "settingsModal.agentModel.eyebrow": "Agent model",
    "settingsModal.agentModel.title": "AI model routing",
    "settingsModal.agentModel.operatorDefault": "Operator default",
    "settingsModal.agentModel.userSelected": "User selected",
    "settingsModal.agentModel.tableLabel": "Agent model options",
    "settingsModal.agentModel.columns.model": "Model",
    "settingsModal.agentModel.columns.context": "Context",
    "settingsModal.agentModel.columns.cost": "Cost",
    "settingsModal.agentModel.columns.action": "Action",
    "settingsModal.agentModel.costClass": "Class {{class}}",
    "settingsModal.agentModel.current": "Current",
    "settingsModal.agentModel.use": "Use",
    "settingsModal.agentModel.useOperatorDefault": "Use operator default",
    "settingsModal.agentModel.helper":
      "Model changes persist per user and take effect on the next Agent turn.",
    "settingsModal.agentSettings.loading": "Loading Agent memory settings...",
    "settingsModal.agentSettings.success.updated": "Agent settings updated.",
    "settingsModal.agentSettings.errors.update": "Unable to update Agent settings.",
    "settingsModal.memoryData.dreamReflection": "Dream reflection",
    "settingsModal.memoryData.dreamReflectionHelper":
      "Run the nightly 3 AM memory reflection job for this user.",
    "settingsModal.memoryData.queryExpansion": "Query expansion",
    "settingsModal.memoryData.queryExpansionHelper":
      "Expand short or vague memory searches with AI. Improves recall and costs more.",
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
  const value = dictionary[key] || String(options?.defaultValue ?? key);
  return value
    .replace("{{limit}}", String(options?.limit ?? ""))
    .replace("{{remaining}}", String(options?.remaining ?? ""))
    .replace("{{hours}}", String(options?.hours ?? ""))
    .replace("{{used}}", String(options?.used ?? ""))
    .replace("{{reset}}", String(options?.reset ?? ""))
    .replace("{{count}}", String(options?.count ?? ""))
    .replace("{{class}}", String(options?.class ?? ""))
    .replace("{{label}}", String(options?.label ?? ""))
    .replace("{{priceLabel}}", String(options?.priceLabel ?? ""))
    .replace("{{status}}", String(options?.status ?? ""));
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
          stripeEnabled: true,
          topupCheckoutEnabled: true,
          topupPacks: [
            {
              id: "boost_500",
              label: "500 units",
              units: 500,
              stripePriceId: "price_topup_500",
              unitAmount: 900,
              currency: "usd",
              available: true,
            },
          ],
        },
      },
    },
  }),
  useCheckout: () => ({
    mutateAsync: jest.fn(async () => "https://checkout.example/plan"),
    isPending: false,
  }),
  useBillingPortal: () => ({
    mutateAsync: jest.fn(async () => "https://billing.example/portal"),
    isPending: false,
  }),
  useSyncBilling: () => ({
    mutateAsync: jest.fn(async () => ({ success: true })),
    isPending: false,
  }),
  useTopupCheckout: () => ({
    mutateAsync: jest.fn(async () => "https://checkout.example/topup"),
    isPending: false,
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
          recurringRemaining: 1420,
          topupUnits: 500,
          remaining: 1920,
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
  useSpaces: () => ({
    data: [
      {
        id: "research",
        title: "Research Room",
        description: "Long-running research workspace",
        icon: "R",
        color: "#d24430",
        instructions: "Prefer cited answers.",
        pinnedFiles: [
          {
            name: "strategy.pdf",
            type: "application/pdf",
            size: 1200,
            status: "embedded",
            location: "documents/strategy.pdf",
          },
          {
            name: "draft.txt",
            type: "text/plain",
            size: 220,
            status: "processing",
            location: "documents/draft.txt",
          },
        ],
        threads: [{ id: "thread-1", label: "Launch" }],
      },
      {
        id: "zaki-bot",
        title: "Agent",
        fixed: true,
        pinnedFiles: [],
        threads: [],
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useCancelSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

function renderSettingsModal(onClose = jest.fn()) {
  return render(
    <MemoryRouter initialEntries={["/agent"]}>
      <SettingsModal
        isOpen
        onClose={onClose}
        displayName="Nova"
        email="nova@example.com"
        onDisplayNameChange={() => {}}
        themePreference="system"
        onThemeChange={() => {}}
        onSave={() => {}}
        onAccountDeleted={() => {}}
      />
      <LocationProbe />
    </MemoryRouter>
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="settings-location">
      {location.pathname}
      {location.search}
      {location.hash}
    </output>
  );
}

function renderSettingsPage(initialEntry = "/settings") {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = jest.fn();
  }
  useAuthStore.setState({
    token: "token",
    user: { id: "user-1", username: "nova@example.com", fullName: "Nova" },
    isHydrating: false,
    isLoading: false,
  });
  useUIStore.setState({ themePreference: "system", systemTheme: "light" });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SettingsPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe("SettingsModal", () => {
  it("routes the legacy modal entry to the canonical settings page", async () => {
    const onClose = jest.fn();
    renderSettingsModal(onClose);

    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent("/settings");
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can route again after the legacy modal shim is closed and reopened", async () => {
    const onClose = jest.fn();
    const modalProps = {
      onClose,
      displayName: "Nova",
      email: "nova@example.com",
      onDisplayNameChange: () => {},
      themePreference: "system" as const,
      onThemeChange: () => {},
      onSave: () => {},
      onAccountDeleted: () => {},
    };
    const { rerender } = render(
      <MemoryRouter initialEntries={["/agent"]}>
        <SettingsModal isOpen={false} {...modalProps} />
        <LocationProbe />
      </MemoryRouter>
    );

    rerender(
      <MemoryRouter initialEntries={["/agent"]}>
        <SettingsModal isOpen {...modalProps} />
        <LocationProbe />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    rerender(
      <MemoryRouter initialEntries={["/agent"]}>
        <SettingsModal isOpen={false} {...modalProps} />
        <LocationProbe />
      </MemoryRouter>
    );
    rerender(
      <MemoryRouter initialEntries={["/agent"]}>
        <SettingsModal isOpen {...modalProps} />
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
});

describe("SettingsPage", () => {
  it("renders the route-level V2 settings surface with the same MECE sections", async () => {
    renderSettingsPage();

    expect(screen.getByRole("navigation", { name: "Settings sections" })).toBeInTheDocument();
    expect(screen.getByTestId("settings-account")).toBeInTheDocument();
    expect(screen.getByTestId("settings-connections")).toBeInTheDocument();
    expect(screen.getByTestId("settings-channels")).toBeInTheDocument();
    expect(screen.getByTestId("settings-secrets")).toBeInTheDocument();
    expect(screen.getByTestId("settings-providers")).toBeInTheDocument();
    expect(screen.getByTestId("settings-devices")).toBeInTheDocument();
    expect(screen.getByTestId("settings-billing")).toBeInTheDocument();
    expect(screen.getByTestId("settings-products-access")).toBeInTheDocument();
    expect(screen.getByTestId("settings-agent")).toBeInTheDocument();
    expect(screen.getByTestId("settings-spaces")).toBeInTheDocument();
    expect(screen.getByTestId("settings-brain")).toBeInTheDocument();
    expect(screen.getByTestId("settings-platform-usage")).toBeInTheDocument();
    expect(screen.getByTestId("settings-memory-data")).toBeInTheDocument();
    expect(screen.getByTestId("settings-developer-access")).toBeInTheDocument();
    expect(screen.getByTestId("settings-privacy")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Plan & Usage" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agent" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Spaces/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Brain" })).toBeInTheDocument();
    const routeOrder = [
      "settings-account",
      "settings-billing",
      "settings-products-access",
      "settings-agent",
      "settings-spaces",
      "settings-brain",
      "settings-channels",
      "settings-secrets",
      "settings-providers",
      "settings-devices",
      "settings-memory-data",
      "settings-developer-access",
      "settings-connections",
      "settings-privacy",
    ].map((testId) => screen.getByTestId(testId));
    for (let index = 0; index < routeOrder.length - 1; index += 1) {
      expect(
        routeOrder[index].compareDocumentPosition(routeOrder[index + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }

    expect(within(screen.getByTestId("settings-billing")).getByText("ZAKI Hire")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-billing")).getByText("Unit top-ups")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-billing")).getByRole("button", { name: /Buy 500 units/ })).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-products-access")).getByText("ZAKI Design")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-agent")).queryByText("Assistant mode")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("settings-agent")).getByText("Reasoning effort")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-agent")).getByText("Session timeout")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-providers")).getByText("Agent model default")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-providers")).getByLabelText("Agent model default")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-spaces")).getByText("Research Room")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-spaces-summary")).getByText("1/2")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-spaces-summary")).queryByText("Memory capture")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("settings-spaces")).queryByText("Memory controls")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("settings-brain")).getByText("Memory surface")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-brain")).queryByText("Memory controls")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("settings-channels")).getByText("Telegram")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-channels")).getByText("Slack")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-channels")).getByText("Discord")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-channels")).getByText("Email")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-providers")).getByText("OpenAI-compatible provider")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-memory-data")).getByText("Personal brain")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-memory-data")).getByText("Dream reflection")).toBeInTheDocument();
    expect(within(screen.getByTestId("settings-memory-data")).getByText("Query expansion")).toBeInTheDocument();

    await waitFor(() => {
      expect(within(screen.getByTestId("settings-connections")).getByText("Available")).toBeInTheDocument();
      expect(within(screen.getByTestId("settings-channels")).getByText("Configured")).toBeInTheDocument();
      expect(within(screen.getByTestId("settings-channels")).getByText("1 bindings")).toBeInTheDocument();
      expect(within(screen.getByTestId("settings-channels")).getByText(/U123/)).toBeInTheDocument();
      expect(within(screen.getByTestId("settings-secrets")).getByText("telegram_bot_token")).toBeInTheDocument();
      expect(within(screen.getByTestId("settings-secrets")).getByText("Metadata only")).toBeInTheDocument();
      expect(within(screen.getByTestId("settings-devices")).getAllByText("Not paired").length).toBeGreaterThan(0);
    });
  });

  it("normalizes legacy settings query sections to canonical hashes", async () => {
    renderSettingsPage("/settings?section=billing&utm=qa");

    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings?utm=qa#settings-billing"
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("settings-billing")).toHaveAttribute("tabindex", "-1");
    });
  });

  it("updates the active sidebar section when the settings page scrolls", async () => {
    renderSettingsPage("/settings#settings-billing");

    const scroller = document.querySelector<HTMLElement>(".zaki-settings-v2");
    expect(scroller).toBeTruthy();
    Object.defineProperty(scroller, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 800,
        height: 800,
        left: 0,
        right: 1200,
        top: 0,
        width: 1200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    for (const section of document.querySelectorAll<HTMLElement>(".v2-settings-block")) {
      Object.defineProperty(section, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          bottom: 2400,
          height: 320,
          left: 280,
          right: 1100,
          top: 2080,
          width: 820,
          x: 280,
          y: 2080,
          toJSON: () => ({}),
        }),
      });
    }

    Object.defineProperty(screen.getByTestId("settings-billing"), "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: -80,
        height: 320,
        left: 280,
        right: 1100,
        top: -400,
        width: 820,
        x: 280,
        y: -400,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(screen.getByTestId("settings-channels"), "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 420,
        height: 320,
        left: 280,
        right: 1100,
        top: 100,
        width: 820,
        x: 280,
        y: 100,
        toJSON: () => ({}),
      }),
    });

    fireEvent.scroll(scroller);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Channels" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });
  });

  it("sends precise Agent settings PATCH payloads from the product tab", async () => {
    const updateBotSettingsMock = updateBotSettings as jest.MockedFunction<typeof updateBotSettings>;
    updateBotSettingsMock.mockClear();
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("settings-agent")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Autonomy"), {
      target: { value: "supervised" },
    });
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ autonomy: "supervised" });
    });

    fireEvent.change(screen.getByLabelText("Reasoning effort"), {
      target: { value: "high" },
    });
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ assistant_mode: "deep" });
    });

    fireEvent.click(screen.getByLabelText("Proactive updates"));
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ proactive_updates: false });
    });

    const sessionTimeoutInput = screen.getByLabelText("Session timeout");
    fireEvent.change(sessionTimeoutInput, {
      target: { value: "45" },
    });
    expect(updateBotSettingsMock).not.toHaveBeenCalledWith({ session_timeout_minutes: 45 });
    fireEvent.blur(sessionTimeoutInput);
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ session_timeout_minutes: 45 });
    });
  });

  it("keeps memory governance editable only in Memory & Data", async () => {
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("settings-agent")).toBeInTheDocument();
    });

    expect(
      within(screen.getByTestId("settings-agent")).queryByLabelText("Agent dream reflection")
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("settings-agent")).queryByLabelText("Agent query expansion")
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("settings-brain")).queryByLabelText("Brain dream reflection")
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("settings-brain")).queryByLabelText("Brain query expansion")
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("settings-memory-data")).getByLabelText("Dream reflection")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("settings-memory-data")).getByLabelText("Query expansion")
    ).toBeInTheDocument();
    const memoryData = within(screen.getByTestId("settings-memory-data"));
    const forgetButton = memoryData.getByRole("button", { name: "Forget memory" });
    expect(forgetButton).toBeDisabled();
    fireEvent.change(memoryData.getByPlaceholderText("memory key"), {
      target: { value: "mem_1" },
    });
    expect(forgetButton).toBeEnabled();
  });

  it("wires Memory & Data capture, dream, and query settings to their BFF APIs", async () => {
    const updateMemoryPreferencesMock = updateMemoryPreferences as jest.MockedFunction<
      typeof updateMemoryPreferences
    >;
    const updateBotSettingsMock = updateBotSettings as jest.MockedFunction<typeof updateBotSettings>;
    updateMemoryPreferencesMock.mockClear();
    updateBotSettingsMock.mockClear();
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("settings-memory-data")).toBeInTheDocument();
    });

    const memoryData = within(screen.getByTestId("settings-memory-data"));
    fireEvent.change(memoryData.getByLabelText("Memory capture"), {
      target: { value: "off" },
    });
    await waitFor(() => {
      expect(updateMemoryPreferencesMock).toHaveBeenCalledWith("off");
    });

    fireEvent.click(memoryData.getByLabelText("Dream reflection"));
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ dream_enabled: false });
    });

    fireEvent.click(memoryData.getByLabelText("Query expansion"));
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({
        query_expansion_enabled: true,
      });
    });
  });

  it("wires Agent channel identity bindings to the channel BFF", async () => {
    const upsertBindingMock = upsertAgentChannelBinding as jest.MockedFunction<
      typeof upsertAgentChannelBinding
    >;
    const deleteBindingMock = deleteAgentChannelBinding as jest.MockedFunction<
      typeof deleteAgentChannelBinding
    >;
    upsertBindingMock.mockClear();
    deleteBindingMock.mockClear();
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("settings-channels")).toBeInTheDocument();
    });

    const slackBindingEditor = screen
      .getByLabelText("Slack principal key")
      .closest(".zaki-settings-v2__edit-tray");
    expect(slackBindingEditor).not.toBeNull();
    const saveBindingButton = within(slackBindingEditor as HTMLElement).getByRole("button", {
      name: "Save binding",
    });
    expect(saveBindingButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Slack principal key"), {
      target: { value: " U999 " },
    });
    fireEvent.change(screen.getByLabelText("Slack scope key"), {
      target: { value: " C999 " },
    });
    fireEvent.change(screen.getByLabelText("Slack thread key"), {
      target: { value: " thread-99 " },
    });

    expect(saveBindingButton).toBeEnabled();
    fireEvent.click(saveBindingButton);

    await waitFor(() => {
      expect(upsertBindingMock).toHaveBeenCalledWith("slack", {
        account_id: "main",
        principal_key: "U999",
        scope_key: "C999",
        thread_key: "thread-99",
      });
    });

    const existingBindingRow = screen.getByText(/main \/ U123 \/ C123/).closest("div");
    expect(existingBindingRow).not.toBeNull();
    fireEvent.click(
      within(existingBindingRow as HTMLElement).getByRole("button", { name: "Delete binding" })
    );

    await waitFor(() => {
      expect(deleteBindingMock).toHaveBeenCalledWith("slack", "bnd_1");
    });
  });

  it("wires Agent channel credential save, test, and disconnect actions", async () => {
    const connectMock = connectAgentChannelControl as jest.MockedFunction<
      typeof connectAgentChannelControl
    >;
    const testMock = testAgentChannelControl as jest.MockedFunction<typeof testAgentChannelControl>;
    const disconnectMock = disconnectAgentChannelControl as jest.MockedFunction<
      typeof disconnectAgentChannelControl
    >;
    connectMock.mockClear();
    testMock.mockClear();
    disconnectMock.mockClear();
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("settings-channel-control-slack")).toBeInTheDocument();
    });

    const slackControl = within(screen.getByTestId("settings-channel-control-slack"));
    const saveCredentialsButton = slackControl.getByRole("button", {
      name: "Update Slack credentials",
    });
    expect(saveCredentialsButton).toBeDisabled();

    fireEvent.change(slackControl.getByLabelText("Slack Bot token"), {
      target: { value: " xoxb-settings-test " },
    });
    fireEvent.change(slackControl.getByLabelText("Slack Signing secret"), {
      target: { value: " signing-secret " },
    });
    expect(saveCredentialsButton).toBeEnabled();
    fireEvent.click(saveCredentialsButton);

    await waitFor(() => {
      expect(connectMock).toHaveBeenCalledWith("slack", {
        slack_bot_token: "xoxb-settings-test",
        slack_signing_secret: "signing-secret",
      });
    });

    fireEvent.click(slackControl.getByRole("button", { name: "Test Slack" }));
    await waitFor(() => {
      expect(testMock).toHaveBeenCalledWith("slack");
    });

    fireEvent.click(slackControl.getByRole("button", { name: "Disconnect Slack" }));
    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledWith("slack");
    });
  });

  it("wires provider profile creation through the Agent provider BFF", async () => {
    const createProviderMock = createAgentProviderProfile as jest.MockedFunction<
      typeof createAgentProviderProfile
    >;
    createProviderMock.mockClear();
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("settings-provider-create")).toBeInTheDocument();
    });

    const providerCreate = within(screen.getByTestId("settings-provider-create"));
    const saveProviderButton = providerCreate.getByRole("button", { name: "Save provider" });
    expect(saveProviderButton).toBeDisabled();
    fireEvent.change(providerCreate.getByPlaceholderText("Label"), {
      target: { value: " Local OpenAI " },
    });
    fireEvent.change(providerCreate.getByPlaceholderText("https://api.example.com/v1"), {
      target: { value: " https://models.example.com/v1 " },
    });
    fireEvent.change(providerCreate.getByPlaceholderText("API key"), {
      target: { value: " sk-settings-test " },
    });
    fireEvent.change(providerCreate.getByPlaceholderText("model-a, model-b"), {
      target: { value: " gpt-4.1, gpt-4.1-mini " },
    });
    fireEvent.change(providerCreate.getByPlaceholderText("Default model"), {
      target: { value: " gpt-4.1-mini " },
    });
    expect(saveProviderButton).toBeEnabled();
    fireEvent.click(saveProviderButton);

    await waitFor(() => {
      expect(createProviderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Local OpenAI",
          provider_kind: "openai_compatible",
          base_url: "https://models.example.com/v1",
          api_key: "sk-settings-test",
          auth_style: "bearer",
          model_allowlist: ["gpt-4.1", "gpt-4.1-mini"],
          default_model: "gpt-4.1-mini",
        })
      );
    });
  });

  it("wires secret rotation and extension device pairing", async () => {
    const putSecretMock = putAgentSecret as jest.MockedFunction<typeof putAgentSecret>;
    const pairDeviceMock = pairAgentExtensionDevice as jest.MockedFunction<
      typeof pairAgentExtensionDevice
    >;
    putSecretMock.mockClear();
    pairDeviceMock.mockClear();
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("settings-secrets")).toBeInTheDocument();
    });

    const secrets = within(screen.getByTestId("settings-secrets"));
    const saveSecretButton = secrets.getByRole("button", { name: "Save secret" });
    expect(saveSecretButton).toBeDisabled();
    fireEvent.change(secrets.getByPlaceholderText("OPENAI_API_KEY"), {
      target: { value: "slack bot token" },
    });
    fireEvent.change(secrets.getByPlaceholderText("Secret value"), {
      target: { value: " xoxb-secret " },
    });
    expect(saveSecretButton).toBeEnabled();
    fireEvent.click(saveSecretButton);

    await waitFor(() => {
      expect(putSecretMock).toHaveBeenCalledWith("SLACK_BOT_TOKEN", " xoxb-secret ");
    });

    const devices = within(screen.getByTestId("settings-devices"));
    const pairDeviceButton = devices.getByRole("button", { name: "Pair device" });
    expect(pairDeviceButton).toBeDisabled();
    fireEvent.change(devices.getByPlaceholderText("Work laptop"), {
      target: { value: " QA laptop " },
    });
    expect(pairDeviceButton).toBeEnabled();
    fireEvent.click(pairDeviceButton);

    await waitFor(() => {
      expect(pairDeviceMock).toHaveBeenCalledWith({ label: "QA laptop" });
    });
  });

  it("keeps Spaces settings as an overview with object-level manage links", async () => {
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("settings-space-research")).toBeInTheDocument();
    });

    const spaces = within(screen.getByTestId("settings-spaces"));
    expect(spaces.getByTestId("settings-space-open-research")).toBeInTheDocument();
    expect(spaces.getByTestId("settings-space-manage-research")).toBeInTheDocument();
    expect(spaces.queryByTestId("settings-space-edit-research")).not.toBeInTheDocument();
    expect(spaces.queryByTestId("settings-space-save-research")).not.toBeInTheDocument();
    expect(spaces.queryByTestId("settings-space-editor-research")).not.toBeInTheDocument();
    expect(spaces.queryByText("Memory controls")).not.toBeInTheDocument();
  });

});
