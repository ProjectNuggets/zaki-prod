import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchBotRuntimeStatus, type BotSandboxBackend } from "@/lib/api";
import { cn } from "@/lib/utils";

type SandboxState = {
  enabled: boolean;
  backend: BotSandboxBackend | null;
};

const BACKEND_LABEL: Record<BotSandboxBackend, string> = {
  bubblewrap: "bwrap",
  firejail: "firejail",
  docker: "docker",
  landlock: "landlock",
};

export function SandboxBadge({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const [state, setState] = useState<SandboxState | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      try {
        const { response, data } = await fetchBotRuntimeStatus();
        if (cancelled) return;
        if (!response.ok) {
          setState(null);
          return;
        }
        setState({
          enabled: Boolean(data.sandbox?.enabled),
          backend: data.sandbox?.backend ?? null,
        });
      } catch {
        if (!cancelled) setState(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!active || !state || !state.enabled) return null;

  const backendLabel = state.backend ? BACKEND_LABEL[state.backend] ?? state.backend : null;
  const labelText = backendLabel ? `Shell sandboxed (${backendLabel})` : "Shell sandboxed";

  return (
    <div
      role="status"
      aria-label={labelText}
      title={labelText}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
        className
      )}
    >
      <ShieldCheck className="size-3" aria-hidden />
      <span className="font-mono-ui">{labelText}</span>
    </div>
  );
}
