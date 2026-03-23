/**
 * MemoryConfirmationPanel - User-facing memory management
 * 
 * Shows extracted memories pending user confirmation.
 * Allows confirm, reject, edit actions.
 * 
 * P0 Fix: Makes memory system transparent and user-controllable.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, Edit2, Brain, Sparkles, Lightbulb, Heart, Target, Users, CloudRain, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { MemoryModeToggle, useMemoryPolicy } from "./MemoryModeToggle";

interface PendingMemory {
  id: string;
  content: string;
  type: string;
  confidence_score: number;
  created_at: string;
}

interface MemoryConfirmationPanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig: Record<string, { icon: typeof Brain; label: string; className: string }> = {
  fact: { icon: Lightbulb, label: "Fact", className: "bg-zaki-accent-10 text-zaki-accent" },
  preference: { icon: Sparkles, label: "Preference", className: "bg-zaki-brand-10 text-zaki-brand" },
  emotion: { icon: Heart, label: "Emotion", className: "bg-zaki-selected text-zaki-secondary" },
  event: { icon: Calendar, label: "Event", className: "bg-zaki-selected text-zaki-secondary" },
  goal: { icon: Target, label: "Goal", className: "bg-zaki-selected text-zaki-secondary" },
  relationship: { icon: Users, label: "Relationship", className: "bg-zaki-selected text-zaki-secondary" },
  struggle: { icon: CloudRain, label: "Challenge", className: "bg-zaki-selected text-zaki-secondary" },
};

export function MemoryConfirmationPanel({ userId, isOpen, onClose }: MemoryConfirmationPanelProps) {
  const { t, i18n } = useTranslation();
  const [pending, setPending] = useState<PendingMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const {
    policy: memoryPolicy,
    setPolicy: setMemoryPolicy,
    loading: memoryPolicyLoading,
    saving: memoryPolicySaving,
  } = useMemoryPolicy();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");

  // Fetch pending confirmations
  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const fetchPending = async () => {
      setLoading(true);
      try {
        const res = await apiRequest("/api/memory/confirmations");
        const data = await res.json();
        // Backend returns { confirmations: [...] }, not { pending: [...] }
        setPending(data.confirmations || data.pending || []);
      } catch (err) {
        console.error("Failed to fetch pending memories:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPending();
    // Refresh every 30 seconds while panel is open
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [isOpen, userId]);

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    try {
      await apiRequest(`/api/memory/confirmations/${id}/confirm`, {
        method: "POST",
      });
      setPending((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Failed to confirm memory:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await apiRequest(`/api/memory/confirmations/${id}/reject`, {
        method: "POST",
      });
      setPending((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Failed to reject memory:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (memory: PendingMemory) => {
    setEditingId(memory.id);
    setEditValue(memory.content);
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    
    setActionLoading(id);
    try {
      // Reject original, store edited version
      await apiRequest(`/api/memory/confirmations/${id}/reject`, {
        method: "POST",
      });
      
      // Store edited version directly (user-verified)
      await apiRequest("/api/memory", {
        method: "POST",
        body: JSON.stringify({
          content: editValue.trim(),
          type: pending.find((m) => m.id === id)?.type || "context",
          metadata: { userVerified: true, editedFrom: id },
        }),
      });
      
      setPending((prev) => prev.filter((m) => m.id !== id));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save edit:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[80vh] bg-white rounded-2xl shadow-[0px_24px_60px_rgba(15,15,15,0.18)] border border-zaki-subtle overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zaki-subtle bg-zaki-base">
          <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
            <div className="size-10 rounded-xl bg-gradient-to-br from-zaki-brand to-zaki-primary-500 flex items-center justify-center">
              <Brain className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zaki-primary">
                {t("memoryPanel.title")}
              </h2>
              <p className="text-sm text-zaki-muted">
                {t("memoryPanel.pendingCount", { count: pending.length })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full hover:bg-zaki-hover flex items-center justify-center text-zaki-muted transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Memory Mode Toggle */}
        <div className="px-6 py-3 border-b border-zaki-subtle bg-zaki-base">
          <MemoryModeToggle
            value={memoryPolicy}
            onChange={(nextPolicy) => {
              void setMemoryPolicy(nextPolicy);
            }}
            disabled={memoryPolicyLoading || memoryPolicySaving}
          />
        </div>

        {/* Content */}
          <div className="overflow-y-auto max-h-[60vh] p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="size-8 border-2 border-zaki-spinner border-t-zaki-brand rounded-full animate-spin" />
              <p className="mt-4 text-sm text-zaki-muted">{t("memoryPanel.loading")}</p>
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-zaki-primary dark:text-[#efe6d9] font-medium">
                {t("memoryPanel.emptyTitle")}
              </p>
              <p className="text-sm text-zaki-muted mt-1">
                {t("memoryPanel.emptyBody")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((memory) => {
                // Default to 'fact' config if type is unknown
                const config = typeConfig[memory.type] ?? typeConfig.fact!;
                const Icon = config.icon;
                const isEditing = editingId === memory.id;
                const isLoading = actionLoading === memory.id;

                return (
                  <div
                    key={memory.id}
                    className={cn(
                      "group rounded-xl border transition-all",
                      "border-zaki-subtle bg-white",
                      "hover:border-zaki-brand/30",
                      isLoading && "opacity-60"
                    )}
                  >
                    <div className="p-4">
                      {/* Type badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold", config.className)}>
                          <Icon className="size-3.5" />
                          {t(`memory.types.${memory.type}`, { defaultValue: config.label })}
                        </span>
                        <span className="text-2xs text-zaki-muted">
                          {t("memoryPanel.confidence", {
                            value: Math.round(memory.confidence_score * 100),
                          })}
                        </span>
                      </div>

                      {/* Content */}
                      {isEditing ? (
                        <div className="mb-4">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-zaki dark:border-[#2b2119] bg-white dark:bg-[#0f0b08] text-sm text-zaki-primary dark:text-[#efe6d9] focus:outline-none focus:border-zaki-brand"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-zaki-primary mb-4 leading-relaxed">
                          "{memory.content}"
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(memory.id)}
                              disabled={isLoading}
                              className="flex-1 zaki-btn bg-zaki-accent hover:bg-zaki-accent-hover text-white disabled:opacity-50"
                            >
                              <Check className="size-4" />
                              {t("memoryPanel.actions.save")}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={isLoading}
                              className="zaki-btn-sm border border-zaki-subtle text-zaki-secondary hover:bg-zaki-hover transition-colors"
                            >
                              {t("memoryPanel.actions.cancel")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleConfirm(memory.id)}
                              disabled={isLoading}
                              className="flex-1 zaki-btn bg-zaki-accent hover:bg-zaki-accent-hover text-white disabled:opacity-50"
                            >
                              <Check className="size-4" />
                              {t("memory.remember")}
                            </button>
                            <button
                              onClick={() => startEdit(memory)}
                              disabled={isLoading}
                              className="size-9 flex items-center justify-center rounded-lg border border-zaki-subtle text-zaki-secondary hover:bg-zaki-hover transition-colors disabled:opacity-50"
                              title={t("memoryPanel.actions.edit")}
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              onClick={() => handleReject(memory.id)}
                              disabled={isLoading}
                              className="size-9 flex items-center justify-center rounded-lg border border-zaki-subtle text-zaki-secondary hover:bg-zaki-error hover:text-zaki-brand transition-colors disabled:opacity-50"
                              title={t("memoryPanel.actions.forget")}
                            >
                              <X className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zaki-subtle bg-zaki-base">
          <p className="text-2xs text-zaki-muted text-center">
            {t("memoryPanel.footerLine1")}
            <br />
            {t("memoryPanel.footerLine2")}
          </p>
        </div>
      </div>
    </div>
  );
}
