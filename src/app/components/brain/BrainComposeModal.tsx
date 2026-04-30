import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useBrainCompose } from "@/queries";
import type { BrainGraphNode } from "@/lib/api";

interface Props {
  userId: string;
  open: boolean;
  selectedNodes: BrainGraphNode[];
  onClose: () => void;
  onSynthesized?: () => void;
}

export function BrainComposeModal({
  userId,
  open,
  selectedNodes,
  onClose,
  onSynthesized,
}: Props) {
  const { t } = useTranslation();
  const compose = useBrainCompose(userId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justSynthesized, setJustSynthesized] = useState(false);

  // Auto-suggest title from first 1-2 selected node summaries.
  useEffect(() => {
    if (open && !title && selectedNodes.length > 0) {
      const seed = selectedNodes
        .slice(0, 2)
        .map((n) => (n.summary.split(/[\.\!\?]/)[0] ?? "").trim())
        .filter(Boolean)
        .join(" + ");
      setTitle(seed.slice(0, 80));
    }
    if (!open) {
      setTitle("");
      setContent("");
      setError(null);
    }
  }, [open, selectedNodes, title]);

  async function handleSubmit() {
    setError(null);
    try {
      await compose.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        references: selectedNodes.map((n) => n.id),
      });
      setJustSynthesized(true);
      onSynthesized?.();
      // Close after a beat so user sees success
      setTimeout(() => {
        setJustSynthesized(false);
        onClose();
      }, 800);
    } catch {
      setError(t("brain.compose.errorGeneric"));
    }
  }

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    selectedNodes.length >= 2 &&
    !compose.isPending;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="absolute inset-x-0 bottom-0 rounded-t-zaki-lg border-t border-zaki-border bg-zaki-base p-4 shadow-2xl"
          style={{ minHeight: 240 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zaki-text">
              {t("brain.compose.title", { count: selectedNodes.length })}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-zaki-muted hover:text-zaki-text"
            >
              {t("brain.compose.cancel")}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {selectedNodes.map((n) => (
              <span
                key={n.id}
                className="max-w-[14rem] truncate rounded-full bg-zaki-raised px-2 py-0.5 text-[11px] text-zaki-muted"
                title={n.summary}
              >
                {n.summary}
              </span>
            ))}
          </div>

          <label className="mb-2 block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-zaki-muted">
              {t("brain.compose.titleField")}
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 py-1.5 text-sm text-zaki-text outline-none focus:border-[#f10202]"
            />
          </label>

          <label className="mb-3 block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-zaki-muted">
              {t("brain.compose.contentField")}
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 py-1.5 text-sm text-zaki-text outline-none focus:border-[#f10202]"
            />
          </label>

          {error && (
            <div className="mb-2 text-xs text-red-500">{error}</div>
          )}

          <div className="flex items-center justify-between">
            {justSynthesized ? (
              <span className="text-xs font-semibold text-[#f10202]">
                {t("brain.compose.youSynthesized")}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="rounded-zaki-md bg-[#f10202] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {compose.isPending
                ? t("brain.compose.submitting")
                : t("brain.compose.submit")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
