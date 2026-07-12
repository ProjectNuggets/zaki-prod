# NovaOrbit Assessment OS

NovaOrbit Assessment OS is the operating system behind the public NovaOrbit framework.

The website explains the idea:

- Where should AI work?
- What should AI do?
- How does the business change?

This folder defines how Nova Nuggets runs the assessment, scores evidence, turns gaps into actions, and converts the readout into the first workflow implementation.

## Client Promise

NovaOrbit does not sell generic AI strategy. It answers one decision:

**Which workflow should be built first, and what must be true for AI to work there safely, measurably, and under company control?**

Every assessment must produce:

- A scored maturity baseline across Where, What, and How.
- A four-stage maturity placement with red-gate caps.
- A clear first-workflow recommendation.
- A deployment direction: NooX, customer cloud, NNGTs cloud, or hybrid.
- Named blockers, owners, and next actions.
- A path from assessment to build, deploy, run, and scale.

## Operating Principles

1. **Evidence over opinion**
   Scores are based on evidence: artifacts, interviews, system access descriptions, operating records, process maps, and metric baselines.

2. **No false maturity**
   Red gates cap the maturity stage when access, workflow, ownership, approval, reliability, or evidence is not ready.

3. **Board-simple, CTO-defensible**
   The board sees Where / What / How and the four-stage curve. The CTO sees gate-level evidence, integration assumptions, deployment constraints, and risk controls.

4. **Every score maps to action**
   A low score is not a criticism. It is an action backlog item with an owner, decision, and recommended next step.

5. **Implementation-aware**
   NovaOrbit is designed by a company that can assess, build, deploy, and run the full AI stack. The assessment must never end in a generic roadmap.

6. **Secure by default**
   Do not request secrets, production credentials, personal data extracts, or sensitive documents unless a formal legal and security path exists. Use redacted samples, screenshots, architecture descriptions, and policy documents where possible.

## Asset Map

| File | Purpose |
| --- | --- |
| `01-rubric-and-scoring.md` | The 12-gate scoring model, stage logic, red gates, and score interpretation rules. |
| `02-interview-guide.md` | Role-specific interview guide for executives, CTO/CIO, security, finance, department owners, and operators. |
| `03-evidence-checklist.md` | Evidence request list and red flags by gate. |
| `04-roi-worksheet.md` | Business case method, formulas, use-case prioritization, and CFO readout model. |
| `05-report-template.md` | Board-ready and CTO-defensible report structure. |
| `06-stage-action-playbook.md` | Stage-to-action matrix that turns scores into definitive next moves. |
| `07-offer-operations.md` | Delivery cadence, RACI, acceptance criteria, and Standard vs In-Depth operating model. |
| `08-sample-report-atlas-components.md` | Fictional sample readout showing what a buyer receives. |
| `09-stress-test.md` | Adversarial review of the methodology, sample report, and buyer objections. |
| `../../public/assets/downloads/novaorbit-one-pager.pdf` | Downloadable one-page board pre-read and sales opener. |
| `../../public/assets/downloads/novaorbit-scoring-workbook.xlsx` | Editable scoring workbook with dashboard, scorecard, red gates, ROI model, and action plan. |
| `templates/novaorbit-scorecard.csv` | 12-gate scoring worksheet. |
| `templates/novaorbit-evidence-register.csv` | Evidence request and confidence tracker. |
| `templates/novaorbit-workflow-prioritization.csv` | First-workflow candidate ranking sheet. |
| `templates/novaorbit-roi-model.csv` | Lightweight ROI modeling starter. |

## Delivery Modes

### NovaOrbit Standard

Price: EUR 10,000

Duration: 2 weeks

Purpose:

Board-ready maturity assessment and first-workflow direction.

Designed for:

- Leadership teams that need clarity before implementation.
- Companies with AI interest but unclear first workflow.
- Buyers who need a credible readout without deep technical validation.

Minimum output:

- Maturity score across Where, What, and How.
- Stage placement and red-gate blockers.
- Top 3 workflow candidates.
- First workflow recommendation.
- High-level infrastructure/access map.
- Executive readout and next-step proposal.

### NovaOrbit In-Depth

Price: EUR 18,000

Duration: 4-6 weeks

Purpose:

Deeper stack, workflow, integration, governance, and ROI diagnostic.

Designed for:

- Sensitive data environments.
- CTO/CIO teams needing API, MCP, data, integration, and deployment validation.
- Companies preparing for a first workflow SOW.

Minimum output:

- Everything in Standard.
- API/MCP/source-system readiness map.
- Data boundary and deployment recommendation.
- Workflow economics and ROI model.
- Agent/app design brief.
- Governance, approval, reliability, and run-model gap analysis.
- 90-day implementation roadmap and CTO appendix.

## Standard Assessment Flow

1. **Align**
   Confirm sponsor, stakeholders, business pressure, target functions, and decision timeline.

2. **Discover**
   Interview leadership, IT, security/compliance, finance, department owners, and operators.

3. **Inspect**
   Review workflow artifacts, source systems, access posture, integration options, deployment constraints, controls, and metric baselines.

4. **Score**
   Score 12 gates across the three dimensions and apply red-gate caps.

5. **Decide**
   Select the first workflow and define deployment direction, owner map, ROI signal, and implementation path.

6. **Read Out**
   Present the board summary, technical appendix, workflow recommendation, and first-workflow proposal.

## Quality Bar

An assessment is not complete until these questions can be answered:

- What is the current maturity stage?
- Which red gates cap maturity?
- What workflow should be built first?
- Why that workflow and not another?
- Where will it run?
- Which systems, APIs, MCPs, files, databases, or tools must it reach?
- What should the AI app or agent do?
- What must it never do?
- Who owns the workflow, approvals, security posture, and metric?
- What evidence proves value after launch?
- What happens in the first 30, 60, and 90 days after the assessment?

## Positioning Line

Most AI assessments tell you whether you are ready. NovaOrbit tells you what to build first.
