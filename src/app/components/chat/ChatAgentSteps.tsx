import { FileText, Globe2, Loader2, Search, Sparkles } from "lucide-react";
import type { AgentStep, AgentStepKind } from "./rendering/agentThoughtSteps";

/**
 * Compact, collapsible "the agent is working" disclosure for the NORMAL Spaces
 * chat (single always-agent mode). It sits just above the assistant bubble and
 * surfaces the auto-decided tool steps (web search, scraping, file creation,
 * document lookup) that the engine streams via `agentThought` events.
 *
 * This is deliberately unobtrusive and self-contained. It reuses the visual
 * language of {@link ./BotToolCallBlock} (the `<details>` disclosure + zaki
 * surface classes) but is much smaller. The separate nullALIS agent space has
 * its own rich rail and must NOT use this component.
 *
 * Renders NOTHING when there are no steps and the turn isn't running.
 */

interface ChatAgentStepsProps {
  steps: AgentStep[];
  running: boolean;
}

function StepIcon({ kind }: { kind: AgentStepKind }) {
  const className = "size-3.5 shrink-0 text-zaki-muted";
  switch (kind) {
    case "search":
      return <Search className={className} aria-hidden />;
    case "scrape":
      return <Globe2 className={className} aria-hidden />;
    case "file":
      return <FileText className={className} aria-hidden />;
    case "docs":
      return <Search className={className} aria-hidden />;
    case "thought":
    default:
      return <Sparkles className={className} aria-hidden />;
  }
}

export function ChatAgentSteps({ steps, running }: ChatAgentStepsProps) {
  if (steps.length === 0 && !running) {
    return null;
  }

  const headerLabel = running ? "Working…" : `Agent steps (${steps.length})`;

  return (
    <details
      className="max-w-[80%] rounded-[2px] border border-zaki bg-zaki-raised px-3 py-2 text-xs dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210]"
      open={running}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-zaki-secondary">
        {running ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-zaki-muted" aria-hidden />
        ) : (
          <Sparkles className="size-3.5 shrink-0 text-zaki-muted" aria-hidden />
        )}
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-zaki-muted">
          agent
        </span>
        <span className="font-semibold text-zaki-primary">{headerLabel}</span>
      </summary>
      {steps.length > 0 ? (
        <ul className="mt-2 space-y-1.5 rounded-[2px] border border-zaki bg-zaki-elevated p-2 dark:border-[rgba(240,236,230,0.08)] dark:bg-[#1a1714]">
          {steps.map((step, index) => (
            <li
              key={`${step.kind}-${index}`}
              className="flex items-center gap-2 text-[11px] text-zaki-secondary"
            >
              <StepIcon kind={step.kind} />
              <span className="truncate">{step.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}
