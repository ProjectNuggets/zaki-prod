# 04 - ROI Worksheet

NovaOrbit ROI is conservative by default.

The goal is not to inflate a transformation case. The goal is to identify a first workflow whose value is visible enough to justify implementation.

## ROI Principles

1. **Use ranges, not fake precision**
   Provide conservative, expected, and upside cases.

2. **Separate capacity from cash**
   Time saved is not automatically cash saved. Label it as capacity unless headcount, overtime, contractor spend, or revenue can be directly affected.

3. **Count quality and risk carefully**
   Quality, compliance, and control improvements matter, but do not convert them into euros unless the client accepts the assumption.

4. **Baseline before target**
   No baseline, no scale. If the current state cannot be measured, the first action is baseline creation.

5. **Finance owner signs off**
   CFO or finance owner should approve the assumptions before the readout.

## Workflow Candidate Score

Use this to rank the top opportunities.

| Factor | Score 1 | Score 2 | Score 3 | Score 4 | Score 5 |
| --- | --- | --- | --- | --- | --- |
| Business impact | Minor convenience | Local time saving | Department value | Material cost/risk/revenue impact | Strategic operating impact |
| Repetition | Rare | Monthly | Weekly | Daily | High-volume daily |
| Data/access feasibility | Unknown | Difficult | Partial | Clear | Implementation-ready |
| Control feasibility | High-risk | Many approvals unknown | Manageable | Clear approvals | Low-risk or well controlled |
| Owner strength | No owner | Sponsor only | Department owner | Sponsor + owner | Sponsor + owner + IT/security |
| Evidence readiness | No baseline | Anecdotal | Proxy exists | Baseline exists | Baseline + target exists |

Prioritization formula:

`Opportunity Score = Business Impact + Repetition + Data/Access Feasibility + Control Feasibility + Owner Strength + Evidence Readiness`

Interpretation:

- 6-12: Discovery candidate.
- 13-20: Possible candidate, needs gating.
- 21-26: Strong first-workflow candidate.
- 27-30: Priority implementation candidate.

## Baseline Inputs

| Input | Description | Source | Owner |
| --- | --- | --- | --- |
| Workflow volume | Number of cases/tasks per week or month. | Tickets, CRM, ERP, inbox, logs, estimates | Department owner |
| Current cycle time | Time from workflow start to usable output. | System timestamps, time study, interviews | Department owner |
| Active labor time | Human time spent per case, excluding waiting. | Time study, operator estimate | Department owner |
| Fully loaded cost | Accepted hourly cost proxy. | Finance | CFO/finance |
| Rework/error rate | Percentage requiring correction, escalation, or redo. | QA, tickets, finance, manager estimate | Department owner |
| Delay cost | Cost or revenue impact from waiting. | Finance or operations | CFO/operations |
| Quality/risk cost | Cost of errors, exceptions, compliance issues. | Finance/compliance | CFO/compliance |
| Revenue upside | Conversion, retention, throughput, or customer response value. | Sales/customer data | Revenue owner |

## Core Calculations

### Labor Capacity Value

`Weekly active hours = workflow volume per week * active labor time per case`

`Weekly capacity released = weekly active hours * expected automation/support percentage`

`Annual capacity value = weekly capacity released * fully loaded hourly cost * 46 working weeks`

Use 46 working weeks to stay conservative.

### Cycle-Time Value

Use when speed creates business value.

`Cycle-time improvement = current cycle time - target cycle time`

`Annual speed value = workflow volume * value per faster case`

Only use this if the client can define value per faster case.

### Quality / Rework Value

`Annual rework hours = workflow volume per year * rework rate * rework time per case`

`Annual rework value = annual rework hours * fully loaded hourly cost`

If errors create direct financial loss:

`Annual error cost = workflow volume per year * error rate * average error cost`

### Revenue Value

Use only when accepted by revenue owner.

`Annual revenue value = eligible volume * conversion lift * gross profit per conversion`

Do not mix revenue and productivity in the same headline unless clearly separated.

## ROI Scenario Table

| Scenario | Automation / Assist Rate | Quality Improvement | Adoption Rate | Confidence |
| --- | ---: | ---: | ---: | --- |
| Conservative | 10-15% | 0-5% | 50-60% | High |
| Expected | 20-35% | 5-15% | 60-80% | Medium |
| Upside | 35-50% | 15-25% | 80%+ | Low until proven |

The readout should lead with conservative and expected. Upside belongs in appendix unless evidence is strong.

## First Workflow Business Case Template

| Field | Value |
| --- | --- |
| Workflow |  |
| Function |  |
| Workflow owner |  |
| Executive sponsor |  |
| Current volume |  |
| Current active labor time |  |
| Current cycle time |  |
| Baseline metric |  |
| Target metric |  |
| Primary value type | Cost / capacity / speed / quality / revenue / risk |
| Conservative annual value |  |
| Expected annual value |  |
| Upside annual value |  |
| Implementation complexity | Low / Medium / High |
| Control complexity | Low / Medium / High |
| Recommended next action |  |

## CFO Readout Language

Use:

"The first workflow does not need to justify the entire AI transformation. It needs to prove that AI can create measurable operating capacity under company control. The conservative case is [value], based on [assumptions]. The expected case is [value], dependent on [conditions]. The next financial decision is whether the workflow is valuable enough to scope implementation."

Avoid:

- "This will save X FTE."
- "AI will reduce costs by Y%" without baseline.
- "Productivity gain" without a measurable workflow.

## ROI Red Flags

- Benefits depend on adoption but no adoption owner exists.
- Value is based on generic AI benchmarks.
- Baseline is anecdotal and cannot be measured later.
- Savings are double-counted across time, quality, and revenue.
- High revenue upside is used to justify a workflow with weak access or governance.
- The first workflow is chosen for technical interest instead of business value.

## Output For Report

The report should include:

- Top 3 workflow candidates.
- Opportunity score for each.
- Selected first workflow.
- Conservative and expected value ranges.
- Required baseline improvements before build.
- Measurement owner.
- 30/60/90-day evidence plan.
