import { useMemo } from "react";
import { V2Badge } from "@/app/components/v2";
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
      ? "Composio available"
      : "Connector unavailable";

  return (
    <V2SettingsBlock
      id="settings-connections"
      data-testid="settings-connections"
      title="Connections"
      meta={loading ? "Checking OAuth availability" : "Agent-managed OAuth"}
    >
      <V2SettingsRow
        name="Gmail & Google Drive"
        description="Ask ZAKI to use Gmail or Drive and ZAKI gives you a secure Composio OAuth link in the conversation. ZAKI never asks for an IMAP or SMTP password, and requires approval before private data is sent elsewhere."
      >
        <div className="zaki-settings-v2__control-stack">
          <div className="zaki-settings-v2__status-chips">
            <V2Badge tone={connectorConfigured ? "success" : "default"}>
              {connectorLabel}
            </V2Badge>
            <V2Badge>Managed in chat</V2Badge>
          </div>
          <span className="zaki-settings-v2__action-note">
            When an account is needed, ZAKI presents the Connect Link and
            continues after you authorize it with Composio.
          </span>
        </div>
      </V2SettingsRow>
    </V2SettingsBlock>
  );
}
