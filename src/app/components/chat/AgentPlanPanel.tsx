import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Circle, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fetchAgentSessionPlan,
  fetchAgentSessionTodos,
  type AgentSessionPlanResponse,
  type AgentSessionTodosResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { NullalisTaskItem, NullalisTranscriptEntry } from "./BotStatusRail";
import {
  buildAgentPlanPanelModel,
  type AgentPlanPanelStep,
  type AgentPlanStepState,
} from "./AgentPlanPanelModel";

const PLAN_POLL_INTERVAL_MS = 5_000;
const PLAN_READ_TIMEOUT_MS = 10_000;
const MAX_PLAN_POLLS_PER_RUN = 24;
const AGENT_READ_SUPPORT_HEADER = "X-Zaki-Agent-Read-Support";

type ActivePlanRequest = {
  sessionKey: string;
  generation: number;
  controller: AbortController;
  promise: Promise<void>;
};

export type AgentPlanPanelProps = {
  sessionKey: string | null;
  transcriptEntries: NullalisTranscriptEntry[];
  tasks: NullalisTaskItem[];
  isStreaming: boolean;
  isOnline: boolean;
  onRetryStep?: (step: AgentPlanPanelStep) => void | Promise<void>;
};

function StepStateIcon({ state }: { state: AgentPlanStepState }) {
  if (state === "done") return <Check className="size-3" aria-hidden />;
  if (state === "running") return <Loader2 className="size-3 animate-spin" aria-hidden />;
  if (state === "failed" || state === "blocked") {
    return <AlertTriangle className="size-3" aria-hidden />;
  }
  return <Circle className="size-2.5" aria-hidden />;
}

