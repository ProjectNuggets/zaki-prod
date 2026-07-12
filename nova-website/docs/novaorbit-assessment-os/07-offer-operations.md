# 07 - Offer Operations

This file defines how NovaOrbit Standard and NovaOrbit In-Depth are delivered.

## Commercial Offer Map

| Offer | Price | Duration | Buyer Intent | Output |
| --- | ---: | --- | --- | --- |
| NovaOrbit Standard | EUR 10,000 | 2 weeks | "We need to know where to start." | Maturity baseline and first-workflow direction. |
| NovaOrbit In-Depth | EUR 18,000 | 4-6 weeks | "We need to validate stack, governance, ROI, and implementation path." | Technical and business diagnostic with 90-day roadmap. |

## Standard Scope

Included:

- Kickoff and sponsor alignment.
- Stakeholder interview set.
- High-level infrastructure and access review.
- Workflow candidate mapping.
- 12-gate maturity scoring.
- Red-gate review.
- Top 3 workflow candidates.
- First workflow recommendation.
- Executive readout.
- Next-step proposal.

Not included:

- Production system access.
- Deep API testing.
- Security penetration testing.
- Full solution architecture.
- Data migration analysis.
- Implementation build.
- Legal compliance opinion.

## In-Depth Scope

Included:

- Everything in Standard.
- Deeper source-system and access review.
- API/MCP/export/database feasibility mapping.
- Deployment option comparison.
- Data boundary and governance review.
- Workflow economics and ROI model.
- Agent/app role design.
- Reliability and evaluation requirements.
- 90-day roadmap.
- CTO appendix.
- Implementation SOW input.

Not included unless separately scoped:

- Production integration build.
- Procurement.
- Hardware installation.
- Legal compliance certification.
- Formal security audit.
- Production data processing.

## RACI

| Activity | Nova Nuggets | Client Sponsor | Department Owner | IT/Security | Finance |
| --- | --- | --- | --- | --- | --- |
| Scope kickoff | Responsible | Accountable | Consulted | Consulted | Consulted |
| Stakeholder scheduling | Consulted | Accountable | Consulted | Consulted | Consulted |
| Interviews | Responsible | Consulted | Consulted | Consulted | Consulted |
| Evidence collection | Responsible | Accountable | Responsible | Responsible | Responsible |
| Scoring | Responsible | Consulted | Consulted | Consulted | Consulted |
| ROI assumptions | Responsible | Consulted | Consulted | Consulted | Accountable |
| Red-gate review | Responsible | Accountable | Consulted | Consulted | Consulted |
| First workflow decision | Responsible | Accountable | Responsible | Consulted | Consulted |
| Readout | Responsible | Accountable | Consulted | Consulted | Consulted |
| Next proposal | Responsible | Accountable | Consulted | Consulted | Consulted |

RACI rule:

The client sponsor is accountable for the commercial and organizational decision. The department owner is responsible for workflow truth, adoption, and operational feasibility. If those two disagree, the readout must name the disagreement as a decision risk.

Finance rule:

If finance participates, ROI assumptions can be marked finance-reviewed. If finance does not participate, the readout may include only a proxy value case and must list finance validation as a required next action.

## Standard Timeline

### Week 1

Day 1:

- Kickoff.
- Confirm objectives, stakeholders, functions, and evidence request.

Days 2-3:

- Executive, CFO, CTO/CIO, and security interviews.

Days 4-5:

- Department owner and operator interviews.
- Workflow candidate shortlist.

### Week 2

Days 6-7:

- Evidence review.
- Scorecard drafting.
- Red-gate review.

Days 8-9:

- First workflow recommendation.
- Executive readout drafting.
- Commercial next-step shaping.

Day 10:

- Readout.
- Decision on next step.

## In-Depth Timeline

### Week 1 - Alignment And Discovery

- Kickoff.
- Stakeholder map.
- Executive, finance, IT/security, and department interviews.
- Evidence request.

### Week 2 - Workflow And Stack Mapping

- Workflow mapping.
- Source-system mapping.
- API/MCP/export/database review.
- Deployment boundary review.

### Week 3 - Scoring And Business Case

- 12-gate scoring.
- Red-gate review.
- Workflow economics.
- ROI model.
- Initial agent/app design.

### Week 4 - Architecture And Operating Model

- Deployment recommendation.
- Governance and approval model.
- Reliability and evaluation plan.
- Run model.
- 90-day roadmap.

### Weeks 5-6 - Optional Depth

Use if needed for:

- More stakeholders.
- Multiple departments.
- Complex data boundaries.
- Detailed API/MCP validation.
- Procurement or infrastructure constraints.
- SOW alignment.

## Definition Of Done

NovaOrbit Standard is complete when:

- All required stakeholder groups have been interviewed or explicitly marked unavailable.
- 12 gates are scored.
- Evidence confidence is recorded.
- Red gates are open/closed.
- Top 3 workflow candidates are ranked.
- First workflow is recommended or discovery is recommended because no workflow is ready.
- Deployment direction is stated.
- Executive readout is delivered.
- Next-step proposal is clear.

NovaOrbit In-Depth is complete when:

- Standard definition of done is satisfied.
- API/MCP/source-system readiness is documented.
- Deployment recommendation is supported by constraints.
- ROI model is documented.
- Agent/app role is defined.
- Governance, approval, reliability, and run model are documented.
- 90-day implementation roadmap is produced.
- CTO appendix is delivered.

## Readout Acceptance Criteria

A strong readout must answer:

- What stage are we in?
- What caps maturity?
- Which workflow should go first?
- Why that workflow?
- Where will it run?
- What AI app or agent should be built?
- What should it not do?
- Who owns the outcome?
- What metric proves value?
- What are the first 30/60/90-day actions?
- What is the commercial next step?

## Risk Controls

If the client cannot provide evidence:

- Score conservatively.
- Mark confidence as low.
- State the assumption.
- Turn missing evidence into an action.

If the client wants implementation before red gates are resolved:

- Explain the cap.
- Propose In-Depth validation or a tightly scoped discovery sprint.
- Avoid a broad SOW.

If the client wants only a workshop:

- Position advisory as alignment.
- Position NovaOrbit as the scored assessment that produces a build decision.

If the client asks for legal/security certification:

- Clarify that NovaOrbit is not legal advice, a penetration test, or a formal compliance certification.
- Offer to work with the client's legal/security stakeholders.

## Handoff To First Workflow SOW

The assessment should feed directly into a proposal with:

- Workflow scope.
- Agent/app role.
- App surface.
- Systems and access assumptions.
- Deployment boundary.
- Approval and governance model.
- Reliability/evaluation plan.
- Run ledger requirements.
- Timeline.
- Commercials.
- Out-of-scope items.

## Internal QA Checklist

Before sending the report:

- [ ] NovaOrbit naming is consistent.
- [ ] "Assessment" is used for the offer; "audit" is only used for evidence/logging.
- [ ] Every gate has a score and confidence.
- [ ] Every red gate has a status.
- [ ] No sensitive client data is included unnecessarily.
- [ ] No ROI claim lacks an assumption.
- [ ] The first workflow is specific.
- [ ] The next action is definitive.
- [ ] The report can be read by a board member in 10 minutes.
- [ ] The appendix can survive CTO/CIO scrutiny.
