import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchAgentDiagnostics } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/app/components/ui/sheet";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type DiagnosticsData = {
  gateway?: {
    requests_total?: number;
    in_flight_requests?: number;
    draining?: boolean;
  };
  runtime_mode?: string;
  instance_id?: string | null;
  owned_users_count?: number;
  memory_search_enabled?: boolean | null;
  memory_summarizer_enabled?: boolean | null;
  agent_message_timeout_secs?: number | null;
  provider_retries?: number | null;
  fallback_provider_count?: number | null;
  effective_config_source?: string;
  assistant_mode?: string | null;
  telegram_connected_normalized?: boolean | null;
  heartbeat_enabled_normalized?: boolean | null;
  onboarding_ready_normalized?: boolean | null;
  client_ready_status?: string | null;
  upstreamHealth?: { ok?: boolean; latencyMs?: number | null };
  upstreamReady?: { ok?: boolean; latencyMs?: number | null };
  [key: string]: unknown;
};

function StatusDot({ ok }: { ok?: boolean | null }) {
  if (ok === true) return <CheckCircle2 className="size-3.5 text-emerald-500" />;
  if (ok === false) return <XCircle className="size-3.5 text-red-500" />;
  return <Activity className="size-3.5 text-zinc-400" />;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={cn("text-right", mono && "font-mono")}>{value ?? "—"}</span>
    </div>
  );
}

export function DiagnosticsSheet({ isOpen, onClose }: Props) {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await fetchAgentDiagnostics();
      setData(d as DiagnosticsData);
      setLastFetched(Date.now());
    } catch {
      toast.error("Failed to fetch diagnostics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const healthOk = data?.upstreamHealth?.ok;
  const readyOk = data?.upstreamReady?.ok;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[380px] border-l border-zinc-200 bg-white p-0 dark:border-zinc-700 dark:bg-zinc-900 sm:w-[420px]"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <SheetTitle className="text-sm font-semibold">Diagnostics</SheetTitle>
          <SheetDescription className="sr-only">
            Agent runtime diagnostics
          </SheetDescription>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Refresh"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
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

        <div className="overflow-y-auto px-4 py-3 text-xs" style={{ maxHeight: "calc(100vh - 60px)" }}>
          {loading && !data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-zinc-400" />
            </div>
          ) : !data ? (
            <p className="py-12 text-center text-sm text-zinc-500">No data available</p>
          ) : (
            <div className="space-y-4">
              {/* Health banner */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3",
                  healthOk && readyOk
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-950/20"
                    : "border-red-200 bg-red-50 dark:border-red-700/40 dark:bg-red-950/20"
                )}
              >
                <StatusDot ok={healthOk && readyOk} />
                <span className="font-medium">
                  {healthOk && readyOk
                    ? "Agent runtime healthy"
                    : healthOk === false
                      ? "Agent runtime unhealthy"
                      : "Agent runtime status unknown"}
                </span>
                {data.upstreamHealth?.latencyMs != null && (
                  <span className="ml-auto text-[11px] text-zinc-500">
                    {data.upstreamHealth.latencyMs}ms
                  </span>
                )}
              </div>

              {/* Runtime section */}
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Runtime
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <Row label="Mode" value={data.runtime_mode} />
                  <Row label="Config source" value={data.effective_config_source} />
                  <Row label="Instance" value={data.instance_id?.slice(0, 12)} mono />
                  <Row label="Users" value={data.owned_users_count} />
                </div>
              </div>

              {/* Agent config */}
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Agent Config
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <Row label="Assistant mode" value={data.assistant_mode} />
                  <Row label="Message timeout" value={data.agent_message_timeout_secs ? `${data.agent_message_timeout_secs}s` : null} />
                  <Row label="Provider retries" value={data.provider_retries} />
                  <Row label="Fallback providers" value={data.fallback_provider_count} />
                </div>
              </div>

              {/* Features */}
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Features
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <Row
                    label="Memory search"
                    value={<StatusDot ok={data.memory_search_enabled} />}
                  />
                  <Row
                    label="Memory summarizer"
                    value={<StatusDot ok={data.memory_summarizer_enabled} />}
                  />
                  <Row
                    label="Telegram"
                    value={<StatusDot ok={data.telegram_connected_normalized} />}
                  />
                  <Row
                    label="Heartbeat"
                    value={<StatusDot ok={data.heartbeat_enabled_normalized} />}
                  />
                  <Row
                    label="Onboarding"
                    value={<StatusDot ok={data.onboarding_ready_normalized} />}
                  />
                </div>
              </div>

              {/* Gateway stats */}
              {data.gateway && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Gateway
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <Row label="Total requests" value={data.gateway.requests_total?.toLocaleString()} />
                    <Row label="In-flight" value={data.gateway.in_flight_requests} />
                    <Row
                      label="Draining"
                      value={data.gateway.draining ? "yes" : "no"}
                    />
                  </div>
                </div>
              )}

              {lastFetched && (
                <div className="pt-2 text-center text-[10px] text-zinc-400">
                  Updated {new Date(lastFetched).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
