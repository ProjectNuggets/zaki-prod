import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Printer,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { MessageContent } from "./chat/rendering/MessageContent";

type ArtifactState = "loading" | "viewing" | "error" | "expired";
type CopyTarget = "link" | "content" | null;

type SharedArtifactPayload = {
  title?: string;
  kind?: string;
  content?: string;
  updated_at_unix?: number;
  updatedAtUnix?: number;
  error?: string;
};

function normalizeKind(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "artifact";
}

function normalizeContent(value: unknown) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatPublicArtifactDate(value: unknown) {
  const raw = typeof value === "number" ? value : null;
  if (raw == null) return "recently updated";
  const date = new Date(raw < 10_000_000_000 ? raw * 1000 : raw);
  if (Number.isNaN(date.getTime())) return "recently updated";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderableContent(kind: string, content: string) {
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

function artifactFrameSource(kind: string, content: string) {
  if (kind === "svg" || kind.includes("svg")) {
    return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;min-height:100%;display:grid;place-items:center;background:#fff;color:#111;font-family:system-ui,sans-serif}svg{max-width:100%;height:auto}</style></head><body>${content}</body></html>`;
  }
  return content;
}

function isCodeArtifact(kind: string) {
  return kind === "json" || kind.includes("/json") || kind === "code" || kind.includes("code");
}

function artifactWordCount(value: string) {
  const words = value.trim().match(/\S+/g);
  return words?.length ?? 0;
}

function artifactSizeLabel(value: string) {
  const bytes = new Blob([value]).size;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function artifactExtension(kind: string) {
  if (kind.includes("html")) return "html";
  if (kind.includes("svg")) return "svg";
  if (kind.includes("json")) return "json";
  if (kind.includes("markdown") || kind === "md") return "md";
  if (kind.includes("csv")) return "csv";
  return "txt";
}

function artifactMimeType(kind: string) {
  if (kind.includes("html")) return "text/html;charset=utf-8";
  if (kind.includes("svg")) return "image/svg+xml;charset=utf-8";
  if (kind.includes("json")) return "application/json;charset=utf-8";
  if (kind.includes("csv")) return "text/csv;charset=utf-8";
  return "text/plain;charset=utf-8";
}

function safeArtifactFilename(title: string, kind: string) {
  const stem =
    title
      .trim()
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 96) || "zaki-artifact";
  return `${stem}.${artifactExtension(kind)}`;
}

export function SharedArtifact() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [state, setState] = useState<ArtifactState>("loading");
  const [artifact, setArtifact] = useState<SharedArtifactPayload | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<CopyTarget>(null);

  useEffect(() => {
    let active = true;
    if (!shareCode) {
      setState("error");
      setError("Invalid artifact link.");
      return () => {
        active = false;
      };
    }

    setState("loading");
    setError("");
    setArtifact(null);

    void fetch(buildApiUrl(`/api/agent/share/artifact/${encodeURIComponent(shareCode)}`))
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as SharedArtifactPayload;
        if (!active) return;
        if (response.status === 404) {
          setState("error");
          setError("This artifact share was not found or has been revoked.");
          return;
        }
        if (response.status === 410) {
          setState("expired");
          setError("This artifact share has expired.");
          return;
        }
        if (!response.ok) {
          setState("error");
          setError(data.error || "Artifact share is unavailable.");
          return;
        }
        setArtifact(data);
        setState("viewing");
      })
      .catch(() => {
        if (!active) return;
        setState("error");
        setError("Artifact share is unavailable.");
      });

    return () => {
      active = false;
    };
  }, [shareCode]);

  const title = artifact?.title?.trim() || "Shared artifact";
  const kind = normalizeKind(artifact?.kind);
  const content = useMemo(
    () => renderableContent(kind, normalizeContent(artifact?.content)),
    [artifact?.content, kind]
  );
  const updatedLabel = formatPublicArtifactDate(
    artifact?.updated_at_unix ?? artifact?.updatedAtUnix
  );
  const wordCount = artifactWordCount(content);
  const sizeLabel = artifactSizeLabel(content);
  const sourceFilename = safeArtifactFilename(title, kind);

  const markCopied = (target: Exclude<CopyTarget, null>) => {
    setCopied(target);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const handleCopyLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard || typeof window === "undefined") {
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    markCopied("link");
  };

  const handleCopyContent = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard || !content) {
      return;
    }
    await navigator.clipboard.writeText(content);
    markCopied("content");
  };

  const handleDownloadSource = () => {
    if (!content || typeof window === "undefined" || typeof document === "undefined") return;
    const objectUrl = window.URL.createObjectURL(
      new Blob([content], { type: artifactMimeType(kind) })
    );
    try {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = sourceFilename;
      anchor.rel = "noopener";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    }
  };

  const handlePrint = () => {
    if (typeof window === "undefined" || typeof window.print !== "function") return;
    window.print();
  };

  if (state === "loading") {
    return (
      <main className="zaki-shared-artifact">
        <div className="zaki-shared-artifact__loading" role="status">
          <div className="zaki-shared-artifact__spinner" aria-hidden />
          <span>Loading artifact...</span>
        </div>
      </main>
    );
  }

  if (state === "error" || state === "expired") {
    return (
      <main className="zaki-shared-artifact">
        <section className="zaki-shared-artifact__empty" aria-live="polite">
          <AlertCircle className="size-10" aria-hidden />
          <h1>{state === "expired" ? "Artifact expired" : "Artifact unavailable"}</h1>
          <p>{error}</p>
          <Link to="/" className="zaki-shared-artifact__home">
            <ArrowLeft className="size-4" aria-hidden />
            Back to ZAKI
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="zaki-shared-artifact" data-testid="shared-artifact-page">
      <header className="zaki-shared-artifact__masthead">
        <Link to="/" className="zaki-shared-artifact__brand" aria-label="Open ZAKI">
          ZAKI
        </Link>
        <div className="zaki-shared-artifact__actions">
          <button type="button" onClick={() => void handleCopyLink()}>
            {copied === "link" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
          <button type="button" onClick={() => void handleCopyContent()} disabled={!content}>
            {copied === "content" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied === "content" ? "Copied" : "Copy content"}
          </button>
          <button type="button" onClick={handleDownloadSource} disabled={!content}>
            <Download className="size-4" aria-hidden />
            Download .{artifactExtension(kind)}
          </button>
          <button type="button" onClick={handlePrint}>
            <Printer className="size-4" aria-hidden />
            Print
          </button>
          <Link to="/products/agent">
            <ExternalLink className="size-4" aria-hidden />
            ZAKI Agent
          </Link>
        </div>
      </header>

      <section className="zaki-shared-artifact__hero">
        <div className="zaki-shared-artifact__eyebrow">
          <FileText className="size-4" aria-hidden />
          Shared {kind}
        </div>
        <h1>{title}</h1>
        <div className="zaki-shared-artifact__meta">
          <span>
            <Clock className="size-4" aria-hidden />
            {updatedLabel}
          </span>
          <span>{wordCount ? `${wordCount} words` : "source artifact"}</span>
          <span>{sizeLabel}</span>
          <span>Public artifact link</span>
        </div>
      </section>

      <article className="zaki-shared-artifact__document" data-kind={kind}>
        {isFramedArtifact(kind) ? (
          <iframe
            title={title}
            sandbox=""
            srcDoc={artifactFrameSource(kind, content)}
            className="zaki-shared-artifact__frame"
            data-testid="shared-artifact-frame"
          />
        ) : isCodeArtifact(kind) ? (
          <pre className="zaki-shared-artifact__code">{content}</pre>
        ) : (
          <MessageContent content={content} role="assistant" surface="shared" />
        )}
      </article>
    </main>
  );
}
