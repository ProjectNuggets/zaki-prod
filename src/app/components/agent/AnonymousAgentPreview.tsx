import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, ListChecks, Eye } from "lucide-react";
import { requestAnonymousAgentPreview } from "@/lib/api";
import { PaywallCard, classifyBillingDenial, type PaywallState } from "../PaywallCard";
import { resolveUserFacingError, codeFromHttpStatus } from "@/lib/userFacingErrors";
import { saveAgentPlanForClaim, type AgentPlanPreview } from "@/lib/agentPlanPreview";
import { readPendingIntent } from "@/lib/pendingIntent";

/**
 * WP-F — the anonymous Agent surface (spec flow F7).
 *
 * "Anon Agent — type -> 'preview' plan -> 'Save and continue' -> auth."
 *
 * This is what an anonymous visitor gets at /agent. It is NOT the authenticated Agent
 * workbench (ChatArea's agent surface), and that separation is deliberate: the workbench
 * provisions sessions, streams from the agent engine, and drives tools. An anonymous visitor
 * must reach none of it, so they are never routed into it — they land here instead, and this
 * component talks to exactly one endpoint (`/api/anonymous/agent/preview`) which cannot execute.
 *
 * What the visitor sees: the PLAN the agent would follow, framed unmistakably as a preview,
 * with one door forward — an account. Nothing on this surface runs anything.
 */

type PreviewStatus = "idle" | "running" | "ready" | "error" | "limit";

type LimitInfo = {
  state: PaywallState;
  limit: number | null;
  used: number | null;
  resetAt: string | null;
  message: string;
};

