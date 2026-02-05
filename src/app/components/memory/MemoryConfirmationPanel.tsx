/**
 * MemoryConfirmationPanel - User-facing memory management
 * 
 * Shows extracted memories pending user confirmation.
 * Allows confirm, reject, edit actions.
 * 
 * P0 Fix: Makes memory system transparent and user-controllable.
 */

import { useState, useEffect } from "react";
import { Check, X, Edit2, Brain, Sparkles, Lightbulb, Heart, Target, Users, CloudRain, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { MemoryModeToggle, useMemoryMode } from "./MemoryModeToggle";

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

const typeConfig: Record<string, { icon: typeof Brain; label: string; color: string; bg: string }> = {
  fact: { icon: Lightbulb, label: "Fact", color: "text-amber-600", bg: "bg-amber-50" },
  preference: { icon: Sparkles, label: "Preference", color: "text-amber-600", bg: "bg-amber-50" },
  emotion: { icon: Heart, label: "Emotion", color: "text-rose-500", bg: "bg-rose-50" },
  event: { icon: Calendar, label: "Event", color: "text-indigo-600", bg: "bg-indigo-50" },
  goal: { icon: Target, label: "Goal", color: "text-emerald-600", bg: "bg-emerald-50" },
  relationship: { icon: Users, label: "Relationship", color: "text-violet-600", bg: "bg-violet-50" },
  struggle: { icon: CloudRain, label: "Challenge", color: "text-slate-600", bg: "bg-slate-50" },
};

export function MemoryConfirmationPanel({ userId, isOpen, onClose }: MemoryConfirmationPanelProps) {
  const [pending, setPending] = useState<PendingMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [memoryMode, setMemoryMode] = useMemoryMode();

  // Fetch pending confirmations
  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const fetchPending = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(`/api/memory/confirmations/${userId}`);
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
        body: JSON.stringify({ userId }),
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
        body: JSON.stringify({ userId }),
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
        body: JSON.stringify({ userId }),
      });
      
      // Store edited version directly (user-verified)
      await apiRequest("/api/memory", {
        method: "POST",
        body: JSON.stringify({
          userId,
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
      <div className="w-full max-w-lg max-h-[80vh] bg-white dark:bg-[#0f0b08] rounded-2xl shadow-xl border border-zaki dark:border-[#2b2119] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zaki dark:border-[#2b2119]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-zaki-brand to-zaki-primary-500 flex items-center justify-center">
              <Brain className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">
                Memories to Review
              </h2>
              <p className="text-sm text-zaki-muted">
                {pending.length} pending confirmation{pending.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full hover:bg-zaki-hover dark:hover:bg-[#21180f] flex items-center justify-center text-zaki-muted transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Memory Mode Toggle */}
        <div className="px-6 py-3 border-b border-zaki dark:border-[#2b2119] bg-zaki/30 dark:bg-[#1a140e]">
          <MemoryModeToggle value={memoryMode} onChange={setMemoryMode} />
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="size-8 border-2 border-zaki-spinner border-t-zaki-brand rounded-full animate-spin" />
              <p className="mt-4 text-sm text-zaki-muted">Loading memories...</p>
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-zaki-primary dark:text-[#efe6d9] font-medium">
                All caught up!
              </p>
              <p className="text-sm text-zaki-muted mt-1">
                ZAKI will suggest new memories as you chat.
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
                      "border-zaki dark:border-[#2b2119] bg-white dark:bg-[#15100c]",
                      "hover:border-zaki-brand/30 dark:hover:border-zaki-brand/30",
                      isLoading && "opacity-60"
                    )}
                  >
                    <div className="p-4">
                      {/* Type badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.bg, config.color)}>
                          <Icon className="size-3.5" />
                          {config.label}
                        </span>
                        <span className="text-xs text-zaki-muted">
                          {Math.round(memory.confidence_score * 100)}% confidence
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
                        <p className="text-sm text-zaki-primary dark:text-[#efe6d9] mb-4 leading-relaxed">
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
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zaki-brand text-white text-sm font-medium hover:bg-zaki-brand-hover transition-colors disabled:opacity-50"
                            >
                              <Check className="size-4" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={isLoading}
                              className="px-4 py-2 rounded-lg border border-zaki dark:border-[#2b2119] text-sm text-zaki-secondary hover:bg-zaki-hover dark:hover:bg-[#21180f] transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleConfirm(memory.id)}
                              disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zaki-brand text-white text-sm font-medium hover:bg-zaki-brand-hover transition-colors disabled:opacity-50"
                            >
                              <Check className="size-4" />
                              Remember
                            </button>
                            <button
                              onClick={() => startEdit(memory)}
                              disabled={isLoading}
                              className="size-9 flex items-center justify-center rounded-lg border border-zaki dark:border-[#2b2119] text-zaki-secondary hover:bg-zaki-hover dark:hover:bg-[#21180f] transition-colors disabled:opacity-50"
                              title="Edit"
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              onClick={() => handleReject(memory.id)}
                              disabled={isLoading}
                              className="size-9 flex items-center justify-center rounded-lg border border-zaki dark:border-[#2b2119] text-zaki-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Forget"
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
        <div className="px-6 py-3 border-t border-zaki dark:border-[#2b2119] bg-zaki-elevated/50 dark:bg-[#15100c]/50">
          <p className="text-xs text-zaki-muted text-center">
            Confirmed memories help ZAKI understand you better.
            <br />
            You can always review and delete memories later.
          </p>
        </div>
      </div>
    </div>
  );
}
