import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BotSandboxBackend } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ZakiRuntimeSandbox } from "@/stores/zakiSessionUiStore";

const BACKEND_LABEL: Record<BotSandboxBackend, string> = {
  bubblewrap: "bwrap",
  firejail: "firejail",
  docker: "docker",
};

export function SandboxBadge({
  active,
  sandbox,
  className,
}: {
  active: boolean;
  sandbox: ZakiRuntimeSandbox | null;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!active || !sandbox || !sandbox.enabled) return null;

  const backendLabel = sandbox.backend ? BACKEND_LABEL[sandbox.backend] ?? sandbox.backend : null;
  const labelText = backendLabel
    ? t("zakiControls.sandbox.activeWithBackend", { backend: backendLabel })
    : t("zakiControls.sandbox.active");

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
