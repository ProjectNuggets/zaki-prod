import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { SettingsModal } from "./SettingsModal";
import { SettingsPage } from "../settings/SettingsPage";
import { formatChannelTestActionLabel } from "../settings/SettingsChannelsSection";
import { useAuthStore, useUIStore } from "@/stores";
import {
  connectBotTelegram,
  connectAgentChannelControl,
  deleteAgentChannelBinding,
  disconnectBotTelegram,
  disconnectAgentChannelControl,
  fetchBotSettings,
  fetchBotHeartbeat,
  fetchAgentChannelControls,
  fetchAgentExtensionDevices,
  listAgentSecrets,
  pairAgentExtensionDevice,
  purgeAgentMemoryPii,
  putAgentSecret,
  requestLogout,
  testAgentChannelControl,
  updateBotHeartbeat,
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
      proactive_updates: false,
      voice_replies: false,
      session_timeout_minutes: 30,
      assistant_mode: "balanced",
      autonomy: "supervised",
      dream_enabled: true,
      query_expansion_enabled: false,
      selected_model: null,
    },
  })),
  fetchBotHeartbeat: jest.fn(async () => ({
    response: { ok: true },
    data: {
      enabled: false,
      operator_enabled: true,
      effective_enabled: false,
      interval_minutes: 60,
      delivery_channel: "telegram",
      delivery_ready: false,
      status: "disabled",
      last_run_s: null,
      last_status: null,
      last_reason: null,
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
          channel: "telegram",
          label: "Telegram",
          build_enabled: true,
          operator_configured: true,
          user_managed: true,
          user_connected: true,
          status: "connected",
          secret_refs: [
            { key: "telegram_bot_token", label: "Bot token", required: true, present: true },
            { key: "telegram_webhook_secret", label: "Webhook secret", required: false, present: false },
          ],
          config: {},
          last_test: null,
        },
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
  connectBotTelegram: jest.fn(async () => ({
    response: { ok: true },
    data: { channel: "telegram", status: "connected" },
  })),
  testAgentChannelControl: jest.fn(async () => ({
    response: { ok: true },
    data: { channel: "slack", last_test: { ok: true, detail: "credentials_present" } },
  })),
  disconnectAgentChannelControl: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "disconnected", channel: "slack" },
  })),
  disconnectBotTelegram: jest.fn(async () => ({
    response: { ok: true },
    data: { status: "disconnected", channel: "telegram" },
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
      proactive_updates: payload?.proactive_updates ?? false,
      voice_replies: payload?.voice_replies ?? false,
      session_timeout_minutes: payload?.session_timeout_minutes ?? 30,
      assistant_mode: payload?.assistant_mode ?? "balanced",
      autonomy: payload?.autonomy ?? "supervised",
      dream_enabled: payload?.dream_enabled ?? true,
      query_expansion_enabled: payload?.query_expansion_enabled ?? false,
      selected_model: payload?.selected_model ?? null,
    },
  })),
  updateBotHeartbeat: jest.fn(async ({ enabled }) => ({
    response: { ok: true },
    data: {
      enabled,
      operator_enabled: true,
      effective_enabled: enabled,
      interval_minutes: 60,
      delivery_channel: "telegram",
      delivery_ready: false,
      status: enabled ? "needs_telegram" : "disabled",
      last_run_s: null,
      last_status: null,
      last_reason: null,
    },
  })),
  updateProfile: jest.fn(async () => ({
    response: { ok: true },
    data: { success: true, user: { username: "nova@example.com", fullName: "Nova" } },
  })),
  requestLogout: jest.fn(async () => ({
    response: { ok: true },
    data: { success: true },
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
    "settingsModal.nav.secrets": "Advanced credentials",
    "settingsModal.nav.providers": "Providers",
    "settingsModal.nav.devices": "Devices",
    "settingsModal.nav.billing": "Plan & Usage",
    "settingsModal.nav.products": "Products",
    "settingsModal.nav.usage": "Usage",
    "settingsModal.nav.memoryData": "Memory & Privacy",
    "settingsModal.nav.developerAccess": "Developer",
    "settingsModal.nav.privacy": "Privacy",
    "settingsModal.sections.account": "Account",
    "settingsModal.sections.profile": "Profile",
    "settingsModal.sections.preferences": "Preferences",
    "settingsModal.sections.connections": "Connected accounts",
    "settingsModal.sections.channels": "Channels",
    "settingsModal.sections.secrets": "Advanced credentials",
    "settingsModal.sections.providers": "Models & providers",
    "settingsModal.sections.devices": "Browser extension & devices",
    "settingsModal.sections.billing": "Plan & Usage",
    "settingsModal.sections.planBilling": "Plan & Billing",
    "settingsModal.sections.productsAccess": "Products & Access",
    "settingsModal.sections.usage": "Usage",
    "settingsModal.sections.memoryData": "Memory & Privacy",
    "settingsModal.sections.developerAccess": "Developer Access",
    "settingsModal.sections.privacy": "Privacy",
    "settingsModal.sections.dataPrivacy": "Data & Privacy",
    "settingsModal.account.signOut": "Sign out",
    "settingsModal.account.signingOut": "Signing out",
    "settingsModal.account.signOutHelper": "End this browser session and return to sign in.",
    "settingsModal.account.signOutError":
      "Unable to sign out securely. Check your connection and try again.",
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
    "settingsModal.channels.learningTutors.name": "Learning tutor channels",
    "settingsModal.channels.learningTutors.description":
      "Private-beta tutor channel schema is available through Learning.",
    "settingsModal.channels.loading": "Checking channels",
    "settingsModal.channels.count": "{{count}} channels",
    "settingsModal.channels.status.checking": "Checking",
    "settingsModal.channels.otherChannels.name": "Additional channels",
    "settingsModal.channels.otherChannels.description":
      "Teams, Signal, Matrix, and other adapters stay hidden until their user-safe BFF contracts are exposed.",
    "settingsModal.channels.status.configured": "Configured",
    "settingsModal.channels.status.notConfigured": "Not configured",
    "settingsModal.channels.status.privateBeta": "Private access",
    "settingsModal.channels.status.operatorManaged": "Operator managed",
    "settingsModal.channels.openAgentChannels": "Open channels",
    "settingsModal.channels.bindings.count": "{{count}} bindings",
    "settingsModal.channels.bindings.account": "Account",
    "settingsModal.channels.bindings.thread": "Thread optional",
    "settingsModal.channels.bindings.saveChannel": "Bind {{channel}} identity",
    "settingsModal.channels.bindings.saving": "Saving",
    "settingsModal.channels.bindings.helper":
      "Bindings route inbound identities to your Agent without exposing channel secrets.",
    "settingsModal.channels.bindings.deleteChannel": "Delete {{channel}} binding",
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
    "settingsModal.secrets.addOrRotate": "Add or rotate a vault credential",
    "settingsModal.secrets.addOrRotateHelper":
      "Use this only for advanced manual keys. Channel tokens should be saved from Channels.",
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
    "settingsModal.plan.tiers.free": "Free",
    "settingsModal.plan.tiers.personal": "Personal",
    "settingsModal.plan.tiers.pro": "Pro",
    "settingsModal.plan.tiers.pro_max": "Pro MAX",
    "settingsModal.plan.upgradePlan": "Upgrade to {{plan}}",
    "settingsModal.plan.syncBilling": "Sync billing",
    "settingsModal.plan.recurringRemaining": "Weekly room",
    "settingsModal.plan.topupBalance": "Extra capacity",
    "settingsModal.plan.agentAvailableNow": "Agent available now",
    "settingsModal.plan.agentAvailableNowReady": "Ready",
    "settingsModal.plan.agentAvailableNowBlocked": "Needs more weekly room",
    "settingsModal.plan.agentAvailableNowRollingBlocked": "{{hours}}h window {{percent}}% used; next room clears {{reset}}",
    "settingsModal.plan.billingSource": "Billing source",
    "settingsModal.plan.billingHealth": "Billing health",
    "settingsModal.plan.billingConfigured": "Configured",
    "settingsModal.plan.billingChecking": "Checking",
    "settingsModal.plan.billingUnavailable": "Payment actions are unavailable in this environment.",
    "settingsModal.plan.actionsTitle": "Upgrade or manage plan",
    "settingsModal.plan.actionsHelper":
      "Choose the monthly plan that keeps ZAKI available when work spikes. Payment details and billing sync stay here.",
    "settingsModal.plan.sources.subscription": "Subscription",
    "settingsModal.plan.sources.subscriptionWithAccessCode": "Subscription + access code",
    "settingsModal.plan.sources.accessCode": "Access code",
    "settingsModal.plan.sources.free": "Free account",
    "settingsModal.plan.topups.title": "Additional capacity",
    "settingsModal.plan.topups.deferred":
      "Additional capacity purchases are deferred for this release. Pricing explains the current allowances.",
    "settingsModal.plan.topups.statusOnly": "Deferred",
    "settingsModal.plan.cancelSubscription": "Cancel subscription",
    "settingsModal.plan.upgrade": "Upgrade",
    "settingsModal.usage.plan": "Plan",
    "settingsModal.usage.weeklyAllowance": "Weekly",
    "settingsModal.usage.weeklyAllowanceValue": "{{percent}}% of your weekly usage",
    "settingsModal.usage.weeklyAllowancePending": "Policy pending",
    "settingsModal.usage.burstWindow": "Burst window",
    "settingsModal.usage.burstWindowValue": "{{percent}}% of this capacity window",
    "settingsModal.usage.remainingOfLimit": "{{percent}}% of your weekly usage",
    "settingsModal.usage.usagePercent": "{{percent}}% of your weekly usage",
    "settingsModal.usage.windowUsagePercent": "{{percent}}% of this capacity window",
    "settingsModal.usage.productUsageLinked": "Included in weekly usage",
    "settingsModal.usage.nearCapNudge": "You're at {{percent}}% this week — upgrade for more room.",
    "settingsModal.usage.loading": "Loading usage...",
    "settingsModal.usage.pending": "Pending",
    "settingsModal.usage.unavailable": "Unavailable",
    "settingsModal.usage.usedOfLimit": "{{percent}}% of your weekly usage",
    "settingsModal.usage.usedUnits": "{{percent}}% of your weekly usage",
    "settingsModal.usage.lifecycleLabel": "Lifecycle: {{lifecycle}}",
    "settingsModal.usage.period.day": "Daily",
    "settingsModal.usage.period.week": "Weekly",
    "settingsModal.usage.period.none": "No reset period",
    "settingsModal.usage.resetPending": "Reset pending",
    "settingsModal.usage.productUsage": "Weekly by product",
    "settingsModal.usage.productCount": "{{count}} products",
    "settingsModal.usage.helper":
      "This is the platform usage view. Agent-specific runtime usage remains inside Agent settings.",
    "settingsModal.agentSettings.reasoningEffort.name": "Reasoning effort",
    "settingsModal.agentSettings.defaultsNotice":
      "Defaults for new Agent turns. Per-turn controls can still be changed in Agent.",
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
    "settingsModal.productsAccess.memoryScopes.hireMemory": "Career memory",
    "settingsModal.productsAccess.memoryScopes.designMemory": "Design memory",
    "settingsModal.productsAccess.memoryScopes.sessionMemory": "Session memory",
    "settingsModal.productsAccess.entryPoints.spaces": "Spaces / Chat",
    "settingsModal.productsAccess.entryPoints.agent": "Agent workbench",
    "settingsModal.productsAccess.entryPoints.learning": "Learning",
    "settingsModal.productsAccess.entryPoints.hire": "Career",
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
    "settingsModal.memoryData.dreamReflection": "Improve Agent memories automatically",
    "settingsModal.memoryData.dreamReflectionHelper":
      "Let Agent run background maintenance that organizes saved memories. This is not a memory on/off switch.",
    "settingsModal.memoryData.queryExpansion": "Improve Agent recall",
    "settingsModal.memoryData.queryExpansionHelper":
      "Let Agent broaden short memory searches so it can find relevant saved context more reliably.",
    "settingsModal.memoryData.capturePolicy.name": "Chat memory capture",
    "settingsModal.memoryData.capturePolicy.helper":
      "Controls only Spaces memory capture. Agent memory does not have a master on/off switch yet.",
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
    .replace("{{percent}}", String(options?.percent ?? ""))
    .replace("{{reset}}", String(options?.reset ?? ""))
    .replace("{{count}}", String(options?.count ?? ""))
    .replace("{{class}}", String(options?.class ?? ""))
    .replace("{{label}}", String(options?.label ?? ""))
    .replace("{{channel}}", String(options?.channel ?? ""))
    .replace("{{plan}}", String(options?.plan ?? ""))
    .replace("{{lifecycle}}", String(options?.lifecycle ?? ""))
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

const checkoutMutateMock = jest.fn(async () => "https://checkout.example/plan");
const billingPortalMutateMock = jest.fn(async () => "https://billing.example/portal");
const syncBillingMutateMock = jest.fn(async () => ({ success: true }));
const cancelSubscriptionMutateMock = jest.fn(async () => ({ success: true }));
const mockDefaultBillingConfigured = {
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
};
let mockBillingConfigured = mockDefaultBillingConfigured;

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
        configured: mockBillingConfigured,
      },
    },
  }),
  useCheckout: () => ({
    mutateAsync: checkoutMutateMock,
    isPending: false,
  }),
  useBillingPortal: () => ({
    mutateAsync: billingPortalMutateMock,
    isPending: false,
  }),
  useSyncBilling: () => ({
    mutateAsync: syncBillingMutateMock,
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
            label: "ZAKI Career",
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
          limit: 40,
          used: 20,
          remaining: 20,
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
        availableNow: {
          agent: {
            available: false,
            requiredReserveUnits: 40,
            effectiveRemaining: 20,
            weeklyRemaining: 1420,
            rollingRemaining: 20,
            constraint: "rolling",
            resetAt: "2026-05-20T12:00:00.000Z",
          },
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
            label: "ZAKI Career",
            productKind: "product",
            state: "disabled",
            lifecycle: "future",
            visibleInSettings: true,
            route: "/hire",
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
  useCancelSubscription: () => ({ mutateAsync: cancelSubscriptionMutateMock, isPending: false }),
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

async function renderSettingsPage(initialEntry = "/settings") {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = jest.fn();
  }
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = jest.fn();
  }
  useAuthStore.setState({
    token: "token",
    user: { id: "user-1", username: "nova@example.com", fullName: "Nova" },
    isHydrating: false,
    isLoading: false,
  });
  useUIStore.setState({ themePreference: "system", systemTheme: "light" });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <SettingsPage />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return result!;
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
  beforeEach(() => {
    mockBillingConfigured = mockDefaultBillingConfigured;
  });

  it("renders only the category selected by the settings hash", async () => {
    const accountRender = await renderSettingsPage();

    expect(screen.getByTestId("settings-account")).toBeInTheDocument();
    expect(screen.queryByTestId("settings-billing")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    accountRender.unmount();

    await renderSettingsPage("/settings#settings-privacy");

    expect(screen.getByTestId("settings-privacy")).toBeInTheDocument();
    expect(screen.queryByTestId("settings-account")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the route-level V2 settings nav with configurable categories only", async () => {
    await renderSettingsPage();

    const nav = within(screen.getByRole("navigation", { name: "Settings sections" }));
    for (const name of [
      "Account",
      "Your goals",
      "Suggestions",
      "Plan & Usage",
      "Agent",
      "Automations",
      "Channels",
      "Devices",
      "Memory & Privacy",
      "Privacy",
    ]) {
      expect(nav.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(nav.queryByRole("link", { name: "Products" })).not.toBeInTheDocument();
    expect(nav.queryByRole("link", { name: /Spaces/ })).not.toBeInTheDocument();
    expect(nav.queryByRole("link", { name: "Brain" })).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("settings-account")).getByRole("button", { name: "Sign out" })
    ).toBeInTheDocument();
  });

  it("normalizes legacy settings query sections to canonical hashes", async () => {
    await renderSettingsPage("/settings?section=billing&utm=qa");

    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings?utm=qa#settings-billing"
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("settings-billing")).toHaveAttribute("tabindex", "-1");
    });
  });

  it("maps removed settings links to their configurable owners", async () => {
    const productsRender = await renderSettingsPage("/settings?section=products&utm=qa");

    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings?utm=qa#settings-billing"
      );
    });
    productsRender.unmount();

    const accessRender = await renderSettingsPage("/settings?section=access");
    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-billing"
      );
    });
    accessRender.unmount();

    const productsHashRender = await renderSettingsPage("/settings#settings-products");

    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-billing"
      );
    });
    productsHashRender.unmount();

    const spacesRender = await renderSettingsPage("/settings#settings-spaces");
    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-billing"
      );
    });
    spacesRender.unmount();

    const brainRender = await renderSettingsPage("/settings#settings-brain");
    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-memory-data"
      );
    });
    brainRender.unmount();

    const developerRender = await renderSettingsPage("/settings#settings-developer-access");
    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-secrets"
      );
    });
    developerRender.unmount();

    const connectionsRender = await renderSettingsPage("/settings#settings-connections");
    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-account"
      );
    });
    connectionsRender.unmount();

    const oauthRender = await renderSettingsPage("/settings?section=oauth");
    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-account"
      );
    });
    oauthRender.unmount();

    const usageRender = await renderSettingsPage("/settings#settings-usage");
    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-billing"
      );
    });
    usageRender.unmount();
  }, 15_000);

  it("wires Plan & Usage actions to the monthly platform billing mutations", async () => {
    checkoutMutateMock.mockClear();
    billingPortalMutateMock.mockClear();
    syncBillingMutateMock.mockClear();
    cancelSubscriptionMutateMock.mockClear();

    await renderSettingsPage("/settings#settings-billing");

    const billing = within(screen.getByTestId("settings-billing"));
    await waitFor(() => {
      expect(billing.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    });
    expect(billing.getByRole("button", { name: "Upgrade to Pro MAX" })).toBeInTheDocument();
    expect(billing.queryByRole("button", { name: "Upgrade to Agent" })).not.toBeInTheDocument();
    expect(billing.queryByRole("button", { name: "Upgrade to Complete" })).not.toBeInTheDocument();
    expect(checkoutMutateMock).not.toHaveBeenCalled();

    fireEvent.click(billing.getByRole("button", { name: "Upgrade to Pro MAX" }));
    await waitFor(() => {
      expect(checkoutMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "pro_max", interval: "monthly" })
      );
    });

    fireEvent.click(billing.getByRole("button", { name: "Manage subscription" }));
    await waitFor(() => {
      expect(billingPortalMutateMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(billing.getByRole("button", { name: "Sync billing" }));
    await waitFor(() => {
      expect(syncBillingMutateMock).toHaveBeenCalledTimes(1);
    });

    expect(billing.getByText("Additional capacity")).toBeInTheDocument();
    expect(billing.getByText("Deferred")).toBeInTheDocument();
    expect(billing.queryByRole("button", { name: /Buy 500 units/ })).not.toBeInTheDocument();

    fireEvent.click(billing.getByRole("button", { name: "Cancel subscription" }));
    await waitFor(() => {
      expect(cancelSubscriptionMutateMock).toHaveBeenCalledTimes(1);
    });
  });

  it("renders Plan & Usage as a billing cockpit with overall, burst, wallet, and product meters", async () => {
    await renderSettingsPage("/settings#settings-billing");

    const billing = within(screen.getByTestId("settings-billing"));
    const weeklyMeter = within(billing.getByTestId("settings-weekly-meter"));
    const burstMeter = within(billing.getByTestId("settings-burst-meter"));

    expect(weeklyMeter.getByText("Weekly")).toBeInTheDocument();
    expect(weeklyMeter.getAllByText("5% of your weekly usage").length).toBeGreaterThan(0);
    expect(weeklyMeter.queryByText("1,920 / 1,500 left")).not.toBeInTheDocument();
    expect(weeklyMeter.queryByText("Used")).not.toBeInTheDocument();
    expect(weeklyMeter.queryByText("Remaining")).not.toBeInTheDocument();
    expect(burstMeter.getByText("Burst window")).toBeInTheDocument();
    expect(burstMeter.getAllByText("50% of this capacity window").length).toBeGreaterThan(0);
    expect(burstMeter.queryByText("80 / 100 left")).not.toBeInTheDocument();
    expect(billing.getByText("Weekly room")).toBeInTheDocument();
    expect(billing.getByText("Extra capacity")).toBeInTheDocument();
    expect(billing.getByText("Agent available now")).toBeInTheDocument();
    expect(billing.getByText(/5h window 50% used; next room clears/)).toBeInTheDocument();
    expect(billing.queryByText("1,420")).not.toBeInTheDocument();
    expect(billing.queryByText("500")).not.toBeInTheDocument();
    expect(billing.getByText("Billing source")).toBeInTheDocument();
    expect(billing.getByText("Subscription")).toBeInTheDocument();
    expect(billing.getByText("Choose the monthly plan that keeps ZAKI available when work spikes. Payment details and billing sync stay here.")).toBeInTheDocument();
    expect(billing.queryByText(/Stripe/i)).not.toBeInTheDocument();
    expect(billing.getByText("Weekly by product")).toBeInTheDocument();
    expect(billing.getByText("ZAKI Spaces")).toBeInTheDocument();
    expect(billing.getByText("ZAKI Agent")).toBeInTheDocument();
  });

  it("hides unavailable billing and top-up actions with named explanations", async () => {
    mockBillingConfigured = {
      ...mockDefaultBillingConfigured,
      checkoutEnabled: false,
      portalEnabled: false,
      cancelEnabled: false,
      stripeEnabled: false,
      topupCheckoutEnabled: false,
      topupPacks: [],
    };

    await renderSettingsPage("/settings#settings-billing");

    const billing = within(screen.getByTestId("settings-billing"));
    expect(billing.queryByRole("button", { name: "Upgrade to Pro MAX" })).not.toBeInTheDocument();
    expect(billing.queryByRole("button", { name: "Manage subscription" })).not.toBeInTheDocument();
    expect(billing.queryByRole("button", { name: "Sync billing" })).not.toBeInTheDocument();
    expect(billing.queryByRole("button", { name: "Cancel subscription" })).not.toBeInTheDocument();
    expect(billing.getByText("Payment actions are unavailable in this environment.")).toBeInTheDocument();
    expect(billing.getByText("Additional capacity purchases are deferred for this release. Pricing explains the current allowances.")).toBeInTheDocument();
    expect(billing.getByText("Deferred")).toBeInTheDocument();
  });

  it("switches the active category and hash from the settings nav", async () => {
    await renderSettingsPage("/settings#settings-billing");

    fireEvent.click(screen.getByRole("link", { name: "Channels" }));

    await waitFor(() => {
      expect(screen.getByTestId("settings-location")).toHaveTextContent(
        "/settings#settings-channels"
      );
      expect(screen.getByTestId("settings-channels")).toBeInTheDocument();
      expect(screen.queryByTestId("settings-billing")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Channels" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });
  });

  it("sends precise Agent settings PATCH payloads and opts into proactive check-ins separately", async () => {
    const updateBotSettingsMock = updateBotSettings as jest.MockedFunction<typeof updateBotSettings>;
    const updateBotHeartbeatMock = updateBotHeartbeat as jest.MockedFunction<
      typeof updateBotHeartbeat
    >;
    updateBotSettingsMock.mockClear();
    updateBotHeartbeatMock.mockClear();
    await renderSettingsPage("/settings#settings-agent");

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

    fireEvent.change(screen.getByLabelText("Group activation"), {
      target: { value: "always" },
    });
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ group_activation: "always" });
    });

    const proactiveCheckins = screen.getByLabelText("Proactive check-ins");
    expect(proactiveCheckins).toBeEnabled();
    expect(proactiveCheckins).not.toBeChecked();
    expect(screen.getByText("Off · Delivery through Telegram")).toBeInTheDocument();
    fireEvent.click(proactiveCheckins);
    await waitFor(() => {
      expect(updateBotHeartbeatMock).toHaveBeenCalledWith({ enabled: true });
    });
    await waitFor(() => {
      expect(screen.getByText("On · Connect Telegram to receive check-ins")).toBeInTheDocument();
    });
    expect(updateBotSettingsMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ proactive_updates: expect.any(Boolean) })
    );

    fireEvent.click(screen.getByLabelText("Audio replies on connected channels"));
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ voice_replies: true });
    });

    expect(screen.queryByText("Agent model default")).not.toBeInTheDocument();
    expect(updateBotSettingsMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ selected_model: expect.anything() })
    );

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

  it("surfaces the latest proactive check-in delivery failure", async () => {
    const fetchBotHeartbeatMock = fetchBotHeartbeat as jest.MockedFunction<
      typeof fetchBotHeartbeat
    >;
    fetchBotHeartbeatMock.mockResolvedValueOnce({
      response: { ok: true } as Response,
      data: {
        enabled: true,
        operator_enabled: true,
        effective_enabled: true,
        interval_minutes: 60,
        delivery_channel: "telegram",
        delivery_ready: true,
        status: "ready",
        last_run_s: 1_800_000_000,
        last_status: "send_failed",
        last_reason: "no_target",
      },
    });

    await renderSettingsPage("/settings#settings-agent");

    expect(
      await screen.findByText("On · Last delivery failed; verify Telegram")
    ).toBeInTheDocument();
  });

  it("restores Agent tenant defaults from the header Reset to defaults action", async () => {
    const updateBotSettingsMock = updateBotSettings as jest.MockedFunction<typeof updateBotSettings>;
    const toastSuccessMock = toast.success as jest.MockedFunction<typeof toast.success>;
    updateBotSettingsMock.mockClear();
    toastSuccessMock.mockClear();
    await renderSettingsPage("/settings#settings-agent");

    await waitFor(() => {
      expect(screen.getByTestId("settings-agent")).toBeInTheDocument();
    });

    // Loaded profile equals the canonical defaults, so reset starts disabled.
    const resetButton = screen.getByTestId("settings-agent-reset");
    expect(resetButton).toBeDisabled();

    // Move a control off-default to enable the reset affordance.
    fireEvent.change(screen.getByLabelText("Autonomy"), { target: { value: "read_only" } });
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ autonomy: "read_only" });
    });
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });

    updateBotSettingsMock.mockClear();
    fireEvent.click(resetButton);

    // Reset applies the full editable-default patch via the existing save path.
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({
        assistant_mode: "balanced",
        autonomy: "supervised",
        group_activation: "mention",
        voice_replies: false,
        session_timeout_minutes: 30,
      });
    });
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Agent defaults restored.");
    });
    // Controls are back at defaults, so the affordance disables itself again.
    await waitFor(() => {
      expect(resetButton).toBeDisabled();
    });
  });

  it("requires typed confirmation before enabling full autonomy", async () => {
    const updateBotSettingsMock = updateBotSettings as jest.MockedFunction<typeof updateBotSettings>;
    updateBotSettingsMock.mockClear();
    await renderSettingsPage("/settings#settings-agent");

    await waitFor(() => {
      expect(screen.getByLabelText("Autonomy")).toHaveValue("supervised");
    });

    fireEvent.change(screen.getByLabelText("Autonomy"), { target: { value: "full" } });

    const confirmation = screen.getByRole("alertdialog");
    const confirmButton = within(confirmation).getByRole("button", {
      name: "Enable full autonomy",
    });
    expect(confirmButton).toBeDisabled();
    expect(updateBotSettingsMock).not.toHaveBeenCalledWith({ autonomy: "full" });

    fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(updateBotSettingsMock).not.toHaveBeenCalledWith({ autonomy: "full" });

    fireEvent.change(screen.getByLabelText("Autonomy"), { target: { value: "full" } });
    fireEvent.change(screen.getByPlaceholderText("FULL"), { target: { value: "FULL" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable full autonomy" }));

    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ autonomy: "full" });
    });
  });

  it("keeps Agent settings read-only until their saved profile loads", async () => {
    const fetchBotSettingsMock = fetchBotSettings as jest.MockedFunction<typeof fetchBotSettings>;
    const updateBotSettingsMock = updateBotSettings as jest.MockedFunction<typeof updateBotSettings>;
    fetchBotSettingsMock.mockRejectedValueOnce(new Error("settings_unavailable"));
    updateBotSettingsMock.mockClear();
    await renderSettingsPage("/settings#settings-agent");

    expect(
      await screen.findByText("Unable to load Agent settings. Your saved defaults have not been changed.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Autonomy")).not.toBeInTheDocument();
    expect(screen.queryByTestId("settings-agent-reset")).not.toBeInTheDocument();
    expect(updateBotSettingsMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Autonomy")).toBeInTheDocument();
    });
    expect(updateBotSettingsMock).not.toHaveBeenCalled();
  });

  it("keeps the Agent settings tab focused on controls instead of navigation chips", async () => {
    await renderSettingsPage("/settings#settings-agent");

    await waitFor(() => {
      expect(screen.getByTestId("settings-agent")).toBeInTheDocument();
    });

    const agentSettings = within(screen.getByTestId("settings-agent"));
    expect(agentSettings.queryByRole("button", { name: "Open Agent" })).not.toBeInTheDocument();
    expect(agentSettings.queryByRole("button", { name: "Channels" })).not.toBeInTheDocument();
    expect(agentSettings.queryByRole("button", { name: "Providers" })).not.toBeInTheDocument();
  });

  it("rejects Agent session timeout values outside the BFF contract before PATCH", async () => {
    const updateBotSettingsMock = updateBotSettings as jest.MockedFunction<typeof updateBotSettings>;
    updateBotSettingsMock.mockClear();
    await renderSettingsPage("/settings#settings-agent");

    await waitFor(() => {
      expect(screen.getByTestId("settings-agent")).toBeInTheDocument();
    });

    const sessionTimeoutInput = screen.getByLabelText("Session timeout");
    expect(sessionTimeoutInput).toHaveAttribute("max", "180");
    fireEvent.change(sessionTimeoutInput, {
      target: { value: "181" },
    });
    fireEvent.blur(sessionTimeoutInput);

    expect(sessionTimeoutInput).toHaveValue(181);
    expect(screen.getByText("Use a whole number from 5 to 180 minutes.")).toBeInTheDocument();
    expect(updateBotSettingsMock).not.toHaveBeenCalledWith({ session_timeout_minutes: 181 });
  });

  it("keeps memory governance editable only in Memory & Data", async () => {
    await renderSettingsPage("/settings#settings-agent");

    await waitFor(() => {
      expect(screen.getByTestId("settings-agent")).toBeInTheDocument();
    });

    expect(
      within(screen.getByTestId("settings-agent")).queryByLabelText("Agent dream reflection")
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("settings-agent")).queryByLabelText("Agent query expansion")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("settings-brain")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Memory & Privacy" }));
    await waitFor(() => {
      expect(screen.getByTestId("settings-memory-data")).toBeInTheDocument();
    });

    expect(
      within(screen.getByTestId("settings-memory-data")).getByLabelText("Improve Agent memories automatically")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("settings-memory-data")).getByLabelText("Improve Agent recall")
    ).toBeInTheDocument();
    const memoryData = within(screen.getByTestId("settings-memory-data"));
    const forgetButton = memoryData.getByRole("button", { name: "Forget memory" });
    expect(forgetButton).toBeDisabled();
    fireEvent.change(memoryData.getByLabelText("Memory key to forget"), {
      target: { value: "mem_1" },
    });
    expect(forgetButton).toBeEnabled();
  });

  it("requires an all-category PII dry run before applying purge", async () => {
    const purgeMock = purgeAgentMemoryPii as jest.MockedFunction<typeof purgeAgentMemoryPii>;
    purgeMock.mockClear();
    purgeMock.mockImplementation(async ({ category, dry_run }) => {
      const isDryRun = dry_run ?? false;
      return {
        response: { ok: true },
        data: {
          category,
          dry_run: isDryRun,
          candidate_count: 2,
          deleted: isDryRun ? null : 2,
          sample_keys: ["mem_1"],
        },
      };
    });

    await renderSettingsPage("/settings#settings-memory-data");

    await waitFor(() => {
      expect(screen.getByTestId("settings-memory-data")).toBeInTheDocument();
    });

    const memoryData = within(screen.getByTestId("settings-memory-data"));
    expect(
      memoryData.getByRole("button", { name: "Purge phone/email PII" })
    ).toBeDisabled();

    fireEvent.click(memoryData.getByRole("button", { name: "Dry run PII purge" }));

    await waitFor(() => {
      expect(purgeMock).toHaveBeenCalledWith({ category: "all", dry_run: true });
    });
    await waitFor(() => {
      expect(memoryData.getByText("PII dry run: 2 candidates, 0 deleted.")).toBeInTheDocument();
    });

    const confirmButton = memoryData.getByRole("button", { name: "Confirm purge (2)" });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(purgeMock).toHaveBeenLastCalledWith({ category: "all", dry_run: false });
    });
  });

  it("signs out from the Account settings section", async () => {
    const requestLogoutMock = requestLogout as jest.MockedFunction<typeof requestLogout>;
    requestLogoutMock.mockClear();
    await renderSettingsPage();

    fireEvent.click(
      within(screen.getByTestId("settings-account")).getByRole("button", { name: "Sign out" })
    );

    await waitFor(() => {
      expect(requestLogoutMock).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  it("wires Memory & Data capture, dream, and query settings to their BFF APIs", async () => {
    const updateMemoryPreferencesMock = updateMemoryPreferences as jest.MockedFunction<
      typeof updateMemoryPreferences
    >;
    const updateBotSettingsMock = updateBotSettings as jest.MockedFunction<typeof updateBotSettings>;
    updateMemoryPreferencesMock.mockClear();
    updateBotSettingsMock.mockClear();
    await renderSettingsPage("/settings#settings-memory-data");

    await waitFor(() => {
      expect(screen.getByTestId("settings-memory-data")).toBeInTheDocument();
    });

    const memoryData = within(screen.getByTestId("settings-memory-data"));
    fireEvent.change(memoryData.getByLabelText("Chat memory capture"), {
      target: { value: "off" },
    });
    await waitFor(() => {
      expect(updateMemoryPreferencesMock).toHaveBeenCalledWith("off");
    });

    fireEvent.click(memoryData.getByLabelText("Improve Agent memories automatically"));
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({ dream_enabled: false });
    });

    fireEvent.click(memoryData.getByLabelText("Improve Agent recall"));
    await waitFor(() => {
      expect(updateBotSettingsMock).toHaveBeenCalledWith({
        query_expansion_enabled: true,
      });
    });
  });

  it("keeps non-release-ready channels visible but not configurable", async () => {
    const connectMock = connectAgentChannelControl as jest.MockedFunction<
      typeof connectAgentChannelControl
    >;
    const testMock = testAgentChannelControl as jest.MockedFunction<typeof testAgentChannelControl>;
    const disconnectMock = disconnectAgentChannelControl as jest.MockedFunction<
      typeof disconnectAgentChannelControl
    >;
    const upsertBindingMock = upsertAgentChannelBinding as jest.MockedFunction<
      typeof upsertAgentChannelBinding
    >;
    const deleteBindingMock = deleteAgentChannelBinding as jest.MockedFunction<
      typeof deleteAgentChannelBinding
    >;
    connectMock.mockClear();
    testMock.mockClear();
    disconnectMock.mockClear();
    upsertBindingMock.mockClear();
    deleteBindingMock.mockClear();
    await renderSettingsPage("/settings#settings-channels");

    await waitFor(() => {
      expect(screen.getByTestId("settings-channels")).toBeInTheDocument();
    });

    for (const [id, label] of [
      ["slack", "Slack"],
      ["discord", "Discord"],
      ["whatsapp", "WhatsApp"],
    ]) {
      const row = within(screen.getByTestId(`settings-channel-${id}`));
      expect(row.getByText("Coming soon")).toBeInTheDocument();
      expect(row.queryByRole("button", { name: `Manage ${label}` })).not.toBeInTheDocument();
      expect(row.queryByText(/not yet available for sending or receiving/i)).toBeInTheDocument();
      expect(screen.queryByTestId(`settings-channel-panel-${id}`)).not.toBeInTheDocument();
    }

    expect(screen.queryByLabelText("Slack Bot token")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Discord Bot token")).not.toBeInTheDocument();
    expect(connectMock).not.toHaveBeenCalled();
    expect(testMock).not.toHaveBeenCalled();
    expect(disconnectMock).not.toHaveBeenCalled();
    expect(upsertBindingMock).not.toHaveBeenCalled();
    expect(deleteBindingMock).not.toHaveBeenCalled();
  });

  it("wires verified Telegram credential save, test, and disconnect actions", async () => {
    const connectTelegramMock = connectBotTelegram as jest.MockedFunction<typeof connectBotTelegram>;
    const testMock = testAgentChannelControl as jest.MockedFunction<typeof testAgentChannelControl>;
    const disconnectTelegramMock = disconnectBotTelegram as jest.MockedFunction<typeof disconnectBotTelegram>;
    connectTelegramMock.mockClear();
    testMock.mockClear();
    disconnectTelegramMock.mockClear();
    await renderSettingsPage("/settings#settings-channels");

    await waitFor(() => expect(screen.getByTestId("settings-channel-telegram")).toBeInTheDocument());

    fireEvent.click(
      within(screen.getByTestId("settings-channel-telegram")).getByRole("button", {
        name: "Manage Telegram",
      })
    );

    const telegramControl = within(screen.getByTestId("settings-channel-panel-telegram"));
    const saveTelegramButton = telegramControl.getByRole("button", {
      name: "Update Telegram credentials",
    });
    expect(saveTelegramButton).toBeDisabled();
    fireEvent.change(telegramControl.getByLabelText("Telegram Bot token"), {
      target: { value: " 123456:telegram-token " },
    });
    expect(saveTelegramButton).toBeEnabled();
    fireEvent.click(saveTelegramButton);

    await waitFor(() => {
      expect(connectTelegramMock).toHaveBeenCalledWith({
        bot_token: "123456:telegram-token",
      });
    });
    fireEvent.click(telegramControl.getByRole("button", { name: "Test Telegram connection" }));
    await waitFor(() => {
      expect(testMock).toHaveBeenCalledWith("telegram");
    });
    fireEvent.click(telegramControl.getByRole("button", { name: "Disconnect Telegram" }));
    await waitFor(() => {
      expect(disconnectTelegramMock).toHaveBeenCalled();
    });
  });

  it("shows a user-safe error when a live channel test rejects saved credentials", async () => {
    const testMock = testAgentChannelControl as jest.MockedFunction<typeof testAgentChannelControl>;
    testMock.mockResolvedValueOnce({
      response: { ok: true } as Response,
      data: {
        channel: "telegram",
        last_test: { ok: false, detail: "provider_auth_rejected", checked_at_s: 1730000000 },
      },
    });
    (toast.error as jest.Mock).mockClear();
    (toast.success as jest.Mock).mockClear();
    await renderSettingsPage("/settings#settings-channels");

    await waitFor(() => {
      expect(screen.getByTestId("settings-channel-telegram")).toBeInTheDocument();
    });
    fireEvent.click(
      within(screen.getByTestId("settings-channel-telegram")).getByRole("button", {
        name: "Manage Telegram",
      })
    );
    fireEvent.click(
      within(screen.getByTestId("settings-channel-panel-telegram")).getByRole("button", {
        name: "Test Telegram connection",
      })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Provider rejected the saved credentials.");
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("does not brand a stored non-release-ready channel as connected", async () => {
    const fetchChannelControlsMock = fetchAgentChannelControls as jest.MockedFunction<
      typeof fetchAgentChannelControls
    >;
    fetchChannelControlsMock.mockResolvedValueOnce({
      response: { ok: true } as Response,
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
            ],
            config: {},
            last_test: { ok: true, detail: "provider_reachable", checked_at_s: 1730000000 },
          },
        ],
      },
    });

    await renderSettingsPage("/settings#settings-channels");

    const slackRow = within(await screen.findByTestId("settings-channel-slack"));
    expect(slackRow.getByText("Coming soon")).toBeInTheDocument();
    expect(slackRow.queryByText("Connected")).not.toBeInTheDocument();
    expect(slackRow.queryByRole("button", { name: "Manage Slack" })).not.toBeInTheDocument();
  });

  it("shows an in-flight Testing... affordance for verified Telegram only", async () => {
    const testMock = testAgentChannelControl as jest.MockedFunction<typeof testAgentChannelControl>;
    let resolveTest: (value: Awaited<ReturnType<typeof testAgentChannelControl>>) => void = () => {};
    testMock.mockImplementationOnce(
      () =>
        new Promise<Awaited<ReturnType<typeof testAgentChannelControl>>>((resolve) => {
          resolveTest = resolve;
        })
    );

    await renderSettingsPage("/settings#settings-channels");

    await waitFor(() => expect(screen.getByTestId("settings-channel-telegram")).toBeInTheDocument());

    fireEvent.click(
      within(screen.getByTestId("settings-channel-telegram")).getByRole("button", {
        name: "Manage Telegram",
      })
    );
    const panel = within(screen.getByTestId("settings-channel-panel-telegram"));
    fireEvent.click(panel.getByRole("button", { name: "Test Telegram connection" }));

    await waitFor(() => {
      expect(panel.getByRole("button", { name: "Testing..." })).toBeDisabled();
    });

    await act(async () => {
      resolveTest({
        response: { ok: true } as Response,
        data: { channel: "telegram", last_test: { ok: true, detail: "provider_reachable" } },
      });
    });

    await waitFor(() => {
      expect(panel.getByRole("button", { name: "Test Telegram connection" })).toBeEnabled();
    });
  });

  it("maps Telegram's dedicated bot-token payload to its vault requirement", async () => {
    const fetchChannelControlsMock = fetchAgentChannelControls as jest.MockedFunction<
      typeof fetchAgentChannelControls
    >;
    fetchChannelControlsMock.mockResolvedValueOnce({
      response: { ok: true } as Response,
      data: {
        channels: [
          {
            channel: "telegram",
            label: "Telegram",
            build_enabled: true,
            operator_configured: true,
            user_managed: true,
            user_connected: false,
            status: "not_connected",
            secret_refs: [
              {
                key: "telegram_bot_token",
                label: "Bot token",
                required: true,
                present: false,
              },
            ],
            config: {},
            last_test: null,
          },
        ],
      },
    });
    await renderSettingsPage("/settings#settings-channels");

    fireEvent.click(
      within(screen.getByTestId("settings-channel-telegram")).getByRole("button", {
        name: "Manage Telegram",
      })
    );
    const telegramPanel = within(screen.getByTestId("settings-channel-panel-telegram"));
    const saveButton = telegramPanel.getByRole("button", {
      name: "Update Telegram credentials",
    });
    expect(saveButton).toBeDisabled();
    fireEvent.change(telegramPanel.getByLabelText("Telegram Bot token"), {
      target: { value: "123456:telegram-token" },
    });
    expect(saveButton).toBeEnabled();
  });

  it("keeps structural-only channel test actions credential-specific", () => {
    expect(formatChannelTestActionLabel("telegram", "Telegram")).toBe("Test Telegram connection");
    expect(formatChannelTestActionLabel("slack", "Slack")).toBe("Test Slack connection");
    expect(formatChannelTestActionLabel("discord", "Discord")).toBe("Check Discord credentials");
    expect(formatChannelTestActionLabel("whatsapp", "WhatsApp")).toBe("Check WhatsApp credentials");
  });

  it("hides channel credential actions when the channel control plane is unavailable", async () => {
    const fetchChannelControlsMock = fetchAgentChannelControls as jest.MockedFunction<
      typeof fetchAgentChannelControls
    >;
    fetchChannelControlsMock.mockResolvedValueOnce({
      response: { ok: false } as Response,
      data: { error: "channel_controls_unavailable" },
    });

    await renderSettingsPage("/settings#settings-channels");

    await waitFor(() => {
      expect(
        within(screen.getByTestId("settings-channels")).getAllByText("Coming soon")
          .length
      ).toBeGreaterThan(0);
    });

    const channels = within(screen.getByTestId("settings-channels"));
    expect(channels.queryByRole("button", { name: "Manage Slack" })).not.toBeInTheDocument();
    expect(channels.queryByRole("button", { name: "Manage Discord" })).not.toBeInTheDocument();
    expect(channels.queryByRole("button", { name: "Manage WhatsApp" })).not.toBeInTheDocument();
    expect(channels.getByRole("button", { name: "Manage Telegram" })).toBeInTheDocument();
    expect(
      channels.getAllByText("Credential actions are unavailable until the channel control plane responds.")
        .length
    ).toBeGreaterThan(0);
  });

  it("keeps future provider and model controls hidden from end-user settings", async () => {
    await renderSettingsPage();

    expect(screen.queryByTestId("settings-providers")).not.toBeInTheDocument();
    expect(screen.queryByTestId("settings-provider-create")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent model default")).not.toBeInTheDocument();
    expect(screen.queryByText("OpenAI-compatible provider")).not.toBeInTheDocument();
  });

  it("wires secret rotation and extension device pairing", async () => {
    const putSecretMock = putAgentSecret as jest.MockedFunction<typeof putAgentSecret>;
    const pairDeviceMock = pairAgentExtensionDevice as jest.MockedFunction<
      typeof pairAgentExtensionDevice
    >;
    putSecretMock.mockClear();
    pairDeviceMock.mockClear();
    await renderSettingsPage("/settings#settings-secrets");

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

    fireEvent.click(screen.getByRole("link", { name: "Devices" }));
    await waitFor(() => {
      expect(screen.getByTestId("settings-devices")).toBeInTheDocument();
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

  it("hides secret and device mutation forms when their BFF facades are unavailable", async () => {
    const listSecretsMock = listAgentSecrets as jest.MockedFunction<typeof listAgentSecrets>;
    const fetchDevicesMock = fetchAgentExtensionDevices as jest.MockedFunction<
      typeof fetchAgentExtensionDevices
    >;
    listSecretsMock.mockResolvedValueOnce({
      response: { ok: false } as Response,
      data: { error: "agent_secrets_unavailable" },
    });
    fetchDevicesMock.mockResolvedValueOnce({
      response: { ok: false } as Response,
      data: { error: "extension_devices_unavailable" },
    });

    await renderSettingsPage("/settings#settings-secrets");

    await waitFor(() => {
      expect(
        within(screen.getByTestId("settings-secrets")).getByText(
          "Secret actions are unavailable until the Agent vault responds."
        )
      ).toBeInTheDocument();
    });

    const secrets = within(screen.getByTestId("settings-secrets"));
    expect(secrets.queryByRole("button", { name: "Save secret" })).not.toBeInTheDocument();
    expect(secrets.queryByPlaceholderText("OPENAI_API_KEY")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Devices" }));
    await waitFor(() => {
      expect(
        within(screen.getByTestId("settings-devices")).getByText(
          "Device pairing is unavailable until the extension device service responds."
        )
      ).toBeInTheDocument();
    });

    const devices = within(screen.getByTestId("settings-devices"));
    expect(devices.queryByRole("button", { name: "Pair device" })).not.toBeInTheDocument();
    expect(devices.queryByPlaceholderText("Work laptop")).not.toBeInTheDocument();
  });

  it("keeps Spaces object settings out of route-level Settings", async () => {
    await renderSettingsPage();

    expect(screen.queryByTestId("settings-spaces")).not.toBeInTheDocument();
    expect(screen.queryByTestId("settings-space-research")).not.toBeInTheDocument();
    expect(screen.queryByTestId("settings-space-open-research")).not.toBeInTheDocument();
    expect(screen.queryByTestId("settings-space-manage-research")).not.toBeInTheDocument();
  });

});
