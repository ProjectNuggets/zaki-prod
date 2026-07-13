# 01 - Rubric And Scoring

NovaOrbit scores three dimensions:

1. **Where: Infrastructure & Access**
2. **What: Applications & Agents**
3. **How: Operations & Impact**

Each dimension has four gates. Each gate is scored from 0 to 3.

## Scoring Scale

| Score | Label | Meaning | Evidence Standard |
| ---: | --- | --- | --- |
| 0 | Missing | No reliable evidence exists. | Stakeholders cannot describe the capability, or the answer depends on assumptions. |
| 1 | Informal | Capability exists in pockets but is undocumented, inconsistent, or person-dependent. | Interview evidence exists, but artifacts, owners, or controls are weak. |
| 2 | Defined | Capability is documented, owned, and usable for a first workflow. | Artifacts exist, owners are named, and constraints are clear enough to build. |
| 3 | Operational | Capability is active in production or ready to support production with controls, owners, and evidence. | Operating records, controls, runbooks, metrics, or working systems prove the capability. |

## Stage Signals

Each dimension has a maximum score of 12.

| Dimension Score | Stage Signal |
| ---: | --- |
| 0-3 | Stage 1: Ad Hoc AI |
| 4-6 | Stage 2: Connected AI |
| 7-9 | Stage 3: Operational AI |
| 10-12 | Stage 4: Owned AI Workforce |

Overall maturity:

1. Convert each dimension score into a stage signal.
2. Use the median of the three stage signals.
3. Apply red-gate caps.
4. Apply judgment only when evidence is conflicting, and document why.

## Red-Gate Caps

Red gates prevent false maturity.

| Red Gate | Cap | Trigger |
| --- | --- | --- |
| No access, no AI | Cannot exceed Stage 2 | Source systems, data, permissions, APIs, MCPs, or approved exports are not clear enough to support the first workflow. |
| No workflow, no agent | Cannot exceed Stage 2 | The work is not repeatable, owned, measurable, or connected to a business outcome. |
| No owner, no impact | Cannot exceed Stage 2 | Executive sponsor, workflow owner, IT owner, or approval owner is missing. |
| No evidence, no scale | Cannot exceed Stage 3 | Value, quality, risk, cost, cycle time, or revenue cannot be measured after launch. |
| No reliability, no autonomy | Cannot exceed Stage 3 | The AI output cannot be tested, monitored, reviewed, or safely constrained for the proposed autonomy level. |

The fifth red gate is intentionally not a fourth public dimension. It is a control rule across What and How. It catches the common failure where a workflow looks attractive but quality, hallucination control, evaluation, fallback, or monitoring is not ready.

## Gate Rubric

### Where: Infrastructure & Access

#### W1 - Deployment Boundary

Question:

Where can the AI workload run safely?

| Score | Criteria |
| ---: | --- |
| 0 | No deployment preference, constraints, or ownership model is known. |
| 1 | Cloud, on-prem, or SaaS preferences exist informally, but security, latency, data residency, or operating access is unclear. |
| 2 | A plausible deployment path is defined: NooX, customer cloud, NNGTs cloud, or hybrid. Constraints and owners are named. |
| 3 | Deployment boundary is ready for implementation with network, identity, data residency, support, and operating model understood. |

Evidence:

- Cloud architecture overview.
- Security or data residency policy.
- Network boundary description.
- Current SaaS and infrastructure list.
- On-prem or edge requirements.
- Named IT/cloud owner.

Default actions:

- If 0-1: run deployment boundary workshop with IT/security.
- If 2: validate constraints and implementation route.
- If 3: move into architecture sizing and SOW.

#### W2 - Inference Readiness

Question:

Can model inference run with acceptable privacy, latency, cost, reliability, and scaling?

| Score | Criteria |
| ---: | --- |
| 0 | No view on models, inference location, cost, latency, or usage pattern. |
| 1 | Initial model or vendor preferences exist, but cost, latency, load, or privacy is not modeled. |
| 2 | Inference path is defined for the first workflow, including expected usage, latency, cost, and privacy constraints. |
| 3 | Inference path is tested or implementation-ready with monitoring, fallback, scaling, and cost controls. |

Evidence:

- Expected user count and workflow volume.
- Latency requirements.
- Data sensitivity classification.
- Model/vendor constraints.
- On-prem or GPU requirement.
- Cost envelope.

Default actions:

- If 0-1: estimate volume, latency, and privacy posture.
- If 2: run technical validation for selected path.
- If 3: include in implementation architecture.

#### W3 - Access Readiness

Question:

Can AI safely retrieve from or act on the systems needed for the workflow?

