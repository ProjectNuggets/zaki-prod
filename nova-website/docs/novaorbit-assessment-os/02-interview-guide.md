# 02 - Interview Guide

The interview guide turns NovaOrbit from a framework into a repeatable field method.

Interview goals:

- Understand the business pressure.
- Identify real workflows, not abstract use cases.
- Confirm technical access and deployment constraints.
- Surface risk, governance, and approval requirements.
- Establish a baseline value signal.
- Name the first workflow and the owners required to build it.

## Interview Rules

- Ask for examples, not opinions.
- Ask who owns the decision, not only who has input.
- Ask where the data lives and how it is accessed today.
- Ask what the AI system must never do.
- Ask what would make the project obviously worth scaling.
- Do not request secrets, passwords, API keys, production credentials, or sensitive raw data.
- Use redacted samples where examples are needed.

## Stakeholder Map

| Role | Why They Matter | Required For Standard | Required For In-Depth |
| --- | --- | --- | --- |
| CEO / Managing Director | Business priority, urgency, enterprise decision rights. | Yes | Yes |
| CFO / Finance Owner | ROI model, baseline economics, budget confidence. | Recommended | Yes |
| CTO / CIO / IT Lead | Stack readiness, access, deployment, security constraints. | Yes | Yes |
| Security / Compliance / DPO | Risk posture, data sensitivity, audit, approvals. | Recommended | Yes |
| Department Owner | Workflow ownership and value definition. | Yes | Yes |
| Operators / End Users | Reality of work, exceptions, handoffs, tool usage. | Yes | Yes |
| Source-System Owner | API, MCP, export, database, permissions, tool access. | Optional | Yes |
| HR / Change / Training | Adoption and operating model. | Optional | Recommended |

Finance rule:

For Standard, CFO or finance-owner participation is recommended but not always mandatory. If finance is absent, the report may include a proxy value case, not a finance-approved ROI case. Label the confidence clearly and make finance validation a next action.

## Standard Interview Cadence

Two-week Standard engagement:

| Day | Activity | Participants | Output |
| --- | --- | --- | --- |
| 1 | Kickoff and sponsor alignment | Sponsor, project lead, Nova Nuggets | Scope, stakeholders, functions, timeline |
| 2-3 | Executive and finance interviews | CEO, sponsor, CFO when available | Business pressure, value expectations, finance confidence |
| 3-5 | IT/security discovery | CTO/CIO, IT, security | Deployment and access assumptions |
| 5-7 | Department workflow interviews | Department owners, operators | Workflow candidates and pain points |
| 8-9 | Evidence review and scoring | Nova Nuggets | Draft scorecard and red gates |
| 10 | Readout | Leadership and owners | Stage, first workflow, next proposal |

In-Depth cadence expands the evidence review, system owner sessions, ROI validation, and technical appendix across 4-6 weeks.

## Opening Script

"NovaOrbit is not a generic AI strategy exercise. We are here to answer one decision: which workflow should be built first, and what must be true for AI to work there safely, measurably, and under company control. We will ask about business pressure, current systems, access, ownership, approvals, and evidence. The output is a scored maturity baseline and a first-workflow path."

## CEO / Managing Director Questions

Purpose:

Clarify strategic pressure, urgency, and what would make AI meaningful to the company.

Questions:

1. Where is AI already being used in the company?
2. Which AI use cases have leadership attention today?
3. Where does work feel slow, expensive, risky, or constrained by expertise?
4. Which department would create the strongest proof if AI worked there?
5. What would make you say "this was worth doing" after 90 days?
6. What cannot be compromised: privacy, customer trust, latency, sovereignty, quality, brand, compliance, cost?
7. Who can decide that a workflow is allowed to change?
8. If we identify a credible first workflow, who approves the next step?

Strong signals:

- Sponsor can name a painful workflow and decision owner.
- There is a real business mandate, not just curiosity.
- The company can accept a first workflow before enterprise-wide transformation.

Weak signals:

- AI is discussed as "innovation" without a workflow.
- No owner can approve process change.
- Leadership wants a roadmap but not a build decision.

## CFO / Finance Questions

Purpose:

Turn AI ambition into measurable value.

Questions:

1. Which costs, delays, errors, or revenue opportunities matter most this year?
2. Which workflow has visible volume and measurable cycle time?
3. What baseline data exists today?
4. How should value be expressed: cost reduction, productivity, quality, revenue, risk reduction, working capital, or customer response time?
5. What labor cost proxy is acceptable for modeling?
6. What assumptions would you reject as inflated?
7. What payback period would make the next build obvious?
8. Who should sign off on the ROI model?

Strong signals:

- Finance can provide or approve baseline assumptions.
- The value model can be conservative and still justify action.
- There is agreement on what not to count.

Weak signals:

