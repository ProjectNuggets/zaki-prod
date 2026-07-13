# 03 - Evidence Checklist

This checklist defines what evidence can support NovaOrbit scoring.

Evidence quality matters. A confident score requires more than interviews.

## Evidence Confidence

| Confidence | Meaning |
| --- | --- |
| Low | Interview statement only, no artifact, owner, or example. |
| Medium | Artifact or example exists, but is incomplete, outdated, or not tied to an owner. |
| High | Artifact is current, owner is named, and it directly supports the gate score. |

If a score is high but evidence confidence is low, the report must flag it as an assumption.

## Evidence Handling Rules

- Do not request production credentials, API keys, passwords, secrets, customer personal data, or sensitive exports.
- Prefer redacted screenshots, architecture diagrams, policy excerpts, sample records, synthetic examples, and access descriptions.
- If sensitive evidence is required, document the required legal/security path before asking for it.
- Treat all client artifacts as confidential unless explicitly approved for public use.

## Global Evidence Request List

Request what exists. Do not force clients to produce documents just to satisfy the assessment.

Core:

- Organization chart or stakeholder list.
- Current AI tools in use.
- Target departments and workflow candidates.
- Existing AI policy or acceptable use guidance.
- Current technology stack overview.
- Data/source-system inventory.
- Security and identity overview.
- Current cloud/on-prem posture.
- Examples of current workflow artifacts.
- Baseline metrics or proxy data.
- Existing automation, RPA, analytics, or integration history.

For In-Depth:

- API documentation or system integration notes.
- MCP-compatible interface notes, if any.
- Permission model and role descriptions.
- Cloud/network architecture summary.
- Logging, monitoring, and audit requirements.
- Data classification policy.
- Sample workflow records, redacted.
- Finance-approved cost or value assumptions.
- Current process map or SOPs.
- Support/runbook documentation.

## Gate Evidence Checklist

### W1 - Deployment Boundary

Accepted evidence:

- Cloud/on-prem architecture overview.
- Data residency requirements.
- Security policy.
- Network or VPC boundary description.
- Vendor/security questionnaire.
- Named IT/cloud owner.
- Current infrastructure diagram.

Red flags:

- "We can decide deployment later."
- No one owns cloud or on-prem decisions.
- Sensitive data is involved but boundary is undefined.
- Customer contracts restrict data processing but no one has reviewed them.

### W2 - Inference Readiness

Accepted evidence:

- Expected workflow volume.
- User count.
- Latency expectation.
- Cost envelope.
- Data sensitivity classification.
- Model/vendor constraints.
- Local inference requirement.
- GPU/server constraint.

Red flags:

- Model selected before workload is defined.
- No estimate of usage volume.
- Latency or cost ignored.
- Sensitive data planned for unmanaged external model calls.

### W3 - Access Readiness

Accepted evidence:

- Source-system list.
- API documentation.
- Export process.
- Database access model.
- File storage or SharePoint/Drive structure.
- MCP-compatible tool description.
- Permission model.
- Admin/source-system owner list.

Red flags:

- Workflow depends on systems nobody owns.
- Data exists only in individual inboxes or desktops.
- Access requires broad admin permissions.
- Writeback is requested before read-only value is proven.

### W4 - Control Plane

Accepted evidence:

- Identity provider overview.
- SSO/role-based access notes.
- Logging and observability tools.
- Audit requirements.
- Incident/escalation process.
- Data retention policy.
- Security monitoring process.

Red flags:

- No logs for AI activity.
- No user or role separation.
- No retention decision.
- No way to inspect tool calls, retrieved context, approvals, or outputs.

### A1 - Workflow Fit

Accepted evidence:

- Workflow map.
- SOP.
- Ticket/CRM/ERP examples, redacted.
- Volume and frequency.
- Exception list.
- Handoff examples.
- Current bottleneck evidence.

Red flags:

- "AI should help the department" without a process.
- Workflow is rare or one-off.
- No clear start/end.
- Value depends on changing too many processes at once.

### A2 - Agent Role

Accepted evidence:

- Agent job description.
- Task list.
- Output examples.
- Tools/context required.
- Do/don't list.
- Human fallback rules.
- Acceptance criteria.
- Evaluation examples.

Red flags:

- "A chatbot for everything."
- No output definition.
- No forbidden actions.
- No evaluation method for quality or hallucination.

### A3 - App Surface

Accepted evidence:

- User role list.
- Current screens/tool flow.
- Interface preference.
- Output destination.
- Approval UX description.
- Accessibility/compliance constraints.

Red flags:

- Interface chosen for novelty rather than workflow fit.
- Users must leave their normal work surface without clear value.
- Approval experience is ignored.

### A4 - Integration Depth

Accepted evidence:

- Read/write action list.
- API/tool permissions.
- Approval points.
- Retry/failure requirements.
- Rollback/fallback path.
- Audit requirements.

Red flags:

- Multi-system writeback without approval model.
- No rollback path.
- AI action is not logged.
- Human review is treated as optional for sensitive work.

### H1 - Ownership

Accepted evidence:

- Executive sponsor confirmation.
- Workflow owner.
- IT/security owner.
- Approval owner.
- RACI.
- Decision cadence.

Red flags:

- Sponsor but no workflow owner.
- Department wants AI but cannot approve process change.
- IT is expected to support but was not involved.

### H2 - Business Case

Accepted evidence:

- Baseline cycle time.
- Volume.
- Cost proxy.
- Error/rework rate.
- Revenue/conversion metric.
- Risk/control metric.
- Finance owner.
- Target improvement range.

Red flags:

- Value described only as "productivity."
- No baseline.
- Benefits double-counted.
- No owner for measurement after launch.

### H3 - Governance

Accepted evidence:

- AI policy.
- Approval matrix.
- Risk classification.
- Escalation process.
- Compliance requirement.
- Audit trail expectation.
- Human review standard.

Red flags:

- Governance is only a policy document, not tied to workflow.
- No exception handling.
- No one owns approval quality.
- No audit evidence for AI-assisted actions.

### H4 - Run Model

Accepted evidence:

- Support model.
- Monitoring cadence.
- Training plan.
- Feedback process.
- Issue management process.
- Improvement backlog.
- Runbook.
- Continuous improvement owner.

Red flags:

- AI project ends at launch.
- No monitoring owner.
- No user feedback loop.
- No plan for model, prompt, retrieval, tool, or workflow updates.

## Evidence Summary Template

| Gate | Evidence Received | Confidence | Missing Evidence | Risk | Follow-Up Owner |
| --- | --- | --- | --- | --- | --- |
| W1 Deployment Boundary |  | Low / Medium / High |  |  |  |
| W2 Inference Readiness |  | Low / Medium / High |  |  |  |
| W3 Access Readiness |  | Low / Medium / High |  |  |  |
| W4 Control Plane |  | Low / Medium / High |  |  |  |
| A1 Workflow Fit |  | Low / Medium / High |  |  |  |
| A2 Agent Role |  | Low / Medium / High |  |  |  |
| A3 App Surface |  | Low / Medium / High |  |  |  |
| A4 Integration Depth |  | Low / Medium / High |  |  |  |
| H1 Ownership |  | Low / Medium / High |  |  |  |
| H2 Business Case |  | Low / Medium / High |  |  |  |
| H3 Governance |  | Low / Medium / High |  |  |  |
| H4 Run Model |  | Low / Medium / High |  |  |  |
