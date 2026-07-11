# NovaOrbit Framework

## Positioning

NovaOrbit is the AI maturity assessment for companies moving from AI tools to owned, governed work capacity.

Operational assessment assets live in `docs/novaorbit-assessment-os/`.

White paper title:

**Closing the Last Mile Between AI and Humans**

Core thesis:

The hard part is no longer whether AI can answer. The hard part is whether AI can work inside the company with the right context, systems, approvals, interfaces, owners, and evidence.

## Public Mental Model

NovaOrbit uses three questions:

1. **Where should AI work?**
   Infrastructure & Access.

2. **What should AI do?**
   Applications & Agents.

3. **How does the business change?**
   Operations & Impact.

This is the public layer. It is simple enough for the board and precise enough for technical diligence.

## Dimensions And Gates

### 1. Where: Infrastructure & Access

Assesses whether AI can safely run, connect, retrieve, act, and stay observable inside the current technical environment.

Gates:

- Deployment boundary: NooX, customer cloud, NNGTs cloud, or hybrid.
- Inference readiness: model serving, latency, cost, privacy, and scaling.
- Access readiness: APIs, MCPs, databases, files, permissions, and source ownership.
- Control plane: identity, logging, audit, observability, and security.

Key diagnostic question:

Can AI function on the current stack today, and if not, what must change first?

### 2. What: Applications & Agents

Defines the AI apps, ZAKI agents, RAG layers, automations, interfaces, and human approval paths worth building first.

Gates:

- Workflow fit: repeated work, clear context, and visible decision value.
- Agent role: task, autonomy level, memory, tools, fallback, and output.
- App surface: chat, dashboard, embedded workflow, internal tool, or API surface.
- Integration depth: read-only, approved action, writeback, or multi-system automation.

Key diagnostic question:

What AI capability should exist as a product or agent, not just as a prompt?

### 3. How: Operations & Impact

Maps who owns the workflow, how humans stay in control, and how cost reduction, quality, speed, risk, or revenue is proven.

Gates:

- Ownership: executive sponsor, workflow owner, IT owner, and approval owner.
- Business case: baseline, cost, cycle time, quality, risk, revenue, and ROI signal.
- Governance: oversight, escalation, policy, compliance, and AI risk posture.
- Run model: adoption, training, monitoring, support, and continuous improvement.

Key diagnostic question:

What changes in the business once AI is working, and how will leadership know it is worth scaling?

## Maturity Curve

### Stage 1: Ad Hoc AI

Individual tools, prompts, scattered experiments, and unmanaged adoption without shared operating evidence.

Typical state:

- ChatGPT, Copilot, or point tools used by individuals.
- No shared company memory.
- No agreed deployment boundary.
- No workflow owner or evidence ledger.

Next action:

Map current use, identify sensitive workflows, and choose one owned business process for assessment.

### Stage 2: Connected AI

Use cases are selected, systems are mapped, access is understood, and first pilots can be scoped.

Typical state:

- Business use cases exist.
- Data sources and systems are known.
- IT can discuss APIs, MCPs, files, permissions, and deployment options.
- Pilot candidates are visible but not yet operational.

Next action:

Select the first workflow, define the AI role, validate access, and choose the deployment path.

### Stage 3: Operational AI

AI runs in named workflows with owners, controls, integrations, human approvals, and measurable output.

Typical state:

- Workflow owner and executive sponsor are named.
- ZAKI agent or AI app has defined tools, memory, approvals, and outputs.
- Run ledger captures usage, exceptions, value, and audit evidence.
- Humans approve sensitive work.

Next action:

Harden controls, improve output quality, measure ROI, and prepare the next department or workflow.

### Stage 4: Owned AI Workforce

AI becomes repeatable company-owned work capacity across departments, supported by private runtime and run operations.

Typical state:

- Multiple governed AI workflows are live.
- Infrastructure, memory, agents, apps, and operations are managed as one system.
- The company owns the workflow, evidence, and deployment posture.
- Continuous improvement is part of operations.

Next action:

Scale the managed AI workforce across roles, departments, and higher-value workflows.

## Red Gates

NovaOrbit does not average away critical blockers. Red gates cap maturity until resolved.

1. **No access, no AI.**
   If source systems cannot expose data or actions safely, maturity is capped until APIs, MCPs, or controlled access exist.

2. **No workflow, no agent.**
   If the work is not repeatable, owned, and measurable, the next step is discovery, not an agent build.

