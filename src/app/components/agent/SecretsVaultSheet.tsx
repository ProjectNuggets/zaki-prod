import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Key,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAgentSecret,
  putAgentSecret,
  deleteAgentSecret,
  listAgentSecrets,
} from "@/lib/api";
import { EmptyState, InlineConfirm, SheetShell } from "@/app/components/ui/zaki";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type SecretEntry = {
  key: string;
  revealed: boolean;
  value: string | null;
};

export function SecretsVaultSheet({ isOpen, onClose }: Props) {
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState<string | null>(null);

  const loadSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listAgentSecrets();
      const keys = data?.keys ?? [];
      setSecrets(keys.map((key) => ({ key, revealed: false, value: null })));
    } catch {
      toast.error("Failed to load secrets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadSecrets();
  }, [isOpen, loadSecrets]);

  const handleReveal = useCallback(async (key: string) => {
    setActionInProgress(`reveal:${key}`);
    try {
      const { data } = await getAgentSecret(key);
      const value = typeof data?.value === "string" ? data.value : JSON.stringify(data?.value ?? "");
      setSecrets((prev) =>
        prev.map((s) => (s.key === key ? { ...s, revealed: true, value } : s))
      );
    } catch {
      toast.error(`Failed to retrieve "${key}"`);
    } finally {
      setActionInProgress(null);
    }
  }, []);

  const handleHide = useCallback((key: string) => {
    setSecrets((prev) =>
      prev.map((s) => (s.key === key ? { ...s, revealed: false, value: null } : s))
    );
  }, []);

  const handleDelete = useCallback(async (key: string) => {
    setActionInProgress(`delete:${key}`);
    try {
      await deleteAgentSecret(key);
      setSecrets((prev) => prev.filter((s) => s.key !== key));
      toast.success(`Secret "${key}" deleted`);
    } catch {
      toast.error(`Failed to delete "${key}"`);
    } finally {
      setActionInProgress(null);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    const k = newKey.trim();
    const v = newValue.trim();
    if (!k) {
      toast.error("Key is required");
      return;
    }
    if (!v) {
      toast.error("Value is required");
      return;
    }
    setActionInProgress("create");
    try {
      await putAgentSecret(k, v);
      setSecrets((prev) => {
        const existing = prev.findIndex((s) => s.key === k);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { key: k, revealed: false, value: null };
          return next;
        }
        return [...prev, { key: k, revealed: false, value: null }];
      });
      setNewKey("");
      setNewValue("");
      setShowCreate(false);
      toast.success(`Secret "${k}" saved`);
      loadSecrets();
    } catch {
      toast.error("Failed to save secret");
    } finally {
      setActionInProgress(null);
    }
  }, [newKey, newValue, loadSecrets]);

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title="Secrets Vault"
      icon={<KeyRound className="size-4" />}
      subtitle="Encrypted at rest with ChaCha20-Poly1305."
      description="Manage agent secrets and API keys"
      padded={false}
    >
      <div className="px-4 py-3">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-full p-1.5 text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
            title="Add secret"
            aria-label="Add secret"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mb-3 rounded-zaki-md border border-zaki bg-zaki-hover px-3 py-2 text-[11px] text-zaki-secondary">
          Secrets are stored encrypted in the ZAKI runtime. The agent can read them
          during tool execution. Values are never logged.
        </div>

          {showCreate && (
            <div className="mb-4 rounded-zaki-xl border border-zaki-strong bg-zaki-elevated p-3 dark:bg-[#1a1714]">
              <div className="mb-2 font-display text-xs font-bold text-zaki-primary">Add Secret</div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Key (e.g. GITHUB_TOKEN)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                  className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs font-mono-ui text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]"
                />
                <input
                  type="password"
                  placeholder="Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs font-mono-ui text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionInProgress === "create"}
                    onClick={handleCreate}
                    className="rounded-full bg-zaki-brand px-4 py-2 text-xs font-medium text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {actionInProgress === "create" ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" /> Saving...
                      </span>
                    ) : (
                      "Save"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-full border border-zaki-strong px-4 py-2 text-xs text-zaki-primary transition-colors hover:bg-zaki-hover"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && secrets.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-zaki-brand" />
            </div>
          ) : secrets.length === 0 && !showCreate ? (
            <EmptyState
              icon={<Key className="size-5" />}
              title="No secrets stored"
              helper="Add API keys or tokens the agent can use."
              action={
                <button
                  type="button"
                  className="rounded-full bg-zaki-brand px-4 py-2 text-xs font-medium text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5"
                  onClick={() => setShowCreate(true)}
                >
                  Add a secret
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {secrets.map((secret) => (
                <div
                  key={secret.key}
                  className="group rounded-zaki-xl border border-zaki-strong bg-zaki-elevated p-3 text-xs transition-colors hover:border-zaki-accent/40 dark:bg-[#1a1714]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Key className="size-3.5 shrink-0 text-zaki-accent" />
                      <span className="font-mono-ui font-medium truncate text-zaki-primary">{secret.key}</span>
                    </div>
                    {confirmingDeleteKey === secret.key ? (
                      <InlineConfirm
                        label="Delete secret?"
                        disabled={actionInProgress === `delete:${secret.key}`}
                        onConfirm={() => {
                          handleDelete(secret.key);
                          setConfirmingDeleteKey(null);
                        }}
                        onCancel={() => setConfirmingDeleteKey(null)}
                      />
                    ) : (
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title={secret.revealed ? "Hide" : "Reveal"}
                          disabled={!!actionInProgress}
                          onClick={() =>
                            secret.revealed ? handleHide(secret.key) : handleReveal(secret.key)
                          }
                          className="rounded-full p-1.5 text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
                          aria-label={secret.revealed ? "Hide secret" : "Reveal secret"}
                        >
                          {actionInProgress === `reveal:${secret.key}` ? (
                            <Loader2 className="size-3.5 animate-spin text-zaki-brand" />
                          ) : secret.revealed ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          disabled={!!actionInProgress}
                          onClick={() => setConfirmingDeleteKey(secret.key)}
                          className="rounded-full p-1.5 text-zaki-brand transition-colors hover:bg-zaki-brand/10"
                          aria-label="Delete secret"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {secret.revealed && secret.value != null && (
                    <div className="mt-1.5 break-all rounded-zaki-md border border-zaki bg-zaki-raised px-2 py-1 font-mono-ui text-[11px] text-zaki-primary dark:bg-[#141210]">
                      {secret.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </SheetShell>
  );
}
