import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trackProductEvent } from "@/lib/productTelemetry";
import { cn } from "@/lib/utils";
import type { ImageBlock as ImageBlockType } from "../types";

function deriveFilename(url: string, alt: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop() || "";
    if (last && /\.[a-z0-9]+$/i.test(last)) return last;
  } catch {
    // Malformed URL — fall through to alt-derived name.
  }
  const safe = (alt || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return `${safe || "image"}.png`;
}

export function ImageBlock({ block }: { block: ImageBlockType }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const telemetryFiredRef = useRef(false);

  const downloadHref = block.downloadUrl || block.url;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    const filename = deriveFilename(downloadHref, block.alt);
    try {
      const response = await fetch(downloadHref, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(downloadHref, "_blank", "noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  if (failed) {
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        className="text-zaki-brand underline underline-offset-2 break-all text-sm"
      >
        {block.url}
      </a>
    );
  }

  const downloadLabel = t("chat.image.download", { defaultValue: "Download image" });

  return (
    <figure className="my-1">
      <div className="group relative inline-block max-w-full align-top">
        <img
          src={block.url}
          alt={block.alt || "generated image"}
          loading="lazy"
          onLoad={() => {
            if (telemetryFiredRef.current) return;
            telemetryFiredRef.current = true;
            void trackProductEvent({
              event: "image_rendered",
              source: "chat_input",
              plan: null,
              interval: null,
            }).catch(() => {
              // Best-effort telemetry only.
            });
          }}
          onError={() => setFailed(true)}
          className="block max-w-full rounded-[14px] border border-zaki-subtle dark:border-zaki-dark"
          style={{ maxHeight: "512px", objectFit: "contain" }}
          data-testid="assistant-generated-image"
        />
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          aria-label={downloadLabel}
          title={downloadLabel}
          data-testid="assistant-image-download-overlay"
          className={cn(
            "absolute end-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full",
            "bg-black/55 text-white backdrop-blur-sm",
            "opacity-0 transition-opacity duration-150",
            "group-hover:opacity-100 focus-visible:opacity-100",
            "hover:bg-black/75",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
            "disabled:cursor-wait disabled:opacity-100",
          )}
        >
          <Download className="size-4" aria-hidden />
        </button>
      </div>
    </figure>
  );
}
