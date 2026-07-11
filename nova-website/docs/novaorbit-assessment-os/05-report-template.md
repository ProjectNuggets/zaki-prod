# 05 - Report Template

The NovaOrbit report must work for two audiences:

- Board and C-level: clear decision, maturity stage, commercial path.
- CTO/CIO and operators: evidence, gates, blockers, architecture implications.

The report should feel like a standard, not a deck of opinions.

## Report Title

`NovaOrbit Assessment Readout`

Subtitle:

`Where AI can work, what it should do, and how [Client] captures impact.`

## Page Structure

### 1. Executive Decision Page

Purpose:

Give leadership the decision in one page.

Content:

- Current maturity stage.
- One-sentence diagnosis.
- First workflow recommendation.
- Deployment direction.
- Top red gates.
- Recommended next step.

Template:

`[Client] is currently Stage [N]: [Stage Name]. The strongest first workflow is [workflow], because [business reason]. The recommended deployment path is [deployment], with [owner] accountable for [metric]. Stage [next stage] is blocked by [red gates].`

### 2. Maturity Scorecard

Content:

| Dimension | Score | Stage Signal | Confidence | Key Blocker | Next Action |
| --- | ---: | --- | --- | --- | --- |
| Where: Infrastructure & Access |  |  |  |  |  |
| What: Applications & Agents |  |  |  |  |  |
| How: Operations & Impact |  |  |  |  |  |

Include:

- Overall stage.
- Red-gate cap.
- Evidence confidence.

### 3. Red-Gate Review

Content:

| Red Gate | Status | Why It Matters | Required Action | Owner |
| --- | --- | --- | --- | --- |
| No access, no AI | Open / Closed |  |  |  |
| No workflow, no agent | Open / Closed |  |  |  |
| No owner, no impact | Open / Closed |  |  |  |
| No evidence, no scale | Open / Closed |  |  |  |
| No reliability, no autonomy | Open / Closed |  |  |  |

Rule:

Do not soften open red gates. They are what make the framework credible.

### 4. Where: Infrastructure & Access

Content:

- Deployment boundary diagnosis.
- Inference readiness.
- Access readiness.
- Control plane readiness.
- System map.
- Open access questions.
- Recommended deployment path.

Minimum diagram:

`Source systems -> Access layer -> AI runtime -> App/agent surface -> Logs/evidence`

Output:

`[Client] can/cannot support the first workflow on the current stack because [reason]. The required infrastructure actions are [actions].`

### 5. What: Applications & Agents

Content:

- Workflow candidates.
- Selected first workflow.
- Agent/app role.
- App surface.
- Integration depth.
- Human approval points.
- Reliability and evaluation requirements.

Agent role template:

| Field | Definition |
| --- | --- |
| Agent/app name |  |
| Workflow |  |
| Users |  |
| Inputs |  |
| Outputs |  |
| Tools/systems |  |
| Memory/context |  |
| Allowed actions |  |
| Forbidden actions |  |
| Human approvals |  |
| Quality checks |  |
| Fallback path |  |

### 6. How: Operations & Impact

Content:

- Executive sponsor.
- Workflow owner.
- IT/security owner.
- Approval owner.
- Baseline metric.
- ROI model.
- Governance model.
- Run model.
- Adoption and training assumptions.

Business case table:

| Workflow | Conservative Value | Expected Value | Confidence | Main Assumption |
| --- | ---: | ---: | --- | --- |
|  |  |  |  |  |

### 7. First Workflow Recommendation

Content:

- Why this workflow first.
- Why other candidates were not chosen.
- What must be true before build.
- Scope boundaries.
- Target outcome.
- Implementation complexity.
- Risk/control complexity.

Template:

`The recommended first workflow is [workflow]. It is the strongest first build because it has [owner], [value signal], [access path], and [control path]. It should start with [read-only / approved action / writeback] integration and mature toward [future state].`

### 8. 90-Day Execution Path

Use a 30/60/90 structure.

| Period | Objective | Actions | Evidence Produced |
| --- | --- | --- | --- |
| Days 0-30 | Confirm build foundation |  |  |
| Days 31-60 | Build and validate first workflow |  |  |
| Days 61-90 | Launch, measure, and decide scale |  |  |

### 9. Commercial Next Step

Content:

- Recommended service path.
- First workflow build estimate or proposal direction.
- Managed-agent/run support option.
- Decision required from client.

Template:

`Based on this assessment, Nova Nuggets recommends [First Workflow SOW / deeper In-Depth diagnostic / governance sprint / deployment validation] as the next commercial step.`

### 10. Technical Appendix

Required for In-Depth. Optional for Standard.

Content:

- Source-system map.
- API/MCP/export/database notes.
- Data boundary.
- Deployment option comparison.
- Identity and access assumptions.
- Logging and audit assumptions.
- Reliability and evaluation plan.
- Open technical risks.

### 11. Evidence Appendix

Content:

- Interviews completed.
- Artifacts reviewed.
- Evidence confidence by gate.
- Assumptions.
- Open questions.

## Readout Rules

The readout must be direct:

- Name the stage.
- Name the red gates.
- Name the first workflow.
- Name what not to build yet.
- Name the owner and next decision.

Avoid:

- "AI transformation journey" without workflow specificity.
- Generic heatmaps without actions.
- Vendor-neutral language that ignores Nova Nuggets' ability to build and run.
- Overpromising ROI.

## Board Summary Template

`NovaOrbit assessed [Client] across Where, What, and How. [Client] currently shows a Stage [N] maturity signal: [stage name]. The strongest first workflow is [workflow], expected to improve [metric] through [agent/app]. The recommended deployment path is [deployment]. The critical blockers are [red gates]. The next decision is [decision].`

## CTO Summary Template

`The first workflow requires access to [systems] through [API/export/MCP/database/file path]. The recommended runtime is [deployment] due to [data/latency/security reason]. The agent/app should start at [integration depth] with [approval model]. The implementation risk is [risk] until [technical blocker] is resolved.`

## CFO Summary Template

`The conservative value case is [amount/range] based on [baseline]. The expected case is [amount/range] if [adoption/control/access assumptions] are met. Value should be tracked through [metric] owned by [owner].`
