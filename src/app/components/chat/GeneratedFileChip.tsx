import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { backendAuthRequest } from "@/lib/api";

/**
 * A small download chip for a file the engine agent generated during a normal
 * Spaces chat turn (surfaced from a `fileDownload` SSE event).
 *
 * The BFF download route authenticates with a Bearer token (Authorization
 * header) and is cross-origin from the SPA on staging/prod — so a plain anchor
 * navigation cannot authenticate. We download via an authed fetch
 * (`backendAuthRequest` adds the Bearer token, credentials, and 401 refresh),
 * then trigger a browser download from the resulting blob.
 */

export interface GeneratedFile {
  filename: string;
  storageFilename: string;
  fileSize: number | null;
}

interface GeneratedFileChipProps {
  spaceId: string;
  file: GeneratedFile;
}

function formatFileSize(bytes: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || Number.isInteger(size) ? 0 : 1)} ${units[unitIndex]}`;
}

export function GeneratedFileChip({ spaceId, file }: GeneratedFileChipProps) {
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sizeLabel = formatFileSize(file.fileSize);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setFailed(false);
    try {
      const res = await backendAuthRequest(
        `/api/spaces/${encodeURIComponent(spaceId)}/files/${encodeURIComponent(file.storageFilename)}`
      );
      if (!res.ok) throw new Error(`download failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      title={failed ? "Download failed — click to retry" : `Download ${file.filename}`}
      className="inline-flex max-w-[80%] items-center gap-2 rounded-[2px] border border-zaki bg-zaki-raised px-3 py-2 text-xs text-zaki-secondary transition-colors hover:bg-zaki-elevated disabled:opacity-60 dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210] dark:hover:bg-[#1a1714]"
    >
      <FileText className="size-4 shrink-0 text-zaki-muted" aria-hidden />
      <span className="truncate font-medium text-zaki-primary">{file.filename}</span>
      {sizeLabel ? (
        <span className="shrink-0 font-mono-ui text-[10px] text-zaki-muted">{sizeLabel}</span>
      ) : null}
      {downloading ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-zaki-muted" aria-hidden />
      ) : (
        <Download
          className={`size-3.5 shrink-0 ${failed ? "text-red-500" : "text-zaki-muted"}`}
          aria-hidden
        />
      )}
    </button>
  );
}