export function AgentPlanPanel({
  sessionKey,
  transcriptEntries,
  tasks,
  isStreaming,
  isOnline,
  onRetryStep,
}: AgentPlanPanelProps) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<AgentSessionPlanResponse | null>(null);
  const [todos, setTodos] = useState<AgentSessionTodosResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionKey));
  const [planUnavailable, setPlanUnavailable] = useState(false);
  const [confirmRetryId, setConfirmRetryId] = useState<string | null>(null);
  const [retryBusyId, setRetryBusyId] = useState<string | null>(null);
  const [retryFailedId, setRetryFailedId] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState<{
    step: AgentPlanPanelStep;
    state: "starting" | "failed";
  } | null>(null);
  const sessionGenerationRef = useRef(0);
  const activeRequestRef = useRef<ActivePlanRequest | null>(null);
  const pollCountRef = useRef(0);
  const unsupportedReadsRef = useRef(new Set<"plan" | "todos">());

  const allReadsUnsupported = useCallback(
    () => unsupportedReadsRef.current.has("plan") && unsupportedReadsRef.current.has("todos"),
    []
  );

  const loadPlan = useCallback((showLoading = true): Promise<void> => {
    if (!sessionKey) {
      setPlan(null);
      setTodos(null);
      setLoading(false);
      setPlanUnavailable(false);
      return Promise.resolve();
    }
    if (allReadsUnsupported()) {
      setLoading(false);
      setPlanUnavailable(false);
      return Promise.resolve();
    }

    const existing = activeRequestRef.current;
    if (existing?.sessionKey === sessionKey) return existing.promise;

    const generation = sessionGenerationRef.current;
    if (showLoading) setLoading(true);
    const request = {} as ActivePlanRequest;
    request.sessionKey = sessionKey;
    request.generation = generation;
    request.controller = new AbortController();
    const timeout = window.setTimeout(() => request.controller.abort(), PLAN_READ_TIMEOUT_MS);
    request.promise = (async () => {
      const skipPlan = unsupportedReadsRef.current.has("plan");
      const skipTodos = unsupportedReadsRef.current.has("todos");
      const [planResult, todosResult] = await Promise.allSettled([
        skipPlan
          ? Promise.resolve(null)
          : fetchAgentSessionPlan(sessionKey, { signal: request.controller.signal }),
        skipTodos
          ? Promise.resolve(null)
          : fetchAgentSessionTodos(sessionKey, { signal: request.controller.signal }),
      ]);
      if (generation !== sessionGenerationRef.current) return;

      const planFailed =
        !skipPlan &&
        (planResult.status !== "fulfilled" || !planResult.value?.response.ok);
      if (!skipPlan && !planFailed && planResult.status === "fulfilled" && planResult.value) {
        setPlan(planResult.value.data);
        if (planResult.value.response.headers?.get(AGENT_READ_SUPPORT_HEADER) === "unsupported") {
          unsupportedReadsRef.current.add("plan");
        }
      } else if (!skipPlan) {
        setPlan(null);
      }
      if (!skipTodos && todosResult.status === "fulfilled" && todosResult.value?.response.ok) {
        setTodos(todosResult.value.data);
        if (todosResult.value.response.headers?.get(AGENT_READ_SUPPORT_HEADER) === "unsupported") {
          unsupportedReadsRef.current.add("todos");
        }
      } else if (!skipTodos) {
        setTodos(null);
      }
      setPlanUnavailable(planFailed);
    })().finally(() => {
      window.clearTimeout(timeout);
      if (activeRequestRef.current === request) activeRequestRef.current = null;
      if (generation === sessionGenerationRef.current) setLoading(false);
    });
    activeRequestRef.current = request;
    return request.promise;
  }, [allReadsUnsupported, sessionKey]);

  useEffect(() => {
    sessionGenerationRef.current += 1;
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    pollCountRef.current = 0;
    setPlan(null);
    setTodos(null);
    setLoading(Boolean(sessionKey));
    setPlanUnavailable(false);
    setConfirmRetryId(null);
    setRetryFailedId(null);
    setRetryAttempt(null);
    void loadPlan(true);
    return () => {
      sessionGenerationRef.current += 1;
      const activeRequest = activeRequestRef.current;
      activeRequest?.controller.abort();
      if (activeRequestRef.current === activeRequest) activeRequestRef.current = null;
    };
  }, [loadPlan]);

  useEffect(() => {
    if (!sessionKey || !isStreaming) return;
    pollCountRef.current = 0;
    let cancelled = false;
    let timer: number | null = null;
    const scheduleNextPoll = () => {
      if (cancelled || allReadsUnsupported() || pollCountRef.current >= MAX_PLAN_POLLS_PER_RUN) return;
      timer = window.setTimeout(async () => {
        if (cancelled || allReadsUnsupported()) return;
        pollCountRef.current += 1;
        await loadPlan(false);
        scheduleNextPoll();
      }, PLAN_POLL_INTERVAL_MS);
    };
    void loadPlan(false).finally(scheduleNextPoll);
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [allReadsUnsupported, isStreaming, loadPlan, sessionKey]);

  const model = useMemo(
    () => buildAgentPlanPanelModel({ plan, todos, transcriptEntries, tasks, isStreaming }),
    [isStreaming, plan, tasks, todos, transcriptEntries]
  );
  const progressPercent = model.totalSteps
    ? Math.round((model.completedSteps / model.totalSteps) * 100)
    : 0;

  const sourceLabel = {
    backend: t("zakiAgent.planPanel.sources.backend", { defaultValue: "saved plan" }),
    live: t("zakiAgent.planPanel.sources.live", { defaultValue: "live run" }),
    checklist: t("zakiAgent.planPanel.sources.checklist", { defaultValue: "saved checklist" }),
    tasks: t("zakiAgent.planPanel.sources.tasks", { defaultValue: "active tasks" }),
    idle: t("zakiAgent.planPanel.sources.idle", { defaultValue: "idle" }),
  }[model.source];

  const stateLabel = (state: AgentPlanStepState) =>
    t(`zakiAgent.planPanel.states.${state}`, {
      defaultValue: {
        queued: "queued",
        running: "working",
        done: "done",
        failed: "failed",
        blocked: "blocked",
      }[state],
    });

  const handleRetry = async (step: AgentPlanPanelStep) => {
    if (!onRetryStep || isStreaming || !isOnline || retryBusyId) return;
    setRetryBusyId(step.id);
    setRetryFailedId(null);
    setRetryAttempt({ step, state: "starting" });
    try {
      await onRetryStep(step);
      setConfirmRetryId(null);
      setRetryAttempt(null);
    } catch {
      setRetryFailedId(step.id);
      setRetryAttempt({ step, state: "failed" });
    } finally {
      setRetryBusyId(null);
    }
  };

  return (
    <section className="zaki-agent-plan" aria-label={t("zakiAgent.planPanel.label", { defaultValue: "Run plan" })}>
      <div className="zaki-agent-plan__head">
        <div>
          <div className="zaki-agent-plan__title">
            {t("zakiAgent.planPanel.title", { defaultValue: "current plan" })}
          </div>
          <div className="zaki-agent-plan__source">
            {sourceLabel}
            {planUnavailable && model.steps.length
              ? ` · ${t("zakiAgent.planPanel.syncUnavailable", {
                  defaultValue: "plan sync unavailable",
                })}`
              : ""}
            {model.revision != null
              ? ` · ${t("zakiAgent.planPanel.revision", {
                  defaultValue: "revision {{revision}}",
                  revision: model.revision,
                })}`
              : ""}
          </div>
        </div>
        {model.totalSteps ? (
          <div className="zaki-agent-plan__progress" aria-label={t("zakiAgent.planPanel.progressLabel", {
            defaultValue: "{{completed}} of {{total}} steps complete",
            completed: model.completedSteps,
            total: model.totalSteps,
          })}>
            <span className="zaki-agent-plan__bar" aria-hidden>
              <span style={{ width: `${progressPercent}%` }} />
            </span>
            <strong>{model.completedSteps} / {model.totalSteps}</strong>
          </div>
        ) : null}
      </div>

      {model.objective ? <p className="zaki-agent-plan__objective">{model.objective}</p> : null}

      {model.steps.length ? (
        <ol className="zaki-agent-plan__list">
          {model.steps.map((step) => {
            const retryDisabled = !onRetryStep || isStreaming || !isOnline || Boolean(retryBusyId);
            const confirming = confirmRetryId === step.id;
            const displayTitle = step.title || t("zakiAgent.planPanel.stepFallback", {
              defaultValue: "Step {{index}}",
              index: step.index,
            });
            return (
              <li
                key={step.id}
                className={cn("zaki-agent-plan__step", `is-${step.state}`)}
                data-state={step.state}
                data-testid={`agent-plan-step-${step.index}`}
              >
                <span className="zaki-agent-plan__mark" aria-hidden>
                  <StepStateIcon state={step.state} />
                </span>
                <div className="zaki-agent-plan__step-body">
                  <div className="zaki-agent-plan__step-title">{displayTitle}</div>
                  <div className="zaki-agent-plan__step-meta">
                    <span>{stateLabel(step.state)}</span>
                    {step.tool ? <span className="is-tool">{step.tool}</span> : null}
                    {step.summary ? <span>{step.summary}</span> : null}
                  </div>

                  {step.state === "failed" ? (
                    <div className="zaki-agent-plan__failure" role="status">
                      <p>{t("zakiAgent.planPanel.failedBody", { defaultValue: "This step did not finish." })}</p>
                      <button
                        type="button"
                        onClick={() => setConfirmRetryId(confirming ? null : step.id)}
                        disabled={retryDisabled}
                        title={
                          isStreaming
                            ? t("zakiAgent.planPanel.retryAfterRun", { defaultValue: "Retry after the current run finishes." })
                            : !isOnline
                              ? t("zakiAgent.planPanel.retryOffline", { defaultValue: "Reconnect to retry this step." })
                              : undefined
                        }
                      >
                        <RotateCcw className="size-3" aria-hidden />
                        {t("zakiAgent.planPanel.retry", { defaultValue: "Retry from here" })}
                      </button>
                      {confirming ? (
                        <div className="zaki-agent-plan__retry-confirm">
                          <p>
                            {t("zakiAgent.planPanel.retryDisclosure", {
                              defaultValue: "This starts a new visible Agent turn. It does not silently replay the original tool call.",
                            })}
                          </p>
                          <div>
                            <button
                              type="button"
                              onClick={() => void handleRetry({ ...step, title: displayTitle })}
                              disabled={retryDisabled}
                            >
                              {retryBusyId === step.id
                                ? t("zakiAgent.planPanel.retryStarting", { defaultValue: "Starting…" })
                                : t("zakiAgent.planPanel.retryConfirm", { defaultValue: "Start retry" })}
                            </button>
                            <button type="button" onClick={() => setConfirmRetryId(null)} disabled={Boolean(retryBusyId)}>
                              {t("common.cancel", { defaultValue: "Cancel" })}
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {retryFailedId === step.id ? (
                        <p className="zaki-agent-plan__retry-error">
                          {t("zakiAgent.planPanel.retryFailed", {
                            defaultValue: "Retry could not start. The current run was not changed.",
                          })}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : loading ? (
        <div className="zaki-agent-plan__empty" role="status">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {t("zakiAgent.planPanel.loading", { defaultValue: "Loading run plan…" })}
        </div>
      ) : planUnavailable ? (
        <div className="zaki-agent-plan__empty is-error" role="status">
          <AlertTriangle className="size-3.5" aria-hidden />
          <div>
            <strong>{t("zakiAgent.planPanel.unavailable", { defaultValue: "Run plan unavailable." })}</strong>
            <span>{t("zakiAgent.planPanel.unavailableBody", { defaultValue: "Your conversation is still available." })}</span>
          </div>
          <button type="button" onClick={() => void loadPlan(true)} aria-label={t("zakiAgent.planPanel.refresh", { defaultValue: "Refresh plan" })}>
            <RefreshCw className="size-3" aria-hidden />
            {t("zakiAgent.planPanel.refreshShort", { defaultValue: "Refresh" })}
          </button>
        </div>
      ) : (
        <div className="zaki-agent-plan__empty" role="status">
          <Circle className="size-3" aria-hidden />
          <div>
            <strong>{t("zakiAgent.planPanel.idle", { defaultValue: "No run plan yet." })}</strong>
            <span>
              {t("zakiAgent.planPanel.idleBody", {
                defaultValue: "Plans appear when Agent breaks work into multiple steps.",
              })}
            </span>
          </div>
        </div>
      )}
      {retryAttempt && !model.steps.some(
        (step) => step.id === retryAttempt.step.id && step.state === "failed"
      ) ? (
        <div className="zaki-agent-plan__empty is-error" role="status">
          {retryAttempt.state === "starting" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <AlertTriangle className="size-3.5" aria-hidden />
          )}
          <div>
            <strong>{retryAttempt.step.title}</strong>
            <span>
              {retryAttempt.state === "starting"
                ? t("zakiAgent.planPanel.retryStarting", { defaultValue: "Starting…" })
                : t("zakiAgent.planPanel.retryFailed", {
                    defaultValue: "Retry could not start. The current run was not changed.",
                  })}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
