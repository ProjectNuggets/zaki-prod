# NovaOrbit Sample Assessment Report

Client:

**Atlas Components GmbH**

Status:

Fictional example for sales, training, and methodology demonstration. Do not present as a real client reference.

Report type:

NovaOrbit In-Depth sample

Prepared by:

Nova Nuggets

## 1. Executive Decision Page

Atlas Components GmbH is currently **Stage 3: Operational AI**.

The organization has a credible first workflow, known systems, a willing department owner, and a plausible customer-cloud deployment path. Stage 4 is not yet defensible because the value baseline, output reliability plan, and run model are not strong enough to scale beyond the first controlled workflow.

Recommended first workflow:

**RFQ response and quotation preparation for industrial component sales.**

Recommended first build:

**ZAKI RFQ Response Agent**

Recommended deployment:

**Customer-cloud deployment with Nova Nuggets operating support.**

Why this workflow first:

- Repeated, high-volume workflow.
- Clear cost of delay and rework.
- Strong sales owner.
- Source systems are known.
- Human approval already exists.
- First version can start as read-only plus draft generation before any writeback.

Primary metric:

Reduce average RFQ preparation cycle time from **3.8 business days** to **2.4 business days** within 90 days of launch.

Critical red gates:

| Red Gate | Status | Impact |
| --- | --- | --- |
| No access, no AI | Conditional | Access path exists for documents, CRM, and inbox. SAP pricing export requires IT validation before final SOW. |
| No workflow, no agent | Closed | RFQ workflow is repeated, owned, and measurable. |
| No owner, no impact | Closed | Sales operations owner and executive sponsor are named. |
| No evidence, no scale | Open | Baseline exists only from sampled RFQs, not automated reporting. |
| No reliability, no autonomy | Open | Output evaluation and exception handling must be designed before approved actions or writeback. |

Recommended next decision:

Approve a **60-90 day First Workflow SOW** for a read-only and draft-generation ZAKI RFQ Response Agent only after one of two access paths is confirmed: controlled SAP pricing export/API, or a v1 scope that excludes pricing retrieval and routes pricing checks to human review. Reliability testing, human approval, and ROI measurement must be built into the launch.

## 2. Client Context

Atlas Components GmbH is a fictional German mid-market manufacturer of precision components for industrial equipment suppliers.

Approximate profile:

| Attribute | Sample Assumption |
| --- | --- |
| Employees | 480 |
| Revenue band | EUR 80M-120M |
| Primary market | DACH industrial manufacturing |
| Current AI state | Individual ChatGPT/Copilot use, no governed workflow AI |
| Core systems | Microsoft 365, SharePoint, Dynamics CRM, SAP Business One, shared sales inbox |
| Target function | Sales operations and technical quotations |
| Sensitive data | Customer drawings, pricing, contract terms, component specifications |

Business pressure:

Atlas receives frequent RFQs from existing and new customers. Sales operations must gather prior quote history, check drawings/specifications, compare similar parts, review contract terms, request engineering clarification, and prepare a response package. The process is valuable but slow, with repeated manual search and handoff work.

## 3. Maturity Scorecard

| Dimension | Score | Stage Signal | Confidence | Key Blocker | Next Action |
| --- | ---: | --- | --- | --- | --- |
| Where: Infrastructure & Access | 7/12 | Stage 3 | Medium | SAP pricing access not validated | Confirm least-privilege export/API path |
| What: Applications & Agents | 8/12 | Stage 3 | High | Writeback should not start in v1 | Start read-only plus draft generation |
| How: Operations & Impact | 6/12 | Stage 2 | Medium | Baseline and run model are informal | Create measurement owner and run cadence |

Overall maturity:

**Stage 3: Operational AI**

Stage cap:

Cannot progress to Stage 4 until evidence and reliability red gates are closed.

Implementation condition:

The first workflow can proceed only if SAP pricing access is validated or explicitly excluded from v1. Without that decision, the access red gate remains open and the project should stay in implementation discovery.

Interpretation:

Atlas has enough structure to build the first controlled AI workflow. It is not ready to scale an AI workforce across departments until measurement, output reliability, and run operations are proven in the first workflow.

## 4. Gate-Level Score