export function AnonymousAgentPreview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [plan, setPlan] = useState<AgentPlanPreview | null>(null);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaLimit, setQuotaLimit] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<string>("");
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);

  // A deep link from the dashboard carries the typed prompt in the pending intent, so the
  // visitor's words survive the navigation. The intent is left in place — it is the same
  // record the claim reads after signup.
  useEffect(() => {
    const intent = readPendingIntent();
    if (intent?.productId === "agent" && intent.prompt) {
      setPrompt((current) => current || intent.prompt);
    }
  }, []);

  const goToAuth = useCallback(
    (mode: "login" | "signup") => {
      navigate(`/?auth=${mode}&next=${encodeURIComponent("/agent")}`);
    },
    [navigate]
  );

  const runPreview = useCallback(
    async (task: string) => {
      const trimmed = task.trim();
      if (!trimmed || status === "running") return;

      setStatus("running");
      setErrorCode("");
      setLimitInfo(null);

      try {
        const { response, data } = await requestAnonymousAgentPreview(trimmed);

        // The daily cap. WP-B/WP-C (#91) made this a REAL limit state — a card that names the
        // limit, shows the reset, keeps the prompt and offers one way forward. Never a toast.
        //
        // Note the gate: a 429 is only the LIMIT state when the backend's code says so
        // (daily_limit_reached / weekly_limit_reached / quota_exceeded). A bare 429 is the
        // anonymous TURN RATE LIMITER — a visitor clicking twice in a second — which means
        // "slow down", not "you are out of free chats today". Rendering the daily limit state
        // for that would tell them their allowance is gone when it is not, so it falls through
        // to the taxonomy and gets `rate_limited` copy ("wait a few seconds, then retry").
        const denial = classifyBillingDenial(data.code);
        if (response.status === 429 && denial.isPaywall) {
          const limit = typeof data.limit === "number" ? data.limit : null;
          setLimitInfo({
            state: denial.state ?? "limit_reached",
            limit,
            used: limit,
            resetAt: data.resetAt ?? null,
            message: String(data.message || data.error || ""),
          });
          setStatus("limit");
          return;
        }

        if (!response.ok || !data.success || !data.plan?.steps?.length) {
          // WP-C: resolve a CODE, never render one. Fall back to the HTTP status when the
          // body carried none (a proxy error page, a non-JSON body).
          setErrorCode(data.code || codeFromHttpStatus(response.status));
          setStatus("error");
          return;
        }

        setPlan({
          prompt: data.prompt || trimmed,
          steps: data.plan.steps.filter(Boolean),
          planMarkdown: data.planMarkdown || "",
        });
        setQuotaRemaining(
          typeof data.quota?.remaining === "number" ? data.quota.remaining : null
        );
        setQuotaLimit(typeof data.quota?.limit === "number" ? data.quota.limit : null);
        setStatus("ready");
      } catch {
        setErrorCode("network_drop");
        setStatus("error");
      }
    },
    [status]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void runPreview(prompt);
    },
    [prompt, runPreview]
  );

  /**
   * "Save and continue" — the F7 handoff.
   *
   * Writes the plan into the anonymous work ledger as a SUCCEEDED result (with the plan text
   * as the assistant reply) plus the pending intent, then sends the visitor to signup. That is
   * precisely the shape #89's claim imports: a prompt AND a reply. A draft would import
   * nothing, which is why the plan — not just the prompt — is what gets saved.
   */
  const handleSaveAndContinue = useCallback(() => {
    if (!plan) return;
    saveAgentPlanForClaim(plan);
    goToAuth("signup");
  }, [goToAuth, plan]);

  const resolvedError = errorCode ? resolveUserFacingError(errorCode, t) : null;

  return (
    <div className="zaki-agent-preview" data-testid="anon-agent-preview">
      <header className="zaki-agent-preview__head">
        <span className="zaki-agent-preview__kicker">
          <Sparkles className="size-4" aria-hidden="true" />
          {t("agentPreview.kicker", { defaultValue: "Agent preview" })}
        </span>
        <h1>{t("agentPreview.title", { defaultValue: "See the plan before you commit" })}</h1>
        <p>
          {t("agentPreview.subtitle", {
            defaultValue:
              "Describe a task and ZAKI will show you the steps it would take. Nothing runs until you have an account.",
          })}
        </p>
      </header>

      <form className="zaki-agent-preview__composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="anon-agent-prompt">
          {t("agentPreview.inputLabel", { defaultValue: "Describe the task" })}
        </label>
        <textarea
          id="anon-agent-prompt"
          ref={inputRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          maxLength={800}
          placeholder={t("agentPreview.placeholder", {
            defaultValue: "e.g. Research our top 3 competitors and summarise their pricing",
          })}
          disabled={status === "running"}
        />
        <div className="zaki-agent-preview__composer-actions">
          <button
            type="submit"
            className="zaki-agent-preview__submit"
            disabled={!prompt.trim() || status === "running"}
          >
            {status === "running"
              ? t("agentPreview.running", { defaultValue: "Drafting the plan..." })
              : t("agentPreview.submit", { defaultValue: "Preview the plan" })}
          </button>
          {typeof quotaRemaining === "number" && typeof quotaLimit === "number" ? (
            // The SAME anonymous daily counter the dashboard shows and the backend enforces.
            <small
              className="zaki-agent-preview__meter"
              data-testid="anon-agent-preview-meter"
              data-remaining={String(quotaRemaining)}
              data-limit={String(quotaLimit)}
            >
              {t("zakiDashboard.meter.enforcedDaily", {
                remaining: quotaRemaining,
                limit: quotaLimit,
                defaultValue: `${quotaRemaining} of ${quotaLimit} free chats left today`,
              })}
            </small>
          ) : null}
        </div>
      </form>

      {/* The limit state — #91's card, with the anonymous CTA. Not a toast. */}
      {status === "limit" && limitInfo ? (
        <PaywallCard
          state={limitInfo.state}
          identity="anon"
          limitPeriod="day"
          limitUsed={limitInfo.used}
          limitTotal={limitInfo.limit}
          resetAt={limitInfo.resetAt}
          // The typed task is still sitting in the composer — say so.
          promptPreserved={Boolean(prompt.trim())}
          message={limitInfo.message}
          onSignIn={() => goToAuth("login")}
          onSeePlans={() => navigate("/pricing")}
          onDismiss={() => setStatus("idle")}
        />
      ) : null}

      {status === "error" && resolvedError ? (
        <div className="zaki-agent-preview__error" role="alert" data-testid="anon-agent-preview-error">
          <h2>{resolvedError.title}</h2>
          {/* A human sentence, resolved from the taxonomy. Never a machine code. */}
          <p>{resolvedError.body}</p>
          <button type="button" onClick={() => void runPreview(prompt)}>
            {resolvedError.actionLabel}
          </button>
        </div>
      ) : null}

      {status === "ready" && plan ? (
        <section
          className="zaki-agent-preview__plan"
          data-testid="anon-agent-plan-card"
          aria-label={t("agentPreview.planAria", { defaultValue: "Proposed plan preview" })}
        >
          <div className="zaki-agent-preview__plan-head">
            <span className="zaki-agent-preview__plan-kicker">
              <ListChecks className="size-4" aria-hidden="true" />
              {t("agentPreview.planKicker", { defaultValue: "Proposed plan" })}
            </span>
            {/* The framing that keeps this honest: a plan, not a run. */}
            <span className="zaki-agent-preview__plan-badge" data-testid="anon-agent-plan-badge">
              <Eye className="size-3.5" aria-hidden="true" />
              {t("agentPreview.notRunBadge", { defaultValue: "Preview — nothing has been run" })}
            </span>
          </div>

          <p className="zaki-agent-preview__plan-task">{plan.prompt}</p>

          <ol className="zaki-agent-preview__plan-steps">
            {plan.steps.map((step, index) => (
              <li key={`${index}-${step}`} data-testid="anon-agent-plan-step">
                <span aria-hidden="true">{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>

          <footer className="zaki-agent-preview__plan-foot">
            <p>
              {t("agentPreview.saveExplainer", {
                defaultValue:
                  "Save this plan to your account and ZAKI can actually run it for you.",
              })}
            </p>
            <button
              type="button"
              className="zaki-agent-preview__save"
              data-testid="anon-agent-save-continue"
              onClick={handleSaveAndContinue}
            >
              {t("agentPreview.saveAndContinue", { defaultValue: "Save and continue" })}
            </button>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
