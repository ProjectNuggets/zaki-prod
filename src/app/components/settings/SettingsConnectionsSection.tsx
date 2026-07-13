import { useMemo } from "react";
import { V2Badge, V2Button } from "@/app/components/v2";
import type { AgentIntegrationsResponse } from "@/lib/api";
import { V2SettingsBlock, V2SettingsRow } from "./V2SettingsPrimitives";

type AgentIntegration = NonNullable<
  AgentIntegrationsResponse["integrations"]
>[number];

type SettingsConnectionsSectionProps = {
  integrations: AgentIntegration[];
  loading: boolean;
  available: boolean;
};

export function SettingsConnectionsSection({
  integrations,
  loading,
  available,
}: SettingsConnectionsSectionProps) {
  const composio = useMemo(
    () =>
      integrations.find((integration) => integration.kind === "composio") ??
      null,
    [integrations],
  );
  const connectorConfigured = available && composio?.configured === true;
  const connectorLabel = loading
    ? "Checking connector"
    : connectorConfigured
      ? "Connector configured"
      : "Connector unavailable";

  return (
    <V2SettingsBlock
      id="settings-connections"
      data-testid="settings-connections"
      title="Connections"
      meta={loading ? "Checking OAuth availability" : "Personal accounts"}
    >
      <V2SettingsRow
        name="Gmail & Google Drive"
        description="Connect your own Google account through Composio OAuth so ZAKI can act as you in Gmail and Drive. ZAKI never asks for an IMAP or SMTP password. Setup remains unavailable until ZAKI can show the authorized account and require approval before private data is sent elsewhere."
      >
        <div className="zaki-settings-v2__control-stack">
          <div className="zaki-settings-v2__status-chips">
            <V2Badge tone={connectorConfigured ? "success" : "default"}>
              {connectorLabel}
            </V2Badge>
            <V2Badge tone="warn">OAuth setup blocked</V2Badge>
          </div>
          <V2Button size="sm" variant="accent" disabled>
            Connect Gmail
          </V2Button>
          <span className="zaki-settings-v2__action-note">
            User-scoped OAuth start and connected-account status are not exposed
            by the BFF yet.
          </span>
        </div>
      </V2SettingsRow>
    </V2SettingsBlock>
  );
}