| Dimension | Gate | Score | Evidence Confidence | Key Evidence | Blocker | Owner | Next Action |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| Where | W1 Deployment Boundary | 2 | Medium | Customer prefers Azure/customer cloud for sensitive commercial data | Operating access needs approval | CTO | Confirm deployment responsibility model |
| Where | W2 Inference Readiness | 2 | Medium | Expected 30-45 RFQs/week; latency not critical | Model cost not yet estimated | CTO | Estimate volume, token use, and monitoring |
| Where | W3 Access Readiness | 2 | Medium | SharePoint, CRM, inbox, SAP export path identified | SAP export/API path requires validation | IT lead | Validate source-system access and permissions |
| Where | W4 Control Plane | 1 | Medium | SSO and logging exist, but AI run ledger is not defined | AI activity logs not designed | IT/security | Define run ledger and audit fields |
| What | A1 Workflow Fit | 3 | High | RFQ workflow is repeated, high-friction, and owned | None | Sales operations | Build candidate approved |
| What | A2 Agent Role | 2 | High | Agent role defined for retrieval, comparison, draft response, checklist | Evaluation examples missing | Sales operations | Create test set and quality rubric |
| What | A3 App Surface | 2 | Medium | Sales wants CRM-linked web app plus email draft output | UX states not designed | Sales operations | Design first user journey |
| What | A4 Integration Depth | 1 | High | Read-only and draft generation safe for v1 | Writeback not approved | Sales + IT | Defer writeback until reliability gate closes |
| How | H1 Ownership | 2 | High | Sponsor, sales owner, IT owner named | Approval owner needs formal confirmation | Sponsor | Confirm approval RACI |
| How | H2 Business Case | 1 | Medium | RFQ sample reviewed; cycle-time estimate exists | Automated baseline absent | Finance | Validate baseline and cost proxy |
| How | H3 Governance | 2 | Medium | Human approval already required for quotes | AI exception policy missing | Security/sales | Define exception and escalation model |
| How | H4 Run Model | 1 | Low | Support expectation discussed | No post-launch operating cadence | Sponsor | Define 90-day run model |

## 5. Red-Gate Review

### Conditional: No access, no AI

Source systems are known and initial access paths exist. The gate is not fully clean because SAP pricing access is not validated. This does not block a scoped first workflow, but it blocks a final implementation SOW until the access path is confirmed.

Required action:

Validate whether SAP pricing can be accessed through API, scheduled export, controlled database view, or manual upload for v1. If not, remove pricing retrieval from v1 and require a human pricing check before any draft leaves sales operations.

Owner:

IT lead.

### Closed: No workflow, no agent

The RFQ workflow is specific, repeated, owned, and valuable. It has a clear start, output, and human approval point.

Required action:

Lock v1 scope around read-only retrieval, comparison, checklist generation, and draft response preparation.

Owner:

Sales operations.

### Closed: No owner, no impact

Executive sponsor, sales operations owner, and IT owner are identified. Approval ownership must be formally recorded before launch.

Required action:

Add approval owner to the RACI.

Owner:

Client sponsor.

### Open: No evidence, no scale

Atlas has sampled RFQ cycle-time data, but not automated baseline reporting. The first workflow can proceed, but scale decisions require better evidence.

Required action:

Create a baseline measurement plan before build starts.

Owner:

Finance owner and sales operations.

### Open: No reliability, no autonomy

The agent can draft and recommend, but cannot act autonomously until output quality, hallucination controls, source grounding, exception handling, and human review are tested.

Required action:

Create a 30-case evaluation set, output rubric, exception taxonomy, and approval workflow before any writeback.

Owner:

Nova Nuggets with sales operations and IT/security.

## 6. Where: Infrastructure & Access

Current state:

- Microsoft 365 and SharePoint hold product documents, historical quote templates, and customer correspondence.
- Dynamics CRM contains customer/account history.
- SAP Business One contains pricing and part data.
- Shared inbox contains RFQ intake and current correspondence.
- Azure/customer cloud is acceptable in principle, but operating access must be approved.

Recommended deployment:

**Customer cloud.**

Rationale:

- Data is commercially sensitive but not currently classified as requiring local NooX inference.
- Customer cloud preserves ownership of network, identity, data boundary, and logs.
- Latency is not the primary constraint.
- NooX can remain an option if future workflows require local inference, customer contract assurance, or plant-level processing.

Access assumptions:

| System | Required Use | Access Path | Status |
| --- | --- | --- | --- |
| SharePoint | Product docs, quote templates, specifications | Graph API or controlled document library access | Plausible |
| Dynamics CRM | Account context, prior opportunities, customer metadata | API/service account with scoped permissions | Plausible |
| SAP Business One | Pricing and part master data | API/export/database view to validate | Open |
| Shared inbox | RFQ intake and correspondence | Microsoft Graph/shared mailbox scope | Plausible |

