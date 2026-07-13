import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { V2Badge, V2Button, type V2BadgeTone } from "@/app/components/v2";
import {
  V2SettingsBlock,
  V2SettingsRow,
} from "./V2SettingsPrimitives";
import type {
  AgentChannelBinding,
  AgentChannelBindingPayload,
  AgentChannelControlId,
  AgentChannelControlStatus,
  AgentChannelId,
  AgentChannelStatus,
} from "@/lib/api";

export type SettingsChannelId = AgentChannelControlId;

type SettingsChannelConfig = {
  id: SettingsChannelId;
  label: string;
  description: string;
  principalPlaceholder: string;
  scopePlaceholder: string;
  setupNotes?: string[];
};

type SettingsChannelViewModel = SettingsChannelConfig & {
  launch: AgentChannelStatus | null;
  control: AgentChannelControlStatus | null;
  bindings: AgentChannelBinding[];
  missingSecrets: string[];
  missingSecretKeys: string[];
  presentSecrets: number;
  totalRequiredSecrets: number;
  statusLabel: string;
  statusTone: V2BadgeTone;
  ownershipLabel: string;
  ownershipTone: V2BadgeTone;
  actionLabel: string;
  panelLead: string;
  notes: string[];
  credentialSummary: string;
  bindingSummary: string;
  canManageBindings: boolean;
  credentialFormVisible: boolean;
  isConnected: boolean;
  canTestChannel: boolean;
  canDisconnectChannel: boolean;
  hasLiveProbe: boolean;
};

export type ChannelBindingDraft = Pick<
  AgentChannelBindingPayload,
  "account_id" | "principal_key" | "scope_key" | "thread_key"
>;

const SETTINGS_CHANNELS: SettingsChannelConfig[] = [
  {
    id: "telegram",
    label: "Telegram",
    description: "Bot channel for Telegram chats.",
    principalPlaceholder: "telegram-user-id",
    scopePlaceholder: "telegram-chat-id",
  },
  {
    id: "slack",
    label: "Slack",
    description: "Connect your own Slack app to a workspace with write-only credentials.",
    principalPlaceholder: "U123456",
    scopePlaceholder: "C123456",
    setupNotes: [
      "Create a Slack app, install it to your workspace, and copy its Bot User OAuth Token (xoxb-…).",
      "Under Basic Information, copy the Signing Secret. Both the Bot token and Signing secret are required for first-time setup.",
      "This V1 flow uses pasted app credentials; workspace OAuth app-install is not available yet.",
    ],
  },
  {
    id: "discord",
    label: "Discord",
    description: "Connect your own Discord bot for direct messages and server channels.",
    principalPlaceholder: "discord-user-id",
    scopePlaceholder: "discord-channel-id",
    setupNotes: [
      "Create a bot in the Discord Developer Portal, open Bot, and copy its token.",
      "Use OAuth2 → URL Generator to select the bot scope, invite it to your server, and enable the Message Content intent.",
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "WhatsApp channel when enabled.",
    principalPlaceholder: "whatsapp-user-id",
    scopePlaceholder: "whatsapp-thread-id",
  },
];

export const USER_MANAGED_CHANNELS: AgentChannelControlId[] = [
  "telegram",
  "slack",
  "discord",
  "whatsapp",
];

export const CHANNEL_ACTIVATION_FIELDS: Partial<Record<
  AgentChannelControlId,
  Array<{
    key: string;
    label: string;
    placeholder: string;
    secret?: boolean;
    vaultKey?: string;
  }>
>> = {
  telegram: [
    {
      key: "bot_token",
      vaultKey: "telegram_bot_token",
      label: "Bot token",
      placeholder: "123456:ABC...",
      secret: true,
    },
    {
      key: "webhook_base_url",
      label: "Webhook base URL",
      placeholder: "https://your-domain.example.com",
    },
    {
      key: "webhook_secret_token",
      label: "Webhook secret",
      placeholder: "Webhook secret",
      secret: true,
    },
  ],
  slack: [
    { key: "slack_bot_token", label: "Bot token", placeholder: "xoxb-...", secret: true },
    {
      key: "slack_signing_secret",
      label: "Signing secret",
      placeholder: "Slack signing secret",
      secret: true,
    },
    {
      key: "slack_app_token",
      label: "App token",
      placeholder: "xapp-... (optional)",
      secret: true,
    },
    {
      key: "team_id",
      label: "Workspace ID",
      placeholder: "T123456 (optional)",
    },
  ],
  discord: [
    { key: "discord_bot_token", label: "Bot token", placeholder: "Discord bot token", secret: true },
    { key: "guild_id", label: "Guild ID", placeholder: "Discord server id (optional)" },
  ],
  whatsapp: [
    { key: "whatsapp_access_token", label: "Access token", placeholder: "WhatsApp access token", secret: true },
    { key: "whatsapp_verify_token", label: "Verify token", placeholder: "Webhook verify token", secret: true },
    { key: "whatsapp_app_secret", label: "App secret", placeholder: "Meta app secret (optional)", secret: true },
    { key: "phone_number_id", label: "Phone number ID", placeholder: "Meta phone number ID" },
    { key: "business_account_id", label: "Business account ID", placeholder: "Meta business account ID (optional)" },
  ],
};

export function defaultChannelBindingDraft(): ChannelBindingDraft {
  return {
    account_id: "main",
    principal_key: "",
    scope_key: "",
    thread_key: "",
  };
}

export function buildEmptyChannelActivationDrafts() {
  return USER_MANAGED_CHANNELS.reduce<Record<string, Record<string, string>>>((drafts, channel) => {
    drafts[channel] = (CHANNEL_ACTIVATION_FIELDS[channel] ?? []).reduce<Record<string, string>>((fields, field) => {
      fields[field.key] = "";
      return fields;
    }, {});
    return drafts;
  }, {});
}

export function compactStringPayload(payload: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, String(value || "").trim()])
      .filter(([, value]) => Boolean(value))
  ) as Record<string, string>;
}

