import {
  normalizeAgentArtifactShareUrl,
  normalizeAgentExportDownloadUrl,
} from "@/lib/api";

export type AgentArtifactExportFormat =
  | "html"
  | "pdf"
  | "docx"
  | "pptx"
  | "xlsx";

const AGENT_ARTIFACT_EXPORT_FORMATS = [
  "html",
  "pdf",
  "docx",
  "pptx",
  "xlsx",
] as const satisfies readonly AgentArtifactExportFormat[];

export const PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS = [
  "pdf",
] as const satisfies readonly AgentArtifactExportFormat[];

export type AgentArtifactExportState = {
  status: "idle" | "exporting" | "ready" | "exported" | "failed" | "unavailable";
  url?: string | null;
  error?: string | null;
};

export type AgentArtifactExportAvailability = {
  supported: boolean;
  reason?: string;
};

const AGENT_ARTIFACT_EXPORT_LABELS: Record<AgentArtifactExportFormat, string> = {
  html: "HTML",
  pdf: "PDF",
  docx: "DOCX",
  pptx: "PPTX",
  xlsx: "XLSX",
};

type ArtifactLike = Record<string, unknown> & {
  id?: string | null;
  artifact_id?: string | null;
  artifactId?: string | null;
  title?: string | null;
  name?: string | null;
  label?: string | null;
  type?: string | null;
  kind?: string | null;
  mime_type?: string | null;
  mimeType?: string | null;
  version?: string | number | null;
  current_version?: string | number | null;
  currentVersion?: string | number | null;
  session_key?: string | null;
  sessionKey?: string | null;
  session_id?: string | null;
  sessionId?: string | null;
  updated_at?: string | number | null;
  updatedAt?: string | number | null;
  created_at?: string | number | null;
  createdAt?: string | number | null;
  public_url?: string | null;
  publicUrl?: string | null;
  share_url?: string | null;
  shareUrl?: string | null;
  share_code?: string | null;
  shareCode?: string | null;
  download_url?: string | null;
  downloadUrl?: string | null;
  url?: string | null;
  supported_formats?: unknown;
  supportedFormats?: unknown;
  export_formats?: unknown;
  exportFormats?: unknown;
  unsupported_formats?: unknown;
  unsupportedFormats?: unknown;
  export_availability?: unknown;
  exportAvailability?: unknown;
  export_unavailable_reasons?: unknown;
  exportUnavailableReasons?: unknown;
  unsupported_reasons?: unknown;
  unsupportedReasons?: unknown;
  exports?: unknown;
};

function stringValue(source: ArtifactLike, ...keys: Array<keyof ArtifactLike>): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function getAgentArtifactId(artifact: ArtifactLike): string {
  return stringValue(artifact, "id", "artifact_id", "artifactId") || "";
}

export function getAgentArtifactTitle(artifact: ArtifactLike): string {
  return (
    stringValue(artifact, "title", "name", "label") ||
    getAgentArtifactKind(artifact) ||
    getAgentArtifactId(artifact) ||
    "Artifact"
  );
}

export function getAgentArtifactKind(artifact: ArtifactLike): string | null {
  return stringValue(artifact, "kind", "type", "mime_type", "mimeType");
}

export function getAgentArtifactVersion(artifact: ArtifactLike): string | number | null {
  const version = artifact.version ?? artifact.current_version ?? artifact.currentVersion;
  return typeof version === "string" || typeof version === "number" ? version : null;
}

export function getAgentArtifactSessionKey(artifact: ArtifactLike): string | null {
  return stringValue(artifact, "session_key", "sessionKey", "session_id", "sessionId");
}

export function getAgentArtifactUpdatedAt(artifact: ArtifactLike): string | number | null {
  return artifact.updated_at ?? artifact.updatedAt ?? artifact.created_at ?? artifact.createdAt ?? null;
}

export function getAgentArtifactShareUrl(artifact: ArtifactLike): string | null {
  const directUrl = normalizeAgentArtifactShareUrl(
    stringValue(artifact, "public_url", "publicUrl", "share_url", "shareUrl")
  );
  if (directUrl) return directUrl;
  const shareCode = stringValue(artifact, "share_code", "shareCode");
  return shareCode ? normalizeAgentArtifactShareUrl(`/api/v1/share/artifact/${shareCode}`) : null;
}