Control requirements:

- Role-based access.
- Run ledger for every generated draft.
- Source citations for retrieved documents.
- Human approval before response leaves the company.
- Logs for context used, user action, approval status, and exceptions.

## 7. What: Applications & Agents

Recommended agent:

**ZAKI RFQ Response Agent**

Agent role:

Help sales operations prepare RFQ responses by retrieving relevant customer, part, pricing, and document context, comparing against prior quotes, producing a preparation checklist, and drafting a response package for human review.

Agent job description:

| Field | Definition |
| --- | --- |
| Users | Sales operations, account managers, technical sales |
| Inputs | RFQ email, drawings/specification attachments, customer name, part references |
| Outputs | RFQ summary, missing information checklist, prior quote comparison, draft response, internal handoff note |
| Tools/systems | SharePoint, Dynamics CRM, SAP pricing export/API, shared inbox |
| Memory/context | Product docs, quote templates, prior RFQs, customer account context |
| Allowed actions | Retrieve, summarize, compare, draft, flag exceptions |
| Forbidden actions | Send customer emails, change CRM/SAP records, approve pricing, commit delivery dates |
| Human approvals | Sales owner approves all outgoing customer responses |
| Quality checks | Source citations, confidence flags, exception tags, review checklist |
| Fallback path | Route unclear or high-risk RFQs to sales operations and engineering |

Recommended v1 integration depth:

**Read-only plus draft generation.**

Deferred:

- CRM writeback.
- Automated customer email sending.
- Pricing approval.
- Delivery-date commitment.

Reason:

Reliability gate is open. Human approval must stay central until the evaluation set proves source grounding, output quality, and safe exception handling.

## 8. How: Operations & Impact

Owner map:

| Role | Named Owner In Sample | Responsibility |
| --- | --- | --- |
| Executive sponsor | Managing Director | Funding and decision authority |
| Workflow owner | Head of Sales Operations | Workflow accuracy, adoption, success metric |
| IT owner | Head of IT | Access, cloud boundary, identity, logs |
| Security/compliance owner | IT security lead | Data boundary, approvals, logging |
| Finance owner | Controller | Baseline validation and value case |
| Approval owner | Head of Sales Operations | Final customer-facing approval |

Primary business case:

Reduce manual RFQ preparation time and cycle time while improving response consistency.

Baseline assumptions:

| Input | Sample Value | Confidence |
| --- | ---: | --- |
| RFQ volume | 38/week | Medium |
| Active labor time | 95 minutes/RFQ | Medium |
| Average cycle time | 3.8 business days | Medium |
| Fully loaded hourly cost proxy | EUR 68/hour | Low until finance validates |
| Expected assist rate | 25% | Medium |
| Working weeks/year | 46 | High |

Conservative capacity model:

`38 RFQs/week * 95 minutes = 60.2 active hours/week`

`60.2 active hours/week * 25% assist rate = 15.05 hours/week released`

`15.05 hours/week * EUR 68/hour * 46 weeks = EUR 47,069 annual capacity value`

Expected value range:

| Scenario | Annual Value | Notes |
| --- | ---: | --- |
| Conservative | EUR 35k-50k | Capacity release only, low finance confidence |
| Expected | EUR 65k-95k | Includes reduced rework and faster sales response |
| Upside | EUR 120k+ | Requires validated conversion or win-rate impact |

Finance status:

Proxy value case only. Finance validation is required before calling this a finance-approved ROI case.

What is not counted:

- No headcount reduction is assumed.
- No win-rate uplift is counted in the conservative case.
- No customer lifetime value uplift is counted.
- No procurement or engineering productivity benefit is counted.
- No value is claimed for fully autonomous action.

Payback view:

The conservative capacity case can justify a tightly scoped first workflow if implementation cost stays near the lower end of the First Workflow range and if the client values cycle-time reduction. It does not justify broad AI workforce scaling by itself. Scale should depend on 90-day evidence.

## 9. First Workflow Recommendation

Recommended first workflow:

**RFQ response and quotation preparation.**

Why first:

- It is repeated and painful.
- It uses existing company context.
- It has known systems and owners.
- It can start safely without writeback.
- It creates measurable cycle-time and capacity evidence.
- It leads naturally to managed ZAKI agents if successful.

Why not other candidates first:

