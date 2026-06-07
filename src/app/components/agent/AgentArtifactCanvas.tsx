import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  History,
  Link2,
  Link2Off,
  Pencil,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  downloadAgentExportFile,
  exportAgentArtifact,
  fetchAgentArtifact,
  fetchAgentArtifactDiff,
  fetchAgentArtifactHistory,
  revokeAgentArtifactShare,
  shareAgentArtifact,
  updateAgentArtifact,
  type AgentArtifact,
} from "@/lib/api";
import {
  getAgentArtifactExportAvailability,
  getAgentArtifactExportDownloadUrl,
  getAgentArtifactExportFormatLabel,
  getAgentArtifactKind,
  getAgentArtifactShareUrl,
  getAgentArtifactTitle,
  getAgentArtifactVersion,
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

function artifactCanEdit(kind: string | null | undefined, preview: string | null) {
  if (!preview) return false;
  return /\b(markdown|text|md|plain|html|json)\b/i.test(String(kind || ""));
}

function normalizeArtifactKind(value: string | null | undefined) {
  return String(value || "artifact").trim().toLowerCase();
}

function renderableArtifactContent(kind: string, content: string) {
  if (kind === "json" || kind.includes("/json")) {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }
  return content;
}

function isFramedArtifact(kind: string) {
  return kind === "html" || kind.includes("html") || kind === "svg" || kind.includes("svg");
}

function isCodeArtifact(kind: string) {
  return kind === "json" || kind.includes("/json") || kind === "code" || kind.includes("code");
}

function artifactFrameSource(kind: string, content: string) {
  if (kind === "svg" || kind.includes("svg")) {
    return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;min-height:100%;display:grid;place-items:center;background:#fff;color:#111;font-family:system-ui,sans-serif}svg{max-width:100%;height:auto}</style></head><body>${content}</body></html>`;
  }
  return content;
}

function renderArtifactPreviewContent({
  kind,
  title,
  content,
  frameTestId,
}: {
  kind: string;
  title: string;
  content: string;
  frameTestId?: string;
}) {
  const renderableContent = renderableArtifactContent(kind, content);
  if (isFramedArtifact(kind)) {
    return (
      <iframe
        title={`${title} preview`}
        sandbox=""
        srcDoc={artifactFrameSource(kind, renderableContent)}
        className="zaki-agent-artifact-canvas__frame"
        data-testid={frameTestId}
      />
    );
  }
  if (isCodeArtifact(kind)) {
    return <pre className="zaki-agent-artifact-canvas__code">{renderableContent}</pre>;
  }
  return <MessageContent content={content} role="assistant" surface="shared" />;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function artifactError(source: unknown, fallback: string) {
  const record = asRecord(source);
  const error = record?.error ?? record?.message ?? record?.reason;
  return typeof error === "string" && error.trim() ? error.trim() : fallback;
}

function normalizeArtifactDetailPayload(data: unknown): AgentArtifact {
  const record = asRecord(data) ?? {};
  const nestedData = asRecord(record.data) ?? {};
  const wrapped =
    asRecord(record.artifact) ??
    asRecord(record.item) ??
    asRecord(nestedData.artifact) ??
    asRecord(nestedData.item);
  const detail: Record<string, unknown> = {
    ...(Object.keys(nestedData).length ? nestedData : {}),
    ...(wrapped ?? record),
  };
  for (const source of [nestedData, record]) {
    for (const [key, value] of Object.entries(source)) {
      if (key === "data" || key === "artifact" || key === "item") continue;
      if (value !== undefined) detail[key] = value;
    }
  }
  return detail as AgentArtifact;
}

function normalizeArtifactHistoryPayload(data: unknown): AgentArtifact[] {
  const record = asRecord(data);
  const nestedData = asRecord(record?.data);
  const containers = [record, nestedData].filter(Boolean) as Array<Record<string, unknown>>;
  let raw: unknown[] = Array.isArray(data) ? data : [];
  for (const key of ["versions", "history", "items", "artifacts"]) {
    if (raw.length) break;
    const match = containers
      .map((container) => container[key])
      .find((value): value is unknown[] => Array.isArray(value));
    raw = match || [];
  }
  return raw.filter((item): item is AgentArtifact => Boolean(asRecord(item)));
}

function versionValue(version: AgentArtifact | AgentInspectorArtifact | null) {
  if (!version) return null;
  const record = version as Record<string, unknown>;
  const raw =
    getAgentArtifactVersion(version as AgentArtifact) ??
    record.version_id ??
    record.versionId ??
    record.revision ??
    record.revision_id ??
    record.revisionId;
  if (typeof raw === "string" || typeof raw === "number") return String(raw);
  return null;
}

function formatArtifactStamp(value: unknown) {
  const numeric = typeof value === "number" ? value : null;
  const date =
    numeric != null
      ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
      : typeof value === "string"
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function artifactWordCount(value: string | null) {
  if (!value) return 0;
  const words = value.trim().match(/\S+/g);
  return words?.length ?? 0;
}

function versionOptionLabel(version: AgentArtifact, index: number) {
  const value = versionValue(version) || String(index + 1);
  const stamp = formatArtifactStamp(version.updated_at ?? version.created_at);
  const title = getAgentArtifactTitle(version);
  return `v${value} - ${title} - ${stamp}`;
}

function safeExportFilename(artifact: AgentInspectorArtifact, format: AgentArtifactExportFormat) {
  const stem =
    artifact.title
      .trim()
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "zaki-artifact";
  return `${stem}.${format}`;
}

function truncateArtifactExcerpt(value: string | null, maxLength = 1200) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}\n...`;
}

function buildAgentRevisionDraft({
  artifactId,
  title,
  kind,
  version,
  excerpt,
}: {
  artifactId: string;
  title: string;
  kind: string;
  version: string | number | null;
  excerpt: string | null;
}) {
  const lines = [
    "Revise the existing artifact below and update the same artifact, not a new one.",
    "",
    `Artifact id: ${artifactId}`,
    `Title: ${title}`,
    `Kind: ${kind}`,
    `Current version: ${version != null ? `v${version}` : "latest"}`,
    "",
    "Use artifact_get if you need the full current body. Then call artifact_update with a complete replacement content body and a one-line change_summary.",
    "Make the revision share-ready: clear opening answer, useful headings, concise sections, tables where helpful, explicit assumptions when context is sparse, and no placeholders, lorem ipsum, or meta commentary.",
    "",
    "Requested change: polish it into a sharper, more impressive, ready-to-share version.",
  ];
  const trimmedExcerpt = truncateArtifactExcerpt(excerpt);
  if (trimmedExcerpt) {
    lines.push("", "Visible excerpt:", trimmedExcerpt);
  }
  return lines.join("\n");
}

type ArtifactCanvasMode = "preview" | "edit" | "history";

export function AgentArtifactCanvas({
  artifact,
  onClose,
  onRequestAgentEdit,
}: {
  artifact: AgentInspectorArtifact;
  onClose: () => void;
  onRequestAgentEdit?: (draft: string) => void;
}) {
  const [detail, setDetail] = useState<AgentArtifact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportStates, setExportStates] = useState<
    Partial<Record<AgentArtifactExportFormat, AgentArtifactExportState>>
  >({});
  const [history, setHistory] = useState<AgentArtifact[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedFromVersion, setSelectedFromVersion] = useState<string | null>(null);
  const [selectedToVersion, setSelectedToVersion] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [mode, setMode] = useState<ArtifactCanvasMode>("preview");
  const [editDraft, setEditDraft] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(artifact.shareUrl || null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "revoking" | "copied" | "failed">("idle");

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    setLoading(true);
    setHistoryLoading(true);
    setExportStates({});
    setHistory([]);
    setHistoryError(null);
    setSelectedFromVersion(null);
    setSelectedToVersion(null);
    setDiffText(null);
    setDiffError(null);
    setMode("preview");
    setEditDraft("");
    setEditSummary("");
    setShareUrl(artifact.shareUrl || null);
    setShareState("idle");
    void Promise.allSettled([fetchAgentArtifact(artifact.id), fetchAgentArtifactHistory(artifact.id)])
      .then((results) => {
        if (!active) return;
        const detailResult = results[0];
        if (detailResult.status === "fulfilled") {
          const { response, data } = detailResult.value;
          if (!response.ok) {
            throw new Error(artifactError(data, `artifact_${response.status}`));
          }
          const nextDetail = normalizeArtifactDetailPayload(data);
          setDetail(nextDetail);
          setShareUrl(getAgentArtifactShareUrl(nextDetail) || artifact.shareUrl || null);
        } else {
          throw detailResult.reason;
        }
        const historyResult = results[1];
        if (historyResult.status === "fulfilled") {
          const { response, data } = historyResult.value;
          if (response.ok) {
            const versions = normalizeArtifactHistoryPayload(data);
            setHistory(versions);
            const newest = versions[0] || null;
            const oldest = versions[versions.length - 1] || null;
            setSelectedFromVersion(versionValue(oldest));
            setSelectedToVersion(versionValue(newest));
          } else {
            setHistoryError(artifactError(data, `history_${response.status}`));
          }
        } else {
          setHistoryError("history_unavailable");
        }
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "artifact_unavailable");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setHistoryLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [artifact.id, artifact.shareUrl]);

  const title = getAgentArtifactTitle((detail || artifact) as AgentArtifact);
  const kind = getAgentArtifactKind((detail || artifact) as AgentArtifact) || artifact.type || "artifact";
  const normalizedKind = normalizeArtifactKind(kind);
  const preview = useMemo(() => artifactPreviewText(detail || artifact), [detail, artifact]);
  const editable = artifactCanEdit(kind, preview);
  const wordCount = artifactWordCount(preview);
  const editWordCount = artifactWordCount(editDraft);
  const currentVersion = getAgentArtifactVersion((detail || artifact) as AgentArtifact) ?? artifact.version ?? null;
  const editing = mode === "edit";
  const hasUnsavedEdit = mode === "edit" && preview != null && editDraft !== preview;
  const exportedCount = PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.filter((format) => {
    const state = exportStates[format];
    return (state?.status === "ready" || state?.status === "exported") && state.url;
  }).length;

  const handleClose = () => {
    if (
      hasUnsavedEdit &&
      typeof window !== "undefined" &&
      !window.confirm("Discard unsaved artifact edits?")
    ) {
      return;
    }
    onClose();
  };

  const setExportState = (format: AgentArtifactExportFormat, state: AgentArtifactExportState) => {
    setExportStates((current) => ({ ...current, [format]: state }));
  };

  const handleDownload = async (format: AgentArtifactExportFormat, url: string) => {
    try {
      await downloadAgentExportFile(url, safeExportFilename(artifact, format));
      setExportState(format, { status: "exported", url });
    } catch {
      setExportState(format, { status: "failed", url, error: "download_failed" });
      toast.error("Download failed. Try exporting again.");
    }
  };

  const handleRevokeShare = async () => {
    if (!shareUrl) return;
    setShareState("revoking");
    try {
      const { response, data } = await revokeAgentArtifactShare(artifact.id);
      if (!response.ok) {
        throw new Error(String(data?.error || "revoke_failed"));
      }
      setShareUrl(null);
      setShareState("idle");
      toast.success("Artifact share link revoked.");
    } catch {
      setShareState("failed");
      toast.error("Could not revoke artifact share link.");
    }
  };

  const handleExport = async (format: AgentArtifactExportFormat) => {
    const availability = getAgentArtifactExportAvailability((detail || artifact) as AgentArtifact, format);
    const label = getAgentArtifactExportFormatLabel(format);
    if (!availability.supported) {
      setExportState(format, {
        status: "unavailable",
        error: availability.reason || `${label} export unavailable`,
      });
      toast.message(availability.reason || `${label} export is unavailable.`);
      return;
    }
    setExportState(format, { status: "exporting" });
    try {
      const { response, data } = await exportAgentArtifact(artifact.id, format);
      if (!response.ok) {
        const code = typeof data?.error === "string" ? data.error : "export_failed";
        setExportState(format, {
          status:
            response.status === 400 ||
            response.status === 501 ||
            response.status === 502 ||
            code === "unsupported_format" ||
            code === "export_not_yet_available" ||
            code === "renderer_unavailable"
              ? "unavailable"
              : "failed",
          error: code,
        });
        toast.error(`${label} export is unavailable.`);
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
      toast.error(`${label} export failed.`);
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

  const handleLoadDiff = async () => {
    if (!selectedFromVersion || !selectedToVersion) {
      setDiffError("Select two versions to compare.");
      return;
    }
    setDiffLoading(true);
    setDiffError(null);
    setDiffText(null);
    try {
      const { response, data } = await fetchAgentArtifactDiff(
        artifact.id,
        selectedFromVersion,
        selectedToVersion
      );
      if (!response.ok) {
        throw new Error(artifactError(data, "diff_unavailable"));
      }
      const text =
        typeof data.diff === "string"
          ? data.diff
          : typeof data.patch === "string"
            ? data.patch
            : JSON.stringify(data, null, 2);
      setDiffText(text);
    } catch (error) {
      setDiffError(error instanceof Error ? error.message : "diff_unavailable");
    } finally {
      setDiffLoading(false);
    }
  };

  const handleStartEdit = () => {
    if (!editable || !preview) return;
    setEditDraft(preview);
    setEditSummary("");
    setMode("edit");
  };

  const handleRequestAgentEdit = () => {
    if (!onRequestAgentEdit) return;
    onRequestAgentEdit(
      buildAgentRevisionDraft({
        artifactId: artifact.id,
        title,
        kind: normalizedKind,
        version: currentVersion,
        excerpt: preview,
      })
    );
  };

  const handleCancelEdit = () => {
    if (
      hasUnsavedEdit &&
      typeof window !== "undefined" &&
      !window.confirm("Discard unsaved artifact edits?")
    ) {
      return;
    }
    setMode("preview");
    setEditDraft("");
    setEditSummary("");
  };

  const handleModeChange = (nextMode: ArtifactCanvasMode) => {
    if (nextMode === "edit") {
      handleStartEdit();
      return;
    }
    if (
      hasUnsavedEdit &&
      typeof window !== "undefined" &&
      !window.confirm("Discard unsaved artifact edits?")
    ) {
      return;
    }
    if (mode === "edit") {
      setEditDraft("");
      setEditSummary("");
    }
    setMode(nextMode);
  };

  const handleSaveEdit = async () => {
    if (!editable) return;
    setSavingEdit(true);
    try {
      const { response, data } = await updateAgentArtifact(artifact.id, {
        content: editDraft,
        change_summary: editSummary.trim() || "Canvas edit from ZAKI",
      });
      if (!response.ok) {
        throw new Error(artifactError(data, "artifact_update_failed"));
      }
      const nextDetail = normalizeArtifactDetailPayload(data);
      setDetail((current) => ({
        ...((current || artifact) as AgentArtifact),
        ...nextDetail,
        content: artifactPreviewText(nextDetail) || editDraft,
      }));
      setMode("preview");
      setEditSummary("");
      toast.success("Artifact updated.");
      const historyResult = await fetchAgentArtifactHistory(artifact.id);
      if (historyResult.response.ok) {
        const versions = normalizeArtifactHistoryPayload(historyResult.data);
        setHistory(versions);
        const newest = versions[0] || null;
        const previous = versions[1] || versions[versions.length - 1] || null;
        setSelectedFromVersion(versionValue(previous));
        setSelectedToVersion(versionValue(newest));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update artifact.");
    } finally {
      setSavingEdit(false);
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
          <small>
            {currentVersion != null ? `v${currentVersion}` : "current"} · {wordCount ? `${wordCount} words` : "readable canvas"}
            {exportedCount ? ` · ${exportedCount} exports ready` : ""}
          </small>
        </div>
        <div className="zaki-agent-artifact-canvas__actions">
          <button
            type="button"
            aria-pressed={mode === "preview"}
            onClick={() => handleModeChange("preview")}
          >
            <Eye className="size-3.5" aria-hidden />
            Preview
          </button>
          <button
            type="button"
            aria-pressed={mode === "edit"}
            disabled={!editable}
            title={editable ? undefined : "This artifact kind is not text-editable in the canvas."}
            onClick={handleStartEdit}
          >
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            aria-pressed={mode === "history"}
            onClick={() => handleModeChange("history")}
          >
            <History className="size-3.5" aria-hidden />
            Versions
          </button>
          {onRequestAgentEdit ? (
            <button
              type="button"
              onClick={handleRequestAgentEdit}
              title="Draft an agent revision request in the composer."
            >
              <Sparkles className="size-3.5" aria-hidden />
              Ask ZAKI
            </button>
          ) : null}
          <button type="button" onClick={handleClose} aria-label="Close artifact canvas">
            <X className="size-3.5" aria-hidden />
            Close
          </button>
        </div>
      </header>

      <div className="zaki-agent-artifact-canvas__delivery" aria-label="Artifact delivery">
        <section className="zaki-agent-artifact-canvas__delivery-card">
          <div className="zaki-agent-artifact-canvas__section-head">
            <span>share</span>
            <small>{shareUrl ? "public page ready" : "private"}</small>
          </div>
          <div className="zaki-agent-artifact-canvas__delivery-status" data-ready={shareUrl ? "true" : undefined}>
            <strong>{shareUrl ? "Ready to send" : "Create a public link"}</strong>
            <small>{shareUrl ? "Opens as a polished artifact page." : "Default lifetime is seven days."}</small>
          </div>
          <div className="zaki-agent-artifact-canvas__delivery-actions">
            <button type="button" onClick={() => void handleShare()} disabled={shareState === "sharing"}>
              <Share2 className="size-3.5" aria-hidden />
              {shareState === "sharing" ? "Sharing" : shareUrl ? "Refresh share" : "Share"}
            </button>
            {shareUrl ? (
              <button type="button" onClick={() => void handleRevokeShare()} disabled={shareState === "revoking"}>
                <Link2Off className="size-3.5" aria-hidden />
                {shareState === "revoking" ? "Stopping" : "Stop sharing"}
              </button>
            ) : null}
            <button type="button" onClick={() => void handleCopy()} disabled={!shareUrl && !Object.values(exportStates).some((state) => state?.url)}>
              {shareUrl ? <Link2 className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {shareState === "copied" ? "Copied" : "Copy link"}
            </button>
            {shareUrl ? (
              <a href={shareUrl} target="_blank" rel="noreferrer" aria-label="Open shared artifact">
                <ExternalLink className="size-3.5" aria-hidden />
                Open shared artifact
              </a>
            ) : null}
          </div>
        </section>

        <section className="zaki-agent-artifact-canvas__delivery-card">
          <div className="zaki-agent-artifact-canvas__section-head">
            <span>export</span>
            <small>{exportedCount ? `${exportedCount} ready` : "render on demand"}</small>
          </div>
          <div className="zaki-agent-artifact-canvas__export-grid">
            {PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.map((format) => {
              const state = exportStates[format];
              const label = getAgentArtifactExportFormatLabel(format);
              const availability = getAgentArtifactExportAvailability((detail || artifact) as AgentArtifact, format);
              const ready =
                (state?.status === "ready" || state?.status === "exported") && state.url;
              return (
                <button
                  key={format}
                  type="button"
                  onClick={() =>
                    ready ? void handleDownload(format, state.url || "") : void handleExport(format)
                  }
                  disabled={
                    state?.status === "exporting" ||
                    state?.status === "unavailable" ||
                    !availability.supported
                  }
                  title={state?.error || availability.reason || undefined}
                  data-state={state?.status || (availability.supported ? "idle" : "unavailable")}
                >
                  <Download className="size-3.5" aria-hidden />
                  {state?.status === "exporting"
                    ? "Exporting"
                    : !availability.supported
                      ? `${label} unavailable`
                      : ready
                        ? `Download ${label}`
                        : `Export ${label}`}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="zaki-agent-artifact-canvas__workspace" data-mode={mode}>
        {mode === "history" ? (
        <div className="zaki-agent-artifact-canvas__version-strip" data-testid="agent-artifact-history">
          <section className="zaki-agent-artifact-canvas__versions" aria-label="Artifact versions">
            <div className="zaki-agent-artifact-canvas__section-head">
              <span>versions</span>
              <small>{historyLoading ? "loading" : history.length ? `${history.length} records` : "none"}</small>
            </div>
            {historyError ? <div className="v2-empty-line">History unavailable: {historyError}</div> : null}
            {history.length ? (
              <ol>
                {history.map((version, index) => {
                  const value = versionValue(version);
                  const displayValue = value || String(index + 1);
                  const isSelected = Boolean(
                    value && (value === selectedFromVersion || value === selectedToVersion)
                  );
                  return (
                    <li key={`${displayValue}-${index}`}>
                      <button
                        type="button"
                        disabled={!value}
                        aria-pressed={isSelected}
                        data-selected={isSelected ? "true" : undefined}
                        title={value ? undefined : "This version cannot be compared because the backend did not return a version id."}
                        onClick={() => {
                          if (!value) return;
                          setSelectedFromVersion(selectedFromVersion || value);
                          setSelectedToVersion(value);
                        }}
                      >
                        <strong>v{displayValue}</strong>
                        <span>{getAgentArtifactTitle(version)}</span>
                        <small>{formatArtifactStamp(version.updated_at ?? version.created_at)}</small>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : !historyLoading && !historyError ? (
              <div className="v2-empty-line">No version history reported yet.</div>
            ) : null}
          </section>
          <section className="zaki-agent-artifact-canvas__diff" data-testid="agent-artifact-diff" aria-label="Compare artifact versions">
            <div className="zaki-agent-artifact-canvas__section-head">
              <span>compare</span>
              <small>{selectedFromVersion && selectedToVersion ? `v${selectedFromVersion} -> v${selectedToVersion}` : "select versions"}</small>
            </div>
            <div className="zaki-agent-artifact-canvas__diff-controls">
              <select
                aria-label="Compare from version"
                value={selectedFromVersion || ""}
                onChange={(event) => setSelectedFromVersion(event.target.value)}
              >
                <option value="">From version</option>
                {history.map((version, index) => {
                  const value = versionValue(version);
                  return value ? (
                    <option key={`from-${value}`} value={value}>
                      {versionOptionLabel(version, index)}
                    </option>
                  ) : null;
                })}
              </select>
              <select
                aria-label="Compare to version"
                value={selectedToVersion || ""}
                onChange={(event) => setSelectedToVersion(event.target.value)}
              >
                <option value="">To version</option>
                {history.map((version, index) => {
                  const value = versionValue(version);
                  return value ? (
                    <option key={`to-${value}`} value={value}>
                      {versionOptionLabel(version, index)}
                    </option>
                  ) : null;
                })}
              </select>
              <button type="button" onClick={() => void handleLoadDiff()} disabled={diffLoading}>
                {diffLoading ? "Loading" : "Diff"}
              </button>
            </div>
            {diffError ? <div className="v2-empty-line">Diff unavailable: {diffError}</div> : null}
            {diffText ? <pre>{diffText}</pre> : null}
          </section>
        </div>
        ) : null}
        <div className="zaki-agent-artifact-canvas__body">
          {loading ? (
            <div className="v2-empty-line">Loading artifact...</div>
          ) : error ? (
            <div className="v2-empty-line">Artifact preview unavailable: {error}</div>
          ) : mode === "history" ? (
            <div className="zaki-agent-artifact-canvas__history-focus" data-testid="agent-artifact-history-mode">
              <History className="size-5" aria-hidden />
              <strong>Version workspace</strong>
              <span>
                Select two versions above to inspect the diff, then return to Preview or Edit when you are ready to work on the current artifact.
              </span>
            </div>
          ) : editing ? (
            <div className="zaki-agent-artifact-canvas__editor" data-testid="agent-artifact-editor">
              <section className="zaki-agent-artifact-canvas__editor-form" aria-label="Edit artifact source">
                <div className="zaki-agent-artifact-canvas__editor-kicker">
                  <span>source</span>
                  <small>{hasUnsavedEdit ? "unsaved draft" : "current version"}</small>
                </div>
                <label>
                  <span>Artifact content</span>
                  <textarea
                    aria-label="Artifact content"
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                  />
                </label>
                <label>
                  <span>Change summary</span>
                  <input
                    aria-label="Change summary"
                    value={editSummary}
                    placeholder="What changed in this version?"
                    onChange={(event) => setEditSummary(event.target.value)}
                  />
                </label>
                <div className="zaki-agent-artifact-canvas__editor-actions">
                  <button
                    type="button"
                    disabled={savingEdit || !editDraft.trim() || !hasUnsavedEdit}
                    onClick={() => void handleSaveEdit()}
                  >
                    {savingEdit ? "Saving" : "Save version"}
                  </button>
                  <button type="button" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  {onRequestAgentEdit ? (
                    <button type="button" onClick={handleRequestAgentEdit}>
                      <Sparkles className="size-3.5" aria-hidden />
                      Ask ZAKI to revise
                    </button>
                  ) : null}
                </div>
              </section>
              <section
                className="zaki-agent-artifact-canvas__editor-preview"
                aria-label="Edited artifact live preview"
                data-testid="agent-artifact-edit-preview"
              >
                <div className="zaki-agent-artifact-canvas__editor-kicker">
                  <span>live preview</span>
                  <small>
                    {editWordCount ? `${editWordCount} words` : "empty"} · {normalizedKind}
                  </small>
                </div>
                <article className="zaki-agent-artifact-canvas__paper" data-kind={normalizedKind}>
                  {editDraft.trim() ? (
                    renderArtifactPreviewContent({
                      kind: normalizedKind,
                      title,
                      content: editDraft,
                      frameTestId: "agent-artifact-edit-frame-preview",
                    })
                  ) : (
                    <div className="v2-empty-line">
                      Start typing to preview the next artifact version.
                    </div>
                  )}
                </article>
              </section>
            </div>
          ) : preview ? (
            <>
              {editable ? (
                <div className="zaki-agent-artifact-canvas__work-actions">
                  <button
                    type="button"
                    className="zaki-agent-artifact-canvas__edit"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    Edit source
                  </button>
                  {onRequestAgentEdit ? (
                    <button
                      type="button"
                      className="zaki-agent-artifact-canvas__edit"
                      onClick={handleRequestAgentEdit}
                    >
                      <Sparkles className="size-3.5" aria-hidden />
                      Ask ZAKI to revise
                    </button>
                  ) : null}
                </div>
              ) : null}
              <article className="zaki-agent-artifact-canvas__paper" data-kind={normalizedKind}>
                {renderArtifactPreviewContent({
                  kind: normalizedKind,
                  title,
                  content: preview,
                  frameTestId: "agent-artifact-frame-preview",
                })}
              </article>
            </>
          ) : (
            <div className="v2-empty-line">
              Preview is unavailable for this artifact. Export and share remain available.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
