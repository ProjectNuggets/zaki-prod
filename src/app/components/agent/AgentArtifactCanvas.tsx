import { Copy, Download, ExternalLink, FileText, Link2, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  downloadAgentExportFile,
  exportAgentArtifact,
  fetchAgentArtifact,
  shareAgentArtifact,
  type AgentArtifact,
} from "@/lib/api";
import {
  getAgentArtifactExportDownloadUrl,
  getAgentArtifactKind,
  getAgentArtifactShareUrl,
  getAgentArtifactTitle,
  PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS,
  type AgentArtifactExportFormat,
  type AgentArtifactExportState,
} from "@/app/components/agent/agentArtifactSurface";
import type { AgentInspectorArtifact } from "@/app/components/chat/AgentInspectorRail";
import { MessageContent } from "@/app/components/chat/rendering/MessageContent";

function scalar(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function artifactPreviewText(source: AgentArtifact | AgentInspectorArtifact | null): string | null {
  if (!source) return null;
  const record = source as Record<string, unknown>;
  for (const key of ["content", "markdown", "body", "text", "html", "preview", "summary"]) {
    const value = record[key];
    const direct = scalar(value);
    if (direct) return direct;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      for (const nestedKey of ["markdown", "body", "text", "html", "content"]) {
        const nestedValue = scalar(nested[nestedKey]);
        if (nestedValue) return nestedValue;
      }
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function safeExportFilename(artifact: AgentInspectorArtifact, format: AgentArtifactExportFormat) {
  const stem =
    artifact.title
      .trim()
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "zaki-artifact";
  return `${stem}.${format}`;
}

export function AgentArtifactCanvas({
  artifact,
  onClose,
}: {
  artifact: AgentInspectorArtifact;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AgentArtifact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportStates, setExportStates] = useState<
    Partial<Record<AgentArtifactExportFormat, AgentArtifactExportState>>
  >({});
  const [shareUrl, setShareUrl] = useState<string | null>(artifact.shareUrl || null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "copied" | "failed">("idle");

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    setLoading(true);
    setExportStates({});
    setShareUrl(artifact.shareUrl || null);
    setShareState("idle");
    void fetchAgentArtifact(artifact.id)
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) {
          throw new Error(String((data as { error?: unknown })?.error || `artifact_${response.status}`));
        }
        setDetail(data);
        setShareUrl(getAgentArtifactShareUrl(data) || artifact.shareUrl || null);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "artifact_unavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [artifact.id, artifact.shareUrl]);

  const title = getAgentArtifactTitle((detail || artifact) as AgentArtifact);
  const kind = getAgentArtifactKind((detail || artifact) as AgentArtifact) || artifact.type || "artifact";
  const preview = useMemo(() => artifactPreviewText(detail || artifact), [detail, artifact]);

  const setExportState = (format: AgentArtifactExportFormat, state: AgentArtifactExportState) => {
    setExportStates((current) => ({ ...current, [format]: state }));
  };

  const handleDownload = async (format: AgentArtifactExportFormat, url: string) => {
    try {
      await downloadAgentExportFile(url, safeExportFilename(artifact, format));
    } catch {
      setExportState(format, { status: "failed", url, error: "download_failed" });
      toast.error("Download failed. Try exporting again.");
    }
  };

  const handleExport = async (format: AgentArtifactExportFormat) => {
    setExportState(format, { status: "exporting" });
    try {
      const { response, data } = await exportAgentArtifact(artifact.id, format);
      if (!response.ok) {
        const code = typeof data?.error === "string" ? data.error : "export_failed";
        setExportState(format, {
          status: response.status === 501 || code === "export_not_yet_available" ? "unavailable" : "failed",
          error: code,
        });
        toast.error(`${format.toUpperCase()} export is unavailable.`);
        return;
      }
      const url = getAgentArtifactExportDownloadUrl(data);
      if (!url) {
        setExportState(format, { status: "failed", error: "missing_download_url" });
        toast.error("Export finished without a download link.");
        return;
      }
      setExportState(format, { status: "ready", url });
      await handleDownload(format, url);
    } catch {
      setExportState(format, { status: "failed", error: "export_failed" });
      toast.error(`${format.toUpperCase()} export failed.`);
    }
  };

  const handleShare = async () => {
    setShareState("sharing");
    try {
      const { response, data } = await shareAgentArtifact(artifact.id);
      const url = getAgentArtifactShareUrl(data);
      if (!response.ok || !url) {
        throw new Error(String((data as { error?: unknown })?.error || "share_failed"));
      }
      setShareUrl(url);
      setShareState("idle");
      toast.success("Artifact share link ready.");
    } catch {
      setShareState("failed");
      toast.error("Could not create artifact share link.");
    }
  };

  const handleCopy = async () => {
    const firstDownload = PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS
      .map((format) => exportStates[format]?.url)
      .find((url): url is string => typeof url === "string" && url.length > 0);
    const value = shareUrl || firstDownload;
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      setShareState("failed");
      toast.error(value ? "Clipboard is unavailable." : "No artifact link is ready yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setShareState("copied");
      toast.success("Artifact link copied.");
    } catch {
      setShareState("failed");
      toast.error("Could not copy artifact link.");
    }
  };

  return (
    <section className="zaki-agent-artifact-canvas" data-testid="agent-artifact-canvas">
      <header className="zaki-agent-artifact-canvas__head">
        <div className="zaki-agent-artifact-canvas__title">
          <span>
            <FileText className="size-4" aria-hidden />
            {kind}
          </span>
          <h2>{title}</h2>
          <small>{artifact.version != null ? `v${artifact.version}` : "current"} · readable canvas</small>
        </div>
        <div className="zaki-agent-artifact-canvas__actions">
          {PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.map((format) => {
            const state = exportStates[format];
            const ready = state?.status === "ready" && state.url;
            return (
              <button
                key={format}
                type="button"
                onClick={() =>
                  ready ? void handleDownload(format, state.url || "") : void handleExport(format)
                }
                disabled={state?.status === "exporting" || state?.status === "unavailable"}
                title={state?.error || undefined}
              >
                <Download className="size-3.5" aria-hidden />
                {state?.status === "exporting" ? "Exporting" : ready ? format.toUpperCase() : `Export ${format.toUpperCase()}`}
              </button>
            );
          })}
          <button type="button" onClick={() => void handleShare()} disabled={shareState === "sharing"}>
            <Share2 className="size-3.5" aria-hidden />
            {shareState === "sharing" ? "Sharing" : "Share"}
          </button>
          <button type="button" onClick={() => void handleCopy()} disabled={!shareUrl && !Object.values(exportStates).some((state) => state?.url)}>
            {shareUrl ? <Link2 className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {shareState === "copied" ? "Copied" : "Copy link"}
          </button>
          {shareUrl ? (
            <a href={shareUrl} target="_blank" rel="noreferrer" aria-label="Open shared artifact">
              <ExternalLink className="size-3.5" aria-hidden />
              Open share
            </a>
          ) : null}
          <button type="button" onClick={onClose} aria-label="Close artifact canvas">
            <X className="size-3.5" aria-hidden />
            Close
          </button>
        </div>
      </header>
      <div className="zaki-agent-artifact-canvas__body">
        {loading ? (
          <div className="v2-empty-line">Loading artifact...</div>
        ) : error ? (
          <div className="v2-empty-line">Artifact preview unavailable: {error}</div>
        ) : preview ? (
          <MessageContent content={preview} role="assistant" surface="shared" />
        ) : (
          <div className="v2-empty-line">
            Preview is unavailable for this artifact. Export and share remain available.
          </div>
        )}
      </div>
    </section>
  );
}
