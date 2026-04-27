import { useRef, useState } from "react";
import { trackProductEvent } from "@/lib/productTelemetry";
import type { ImageBlock as ImageBlockType } from "../types";

export function ImageBlock({ block }: { block: ImageBlockType }) {
  const [failed, setFailed] = useState(false);
  const telemetryFiredRef = useRef(false);

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

  return (
    <figure className="my-1">
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
    </figure>
  );
}
