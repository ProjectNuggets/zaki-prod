import { buildAnonymousWorkTitle, upsertAnonymousWorkItem } from "./anonymousWork";
import { writePendingIntent } from "./pendingIntent";

/**
 * WP-F — the anonymous Agent plan preview, browser side.
 *
 * This module owns exactly one hard requirement: when the visitor clicks "Save and continue",
 * the plan they are looking at must SURVIVE the trip through signup and land in their account.
 *
 * That is not automatic. #89's claim has a deliberate rule: a DRAFT with no result imports
 * NOTHING. `buildClaimTurns` requires a prompt AND an assistant reply, because importing a
 * lone user turn would leave someone staring at their own question with no answer — the exact
 * empty-thread bug #89 fixed. The dashboard writes `status: "draft"` with an empty `reply` when
 * a prompt is typed, and a draft is correctly un-importable.
 *
 * A generated plan is NOT a draft. It is a real result the visitor read and asked us to keep.
 * So `saveAgentPlanForClaim` promotes the ledger row: `status: "succeeded"` with the plan
 * rendered into `reply`. That single field is what makes the claim import it instead of
 * silently dropping it — and it is why the plan text lives in the ledger rather than only on
 * screen (anonymous turns are never persisted server-side; the browser copy is the only one
 * that exists).
 *
 * It reuses the SAME ledger and the SAME pending-intent plumbing Spaces uses. There is no
 * parallel agent claim path.
 */

export type AgentPlanPreview = {
  prompt: string;
  steps: string[];
  /** The plan rendered as markdown by the BFF — the exact text imported on claim. */
  planMarkdown: string;
};

export const AGENT_PLAN_TASK_KIND = "plan";
export const AGENT_PLAN_ROUTE = "/agent";

/**
 * Render the plan as the assistant reply carried into the account.
 *
 * The BFF already returns `planMarkdown`; this is the fallback for when it does not (an older
 * BFF, a trimmed payload), so "Save and continue" can never write a ledger row with an empty
 * `reply` — which would silently degrade the row back into an un-importable draft.
 */
export function renderAgentPlanMarkdown(plan: {
  prompt: string;
  steps: string[];
}): string {
  const list = plan.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return [
    "**Agent plan (preview)**",
    plan.prompt ? `\nTask: ${plan.prompt}` : "",
    list ? `\n${list}` : "",
    "\n_This plan was previewed while signed out. Nothing was run._",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * Persist the plan for the post-signup claim, and return the ledger id.
 *
 * Writes BOTH halves of the existing handoff, exactly as the Spaces lane does:
 *   1. the anonymous work ledger row — `status: "succeeded"` + the plan as `reply`, which is
 *      what makes #89's claim import it rather than treat it as a draft with nothing to keep;
 *   2. the pending intent — so the claim knows which ledger row this handoff refers to.
 *
 * Returns null when there is nothing worth saving (no prompt, or a plan with no steps). A
 * plan with no steps is not a result, and we do not pretend otherwise.
 */
export function saveAgentPlanForClaim(plan: AgentPlanPreview): string | null {
  const prompt = plan.prompt.trim();
  const steps = plan.steps.filter((step) => step.trim().length > 0);
  if (!prompt || steps.length === 0) return null;

  const reply =
    plan.planMarkdown?.trim() || renderAgentPlanMarkdown({ prompt, steps });
  if (!reply) return null;

  const item = upsertAnonymousWorkItem({
    productId: "agent",
    taskKind: AGENT_PLAN_TASK_KIND,
    prompt,
    // THE field that makes this claimable. An empty `reply` here is a draft, and #89 imports
    // nothing for a draft — the plan would be lost at exactly the moment we promised to keep it.
    reply,
    replyPreview: steps.join(" · "),
    route: AGENT_PLAN_ROUTE,
    title: buildAnonymousWorkTitle(prompt),
    // "succeeded", not "draft": the visitor got a real result and asked us to keep it.
    status: "succeeded",
  });
  if (!item) return null;

  writePendingIntent({
    productId: "agent",
    taskKind: AGENT_PLAN_TASK_KIND,
    prompt,
    source: "agent_preview",
    returnTo: AGENT_PLAN_ROUTE,
    anonymousWorkId: item.id,
  });

  return item.id;
}
