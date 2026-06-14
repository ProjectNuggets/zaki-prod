import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchAgentDiagnostics } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EmptyState, MetaLabel, SheetShell } from "@/app/components/ui/zaki";

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
  telegram_connected_normalized?: boolean | null;
  heartbeat_enabled_normalized?: boolean | null;
  onboarding_ready_normalized?: boolean | null;
  client_ready_status?: string | null;
  upstreamHealth?: { ok?: boolean; latencyMs?: number | null };
  upstreamReady?: { ok?: boolean; latencyMs?: number | null };
  [key: string]: unknown;
};

function StatusDot({ ok }: { ok?: boolean | null }) {
  if (ok === true) return <CheckCircle2 className="size-3.5 text-zaki-accent" />;
  if (ok === false) return <XCircle className="size-3.5 text-zaki-brand" />;
  return <Activity className="size-3.5 text-zaki-muted" />;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 font-body">
      <span className="text-zaki-secondary">{label}</span>
      <span className={cn("text-right text-zaki-primary", mono && "font-mono-ui")}>{value ?? "\u2014"}</span>
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
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title="Diagnostics"
      icon={<Activity className="size-4" />}
      description="Agent runtime diagnostics"
      padded={false}
    >
      <div className="px-4 py-3 text-xs">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full p-1.5 text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary disabled:opacity-60"
            title="Refresh"
            aria-label="Refresh diagnostics"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin text-zaki-brand")} />
          </button>
        </div>
        {loading && !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-zaki-brand" />
          </div>
        ) : !data ? (
          <EmptyState
            icon={<Activity className="size-5" />}
            title="No data available"
            helper="Diagnostics could not be fetched."
            action={
              <button
                type="button"
                onClick={load}
                className="rounded-full border border-zaki-strong px-4 py-2 text-xs font-medium text-zaki-primary transition-colors hover:bg-zaki-hover"
              >
                Retry
              </button>
            }
          />
        ) : (
            <div className="space-y-4">
              {/* Health banner */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-zaki-xl border p-3",
                  healthOk && readyOk
                    ? "border-zaki-accent/30 bg-zaki-accent/10 text-zaki-primary"
                    : "border-zaki-brand/30 bg-zaki-brand/10 text-zaki-primary"
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
                  <span className="ml-auto rounded-full bg-zaki-hover px-2 py-0.5 font-mono-ui text-[11px] font-medium text-zaki-secondary">
                    {data.upstreamHealth.latencyMs}ms
                  </span>
                )}
              </div>

              {/* Runtime section */}
              <div>
                <MetaLabel className="mb-1 flex">Runtime</MetaLabel>
                <div className="divide-y divide-zaki border border-zaki-strong rounded-zaki-xl bg-zaki-raised px-3 dark:bg-[#1a1714]">
                  <Row label="Mode" value={data.runtime_mode} />
                  <Row label="Config source" value={data.effective_config_source} />
                  <Row label="Instance" value={data.instance_id?.slice(0, 12)} mono />
                  <Row label="Users" value={data.owned_users_count} />
                </div>
              </div>

              {/* Agent config */}
              <div>
                <MetaLabel className="mb-1 flex">Agent</MetaLabel>
                <div className="divide-y divide-zaki border border-zaki-strong rounded-zaki-xl bg-zaki-raised px-3 dark:bg-[#1a1714]">
                  <Row label="Message timeout" value={data.agent_message_timeout_secs ? `${data.agent_message_timeout_secs}s` : null} />
                  <Row label="Provider retries" value={data.provider_retries} />
                  <Row label="Fallback providers" value={data.fallback_provider_count} />
                </div>
              </div>

              {/* Features */}
              <div>
                <MetaLabel className="mb-1 flex">Memory</MetaLabel>
                <div className="divide-y divide-zaki border border-zaki-strong rounded-zaki-xl bg-zaki-raised px-3 dark:bg-[#1a1714]">
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
                  <MetaLabel className="mb-1 flex">Gateway</MetaLabel>
                  <div className="divide-y divide-zaki border border-zaki-strong rounded-zaki-xl bg-zaki-raised px-3 dark:bg-[#1a1714]">
                    <Row label="Total requests" value={data.gateway.requests_total?.toLocaleString()} mono />
                    <Row label="In-flight" value={data.gateway.in_flight_requests} mono />
                    <Row
                      label="Draining"
                      value={data.gateway.draining ? "yes" : "no"}
                    />
                  </div>
                </div>
              )}

              {lastFetched && (
                <div className="pt-2 text-center font-mono-ui text-[10px] text-zaki-muted">
                  Updated {new Date(lastFetched).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
      </div>
    </SheetShell>
  );
}
