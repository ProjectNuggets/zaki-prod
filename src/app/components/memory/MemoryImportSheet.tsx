import { useCallback, useMemo, useState } from "react";
import { Check, Copy, Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { captureMemory } from "@/lib/api";
import { SheetShell } from "@/app/components/ui/zaki";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const IMPORT_PROMPT = `I am moving to a new AI assistant (Zaki) and want to bring along what you know about me. Please summarize everything you have learned about me across our conversations as clear, discrete facts another assistant could use to personalize its responses.

Include when you can:
- My name, role, and what I work on
- Interests, values, and preferences (including how I like to be communicated with)
- Current projects, goals, and ongoing challenges
- Tools, languages, and frameworks I use
- Any constraints (time zone, accessibility, family, health) relevant to helping me
- Anything else you believe would help another assistant serve me well

Write in plain text. One fact per line. Start each line with "I " or my name. No bullets, no headers, no preamble, no closing. If a fact would leak private info about someone other than me, skip it.`;

const MAX_CHARS = 8_000;

function splitFacts(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

export function MemoryImportSheet({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [importing, setImporting] = useState(false);

  const factCount = useMemo(() => splitFacts(pasted).length, [pasted]);
  const trimmed = pasted.trim();
  const overLimit = trimmed.length > MAX_CHARS;
  const canImport = !importing && trimmed.length > 0 && !overLimit;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text manually.");
    }
  }, []);

  const handleImport = useCallback(async () => {
    const facts = splitFacts(pasted);
    if (facts.length === 0) {
      toast.error("Paste the other AI's response first.");
      return;
    }
    setImporting(true);
    try {
      const { response, data } = await captureMemory({
        message: trimmed,
        threadId: null,
      });
      if (!response.ok) {
        const message =
          (data as { error?: string } | null)?.error ||
          `Import failed (${response.status})`;
        toast.error(message);
        return;
      }
      const saved = Array.isArray((data as { saved?: unknown[] } | null)?.saved)
        ? ((data as { saved: unknown[] }).saved.length as number)
        : 0;
      const review = Array.isArray((data as { review?: unknown[] } | null)?.review)
        ? ((data as { review: unknown[] }).review.length as number)
        : 0;
      if (saved + review === 0) {
        toast.message("Nothing new to import. Zaki already knew that.");
      } else if (review > 0) {
        toast.success(
          `Imported ${saved} fact${saved === 1 ? "" : "s"} · ${review} pending your review`
        );
      } else {
        toast.success(`Imported ${saved} fact${saved === 1 ? "" : "s"}`);
      }
      setPasted("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [pasted, trimmed, onClose]);

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title="Bring your memory to Zaki"
      subtitle="Copy a prompt into ChatGPT, Claude, or Gemini. Paste the answer back here."
      icon={<Sparkles className="size-4 text-zaki-brand" />}
      width="lg"
      padded
    >
      <div className="flex flex-col gap-6 px-4 py-4">
        {/* Step 1 */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-zaki-brand/15 text-xs font-semibold text-zaki-brand">
              1
            </span>
            <h3 className="text-sm font-semibold text-zaki-primary">
              Copy this prompt
            </h3>
          </div>
          <p className="text-xs text-zaki-muted">
            Paste it into your current AI assistant (ChatGPT, Claude, Gemini, etc.)
            and let it answer.
          </p>
          <div className="relative">
            <textarea
              readOnly
              value={IMPORT_PROMPT}
              rows={9}
              className={cn(
                "w-full resize-none rounded-zaki-md border border-zaki bg-zaki-sunken p-3 pr-10 text-xs text-zaki-secondary",
                "font-mono leading-relaxed focus:outline-none"
              )}
            />
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-zaki bg-zaki-raised px-2 py-1 text-xs font-medium text-zaki-secondary shadow-sm transition-colors",
                "hover:bg-zaki-hover hover:text-zaki-primary"
              )}
              aria-label="Copy prompt"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> Copy
                </>
              )}
            </button>
          </div>
        </section>

        {/* Step 2 */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-zaki-brand/15 text-xs font-semibold text-zaki-brand">
              2
            </span>
            <h3 className="text-sm font-semibold text-zaki-primary">
              Paste the response here
            </h3>
          </div>
          <p className="text-xs text-zaki-muted">
            Zaki will read the facts, skip what it already knows, and queue
            anything sensitive for your review. You stay in control.
          </p>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={10}
            placeholder="Paste the other assistant's answer here..."
            className={cn(
              "w-full resize-y rounded-zaki-md border bg-zaki-raised p-3 text-sm text-zaki-primary placeholder:text-zaki-muted focus:outline-none focus:ring-1 focus:ring-zaki-brand",
              overLimit ? "border-zaki-brand" : "border-zaki"
            )}
          />
          <div className="flex items-center justify-between text-xs">
            <span className={cn("text-zaki-muted", overLimit && "text-zaki-brand")}>
              {trimmed.length} / {MAX_CHARS} chars
              {factCount > 0 && <> · {factCount} lines</>}
            </span>
            {overLimit && (
              <span className="text-zaki-brand">
                Too long. Trim it down first.
              </span>
            )}
          </div>
        </section>

        <div className="flex items-center justify-end gap-2 border-t border-zaki pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              canImport
                ? "bg-zaki-brand text-white hover:bg-zaki-brand/90"
                : "cursor-not-allowed bg-zaki-sunken text-zaki-muted"
            )}
          >
            {importing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Importing...
              </>
            ) : (
              <>
                <Download className="size-3.5" /> Import memories
              </>
            )}
          </button>
        </div>
      </div>
    </SheetShell>
  );
}
