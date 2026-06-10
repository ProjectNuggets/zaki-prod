import { Download, FileText } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

/**
 * A small download chip for a file the engine agent generated during a normal
 * Spaces chat turn (surfaced from a `fileDownload` SSE event). It links to the
 * same-origin BFF download endpoint and triggers a browser download with the
 * original filename.
 *
 * Credentials (cookies) are sent automatically for same-origin GET navigations,
 * so a plain credentialed anchor is sufficient.
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
  const href = buildApiUrl(
    `/api/spaces/${encodeURIComponent(spaceId)}/files/${encodeURIComponent(
      file.storageFilename
    )}`
  );
  const sizeLabel = formatFileSize(file.fileSize);

  return (
    <a
      href={href}
      download={file.filename}
      className="inline-flex max-w-[80%] items-center gap-2 rounded-[2px] border border-zaki bg-zaki-raised px-3 py-2 text-xs text-zaki-secondary transition-colors hover:bg-zaki-elevated dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210] dark:hover:bg-[#1a1714]"
    >
      <FileText className="size-4 shrink-0 text-zaki-muted" aria-hidden />
      <span className="truncate font-medium text-zaki-primary">{file.filename}</span>
      {sizeLabel ? (
        <span className="shrink-0 font-mono-ui text-[10px] text-zaki-muted">{sizeLabel}</span>
      ) : null}
      <Download className="size-3.5 shrink-0 text-zaki-muted" aria-hidden />
    </a>
  );
}
