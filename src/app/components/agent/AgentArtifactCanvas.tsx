import { Copy, Download, ExternalLink, FileText, Link2, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  downloadAgentExportFile,
  exportAgentArtifact,
  fetchAgentArtifact,
  fetchAgentArtifactDiff,
  fetchAgentArtifactHistory,
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
  const [history, setHistory] = useState<AgentArtifact[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedFromVersion, setSelectedFromVersion] = useState<string | null>(null);
  const [selectedToVersion, setSelectedToVersion] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(artifact.shareUrl || null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "copied" | "failed">("idle");

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
    setEditing(false);
    setEditDraft("");
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
  const preview = useMemo(() => artifactPreviewText(detail || artifact), [detail, artifact]);
  const editable = artifactCanEdit(kind, preview);

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
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editable) return;
    setSavingEdit(true);
    try {
      const { response, data } = await updateAgentArtifact(artifact.id, {
        content: editDraft,
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
      setEditing(false);
      toast.success("Artifact updated.");
      const historyResult = await fetchAgentArtifactHistory(artifact.id);
      if (historyResult.response.ok) {
        setHistory(normalizeArtifactHistoryPayload(historyResult.data));
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
          <small>{artifact.version != null ? `v${artifact.version}` : "current"} · readable canvas</small>
        </div>
        <div className="zaki-agent-artifact-canvas__actions">
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
              >
                <Download className="size-3.5" aria-hidden />
                {state?.status === "exporting"
                  ? "Exporting"
                  : !availability.supported
                    ? `${label} unavailable`
                    : ready
                      ? label
                      : `Export ${label}`}
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
      <div className="zaki-agent-artifact-canvas__workspace">
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
              <input
                value={selectedFromVersion || ""}
                placeholder="from"
                onChange={(event) => setSelectedFromVersion(event.target.value)}
              />
              <input
                value={selectedToVersion || ""}
                placeholder="to"
                onChange={(event) => setSelectedToVersion(event.target.value)}
              />
              <button type="button" onClick={() => void handleLoadDiff()} disabled={diffLoading}>
                {diffLoading ? "Loading" : "Diff"}
              </button>
            </div>
            {diffError ? <div className="v2-empty-line">Diff unavailable: {diffError}</div> : null}
            {diffText ? <pre>{diffText}</pre> : null}
          </section>
        </div>
        <div className="zaki-agent-artifact-canvas__body">
          {loading ? (
            <div className="v2-empty-line">Loading artifact...</div>
          ) : error ? (
            <div className="v2-empty-line">Artifact preview unavailable: {error}</div>
          ) : editing ? (
            <div className="zaki-agent-artifact-canvas__editor" data-testid="agent-artifact-editor">
              <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} />
              <div>
                <button type="button" disabled={savingEdit} onClick={() => void handleSaveEdit()}>
                  {savingEdit ? "Saving" : "Save artifact"}
                </button>
                <button type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : preview ? (
            <>
              {editable ? (
                <button
                  type="button"
                  className="zaki-agent-artifact-canvas__edit"
                  onClick={handleStartEdit}
                >
                  Edit text artifact
                </button>
              ) : null}
              <MessageContent content={preview} role="assistant" surface="shared" />
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