export function getAgentArtifactExportDownloadUrl(source: Record<string, unknown>): string | null {
  const candidates = [
    source.download_url,
    source.downloadUrl,
    source.url,
    source.public_url,
    source.publicUrl,
  ];
  const match = candidates.find((value) => typeof value === "string" && value.trim());
  return normalizeAgentExportDownloadUrl(match);
}

export function getAgentArtifactExportFormatLabel(format: AgentArtifactExportFormat): string {
  return AGENT_ARTIFACT_EXPORT_LABELS[format];
}

export function getAgentArtifactExportAvailability(
  artifact: ArtifactLike,
  format: AgentArtifactExportFormat
): AgentArtifactExportAvailability {
  const label = getAgentArtifactExportFormatLabel(format);
  const explicitReason =
    explicitFormatReason(artifact.export_unavailable_reasons, format) ||
    explicitFormatReason(artifact.exportUnavailableReasons, format) ||
    explicitFormatReason(artifact.unsupported_reasons, format) ||
    explicitFormatReason(artifact.unsupportedReasons, format);
  const explicitAvailability =
    explicitFormatAvailability(artifact.export_availability, format, explicitReason) ||
    explicitFormatAvailability(artifact.exportAvailability, format, explicitReason) ||
    explicitFormatAvailability(artifact.exports, format, explicitReason);
  if (explicitAvailability) return explicitAvailability;

  const supportedFormats = normalizeFormatSet(
    artifact.supported_formats ??
      artifact.supportedFormats ??
      artifact.export_formats ??
      artifact.exportFormats
  );
  if (supportedFormats && !supportedFormats.has(format)) {
    return {
      supported: false,
      reason: explicitReason || `${label} export is not available for this artifact.`,
    };
  }

  const unsupportedFormats = normalizeFormatSet(
    artifact.unsupported_formats ?? artifact.unsupportedFormats
  );
  if (unsupportedFormats?.has(format)) {
    return {
      supported: false,
      reason: explicitReason || `${label} export is not available for this artifact.`,
    };
  }

  if (format === "xlsx") {
    const kind = (getAgentArtifactKind(artifact) || "").toLowerCase();
    const looksTabular =
      /\b(spreadsheet|worksheet|workbook|xlsx|xls|csv|table|tabular|dataframe)\b/.test(kind);
    if (!looksTabular) {
      return {
        supported: false,
        reason: explicitReason || "XLSX export is available for spreadsheet or tabular artifacts.",
      };
    }
  }

  return { supported: true };
}

function normalizeExportFormat(value: unknown): AgentArtifactExportFormat | null {
  if (typeof value !== "string") return null;
  const match = value.trim().toLowerCase();
  return (AGENT_ARTIFACT_EXPORT_FORMATS as readonly string[]).includes(match)
    ? (match as AgentArtifactExportFormat)
    : null;
}

function normalizeFormatSet(value: unknown): Set<AgentArtifactExportFormat> | null {
  if (!Array.isArray(value)) return null;
  const formats = value
    .map((item) => normalizeExportFormat(item))
    .filter((item): item is AgentArtifactExportFormat => Boolean(item));
  return formats.length ? new Set(formats) : null;
}

function explicitFormatReason(value: unknown, format: AgentArtifactExportFormat): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const reason = (value as Record<string, unknown>)[format];
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
}

function explicitFormatAvailability(
  value: unknown,
  format: AgentArtifactExportFormat,
  fallbackReason?: string | null
): AgentArtifactExportAvailability | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = (value as Record<string, unknown>)[format];
  if (typeof entry === "boolean") {
    return entry
      ? { supported: true }
      : {
          supported: false,
          reason:
            fallbackReason ||
            `${getAgentArtifactExportFormatLabel(format)} export is not available for this artifact.`,
        };
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const record = entry as Record<string, unknown>;
  const supported = record.supported ?? record.available ?? record.enabled;
  const reason =
    typeof record.reason === "string" && record.reason.trim()
      ? record.reason.trim()
      : fallbackReason || null;
  if (typeof supported === "boolean") {
    return supported
      ? { supported: true, reason: reason || undefined }
      : {
          supported: false,
          reason:
            reason ||
            `${getAgentArtifactExportFormatLabel(format)} export is not available for this artifact.`,
        };
  }
  return null;
}
