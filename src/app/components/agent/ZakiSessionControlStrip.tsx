import { Loader2, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SandboxBadge } from "@/app/components/agent/SandboxBadge";
import type { AgentSessionMode } from "@/lib/api";
import type { ZakiContextPressureState, ZakiRuntimeSandbox } from "@/stores/zakiSessionUiStore";
import { cn } from "@/lib/utils";

const MODES: AgentSessionMode[] = ["plan", "execute", "review"];

function contextTone(state: ZakiContextPressureState) {
  if (state === "near_limit") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300";
  }
  if (state === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300";
  }
  return "border-zaki-strong bg-zaki-elevated text-zaki-secondary dark:bg-[#141210]";
}

export function ZakiSessionControlStrip({
  active,
  mode,
  onChangeMode,
  modePending = false,
  approvalCount,
  channelLabel,
  contextPressurePercent,
  contextPressureState,
  sandbox,
  onOpenControls,
}: {
  active: boolean;
  mode: AgentSessionMode;
  onChangeMode: (mode: AgentSessionMode) => void | Promise<void>;
  modePending?: boolean;
  approvalCount: number;
  channelLabel: string | null;
  contextPressurePercent: number | null;
  contextPressureState: ZakiContextPressureState;
  sandbox: ZakiRuntimeSandbox | null;
  onOpenControls: () => void;
}) {
  const { t } = useTranslation();
  const approvalLabel = t("zakiControls.strip.approvals", { count: approvalCount });

  return (
    <div className="mx-auto mb-3 flex w-full max-w-3xl flex-wrap items-center gap-2 px-4">
      <div className="inline-flex items-center gap-1 rounded-full border border-zaki-strong bg-zaki-raised p-1 dark:bg-[#141210]">
        {MODES.map((candidate) => {
          const selected = candidate === mode;
          return (
            <button
              key={candidate}
              type="button"
              onClick={() => onChangeMode(candidate)}
              disabled={modePending}
              data-testid={`zaki-session-mode-${candidate}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                selected
                  ? "bg-zaki-brand text-white"
                  : "text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary",
                modePending && "opacity-70"
              )}
              aria-pressed={selected}
            >
              {t(`zakiControls.modes.${candidate}`)}
            </button>
          );
        })}
      </div>

      {approvalCount > 0 ? (
        <button
          type="button"
          onClick={onOpenControls}
          data-testid="zaki-session-approval-badge"
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-500/15 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300"
        >
          <ShieldAlert className="size-3.5" />
          {approvalLabel}
        </button>
      ) : null}

      {channelLabel ? (
        <div className="inline-flex items-center rounded-full border border-zaki-strong bg-zaki-elevated px-2.5 py-1 text-[11px] font-medium text-zaki-secondary dark:bg-[#141210]">
          {channelLabel}
        </div>
      ) : null}

      {contextPressureState ? (
        <div
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
            contextTone(contextPressureState)
          )}
        >
          {t("zakiControls.strip.context")}
          {typeof contextPressurePercent === "number" ? ` ${Math.round(contextPressurePercent)}%` : ""}
        </div>
      ) : null}

      <SandboxBadge active={active} sandbox={sandbox} className="ml-auto" />

      <button
        type="button"
        onClick={onOpenControls}
        data-testid="zaki-session-open-controls"
        className="inline-flex items-center gap-1.5 rounded-full border border-zaki-strong bg-zaki-raised px-3 py-1.5 text-xs font-medium text-zaki-primary transition-colors hover:bg-zaki-hover dark:bg-[#141210]"
      >
        {modePending ? <Loader2 className="size-3.5 animate-spin" /> : <SlidersHorizontal className="size-3.5" />}
        {t("zakiControls.common.controls")}
      </button>
    </div>
  );
}