export function canSaveChannelBindingDraft(draft: ChannelBindingDraft) {
  return Boolean(
    draft.account_id.trim() &&
      draft.principal_key.trim() &&
      draft.scope_key.trim()
  );
}

export function hasChannelActivationPayload(draft: Record<string, string>) {
  return Object.keys(compactStringPayload(draft)).length > 0;
}

function isAgentLaunchChannelId(channel: SettingsChannelId): channel is AgentChannelId {
  return channel === "telegram" || channel === "slack" || channel === "discord" || channel === "email";
}

function formatUnixDate(value?: number | null) {
  if (!value) return null;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatChannelTestDetail(detail?: string | null) {
  if (!detail) return "Connection test completed.";
  if (detail === "provider_reachable") return "Provider connection verified.";
  if (detail === "provider_auth_rejected") return "Provider rejected the saved credentials.";
  if (detail === "provider_timeout") return "Provider connection test timed out.";
  if (detail === "provider_unreachable") return "Provider could not be reached.";
  if (detail === "invalid_provider_response") return "Provider returned an unexpected response.";
  if (detail === "credentials_present") {
    return "Saved credentials are present; this provider does not have a live probe yet.";
  }
  if (detail.startsWith("missing_required_secret")) return "A required channel credential is missing.";
  if (detail.startsWith("malformed_secret")) return "A saved channel credential is malformed.";
  return "Connection test completed.";
}

export function channelHasLiveProbe(channel: SettingsChannelId) {
  return channel === "telegram" || channel === "slack";
}

export function formatChannelTestActionLabel(channel: SettingsChannelId, label: string) {
  return channelHasLiveProbe(channel)
    ? `Test ${label} connection`
    : `Check ${label} credentials`;
}

function getChannelTone(channel?: AgentChannelStatus | null): V2BadgeTone {
  if (channel?.connected || channel?.configured) return "success";
  if (channel?.available || channel?.live) return "warn";
  return "default";
}

function getChannelStatusLabel(channel?: AgentChannelStatus | null) {
  if (!channel) return "Checking";
  if (channel.connected) return "Connected";
  if (channel.configured) return "Configured";
  if (channel.available || channel.live) return "Ready";
  return "Not configured";
}

// A connected-but-broken channel must not read as healthy: only treat the last
// live /test as a failure when the engine actually reported ok === false. A
// missing/null last_test (never tested, or a pre-liveness engine) is "unknown",
// not "failed", so we fall back to the stored connection state.
export function lastLiveTestFailed(control?: AgentChannelControlStatus | null) {
  return control?.last_test?.ok === false;
}

function getChannelControlTone(control?: AgentChannelControlStatus | null): V2BadgeTone {
  if (control?.user_connected || control?.status === "connected") {
    return lastLiveTestFailed(control) ? "warn" : "success";
  }
  if (control?.status === "partial") return "warn";
  if (control?.build_enabled === false || control?.status === "disabled_in_build") return "danger";
  return "default";
}

function getChannelControlStatusLabel(control?: AgentChannelControlStatus | null) {
  if (!control) return "Setup status unavailable";
  if (control.status === "connected" || control.user_connected) {
    return lastLiveTestFailed(control) ? "Needs attention" : "Connected";
  }
  if (control.status === "partial") return "Needs required fields";
  if (control.status === "disabled_in_build" || control.build_enabled === false) return "Disabled in this build";
  return "Needs setup";
}

type SettingsChannelsSectionProps = {
  agentChannelsById: Map<AgentChannelId, AgentChannelStatus>;
  agentChannelsLoading: boolean;
  channelControlsById: Map<string, AgentChannelControlStatus>;
  channelControlsLoading: boolean;
  channelControlsAvailable: boolean;
  expandedChannelId: SettingsChannelId | null;
  setExpandedChannelId: (updater: (current: SettingsChannelId | null) => SettingsChannelId | null) => void;
  channelBindingDrafts: Record<AgentChannelId, ChannelBindingDraft>;
  channelActivationDrafts: Record<string, Record<string, string>>;
  channelAction: string | null;
  channelControlAction: string | null;
  updateChannelBindingDraft: (channel: AgentChannelId, patch: Partial<ChannelBindingDraft>) => void;
  updateChannelActivationDraft: (channel: AgentChannelControlId, key: string, value: string) => void;
  handleSaveChannelBinding: (channel: AgentChannelId) => void | Promise<void>;
  handleDeleteChannelBinding: (channel: AgentChannelId, bindingId: string) => void | Promise<void>;
  handleConnectChannelControl: (channel: AgentChannelControlId) => void | Promise<void>;
  handleTestChannelControl: (channel: AgentChannelControlId) => void | Promise<void>;
  handleDisconnectChannelControl: (channel: AgentChannelControlId) => void | Promise<void>;
};

export function SettingsChannelsSection({
  agentChannelsById,
  agentChannelsLoading,
  channelControlsById,
  channelControlsLoading,
  channelControlsAvailable,
  expandedChannelId,
  setExpandedChannelId,
  channelBindingDrafts,
  channelActivationDrafts,
  channelAction,
  channelControlAction,
  updateChannelBindingDraft,
  updateChannelActivationDraft,
  handleSaveChannelBinding,
  handleDeleteChannelBinding,
  handleConnectChannelControl,
  handleTestChannelControl,
  handleDisconnectChannelControl,
}: SettingsChannelsSectionProps) {
  const { t } = useTranslation();

  const settingsChannelRows = useMemo<SettingsChannelViewModel[]>(() => {
    return SETTINGS_CHANNELS.flatMap((config) => {
      const launch = isAgentLaunchChannelId(config.id)
        ? agentChannelsById.get(config.id) ?? null
        : null;
      const control = channelControlsById.get(config.id) ?? null;
      const controlDisabledInBuild =
        control?.build_enabled === false || control?.status === "disabled_in_build";

      if (config.id === "whatsapp" && (!control || controlDisabledInBuild)) return [];

      const bindings = launch?.bindings?.items ?? [];
      const secretRefs = control?.secret_refs ?? [];
      const requiredSecretRefs = secretRefs.filter((secret) => secret.required !== false);
      const presentSecrets = secretRefs.filter((secret) => secret.present).length;
      const configuredCredentialFields = CHANNEL_ACTIVATION_FIELDS[config.id]?.length ?? 0;
      const totalRequiredSecrets =
        requiredSecretRefs.length || (launch?.required_secrets ?? []).length || (control ? configuredCredentialFields : 0);
      const missingSecrets = requiredSecretRefs
        .filter((secret) => !secret.present)
        .map((secret) => secret.label || secret.key);
      const missingSecretKeys = requiredSecretRefs
        .filter((secret) => !secret.present)
        .map((secret) => secret.key);
      const credentialFormVisible =
        Boolean(control) &&
        channelControlsAvailable &&
        !controlDisabledInBuild;
      const isConnected =
        control?.user_connected === true ||
        control?.status === "connected" ||
        launch?.connected === true ||
        launch?.configured === true;
      const hasRequiredSecrets =
        totalRequiredSecrets === 0 || presentSecrets >= totalRequiredSecrets;
      const canTestChannel =
        credentialFormVisible &&
        Boolean(control?.endpoints?.test || control) &&
        (isConnected || hasRequiredSecrets);
      const hasLiveProbe = channelHasLiveProbe(config.id);
      const canDisconnectChannel =
        credentialFormVisible &&
        (config.id === "telegram" || Boolean(control?.endpoints?.disconnect || control)) &&
        (isConnected || presentSecrets > 0);
      const canManageBindings = Boolean(
        isAgentLaunchChannelId(config.id) &&
          launch?.bindings_supported &&
          launch?.status !== "disabled_in_build" &&
          launch?.status !== "unavailable"
      );

      let statusLabel = control ? getChannelControlStatusLabel(control) : getChannelStatusLabel(launch);
      let statusTone = control ? getChannelControlTone(control) : getChannelTone(launch);
      if (!control && config.id !== "telegram" && !channelControlsLoading) {
        statusLabel = channelControlsAvailable ? "Status only" : "Control plane unavailable";
        statusTone = channelControlsAvailable ? "default" : "danger";
      }

      let ownershipLabel = "Status only";
      let ownershipTone: V2BadgeTone = "default";
      if (credentialFormVisible) {
        ownershipLabel = "Your tokens";
        ownershipTone = "success";
      } else if (controlDisabledInBuild) {
        ownershipLabel = "Unavailable";
        ownershipTone = "danger";
      }

      const actionLabel =
        credentialFormVisible || canManageBindings
          ? expandedChannelId === config.id
            ? `Close ${config.label}`
            : `Manage ${config.label}`
          : "Status only";
      const notes: string[] = [];
      notes.push(...(config.setupNotes ?? []));
      if (!channelControlsAvailable && config.id !== "telegram") {
        notes.push("Credential actions are unavailable while the channel control plane is offline.");
      }
      if (missingSecrets.length > 0 && credentialFormVisible) {
        notes.push(`Missing required fields: ${missingSecrets.join(", ")}.`);
      }
      const credentialSummary = credentialFormVisible
        ? `${presentSecrets}/${totalRequiredSecrets} credential fields saved`
        : ownershipLabel;
      const bindingSummary = canManageBindings
        ? `${bindings.length} ${bindings.length === 1 ? "binding" : "bindings"}`
        : "Not available";
      const panelLead = credentialFormVisible
        ? "Save or rotate this channel's write-only token fields."
        : config.id === "telegram"
          ? "Telegram setup is unavailable until the channel control plane responds."
          : "This channel is unavailable in the current build.";

      return [{
        ...config,
        launch,
        control,
        bindings,
        missingSecrets,
        missingSecretKeys,
        presentSecrets,
        totalRequiredSecrets,
        statusLabel,
        statusTone,
        ownershipLabel,
        ownershipTone,
        actionLabel,
        panelLead,
        notes,
        credentialSummary,
        bindingSummary,
        canManageBindings,
        credentialFormVisible,
        isConnected,
        canTestChannel,
        canDisconnectChannel,
        hasLiveProbe,
      }];
    });
  }, [
    agentChannelsById,
    channelControlsAvailable,
    channelControlsById,
    channelControlsLoading,
    expandedChannelId,
  ]);

  return (
    <V2SettingsBlock
      id="settings-channels"
      data-testid="settings-channels"
      title={t("settingsModal.sections.channels", { defaultValue: "Channels" })}
      meta={
        agentChannelsLoading || channelControlsLoading
          ? t("settingsModal.channels.loading", { defaultValue: "Checking channels" })
          : t("settingsModal.channels.count", {
              count: settingsChannelRows.length,
              defaultValue: `${settingsChannelRows.length} channels`,
            })
      }
    >
      <div className="zaki-settings-v2__channel-list">
        {settingsChannelRows.map((channelRow) => {
          const expanded = expandedChannelId === channelRow.id;
          const hasManageAction = channelRow.canManageBindings || channelRow.credentialFormVisible;
          const control = channelRow.control;
          const launchChannelId = isAgentLaunchChannelId(channelRow.id) ? channelRow.id : null;
          const lastTestDate = formatUnixDate(control?.last_test?.checked_at_s);
          const draft = launchChannelId
            ? channelBindingDrafts[launchChannelId] || defaultChannelBindingDraft()
            : defaultChannelBindingDraft();
          const canSaveBindingDraft = launchChannelId ? canSaveChannelBindingDraft(draft) : false;
          const activationDraft = channelActivationDrafts[channelRow.id] || {};
          const hasActivationDraft = hasChannelActivationPayload(activationDraft);
          const credentialFields = CHANNEL_ACTIVATION_FIELDS[channelRow.id] ?? [];
          const hasMissingRequiredDrafts = channelRow.missingSecretKeys.every((vaultKey) => {
            const field = credentialFields.find(
              (candidate) => (candidate.vaultKey ?? candidate.key) === vaultKey
            );
            return Boolean(field && activationDraft[field.key]?.trim());
          });
          const canSaveActivationDraft = hasActivationDraft && hasMissingRequiredDrafts;

          return (
            <div
              key={channelRow.id}
              className="zaki-settings-v2__channel-row"
              data-testid={`settings-channel-${channelRow.id}`}
            >
              <V2SettingsRow name={channelRow.label} description={channelRow.description}>
                <div className="zaki-settings-v2__channel-lane">
                  <div className="zaki-settings-v2__status-chips">
                    <V2Badge tone={channelRow.statusTone}>{channelRow.statusLabel}</V2Badge>
                    <V2Badge tone={channelRow.ownershipTone}>{channelRow.ownershipLabel}</V2Badge>
                    {channelRow.canManageBindings ? (
                      <V2Badge tone={channelRow.bindings.length > 0 ? "success" : "default"}>
                        {t("settingsModal.channels.bindings.count", {
                          count: channelRow.bindings.length,
                          defaultValue: `${channelRow.bindings.length} bindings`,
                        })}
                      </V2Badge>
                    ) : null}
                    {channelRow.credentialFormVisible ? (
                      <V2Badge
                        tone={
                          channelRow.presentSecrets >= channelRow.totalRequiredSecrets
                            ? "success"
                            : "warn"
                        }
                      >
                        {channelRow.presentSecrets}/{channelRow.totalRequiredSecrets} credentials
                      </V2Badge>
                    ) : null}
                  </div>
                  <div className="zaki-settings-v2__actions">
                    {hasManageAction ? (
                      <V2Button
                        size="sm"
                        onClick={() =>
                          setExpandedChannelId((current) =>
                            current === channelRow.id ? null : channelRow.id
                          )
                        }
                        aria-expanded={expanded}
                        aria-controls={`settings-channel-panel-${channelRow.id}`}
                      >
                        {channelRow.actionLabel}
                      </V2Button>
                    ) : null}
                  </div>
                </div>
              </V2SettingsRow>

              {expanded ? (
                <div
                  id={`settings-channel-panel-${channelRow.id}`}
                  data-testid={`settings-channel-panel-${channelRow.id}`}
                  className="zaki-settings-v2__edit-tray zaki-settings-v2__edit-tray--channel"
                >
                  <div className="zaki-settings-v2__tray-head">
                    <div>
                      <strong className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--v2-text)]">
                        {channelRow.label}
                      </strong>
                      <p className="v2-body-sm">{channelRow.panelLead}</p>
                    </div>
                    <V2Badge tone={channelControlsAvailable ? "success" : "danger"}>
                      {channelControlsAvailable
                        ? t("settingsModal.channels.control.loaded", {
                            defaultValue: "Control plane live",
                          })
                        : t("settingsModal.channels.control.unavailable", {
                            defaultValue: "Control plane unavailable",
                          })}
                    </V2Badge>
                  </div>

                  <div className="zaki-settings-v2__channel-summary-grid">
                    <div>
                      <span>Status</span>
                      <strong>{channelRow.statusLabel}</strong>
                    </div>
                    <div>
                      <span>Owner</span>
                      <strong>{channelRow.ownershipLabel}</strong>
                    </div>
                    <div>
                      <span>Credentials</span>
                      <strong>{channelRow.credentialSummary}</strong>
                    </div>
                    <div>
                      <span>Bindings</span>
                      <strong>{channelRow.bindingSummary}</strong>
                    </div>
                  </div>

                  {channelRow.notes.length > 0 ? (
                    <ul className="zaki-settings-v2__channel-notes">
                      {channelRow.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}

                  {channelRow.credentialFormVisible ? (
                    <div className="zaki-settings-v2__channel-panel-section">
                      <div className="zaki-settings-v2__channel-panel-title">
                        <strong>Credentials</strong>
                        <span>Write-only vault fields</span>
                      </div>
                      <div
                        className="zaki-settings-v2__field-grid zaki-settings-v2__field-grid--2"
                        data-testid={`settings-channel-credentials-${channelRow.id}`}
                      >
                        {credentialFields.map((field) => (
                          <input
                            key={field.key}
                            className="v2-input"
                            type={field.secret ? "password" : "text"}
                            value={activationDraft[field.key] || ""}
                            placeholder={`${field.label}: ${field.placeholder}`}
                            aria-label={`${channelRow.label} ${field.label}`}
                            onChange={(event) =>
                              updateChannelActivationDraft(
                                channelRow.id,
                                field.key,
                                event.target.value
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {control?.last_test ? (
                    <div className="zaki-settings-v2__channel-check">
                      <span>{channelRow.hasLiveProbe ? "Last connection test" : "Last credential check"}</span>
                      <strong>
                        {control.last_test.ok
                          ? channelRow.hasLiveProbe
                            ? "Verified"
                            : "Valid"
                          : "Failed"}
                      </strong>
                      <small>
                        {formatChannelTestDetail(control.last_test.detail)}
                        {lastTestDate ? ` · ${lastTestDate}` : ""}
                      </small>
                    </div>
                  ) : null}

                  {channelRow.credentialFormVisible ? (
                    <div className="zaki-settings-v2__actions zaki-settings-v2__actions--with-note">
                      <V2Button
                        size="sm"
                        variant="accent"
                        disabled={
                          channelControlAction === `${channelRow.id}:connect` ||
                          !canSaveActivationDraft
                        }
                        onClick={() => void handleConnectChannelControl(channelRow.id)}
                      >
                        {channelControlAction === `${channelRow.id}:connect`
                          ? t("app.legal.saving")
                          : t("settingsModal.channels.control.connect", {
                              channel: channelRow.label,
                              defaultValue: `${
                                channelRow.isConnected || channelRow.presentSecrets > 0
                                  ? "Update"
                                  : "Save"
                              } ${channelRow.label} credentials`,
                            })}
                      </V2Button>
                      {channelRow.canTestChannel ? (
                        <V2Button
                          size="sm"
                          disabled={channelControlAction === `${channelRow.id}:test`}
                          onClick={() => void handleTestChannelControl(channelRow.id)}
                        >
                          {channelControlAction === `${channelRow.id}:test`
                            ? t("settingsModal.channels.control.testing", {
                                channel: channelRow.label,
                                defaultValue: "Testing...",
                              })
                            : t("settingsModal.channels.control.test", {
                                channel: channelRow.label,
                                defaultValue: formatChannelTestActionLabel(channelRow.id, channelRow.label),
                              })}
                        </V2Button>
                      ) : null}
                      {channelRow.canDisconnectChannel ? (
                        <V2Button
                          size="sm"
                          variant="danger"
                          disabled={channelControlAction === `${channelRow.id}:disconnect`}
                          onClick={() => void handleDisconnectChannelControl(channelRow.id)}
                        >
                          {t("settingsModal.channels.control.disconnect", {
                            channel: channelRow.label,
                            defaultValue: `Disconnect ${channelRow.label}`,
                          })}
                        </V2Button>
                      ) : null}
                      <span className="zaki-settings-v2__action-note">
                        {!hasActivationDraft
                          ? "Enter at least one credential field to save an update."
                          : !hasMissingRequiredDrafts
                            ? "Enter every missing required credential before saving."
                            : "Saving replaces only the fields you enter; stored secret values are not revealed."}
                      </span>
                    </div>
                  ) : null}

                  {channelRow.canManageBindings && launchChannelId ? (
                    <div
                      className="zaki-settings-v2__channel-panel-section zaki-settings-v2__binding-panel"
                      data-testid={`settings-channel-bindings-${channelRow.id}`}
                    >
                      <div className="zaki-settings-v2__channel-panel-title">
                        <strong>Identity bindings</strong>
                        <span>Route inbound identities to this ZAKI account</span>
                      </div>
                      <div className="zaki-settings-v2__field-grid zaki-settings-v2__field-grid--4">
                        <input
                          className="v2-input"
                          value={draft.account_id}
                          onChange={(event) =>
                            updateChannelBindingDraft(launchChannelId, {
                              account_id: event.target.value,
                            })
                          }
                          placeholder={t("settingsModal.channels.bindings.account", {
                            defaultValue: "Account",
                          })}
                          aria-label={`${channelRow.label} account id`}
                        />
                        <input
                          className="v2-input"
                          value={draft.principal_key}
                          onChange={(event) =>
                            updateChannelBindingDraft(launchChannelId, {
                              principal_key: event.target.value,
                            })
                          }
                          placeholder={channelRow.principalPlaceholder}
                          aria-label={`${channelRow.label} principal key`}
                        />
                        <input
                          className="v2-input"
                          value={draft.scope_key}
                          onChange={(event) =>
                            updateChannelBindingDraft(launchChannelId, {
                              scope_key: event.target.value,
                            })
                          }
                          placeholder={channelRow.scopePlaceholder}
                          aria-label={`${channelRow.label} scope key`}
                        />
                        <input
                          className="v2-input"
                          value={draft.thread_key || ""}
                          onChange={(event) =>
                            updateChannelBindingDraft(launchChannelId, {
                              thread_key: event.target.value,
                            })
                          }
                          placeholder={t("settingsModal.channels.bindings.thread", {
                            defaultValue: "Thread optional",
                          })}
                          aria-label={`${channelRow.label} thread key`}
                        />
                      </div>
                      <div className="zaki-settings-v2__actions zaki-settings-v2__actions--with-note">
                        <V2Button
                          size="sm"
                          onClick={() => void handleSaveChannelBinding(launchChannelId)}
                          disabled={channelAction === `${channelRow.id}:save` || !canSaveBindingDraft}
                        >
                          {channelAction === `${channelRow.id}:save`
                            ? t("settingsModal.channels.bindings.saving", {
                                defaultValue: "Saving",
                              })
                            : t("settingsModal.channels.bindings.saveChannel", {
                                channel: channelRow.label,
                                defaultValue: `Bind ${channelRow.label} identity`,
                              })}
                        </V2Button>
                        <span className="zaki-settings-v2__action-note">
                          {canSaveBindingDraft
                            ? t("settingsModal.channels.bindings.helper", {
                                defaultValue:
                                  "Bindings route inbound identities to your Agent without exposing channel secrets.",
                              })
                            : t("settingsModal.channels.bindings.requiredHelper", {
                                defaultValue:
                                  "Enter account, principal, and scope to save a binding.",
                              })}
                        </span>
                      </div>
                      {channelRow.bindings.length > 0 ? (
                        <div className="grid gap-1">
                          {channelRow.bindings.map((binding) => (
                            <div key={binding.id} className="zaki-settings-v2__binding-row">
                              <span className="font-mono text-[var(--v2-text)]">
                                {binding.account_id} / {binding.principal_key} / {binding.scope_key}
                              </span>
                              <V2Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleDeleteChannelBinding(launchChannelId, binding.id)}
                                disabled={channelAction === `${channelRow.id}:${binding.id}`}
                              >
                                {t("settingsModal.channels.bindings.deleteChannel", {
                                  channel: channelRow.label,
                                  defaultValue: `Delete ${channelRow.label} binding`,
                                })}
                              </V2Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="v2-body-sm">No identity bindings yet.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!channelControlsAvailable ? (
        <p className="zaki-settings-v2__empty-state">
          {t("settingsModal.channels.control.unavailableHelper", {
            defaultValue:
              "Credential actions are unavailable until the channel control plane responds.",
          })}
        </p>
      ) : null}

    </V2SettingsBlock>
  );
}
