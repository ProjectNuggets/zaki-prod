import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAgentSecret,
  putAgentSecret,
  deleteAgentSecret,
  listAgentSecrets,
} from "@/lib/api";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/app/components/ui/sheet";

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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[380px] border-l border-zinc-200 bg-white p-0 dark:border-zinc-700 dark:bg-zinc-900 sm:w-[420px]"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <SheetTitle className="text-sm font-semibold">Secrets Vault</SheetTitle>
          <SheetDescription className="sr-only">
            Manage agent secrets and API keys
          </SheetDescription>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Add secret"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: "calc(100vh - 60px)" }}>
          <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Secrets are stored encrypted in nullalis. The agent can read them
            during tool execution. Values are never logged.
          </div>

          {showCreate && (
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <div className="mb-2 text-xs font-semibold">Add Secret</div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Key (e.g. GITHUB_TOKEN)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                  className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs font-mono dark:border-zinc-600 dark:bg-zinc-900"
                />
                <input
                  type="password"
                  placeholder="Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs font-mono dark:border-zinc-600 dark:bg-zinc-900"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionInProgress === "create"}
                    onClick={handleCreate}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && secrets.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-zinc-400" />
            </div>
          ) : secrets.length === 0 && !showCreate ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No secrets stored.{" "}
              <button
                type="button"
                className="text-emerald-600 underline hover:text-emerald-700"
                onClick={() => setShowCreate(true)}
              >
                Add one
              </button>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {secrets.map((secret) => (
                <div
                  key={secret.key}
                  className="group rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Key className="size-3.5 shrink-0 text-zinc-500" />
                      <span className="font-mono font-medium truncate">{secret.key}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        title={secret.revealed ? "Hide" : "Reveal"}
                        disabled={!!actionInProgress}
                        onClick={() =>
                          secret.revealed ? handleHide(secret.key) : handleReveal(secret.key)
                        }
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        {actionInProgress === `reveal:${secret.key}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
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
                        onClick={() => handleDelete(secret.key)}
                        className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40"
                      >
                        {actionInProgress === `delete:${secret.key}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {secret.revealed && secret.value != null && (
                    <div className="mt-1.5 break-all rounded bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {secret.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
