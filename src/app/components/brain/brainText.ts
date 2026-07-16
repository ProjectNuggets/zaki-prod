import { sanitizeAssistantScaffold } from "@/app/components/chat/rendering/scaffoldSanitizer";

/**
 * Brain is a display lane for model-authored memory. Treat every string from
 * that corpus as untrusted assistant output before it reaches the DOM or the
 * graph renderer.
 */
export function sanitizeBrainText(value: string | null | undefined): string {
  return sanitizeAssistantScaffold(value ?? "");
}

/** Resolve the first candidate that still contains user-facing text after sanitization. */
export function brainDisplayText(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const sanitized = sanitizeBrainText(candidate);
    if (sanitized) return sanitized;
  }
  return "Memory";
}