| Score | Criteria |
| ---: | --- |
| 0 | Source systems are unknown or access is blocked. |
| 1 | Systems are known, but API, MCP, export, database, document, or permission path is unclear. |
| 2 | Access path is defined for first workflow with owners, permissions, and boundaries. |
| 3 | Access path is tested or production-ready with scoped permissions and auditability. |

Evidence:

- System inventory.
- API documentation.
- MCP-compatible interfaces.
- Export process.
- Database or file access description.
- Permission model.
- Data owner list.

Default actions:

- If 0-1: map systems and owners before choosing the build.
- If 2: validate least-privilege access and data boundary.
- If 3: design connector, retrieval, or tool integration.

#### W4 - Control Plane

Question:

Can the company observe, govern, secure, and audit AI work?

| Score | Criteria |
| ---: | --- |
| 0 | No control plane for identity, logs, observability, policy, or audit. |
| 1 | Controls exist in separate systems but are not mapped to AI workflows. |
| 2 | Identity, logging, observability, audit, and security responsibilities are defined for the first workflow. |
| 3 | Control plane is implementation-ready with run logs, access controls, monitoring, alerting, and audit evidence. |

Evidence:

- Identity provider overview.
- Logging and monitoring tools.
- Audit requirements.
- Security policies.
- Incident or escalation process.
- Data retention rules.

Default actions:

- If 0-1: define minimum viable control plane.
- If 2: design run ledger and access policy.
- If 3: include observability and audit requirements in SOW.

### What: Applications & Agents

#### A1 - Workflow Fit

Question:

Is the selected workflow repeated, valuable, bounded, and measurable?

| Score | Criteria |
| ---: | --- |
| 0 | Workflow is vague, one-off, or not connected to value. |
| 1 | Pain is real, but workflow steps, volume, exceptions, or owners are unclear. |
| 2 | Workflow is mapped enough to design an AI app or agent and measure the first outcome. |
| 3 | Workflow is documented, high-value, repeated, and ready for implementation discovery. |

Evidence:

- Process map.
- Volume and frequency.
- Pain point description.
- Exception examples.
- Current tools and handoffs.
- Baseline metric.

Default actions:

- If 0-1: run workflow discovery before agent design.
- If 2: create first-workflow proposal.
- If 3: move into implementation scope.

#### A2 - Agent Role

Question:

What should the AI app or agent do, and what must it never do?

| Score | Criteria |
| ---: | --- |
| 0 | Agent role is described as generic assistant or chatbot. |
| 1 | Task idea exists, but autonomy, memory, tools, outputs, and fallback are unclear. |
| 2 | Agent role is defined with task boundaries, context, tools, outputs, owner, and human fallback. |
| 3 | Agent role is implementation-ready with quality criteria, evaluation examples, escalation rules, and failure handling. |

Evidence:

- Task definition.
- Output examples.
- Human review requirements.
- Tool list.
- Memory/context description.
- Rejected actions and forbidden behavior.
- Quality acceptance criteria.

Default actions:

- If 0-1: write agent job description.
- If 2: define output evaluation and escalation rules.
- If 3: include agent spec in SOW.

#### A3 - App Surface

Question:

Where should humans interact with the AI capability?

| Score | Criteria |
| ---: | --- |
| 0 | Interface is not considered. |
| 1 | Chat, dashboard, email, CRM, ticketing, or internal app ideas exist, but user workflow fit is unclear. |
| 2 | App surface is selected for first workflow and matched to user routine, permissions, and outputs. |
| 3 | App surface is implementation-ready with users, screens, states, actions, and acceptance criteria. |

Evidence:

- User roles.
- Current interface screenshots or descriptions.
- Existing workflow entry point.
- Output destination.
- Accessibility or compliance requirements.
- Approval UX requirements.

Default actions:

- If 0-1: choose the lowest-friction surface for the first workflow.
- If 2: design core user journey.
- If 3: scope UI or integration build.

#### A4 - Integration Depth

Question:

How much should the AI capability read, recommend, act, or write back?

| Score | Criteria |
| ---: | --- |
| 0 | Integration depth is not known. |
| 1 | Desired automation exists, but read/write boundaries and approval points are unclear. |
| 2 | Integration level is defined: read-only, approved actions, writeback, or multi-system automation. |
| 3 | Integration design is implementation-ready with permissions, approvals, retries, logging, and rollback/fallback paths. |

Evidence:

- System action list.
- API/tool permissions.
- Approval points.
- Writeback requirements.
- Error handling requirements.
- Audit and rollback expectations.

Default actions:

- If 0-1: start read-only unless value requires controlled action.
- If 2: design approval and logging.
- If 3: scope technical implementation.

### How: Operations & Impact

#### H1 - Ownership

