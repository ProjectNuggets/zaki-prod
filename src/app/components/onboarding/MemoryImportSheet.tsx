// 2026-05-09 — Memory import sheet (paste from ChatGPT/Claude/Gemini).
//
// New users can ask another AI for a structured memory dump using the
// canonical prompt below, then paste it back here. ZAKI ingests it as
// the first user turn — the agent owns the actual remember tool calls,
// so this is just a structured first-message shortcut.
//
// Surfaces:
//   - Dashboard memory-scope panel
//   - Future Memory Control Plane import action
//
// The canonical prompt was previously inlined in ZakiDashboard;
// hoisting it here lets the dashboard simply open this sheet.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Check, Copy, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { SheetShell } from "@/app/components/ui/zaki";
import { cn } from "@/lib/utils";

export const MEMORY_IMPORT_PROMPT = `Export all of my stored memories and any context you have learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions and preferences.

Categories (output in this order):

1. Instructions: Rules I have explicitly asked you to follow going forward, including tone, format, style, "always do X", "never do Y", and corrections to your behavior. Only from stored memories, not from conversation transcripts.

2. Identity: Name, age, location, time zone, languages, education, family, relationships, personal interests, and any accessibility or health context relevant to helping me.

3. Career: Current and past roles, companies, industries, and general skill areas.

4. Projects: Projects I meaningfully built or committed to. Ideally ONE entry per project. Include what it does, current status, and key decisions. Start each entry with the project name or a short descriptor.

5. Preferences: Opinions, tastes, and working-style preferences that apply broadly, including tools, languages, frameworks I use, and how I prefer to communicate.

Format:

Use section headers for each category. Within each category, one entry per line, sorted oldest first:

[YYYY-MM-DD] - Entry content here.

Use [unknown] when no date is available. Skip anything that would leak private information about someone other than me.

Output:

Begin with exactly this line (include it inside the code block too):

Zaki: here are my facts. Save and update your memory accordingly.

Then wrap the entire export in a single code block. After the code block, state whether this is the complete set or if more entries remain.`;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Fires when the user has pasted their dump and pressed "Import." */
  onImport: (dump: string) => Promise<void> | void;
};

export function MemoryImportSheet({ isOpen, onClose, onImport }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [dump, setDump] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setDump("");
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MEMORY_IMPORT_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(
        t("memoryImport.copyError", {
          defaultValue: "Couldn't copy. Select the prompt and copy manually.",
        }),
      );
    }
  };

  const handleImport = async () => {
    const trimmed = dump.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onImport(trimmed);
      onClose();
    } catch {
      toast.error(
        t("memoryImport.importError", {
          defaultValue: "Couldn't send the import. Try again.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canImport = dump.trim().length > 20 && !submitting;

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("memoryImport.title", { defaultValue: "Bring your memory" })}
      subtitle={t("memoryImport.subtitle", {
        defaultValue:
          "Ask another assistant for a structured dump, then paste it here. ZAKI will save what matters.",
      })}
      icon={<Brain className="size-4" />}
      width="lg"
    >
      <div className="flex flex-col gap-5">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted">
              {t("memoryImport.step1Label", {
                defaultValue: "Step 1: copy this prompt",
              })}
            </h3>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                copied
                  ? "bg-zaki-accent/15 text-zaki-accent"
                  : "bg-zaki-brand text-white hover:brightness-110",
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3" />
                  {t("memoryImport.copied", { defaultValue: "Copied" })}
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  {t("memoryImport.copyAction", { defaultValue: "Copy prompt" })}
                </>
              )}
            </button>
          </div>
          <pre className="max-h-[180px] overflow-y-auto rounded-zaki-md border border-zaki-strong bg-zaki-sunken p-3 font-mono text-[11px] leading-relaxed text-zaki-secondary whitespace-pre-wrap">
            {MEMORY_IMPORT_PROMPT}
          </pre>
          <p className="mt-2 text-xs text-zaki-muted">
            {t("memoryImport.step1Hint", {
              defaultValue:
                "Paste this into ChatGPT, Claude, Gemini, or any assistant that knows you.",
            })}
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted">
            {t("memoryImport.step2Label", {
              defaultValue: "Step 2: paste the response",
            })}
          </h3>
          <textarea
            value={dump}
            onChange={(e) => setDump(e.target.value)}
            rows={8}
            placeholder={t("memoryImport.placeholder", {
              defaultValue: "Paste the assistant's reply here.",
            })}
            className="w-full resize-none rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 font-mono text-xs text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210]"
          />
        </section>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zaki-strong px-4 py-2 text-xs text-zaki-primary transition-colors hover:bg-zaki-hover"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            disabled={!canImport}
            onClick={handleImport}
            className="inline-flex items-center gap-1.5 rounded-full bg-zaki-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5 hover:bg-zaki-brand-hover disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {t("memoryImport.importAction", { defaultValue: "Send to ZAKI" })}
          </button>
        </div>
      </div>
    </SheetShell>
  );
}
