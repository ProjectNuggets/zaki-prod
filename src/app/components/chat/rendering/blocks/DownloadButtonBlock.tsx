import type { DownloadButtonBlock as DownloadButtonBlockType } from "../types";

export function DownloadButtonBlock({ block }: { block: DownloadButtonBlockType }) {
  return (
    <div>
      <a
        href={block.url}
        download
        target="_blank"
        rel="noreferrer"
        data-testid="assistant-image-download"
        className="inline-flex items-center gap-1.5 rounded-full border border-zaki-subtle bg-zaki-sunken px-3 py-1.5 text-[13px] font-medium text-zaki-primary hover:bg-zaki-hover dark:border-zaki-dark dark:text-zaki-dark-primary"
      >
        <span aria-hidden>↓</span>
        <span>Download</span>
      </a>
    </div>
  );
}