Question:

Who owns the outcome, approval, technical boundary, and daily workflow?

| Score | Criteria |
| ---: | --- |
| 0 | No owner is named. |
| 1 | Sponsor exists, but workflow, IT, approval, or operating owners are missing. |
| 2 | Executive sponsor, workflow owner, IT owner, and approval owner are named. |
| 3 | Owners are active, decision rights are clear, and operating cadence is defined. |

Evidence:

- Sponsor confirmation.
- RACI.
- Department owner list.
- Decision rights.
- Steering cadence.

Default actions:

- If 0-1: stop implementation planning until owners are named.
- If 2: confirm RACI.
- If 3: include owners in implementation governance.

#### H2 - Business Case

Question:

What value will AI create, and what baseline proves it?

| Score | Criteria |
| ---: | --- |
| 0 | No metric or baseline. |
| 1 | Value hypothesis exists but no baseline, volume, or cost model. |
| 2 | Baseline metric and value model exist for first workflow. |
| 3 | Baseline, target, measurement method, and finance owner are ready for post-launch tracking. |

Evidence:

- Cycle time.
- Volume.
- Labor rate or cost proxy.
- Error/rework rate.
- Revenue/conversion metric.
- Risk/control metric.
- CFO or finance owner.

Default actions:

- If 0-1: collect baseline before final recommendation.
- If 2: run ROI model.
- If 3: include measurement plan in implementation.

#### H3 - Governance

Question:

How will humans control, approve, override, and audit AI work?

| Score | Criteria |
| ---: | --- |
| 0 | No AI governance, approval, or risk posture exists. |
| 1 | Policy or approvals exist informally but are not tied to AI workflow. |
| 2 | Governance model is defined for first workflow with approvals, escalation, policy, and risk boundaries. |
| 3 | Governance is implementation-ready with logs, monitoring, exceptions, review cadence, and evidence trail. |

Evidence:

- AI policy or acceptable use guidance.
- Approval matrix.
- Risk classification.
- Compliance requirements.
- Audit trail requirements.
- Escalation process.

Default actions:

- If 0-1: define approval and escalation model.
- If 2: design run ledger and review cadence.
- If 3: include governance requirements in SOW.

#### H4 - Run Model

Question:

Who will operate, monitor, improve, and support the AI workflow after launch?

| Score | Criteria |
| ---: | --- |
| 0 | No run ownership or support model. |
| 1 | Support assumptions exist but monitoring, iteration, training, or ownership is unclear. |
| 2 | Run model is defined with support, monitoring, adoption, training, and improvement cadence. |
| 3 | Run model is ready with operating routines, issue management, metrics, backlog, and continuous improvement owner. |

Evidence:

- Support model.
- Training plan.
- Monitoring cadence.
- Feedback process.
- Improvement backlog.
- Incident owner.
- Runbook.

Default actions:

- If 0-1: define minimum run model.
- If 2: prepare launch and adoption plan.
- If 3: convert into managed-agent operating proposal.

## Score Interpretation

Use this language in the readout:

- "The organization is currently Stage 1: Ad Hoc AI, with the strongest next action being..."
- "The organization is currently Stage 2: Connected AI, with Stage 3 blocked by..."
- "The organization is currently Stage 3: Operational AI, with the next value coming from..."
- "The organization is currently Stage 4: Owned AI Workforce, with scale dependent on..."

Do not say:

- "You are immature."
- "You are behind."
- "You are not ready for AI."

Say:

- "The organization has a Stage 2 signal because the use case and system map exist, but Stage 3 is capped until access and evidence are defined."

## Scorecard Template

| Dimension | Gate | Score | Evidence Confidence | Key Evidence | Blocker | Owner | Next Action |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| Where | W1 Deployment Boundary |  | Low / Medium / High |  |  |  |  |
| Where | W2 Inference Readiness |  | Low / Medium / High |  |  |  |  |
| Where | W3 Access Readiness |  | Low / Medium / High |  |  |  |  |
| Where | W4 Control Plane |  | Low / Medium / High |  |  |  |  |
| What | A1 Workflow Fit |  | Low / Medium / High |  |  |  |  |
| What | A2 Agent Role |  | Low / Medium / High |  |  |  |  |
| What | A3 App Surface |  | Low / Medium / High |  |  |  |  |
| What | A4 Integration Depth |  | Low / Medium / High |  |  |  |  |
| How | H1 Ownership |  | Low / Medium / High |  |  |  |  |
| How | H2 Business Case |  | Low / Medium / High |  |  |  |  |
| How | H3 Governance |  | Low / Medium / High |  |  |  |  |
| How | H4 Run Model |  | Low / Medium / High |  |  |  |  |
