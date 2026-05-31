import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justSynthesized, setJustSynthesized] = useState(false);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  };

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
      closeTimerRef.current = setTimeout(() => {
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

  // Audit (2026-05-07) — Compose surface relocated from full-width
  // canvas-bottom slide-up to a right-anchored card matching the
  // FloatingOverlay panel slot. Rationale: the bottom-slide pattern
  // covered ~30% of canvas vertical at full width, hiding the very
  // graph the user is composing about. Right-anchored mirrors the
  // panel pattern (filters/clusters/orphans), keeps canvas top + left
  // visible for reference, and slides in from the right edge so the
  // motion direction matches "I'm pulling up a side panel."
  // Mutual exclusion with the FloatingOverlay panels is enforced by
  // BrainPage: opening compose calls setActivePanel(null).
  // Visual style is dark-canvas-locked (white-on-black with /opacity
  // tints) since this surface lives inside the canvas region.
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="absolute inset-x-3 bottom-3 z-30 flex max-h-[80%] flex-col border border-white/10 bg-black/85 sm:inset-x-auto sm:right-3 sm:top-14 sm:bottom-3 sm:w-[min(420px,calc(100%-1.5rem))] sm:max-h-[calc(100%-4.5rem)]"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">
              {t("brain.compose.title", { count: selectedNodes.length })}
            </h3>
            <button
              type="button"
              onClick={handleClose}
              aria-label={t("brain.compose.cancel")}
              className="rounded-[2px] p-1 text-white/40 transition-colors hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {selectedNodes.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selectedNodes.map((n) => (
                  <span
                    key={n.id}
                    className="max-w-[14rem] truncate rounded-[2px] bg-white/10 px-2 py-0.5 text-[11px] text-white/70"
                    title={n.summary}
                  >
                    {n.summary}
                  </span>
                ))}
              </div>
            )}

            <label className="mb-3 block">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {t("brain.compose.titleField")}
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-[2px] border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-zaki-brand focus:ring-1 focus:ring-zaki-brand/30"
              />
            </label>

            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {t("brain.compose.contentField")}
              </span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="mt-1 w-full resize-y rounded-[2px] border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-zaki-brand focus:ring-1 focus:ring-zaki-brand/30"
              />
            </label>

            {error && (
              <div className="mt-2 text-xs text-zaki-error">{error}</div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
            {justSynthesized ? (
              <span className="text-xs font-semibold text-zaki-brand">
                {t("brain.compose.youSynthesized")}
              </span>
            ) : (
              <span className="text-[11px] text-white/40">
                {t("brain.compose.referenceCount", {
                  defaultValue: "{{count}} references",
                  count: selectedNodes.length,
                })}
              </span>
            )}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="rounded-[2px] border border-zaki-brand/30 bg-zaki-brand px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zaki-brand-hover disabled:opacity-50"
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
