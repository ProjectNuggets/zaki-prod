import {
  normalizeAgentArtifactShareUrl,
  normalizeAgentExportDownloadUrl,
  type AgentArtifact,
} from "@/lib/api";

export const PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS = ["docx", "pdf", "html"] as const;

export type AgentArtifactExportFormat =
  (typeof PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS)[number];

export type AgentArtifactExportState = {
  status: "idle" | "exporting" | "ready" | "failed" | "unavailable";
  url?: string | null;
  error?: string | null;
};

type ArtifactLike = AgentArtifact & {
  id?: string;
  artifact_id?: string;
  artifactId?: string;
  title?: string;
  name?: string;
  label?: string;
  type?: string;
  kind?: string;
  mime_type?: string;
  mimeType?: string;
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
  download_url?: string | null;
  downloadUrl?: string | null;
  url?: string | null;
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
  return normalizeAgentArtifactShareUrl(
    stringValue(artifact, "public_url", "publicUrl", "share_url", "shareUrl")
  );
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