- Value is described only as "efficiency."
- No volume, cost, quality, or cycle-time data exists.
- Savings cannot be tied to a business owner.

## CTO / CIO / IT Questions

Purpose:

Validate whether AI can operate on the current stack.

Questions:

1. Where does the first workflow's data live?
2. Which systems would AI need to read from?
3. Which systems would AI need to write to or trigger actions in?
4. Do those systems expose APIs, MCP-compatible interfaces, exports, databases, webhooks, or file access?
5. What identity provider and permission model is used?
6. What logging, monitoring, and audit systems are already in place?
7. What cloud, on-prem, or hybrid constraints matter?
8. Are there data residency, latency, customer contract, or sovereignty constraints?
9. Which deployment path is plausible: NooX, customer cloud, NNGTs cloud, or hybrid?
10. What would block implementation within 90 days?

Strong signals:

- Systems and owners are known.
- Access paths are clear enough for first workflow discovery.
- IT can name the deployment boundary and security constraints.

Weak signals:

- "Ask IT later" is the answer to source-system questions.
- Access depends on individual workarounds.
- No one knows who owns the systems.

## Security / Compliance / DPO Questions

Purpose:

Define boundaries, approvals, audit, and risk posture.

Questions:

1. What categories of data may appear in the first workflow?
2. Which data must not leave the company perimeter?
3. Are there customer, regulatory, contractual, or internal policy constraints?
4. What audit evidence is required for AI-assisted work?
5. How should human approval be handled?
6. What actions require explicit approval?
7. What should be logged?
8. What incident, escalation, or exception process applies?
9. What AI use is already happening outside approved channels?
10. What would make the first workflow unacceptable?

Strong signals:

- Data sensitivity can be classified.
- Approval and audit needs are clear.
- The company has a path for controlled experimentation.

Weak signals:

- AI risk is either ignored or treated as a blanket ban.
- No one can define acceptable AI usage.
- Logging and accountability are missing.

## Department Owner Questions

Purpose:

Identify the first workflow worth building.

Questions:

1. Which repeated workflow is slow, expensive, risky, or painful?
2. How does the workflow start and end?
3. Who touches it?
4. Which tools, documents, emails, tickets, CRM records, ERP data, or knowledge bases are involved?
5. What are the common exceptions?
6. What decisions happen inside the workflow?
7. Which outputs must be created?
8. Where does rework happen?
9. What should an AI agent be allowed to do?
10. What should it never do?
11. Who approves sensitive outputs today?
12. What metric would prove improvement?

Strong signals:

- Workflow is repeated and painful.
- Owner can provide examples.
- There is a clear before/after metric.

Weak signals:

- The workflow is actually a broad department transformation.
- Pain is anecdotal but not frequent.
- No one owns the process end to end.

## Operator / End User Questions

Purpose:

Find the reality that leadership does not see.

Questions:

1. Walk us through the last time this workflow happened.
2. What did you search for?
3. What did you copy from one system to another?
4. Where did you wait for approval or information?
5. What did you check manually?
6. What mistakes happen most often?
7. What would you trust an AI assistant to draft?
8. What would you want to review before anything is sent or changed?
9. What would make an AI tool annoying or risky?
10. What would save you the most time this week?

Strong signals:

- Operators can show concrete handoffs and repetitive work.
- There are clear tasks for retrieval, drafting, comparison, routing, or summarization.
- Human review points are obvious.

Weak signals:

- Operators describe judgment-only work with low repetition.
- The work depends on undocumented personal knowledge.
- The proposed automation would interrupt more than help.

## Source-System Owner Questions

Purpose:

Validate technical feasibility.

Questions:

1. What system is the source of truth?
2. Who owns admin access?
3. What API, export, webhook, database, file, or MCP path exists?
4. What permissions can be scoped?
5. What rate limits or vendor constraints apply?
6. What writeback actions are possible?
7. What logs are produced today?
8. What sandbox or test environment exists?
9. What integration has worked or failed before?
10. What would make this integration unsafe?

Strong signals:

- Access method and owner are known.
- Sandbox or test data exists.
- Permissions can be scoped by role or workflow.

Weak signals:

- No API/export path.
- Admin owner is unknown.
- Writeback requires broad permissions.

## Closing Each Interview

Ask:

1. What did we miss?
2. What would make this fail?
3. Who else has the missing evidence?
4. What artifact should we review next?
5. If one workflow gets built first, which one should it be?

## Interview Output Template

| Field | Notes |
| --- | --- |
| Interviewee |  |
| Role |  |
| Date |  |
| Relevant dimension | Where / What / How |
| Workflow candidates mentioned |  |
| Systems mentioned |  |
| Evidence offered |  |
| Risks or blockers |  |
| Owners named |  |
| Metrics named |  |
| Score implications |  |
| Follow-up required |  |