| Candidate | Reason Deferred |
| --- | --- |
| Engineering design support | Higher technical risk and unclear output liability. |
| Procurement negotiation assistant | Supplier terms and writeback actions require stronger governance. |
| Finance invoice exception handling | Good candidate, but source-system access is less mature. |
| HR policy assistant | Lower direct business impact than RFQ cycle-time reduction. |

V1 scope:

- Intake RFQ from shared inbox.
- Extract customer, part, requirements, and missing data.
- Retrieve relevant prior quotes and product documents.
- Compare against similar components and quote templates.
- Generate internal preparation checklist.
- Draft customer response for human approval.
- Log sources, user, output, approval status, and exception tags.

Out of scope for v1:

- Automated email sending.
- SAP writeback.
- Price approval.
- Delivery-date commitment.
- Fully autonomous customer negotiation.

## 10. 90-Day Execution Path

| Period | Objective | Actions | Evidence Produced |
| --- | --- | --- | --- |
| Days 0-30 | Confirm build foundation | Validate SAP access path, create 30-case test set, define approval RACI, confirm baseline, design run ledger | Access decision, evaluation set, baseline model, RACI |
| Days 31-60 | Build and validate v1 | Build retrieval, draft generation, checklist, source citations, review UI, exception tags | Working prototype, quality test results, issue log |
| Days 61-90 | Launch controlled workflow | Pilot with sales operations, measure cycle time, collect user feedback, review exceptions weekly | Usage ledger, cycle-time delta, quality score, scale recommendation |

## 11. Recommended Commercial Next Step

Recommended next step:

**First Workflow SOW: ZAKI RFQ Response Agent**

Expected delivery:

60-90 days.

Commercial direction:

From EUR 35,000, final scope dependent on SAP access path, UI surface, and deployment requirements.

Follow-on:

If the first workflow meets quality and adoption criteria, convert into managed ZAKI agent run support and prepare the next workflow candidate.

## 12. CTO Appendix

### Proposed Architecture

`Shared inbox -> Intake parser -> Retrieval layer -> Source-grounded draft engine -> Review UI -> Human approval -> Run ledger`

Source systems:

- Microsoft Graph for mailbox and SharePoint.
- Dynamics CRM API for customer/account context.
- SAP Business One export/API for pricing and part data.

Deployment:

- Customer cloud.
- Nova Nuggets operated under least-privilege access.
- Client-owned identity, logs, and data boundary.

Data handling:

- No production secrets shared in assessment artifacts.
- No customer-facing message sent without human approval.
- Source documents cited in generated output.
- Sensitive data remains inside agreed customer-cloud boundary.

Reliability plan:

- 30-case historical RFQ evaluation set.
- Output quality rubric.
- Source citation requirement.
- Confidence and exception tags.
- Human approval before external response.
- Weekly exception review during pilot.

Minimum run ledger:

| Field | Purpose |
| --- | --- |
| User | Who triggered the run |
| RFQ ID | Workflow traceability |
| Sources retrieved | Grounding evidence |
| Draft generated | Output review |
| Confidence flags | Reliability monitoring |
| Exception tags | Risk and improvement |
| Approver | Human control |
| Final status | Outcome tracking |

Open technical risks:

- SAP pricing access path may require custom export.
- Historical quote quality may vary.
- Customer-specific pricing rules may not be consistently documented.
- Attachment parsing quality depends on drawing/specification format.

## 13. Evidence Appendix

Sample interviews completed:

- Managing Director.
- Head of Sales Operations.
- Head of IT.
- IT security lead.
- Sales operations specialist.
- Account manager.
- Controller.

Sample artifacts reviewed:

- Redacted RFQ examples.
- Quote template.
- SharePoint product folder structure.
- CRM opportunity screenshot.
- SAP export sample.
- AI acceptable use draft.

Evidence confidence:

| Area | Confidence | Notes |
| --- | --- | --- |
| Workflow fit | High | Multiple examples and owner confirmation. |
| Access readiness | Medium | System paths known, SAP validation pending. |
| Business case | Medium | Baseline sampled, finance validation pending. |
| Governance | Medium | Human approval exists, AI exception process missing. |
| Reliability | Low | Evaluation set not yet created. |

## 14. Board Summary

Atlas Components GmbH is ready for a controlled first AI workflow, not broad AI workforce scaling yet. The recommended first build is a ZAKI RFQ Response Agent in customer cloud. The workflow is valuable, repeated, and owned. The main blockers are evidence and reliability: Atlas must validate the baseline, design output testing, and keep human approval in place before any autonomy or writeback.

The next decision is whether to approve a 60-90 day First Workflow SOW.