3. **No owner, no impact.**
   If no executive, workflow, IT, or approval owner is named, the project cannot move beyond pilot maturity.

4. **No evidence, no scale.**
   If cycle time, quality, cost, risk, or revenue cannot be measured, the next workflow decision is not defensible.

5. **No reliability, no autonomy.**
   If AI output cannot be tested, monitored, reviewed, or safely constrained for the proposed autonomy level, the project cannot scale beyond controlled human-in-the-loop operation.

## Scoring Mechanics

Each of the three dimensions has four gates.

Each gate is scored from 0 to 3:

- **0: Missing**
  No reliable evidence exists.

- **1: Informal**
  The capability exists in pockets, but is undocumented, inconsistent, or dependent on individuals.

- **2: Defined**
  The capability is documented, owned, and usable for a first workflow.

- **3: Operational**
  The capability is active in production or ready to support production with controls, owners, and evidence.

Dimension score:

- 0-3: Stage 1 signal.
- 4-6: Stage 2 signal.
- 7-9: Stage 3 signal.
- 10-12: Stage 4 signal.

Overall maturity stage:

- Use the median of the three dimension-stage signals.
- Apply red-gate caps after calculating the median.
- A company cannot score above Stage 2 if access, workflow, or ownership is unresolved.
- A company cannot score above Stage 3 if evidence or reliability is unresolved.
- A company cannot score Stage 4 unless all three dimensions are at least Stage 3 and no red gates remain open.

Output language:

- Do not call the client "immature."
- Use stage language: "The organization is currently Stage 2: Connected AI, with Stage 3 blocked by source-system access and missing workflow evidence."
- Every low score must map to an action, owner, and next decision.

Example scorecard:

| Dimension | Score | Stage signal | Key blocker | Next action |
| --- | ---: | --- | --- | --- |
| Where: Infrastructure & Access | 5/12 | Stage 2 | API access unclear | Map systems, permissions, and deployment path |
| What: Applications & Agents | 8/12 | Stage 3 | Approval model informal | Define agent role and human review gates |
| How: Operations & Impact | 6/12 | Stage 2 | No baseline metric | Measure current cycle time and cost |

Example readout:

The client is Stage 2: Connected AI. They have credible use cases and early technical pathways, but they are blocked from Stage 3 by unclear source-system access and missing ROI baseline. The recommended next step is a first workflow around [workflow], deployed through [deployment path], with [owner] accountable for [metric].

## Offers

### NovaOrbit Standard

Price: **EUR 10,000**

Duration: **2 weeks**

Purpose:

A board-ready maturity assessment and first-workflow direction.

Deliverables:

- Where / What / How maturity score.
- 4-stage placement and red-gate blockers.
- Leadership and stakeholder interviews.
- High-level infrastructure and access review.
- Top use-case shortlist and first workflow recommendation.
- Executive readout and next-step proposal.

### NovaOrbit In-Depth

Price: **EUR 18,000**

Duration: **4-6 weeks**

Purpose:

A deeper stack, workflow, integration, governance, and ROI diagnostic.

Deliverables:

- API, MCP, source-system, and data-boundary readiness map.
- Workflow economics and ROI model for the top opportunities.
- ZAKI agent role and AI app surface design.
- Deployment recommendation: NooX, customer cloud, NNGTs cloud, or hybrid.
- Governance, approval, and run-model gap analysis.
- 90-day implementation roadmap and CTO appendix.

## Method

1. **Interview**
   C-level, IT, security, finance, department owners, and operators define business pressure, ownership, and constraints.

2. **Inspect**
   Current systems, data sources, access paths, APIs, MCP options, deployment posture, and AI adoption are mapped.

3. **Score**
   The company is scored across Where, What, and How, with stage caps for unresolved access, workflow, owner, or evidence gaps.

4. **Decide**
   The readout converts maturity into a first workflow, deployment path, owner map, ROI signal, and implementation proposal.

## Research Alignment

NovaOrbit compresses accepted AI maturity themes into an executable commercial model:

- Cloud AI adoption frameworks emphasize people, process, technology, and data.
- AI risk frameworks emphasize governance, mapping, measurement, and management.
- AI management-system standards emphasize oversight, risk, controls, and continuous improvement.
- Enterprise AI transformation research consistently shows that operating model and process change carry most of the value.

NovaOrbit does not try to be broader than those frameworks. It tries to be more executable: every score must map to a buildable action.
