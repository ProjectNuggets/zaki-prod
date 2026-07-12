import {
  ArrowRight,
  Building2,
  CircuitBoard,
  ClipboardCheck,
  FileCheck2,
  Fingerprint,
  Gauge,
  Network,
  Orbit,
  Presentation,
  ShieldCheck,
  Target,
  Workflow,
} from "lucide-react";

export const SITE_URL = "https://novanuggets.com";
export const ZAKI_URL = "https://chatzaki.com";
export const BOOKING_URL = "https://calendar.app.google/7rmv1kwmYhum1TTT9";
export const GENERAL_EMAIL = "hello@novanuggets.com";
export const FOUNDER_EMAIL = "as@novanuggets.com";
export const INVESTOR_MEMO_URL = "/assets/downloads/nova-nuggets-seed-deck.pdf";
export const INVESTOR_REQUEST_URL =
  "mailto:hello@novanuggets.com?subject=Investor%20memo%20request%20%7C%20Nova%20Nuggets";
export const NOVAORBIT_ONE_PAGER_URL = "/assets/downloads/novaorbit-one-pager.pdf";
export const NOVAORBIT_WORKBOOK_URL = "/assets/downloads/novaorbit-scoring-workbook.xlsx";
export const NOVAORBIT_WHITE_PAPER_REQUEST_URL =
  "mailto:hello@novanuggets.com?subject=Closing%20the%20last%20mile%20white%20paper%20request%20%7C%20NovaOrbit";

export type PageSlug =
  | "home"
  | "nova-orbit"
  | "nova-orbit-sample-report"
  | "what-we-do"
  | "deploy"
  | "proof"
  | "pricing"
  | "team"
  | "advisory"
  | "contact"
  | "investors"
  | "impressum"
  | "privacy"
  | "nova-orbit-snapshot"
  | "approach"
  | "ai-workforce"
  | "architecture"
  | "field-notes"
  | "field-note-ai-workforce"
  | "field-note-private-ai-infrastructure"
  | "field-note-sovereign-ai"
  | "field-note-rag-automation"
  | "field-note-noox";

export type RouteDefinition = {
  slug: PageSlug;
  path: string;
  label: string;
  title: string;
  description: string;
};

export const routes: RouteDefinition[] = [
  {
    slug: "home",
    path: "/",
    label: "Home",
    title: "Nova Nuggets | NovaOrbit AI Assessment, Agents, and Infrastructure",
    description:
      "Nova Nuggets helps companies ship owned AI work, not scripts, API wrappers, or demos: NovaOrbit assessments, ZAKI agents, AI apps, and private infrastructure.",
  },
  {
    slug: "nova-orbit",
    path: "/nova-orbit/",
    label: "NovaOrbit",
    title: "NovaOrbit AI Maturity Assessment | Nova Nuggets",
    description:
      "NovaOrbit is the AI maturity assessment that turns Where, What, and How into a 2-week or 4-6-week path toward shipped AI work.",
  },
  {
    slug: "nova-orbit-sample-report",
    path: "/nova-orbit-sample-report/",
    label: "Sample Report",
    title: "NovaOrbit Sample Report | Atlas Components Example",
    description:
      "Preview a fictional NovaOrbit assessment readout showing maturity score, red gates, first workflow, deployment path, ROI confidence, and 90-day roadmap.",
  },
  {
    slug: "what-we-do",
    path: "/what-we-do/",
    label: "What we do",
    title: "What Nova Nuggets Does | AI Workforce Operating Partner",
    description:
      "Nova Nuggets delivers the full stack required to ship measurable AI work: runtime, inference, ZAKI agents, apps, integrations, governance, and transformation support.",
  },
  {
    slug: "deploy",
    path: "/deploy/",
    label: "Deploy",
    title: "How Nova Nuggets Deploys | Private AI Workforce Architecture",
    description:
      "Choose the AI runtime that protects the workflow: NooX on-prem, customer cloud, or NNGTs cloud with governed deployment and operating support.",
  },
  {
    slug: "proof",
    path: "/proof/",
    label: "Proof",
    title: "Nova Nuggets Proof | German Mid-Market AI Workforce Pilot",
    description:
      "See the public proof path for measurable workflow savings, department adoption, governed agents, and NDA-controlled buyer evidence.",
  },
  {
    slug: "pricing",
    path: "/pricing/",
    label: "Pricing",
    title: "Nova Nuggets Pricing | NovaOrbit, First Workflow, Managed Agents",
    description:
      "Start with a 2-week NovaOrbit Standard or 4-6-week In-Depth assessment, ship a first workflow in 60-90 days, then scale managed ZAKI agents.",
  },
  {
    slug: "team",
    path: "/team/",
    label: "Team",
    title: "Nova Nuggets Team | Operators Building AI Workforces",
    description:
      "The Nova Nuggets operator team combines strategy, engineering, deployment, and AI transformation experience across DACH and the GCC.",
  },
  {
    slug: "advisory",
    path: "/advisory/",
    label: "Advisory",
    title: "Nova Nuggets Advisory | Board Sessions and NovaOrbit Alignment",
    description:
      "Executive AI sprints, board sessions, and alignment sessions for teams preparing to move from AI tools to owned AI workforces.",
  },
  {
    slug: "approach",
    path: "/approach/",
    label: "Approach",
    title: "Nova Nuggets Approach | Gated AI Assessment to Production",
    description:
      "The Nova Nuggets methodology moves buyers from NovaOrbit diagnosis to first-workflow build and managed AI operations through ownership, access, reliability, and evidence gates.",
  },
  {
    slug: "ai-workforce",
    path: "/ai-workforce/",
    label: "AI Workforce",
    title: "AI Workforce | Managed ZAKI Agents",
    description:
      "Managed ZAKI agents give employees and departments governed AI capacity with private memory, approved tools, human control, and measurable output.",
  },
  {
    slug: "architecture",
    path: "/architecture/",
    label: "Architecture",
    title: "Reference Architecture | Private AI Deployment",
    description:
      "The Nova Nuggets reference architecture connects inference, memory, tools, model routing, guardrails, observability, and audit evidence inside private deployment boundaries.",
  },
  {
    slug: "field-notes",
    path: "/field-notes/",
    label: "Field Notes",
    title: "Field Notes | AI Workforce and Private AI Infrastructure",
    description:
      "Founder-led essays from Nova Nuggets on owned AI workforces, private AI infrastructure, sovereign AI, RAG, automation, and NooX inference.",
  },
  {
    slug: "field-note-ai-workforce",
    path: "/field-notes/ai-workforce/",
    label: "AI Workforce",
    title: "What Is an AI Workforce? | Nova Nuggets Field Notes",
    description:
      "An AI workforce is the managed layer of agents, memory, tools, approvals, and evidence that turns AI from individual prompts into company work.",
  },
  {
    slug: "field-note-private-ai-infrastructure",
    path: "/field-notes/private-ai-infrastructure/",
    label: "Private AI Infrastructure",
    title: "Private AI Needs Infrastructure, Not Just Software | Nova Nuggets",
    description:
      "Why enterprise AI needs a designed place to run: inference, data boundaries, identity, observability, and operating control.",
  },
  {
    slug: "field-note-sovereign-ai",
    path: "/field-notes/sovereign-ai/",
    label: "Sovereign AI",
    title: "Sovereign AI for the German Mid-Market | Nova Nuggets",
    description:
      "Sovereign AI is an operating posture: where models run, where data lives, who can access context, and how evidence is governed.",
  },
  {
    slug: "field-note-rag-automation",
    path: "/field-notes/rag-automation/",
    label: "RAG and Automation",
    title: "RAG Is Not a Product. It Is a Memory Layer. | Nova Nuggets",
    description:
      "RAG only creates enterprise value when connected to workflow ownership, approvals, tools, measurement, and operating support.",
  },
  {
    slug: "field-note-noox",
    path: "/field-notes/noox/",
    label: "NooX",
    title: "NooX and the Case for Local AI Inference | Nova Nuggets",
    description:
      "NooX is the NNGTs AI inferencing computer for private workloads that need local control, predictable latency, and model-serving ownership.",
  },
  {
    slug: "contact",
    path: "/contact/",
    label: "Contact",
    title: "Contact Nova Nuggets | Book NovaOrbit",
    description:
      "Book NovaOrbit to map the first workflow, deployment boundary, owner, ROI signal, and path to governed AI work.",
  },
  {
    slug: "investors",
    path: "/investors/",
    label: "Investors",
    title: "Nova Nuggets Investors | Owned AI Workforce Company",
    description:
      "Investor overview for Nova Nuggets: product-led ZAKI surface, full-stack AI delivery, enterprise workflow revenue, and owned AI workforce thesis.",
  },
  {
    slug: "impressum",
    path: "/impressum/",
    label: "Impressum",
    title: "Impressum | Nova Nuggets",
    description:
      "Legal notice and provider identification for Nova Nuggets. Placeholder details to be finalized before launch.",
  },
  {
    slug: "privacy",
    path: "/privacy/",
    label: "Privacy",
    title: "Privacy Notice | Nova Nuggets",
    description:
      "Privacy notice for Nova Nuggets website visitors, inquiries, and NovaOrbit booking requests.",
  },
  {
    slug: "nova-orbit-snapshot",
    path: "/nova-orbit-snapshot/",
    label: "NovaOrbit Snapshot",
    title: "NovaOrbit Snapshot | AI Maturity Gap Map",
    description:
      "Generate a client-side NovaOrbit maturity gap map across 12 AI benchmarks, red-gate caps, stages, and next actions.",
  },
];

const navBySlug = (slug: PageSlug, label: string) => {
  const route = routes.find((item) => item.slug === slug);
  if (!route) throw new Error(`Missing primary nav route: ${slug}`);
  return { ...route, label };
};

export const primaryNav = [
  navBySlug("nova-orbit", "Orbit"),
  navBySlug("what-we-do", "System"),
  navBySlug("deploy", "Deploy"),
  navBySlug("proof", "Proof"),
  navBySlug("pricing", "Pricing"),
  navBySlug("team", "Team"),
];

export function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  const withLeading = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

export function routeForPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return routes.find((route) => route.path === normalized) ?? routes[0];
}

export type FieldNote = {
  slug: string;
  path: string;
  label: string;
  title: string;
  deck: string;
  dimension: string;
  decision: string;
  boardQuestion: string;
  operatingMove: string;
  date: string;
  readingTime: string;
  audience: string;
  keywords: string[];
  thesis: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  cta: {
    label: string;
    href: string;
  };
};

export const fieldNotes: FieldNote[] = [
  {
    slug: "ai-workforce",
    path: "/field-notes/ai-workforce/",
    label: "Category",
    title: "What is an AI workforce?",
    deck:
      "The decision: stop treating AI as individual seats and start designing company-owned work capacity with roles, permissions, tools, approvals, and evidence.",
    dimension: "Apps / Agents",
    decision: "Turn scattered AI usage into owned work capacity with a named role, tool boundary, approval path, and evidence trail.",
    boardQuestion: "Which workflow should become company-owned AI capacity first?",
    operatingMove: "Name the workflow owner, approved systems, human checkpoints, and value signal before building the first agent.",
    date: "2026-06-10",
    readingTime: "5 min read",
    audience: "CEOs, transformation leaders, department owners",
    keywords: ["AI workforce", "managed AI agents", "ZAKI agents", "employee AI agents"],
    thesis:
      "The shift is from individual AI assistance to company-owned work capacity: repeatable, governed, measurable, and connected to real workflows.",
    sections: [
      {
        title: "The company does not need another tab.",
        body:
          "Most AI adoption starts with personal productivity. That can help individuals, but it does not create company-owned capacity. Work becomes repeatable only when context, permissions, tools, approvals, and outcomes are designed around a named workflow.",
      },
      {
        title: "Agents need roles before autonomy.",
        body:
          "A useful agent knows the work it owns, the sources it can use, the systems it can touch, the moments that require human approval, and the output that counts as done. That makes the agent part of operations instead of a demo.",
      },
      {
        title: "Evidence is the operating language.",
        body:
          "Leadership should not scale AI because a demo looks impressive. It should scale when usage, cycle time, saved work, exceptions, and approvals are visible enough for finance, IT, and department owners to trust the next deployment.",
      },
    ],
    cta: { label: "Assess your first AI workforce workflow", href: BOOKING_URL },
  },
  {
    slug: "private-ai-infrastructure",
    path: "/field-notes/private-ai-infrastructure/",
    label: "Infrastructure",
    title: "Private AI needs infrastructure, not just software.",
    deck:
      "The decision: choose the operating boundary before the model. Serious AI needs inference, memory, identity, routing, and observability in one deployment posture.",
    dimension: "Infrastructure",
    decision: "Choose where AI runs, which systems it can reach, and how model, memory, identity, and logs stay governable.",
    boardQuestion: "Can AI function on the current tech stack without exposing data or losing control?",
    operatingMove: "Inventory deployment posture, API access, MCP/tool access, identity, data residency, observability, and inference options.",
    date: "2026-06-10",
    readingTime: "6 min read",
    audience: "CTOs, CIOs, data leaders, security teams",
    keywords: ["private AI infrastructure", "on-prem AI inference", "AI deployment", "model serving"],
    thesis:
      "A serious AI program needs a designed runtime: inference, identity, memory, network posture, observability, and support tied to business workflows.",
    sections: [
      {
        title: "The perimeter comes first.",
        body:
          "Before choosing a model, the organization needs to know where data can live, who controls keys, what systems agents can access, and what evidence the business needs from every run. The runtime is a business decision, not only an IT preference.",
      },
      {
        title: "Tool access is a maturity gate.",
        body:
          "Many AI programs stall because the current stack cannot expose clean APIs, approvals, logs, or tool actions. NovaOrbit treats API readiness, MCP paths, identity, and auditability as part of infrastructure maturity.",
      },
      {
        title: "Ownership does not mean isolation.",
        body:
          "Private AI should still be operable. The point is to control routing, memory, logs, tools, and permissions while keeping the business able to use the right model and deployment path for the workflow.",
      },
    ],
    cta: { label: "Compare deployment models", href: "/deploy/" },
  },
  {
    slug: "sovereign-ai",
    path: "/field-notes/sovereign-ai/",
    label: "Sovereignty",
    title: "Sovereign AI for the German mid-market.",
    deck:
      "The decision: make sovereignty operational. Control data, models, access, deployment, and the evidence trail around automated work.",
    dimension: "Infrastructure + Operations",
    decision: "Translate sovereignty from policy language into workflow controls, deployment boundaries, and audit-ready operating evidence.",
    boardQuestion: "Where can sensitive work run, who controls it, and what proof survives diligence?",
    operatingMove: "Map one sensitive workflow against data residency, approval authority, run logs, model routing, and escalation ownership.",
    date: "2026-06-10",
    readingTime: "5 min read",
    audience: "German mid-market leaders, boards, compliance owners",
    keywords: ["sovereign AI", "German AI", "private AI Germany", "enterprise AI governance"],
    thesis:
      "German companies need AI that respects operational seriousness: privacy, data residency, accountability, and practical productivity.",
    sections: [
      {
        title: "Sovereignty starts with the workflow.",
        body:
          "The question is not whether a company is philosophically sovereign. The question is whether sensitive workflows can use AI without losing control over documents, customer data, approvals, model routes, and operational records.",
      },
      {
        title: "The mid-market needs pragmatism.",
        body:
          "Most companies do not need a research lab before they need progress. They need one workflow improved, one department onboarded, one risk boundary agreed, and one measurable case that justifies the next step.",
      },
      {
        title: "The operating model matters as much as the model.",
        body:
          "Sovereign AI fails when it becomes only infrastructure. It works when infrastructure, agents, governance, support, and adoption are delivered as one system with clear ownership.",
      },
    ],
    cta: { label: "Book a NovaOrbit scoping call", href: BOOKING_URL },
  },
  {
    slug: "rag-automation",
    path: "/field-notes/rag-automation/",
    label: "Memory",
    title: "RAG is not a product. It is a memory layer.",
    deck:
      "The decision: do not sell retrieval as transformation. RAG creates value when it sits inside a workflow with owners, permissions, tools, measurement, and action.",
    dimension: "Apps / Agents",
    decision: "Treat retrieval as one layer in an agent workflow, not the business outcome.",
    boardQuestion: "What can the agent know, do, and prove after retrieval?",
    operatingMove: "Define source authority, access rules, action path, approval moments, output state, and evidence ledger before scaling memory.",
    date: "2026-06-10",
    readingTime: "5 min read",
    audience: "Product leaders, operations teams, data teams",
    keywords: ["RAG", "AI automation", "enterprise memory", "workflow automation"],
    thesis:
      "RAG is necessary infrastructure for many enterprise agents, but it is not enough to create business value by itself.",
    sections: [
      {
        title: "Search is not work.",
        body:
          "A RAG system can retrieve the right document and still fail commercially if it does not connect to the next decision, tool, approval, or customer-facing output. Retrieval only matters when it changes the work path.",
      },
      {
        title: "Memory needs permissions.",
        body:
          "Company memory is not one pile of documents. Different employees, departments, and agents need different source authority, access, retention, audit, and escalation rules.",
      },
      {
        title: "Automation closes the loop.",
        body:
          "The useful pattern is memory plus action: retrieve context, draft or decide, call an approved tool, route for human approval, then write the result into the evidence ledger so leadership can see what changed.",
      },
    ],
    cta: { label: "Map a RAG workflow", href: BOOKING_URL },
  },
  {
    slug: "noox",
    path: "/field-notes/noox/",
    label: "NooX",
    title: "NooX and the case for local AI inference.",
    deck:
      "The decision: give private workloads a controlled place to run when latency, data posture, or customer trust makes cloud-only AI too thin.",
    dimension: "Infrastructure",
    decision: "Use local or dedicated inference when control, latency, trust, or workload economics make generic cloud routing insufficient.",
    boardQuestion: "Which workloads deserve local or dedicated inference instead of default cloud routing?",
    operatingMove: "Classify workloads by data sensitivity, latency, model size, availability, cost envelope, and support model before hardware decisions.",
    date: "2026-06-10",
    readingTime: "6 min read",
    audience: "Technical buyers, IT owners, infrastructure leaders",
    keywords: ["NooX", "AI inferencing computer", "local AI inference", "on-prem AI server"],
    thesis:
      "Inference is part of the operating boundary. For some organizations, the right answer is a local or custom server designed around the workload.",
    sections: [
      {
        title: "Not every workload belongs in a generic cloud path.",
        body:
          "Some workflows need predictable latency, physical control, sensitive-data posture, or a deployment story that customers and internal compliance teams can understand quickly. The question is which workloads justify that boundary.",
      },
      {
        title: "NooX can be standard or custom.",
        body:
          "The standard appliance is one path. For larger or more specialized workloads, NNGTs can design central or decentralized inference servers with load balancing, storage, monitoring, and model-serving choices shaped by the project.",
      },
      {
        title: "Hardware only matters when it serves operations.",
        body:
          "NooX is not a hardware story by itself. It is the infrastructure layer below ZAKI agents, RAG, apps, audit trails, support, and workflow automation.",
      },
    ],
    cta: { label: "See NooX deployment options", href: "/deploy/" },
  },
];

export function fieldNoteForPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return fieldNotes.find((note) => note.path === normalized);
}

export const proofPoints = [
  { value: "90 days", label: "assessment to measurable workflow evidence" },
  { value: "EUR 6k/week", label: "reference productivity benchmark" },
  { value: "3 departments", label: "using managed ZAKI agents" },
  { value: "private boundary", label: "customer data kept inside perimeter" },
];

export const commandRoomLanes = [
  {
    label: "01 / Pick the workflow",
    title: "Choose the first workflow worth changing.",
    detail: "NovaOrbit captures the owner, cost, risk, data boundary, and success metric before any agent is built.",
    metric: "4-6 weeks",
  },
  {
    label: "02 / Build the agent",
    title: "ZAKI works with approved context and tools.",
    detail: "Role-aware agents retrieve context, call approved tools, draft outputs, and keep task state inside the perimeter.",
    metric: "3 departments",
  },
  {
    label: "03 / Keep control",
    title: "Humans approve sensitive work.",
    detail: "Approvals, escalation rules, and fallback paths stay visible to employees and auditable to leadership.",
    metric: "0 bytes out",
  },
  {
    label: "04 / Prove scale",
    title: "Each run creates evidence for the next decision.",
    detail: "Usage, cycle time, savings, and exceptions become the evidence for what scales next.",
    metric: "EUR 6k/week",
  },
];

export const proofArtifacts = [
  {
    title: "Workflow economics",
    label: "before / after",
    text: "Before/after cycle time, handoff, and productivity model tied to a named department owner.",
  },
  {
    title: "Deployment boundary",
    label: "customer perimeter",
    text: "Cloud, identity, data residency, model routing, and operating access decisions documented before build.",
  },
  {
    title: "Agent run ledger",
    label: "audit trail",
    text: "Role, memory retrieval, tool call, approval, exception, output, and outcome records for governed adoption.",
  },
  {
    title: "Scale decision",
    label: "next workflow",
    text: "A leadership-ready recommendation for which department or workflow gets the next managed agent.",
  },
];

export const proofMedia = [
  {
    label: "sanitized ROI screen",
    title: "Before / after economics",
    metric: "EUR 6k/week",
    text: "A buyer-facing view of the savings model without exposing the customer's workflow or internal rates.",
  },
  {
    label: "workflow map",
    title: "Human + agent handoff path",
    metric: "90 days",
    text: "An anonymized map showing where intake, retrieval, approvals, and the agent run ledger sit in the process.",
  },
  {
    label: "run ledger",
    title: "Audit-ready agent activity",
    metric: "private boundary",
    text: "Representative ledger view for tool calls, approvals, source grounding, exceptions, and owner decisions.",
  },
];

export const proofQuotes = [
  {
    label: "evidence policy",
    quote: "Estimated proof stays labelled as estimated. Customer-specific evidence is shared only when approved or under NDA.",
  },
  {
    label: "next evidence layer",
    quote: "The reference dossier backlog includes ZAKI screenshots, run ledgers, workflow maps, ROI models, and approved buyer quotes.",
  },
];

export const proofCaseRows = [
  {
    label: "01 Before",
    title: "Manual work spread across people and systems",
    text: "The workflow depended on intake, research, drafting, review, approval, and handoff work that was not visible as one operating path.",
  },
  {
    label: "02 NovaOrbit",
    title: "Boundary, owner, baseline, gates",
    text: "NovaOrbit fixed the workflow owner, deployment boundary, access path, approval model, value baseline, and evidence plan before build.",
  },
  {
    label: "03 ZAKI",
    title: "Managed agent inside the work path",
    text: "ZAKI supported the chosen workflow with approved context, role-aware tools, human approval, exception handling, and a run ledger.",
  },
  {
    label: "04 Evidence",
    title: "ROI model, run ledger, workflow map",
    text: "The reference dossier shows before/after economics, workflow map, approval path, representative screenshots, and operating controls.",
  },
  {
    label: "05 Decision",
    title: "Scale only after gates are closed",
    text: "The output is not a generic success story. It is a decision record for what scales, what waits, and which workflow should be assessed next.",
  },
];

export const proofCaseArtifacts = [
  {
    label: "workflow map",
    title: "Before / after path",
    metric: "handoffs visible",
    text: "Shows where intake, source retrieval, drafting, review, approval, and exception handling moved after NovaOrbit.",
  },
  {
    label: "run ledger",
    title: "Agent activity record",
    metric: "approvals + exceptions",
    text: "Representative ZAKI record for source grounding, tool calls, approval events, exceptions, output state, and owner decisions.",
  },
  {
    label: "value model",
    title: "Finance baseline",
    metric: "EUR 6k/week",
    text: "Sanitized productivity benchmark with assumptions, sensitivity range, workflow owner, and scale-risk notes.",
  },
  {
    label: "decision memo",
    title: "Scale recommendation",
    metric: "next workflow",
    text: "Leadership note on whether to run Standard, In-Depth, or a first-workflow SOW, and which gates must close first.",
  },
];

export const proofDiligenceRows = [
  {
    label: "Qualification",
    title: "MNDA or mutual NDA first",
    text:
      "We share controlled evidence only with qualified buyers, named sponsors, and a real assessment or implementation decision in motion.",
  },
  {
    label: "Workflow artifacts",
    title: "Before, after, owners",
    text:
      "Review the anonymized workflow map, owner model, approval path, source-system boundary, and first-workflow scope.",
  },
  {
    label: "Operating evidence",
    title: "Run ledger and controls",
    text:
      "Inspect representative run-ledger views, approval events, exception handling, access assumptions, and reliability gates.",
  },
  {
    label: "Commercial proof",
    title: "Value model under context",
    text:
      "See the before/after economics structure, finance assumptions, sensitivity range, and scale recommendation without exposing private data.",
  },
  {
    label: "What stays private",
    title: "No raw customer data",
    text:
      "We do not publish customer-identifying material, credentials, raw datasets, sensitive workflow details, or confidential pricing.",
  },
  {
    label: "Buyer output",
    title: "Decision-ready path",
    text:
      "The evidence room is designed to answer whether the buyer should run NovaOrbit Standard, In-Depth, or a first-workflow SOW.",
  },
];

export const orbitDeliverables = [
  {
    label: "01",
    title: "NovaOrbit score",
    text: "Stage placement across Where, What, and How, with red gates that cap unsafe maturity claims.",
  },
  {
    label: "02",
    title: "Infrastructure and access map",
    text: "Deployment boundary, inferencing, APIs, MCP options, identity, audit, source systems, and access gaps.",
  },
  {
    label: "03",
    title: "First workflow proposal",
    text: "ZAKI role, AI app surface, tools, permissions, human approvals, fallback rules, and success metric.",
  },
  {
    label: "04",
    title: "90-day execution path",
    text: "Implementation roadmap, commercial path, deployment model, owner map, and measurable business outcome.",
  },
];

export const novaOrbitDownloadAssets = [
  {
    label: "Board pre-read",
    title: "NovaOrbit one-pager",
    href: NOVAORBIT_ONE_PAGER_URL,
    format: "PDF",
    text:
      "A one-page sales asset explaining the framework, two offers, deliverables, method, red gates, and commercial entry.",
  },
  {
    label: "Assessment tool",
    title: "NovaOrbit scoring workbook",
    href: NOVAORBIT_WORKBOOK_URL,
    format: "XLSX",
    text:
      "Editable workbook with 12-benchmark scoring, red-gate caps, workflow ROI model, and action plan for the readout.",
  },
];

export const sampleReportScoreRows = [
  {
    dimension: "Where: Infrastructure & Access",
    score: "7 / 12",
    stage: "Stage 3 candidate",
    blocker: "SAP pricing access not validated.",
    action: "Validate least-privilege API, export, database view, or manual upload path before build.",
  },
  {
    dimension: "What: Applications & Agents",
    score: "8 / 12",
    stage: "Stage 3",
    blocker: "Quotation workflow is clear, but output standard needs an evaluation set.",
    action: "Define accepted quote draft, source citations, confidence bands, and approval queue.",
  },
  {
    dimension: "How: Operations & Impact",
    score: "6 / 12",
    stage: "Stage 2 to 3",
    blocker: "Savings model is proxy until finance validates baseline and hourly assumptions.",
    action: "Separate capacity, cycle-time, quality, revenue, and risk impact in the CFO model.",
  },
];

export const sampleReportDecisionRows = [
  {
    label: "Build now",
    title: "RFQ response v1",
    text:
      "Proceed with a read-only and draft-generation workflow after SAP pricing access is either validated or excluded from v1.",
  },
  {
    label: "Validate first",
    title: "Access, evidence, reliability",
    text:
      "Close source-system permissions, finance baseline, evaluation set, exception taxonomy, and approval RACI before production scope.",
  },
  {
    label: "Do not scale yet",
    title: "No multi-department rollout",
    text:
      "Stage 4 is not defensible until the first workflow proves value, reliability, adoption, support rhythm, and run-ledger evidence.",
  },
];

export const sampleReportTechnicalRows = [
  {
    label: "Deployment boundary",
    value: "Customer cloud first",
    text: "Use customer identity, private memory, scoped service accounts, and Nova Nuggets operating support.",
  },
  {
    label: "Source-system access",
    value: "Graph, CRM, SAP path to validate",
    text: "SharePoint and inbox access are plausible; SAP pricing access is the implementation gate.",
  },
  {
    label: "MCP / API readiness",
    value: "Mixed readiness",
    text: "Use APIs where stable, controlled exports where faster, and no writeback until reliability gates close.",
  },
  {
    label: "LLM inference path",
    value: "Routed model stack",
    text: "Start with monitored model routing; evaluate NooX or local inference if data posture requires it.",
  },
  {
    label: "Evals and observability",
    value: "Required before delegated action",
    text: "Create a 30-case test set, source-grounding checks, exception log, and run ledger before autonomy.",
  },
];

export const sampleReportEvidenceRows = [
  {
    label: "Cost baseline",
    value: "Finance proxy",
    text: "Validate current RFQ effort, cycle time, rework, and escalation load before approving savings claims.",
  },
  {
    label: "Productivity path",
    value: "Capacity first",
    text: "Measure draft preparation time, reviewer effort, quote quality, and response speed in the 90-day pilot.",
  },
  {
    label: "Risk-adjusted ROI",
    value: "Scale only after evidence",
    text: "Separate hard savings, capacity release, quality, revenue speed, and risk reduction in the CFO view.",
  },
];

export const sampleReportRedGates = [
  {
    gate: "No access, no AI",
    status: "Conditional",
    impact:
      "Proceed only if SAP pricing retrieval is validated or excluded from v1 with human pricing review.",
  },
  {
    gate: "No workflow, no agent",
    status: "Clear",
    impact: "RFQ intake, technical matching, quote drafting, and approval are repeatable enough for v1.",
  },
  {
    gate: "No owner, no impact",
    status: "Named",
    impact: "CEO sponsors, CTO owns access boundary, CFO validates economics, sales lead owns workflow.",
  },
  {
    gate: "No evidence, no scale",
    status: "Proxy",
    impact: "Build can start, but scale decision requires cycle-time and quality evidence from pilot runs.",
  },
  {
    gate: "No reliability, no autonomy",
    status: "Conditional",
    impact:
      "Autonomy stays capped until quote drafts pass evaluation tests, source checks, and approval controls.",
  },
];

export const sampleReportWorkflowSections = [
  {
    label: "First workflow",
    title: "RFQ response and quotation preparation",
    text:
      "A ZAKI quote analyst reads customer requests, retrieves approved product and pricing context, drafts a response, and routes the quote for human approval before any customer-facing send or ERP writeback.",
  },
  {
    label: "Deployment path",
    title: "Customer cloud first, NooX if data posture requires local inference",
    text:
      "Start inside the customer cloud with private memory, approved connectors, logging, and model routing. Move sensitive drawings, pricing, or low-latency workloads to NooX if the access review requires local control.",
  },
  {
    label: "AI surface",
    title: "Sales inbox plus approval dashboard",
    text:
      "The team should not learn a new system for every quote. The first interface is an inbox-side workflow and a compact approval dashboard for exceptions, source citations, and final signoff.",
  },
  {
    label: "Value model",
    title: "Proxy business case until finance validates",
    text:
      "The readout separates capacity release, faster cycle time, fewer quote errors, and revenue response speed. It does not label savings as finance-approved until the CFO baseline is confirmed.",
  },
];

export const sampleReportTimeline = [
  {
    window: "Days 0-30",
    objective: "Confirm build foundation",
    actions: "Validate access path, define source permissions, collect gold-standard RFQs, and agree approval rules.",
    evidence: "Access decision, evaluation set, owner map, and signed v1 workflow scope.",
  },
  {
    window: "Days 31-60",
    objective: "Build governed RFQ assistant",
    actions:
      "Implement retrieval, quote drafting, confidence signals, source citations, approval queue, and run ledger.",
    evidence: "Test results, exception log, approval behavior, and CTO review of deployment controls.",
  },
  {
    window: "Days 61-90",
    objective: "Operate and prove",
    actions: "Run controlled production pilot, measure cycle time, quality, adoption, and escalation volume.",
    evidence: "Scale recommendation, finance-adjusted value model, and next-workflow decision.",
  },
];

export const novaOrbitDimensions = [
  {
    question: "Where should AI work?",
    title: "Infrastructure & Access",
    text:
      "Assesses whether AI can safely run, connect, retrieve, act, and stay observable inside the current technical environment.",
    icon: CircuitBoard,
    gates: [
      "Deployment boundary: NooX, customer cloud, NNGTs cloud, or hybrid.",
      "Inference readiness: model serving, latency, cost, privacy, and scaling.",
      "Access readiness: APIs, MCPs, databases, files, permissions, and source ownership.",
      "Control plane: identity, logging, audit, observability, and security.",
    ],
  },
  {
    question: "What should AI do?",
    title: "Applications & Agents",
    text:
      "Defines the AI apps, ZAKI agents, RAG layers, automations, interfaces, and human approval paths worth building first.",
    icon: Orbit,
    gates: [
      "Workflow fit: repeated work, clear context, and visible decision value.",
      "Agent role: task, autonomy level, memory, tools, fallback, and output.",
      "App surface: chat, dashboard, embedded workflow, internal tool, or API surface.",
      "Integration depth: read-only, approved action, writeback, or multi-system automation.",
    ],
  },
  {
    question: "How does the business change?",
    title: "Operations & Impact",
    text:
      "Maps who owns the workflow, how humans stay in control, and how cost reduction, quality, speed, risk, or revenue is proven.",
    icon: Workflow,
    gates: [
      "Ownership: executive sponsor, workflow owner, IT owner, and approval owner.",
      "Business case: baseline, cost, cycle time, quality, risk, revenue, and ROI signal.",
      "Governance: oversight, escalation, policy, compliance, and AI risk posture.",
      "Run model: adoption, training, monitoring, support, and continuous improvement.",
    ],
  },
];

export const novaOrbitStages = [
  {
    label: "Stage 1",
    title: "Ad Hoc AI",
    text: "Individual tools, prompts, scattered experiments, and unmanaged adoption without shared operating evidence.",
  },
  {
    label: "Stage 2",
    title: "Connected AI",
    text: "Use cases are selected, systems are mapped, access is understood, and first pilots can be scoped.",
  },
  {
    label: "Stage 3",
    title: "Operational AI",
    text: "AI runs in named workflows with owners, controls, integrations, human approvals, and measurable output.",
  },
  {
    label: "Stage 4",
    title: "Owned AI Workforce",
    text: "AI becomes repeatable company-owned work capacity across departments, supported by private runtime and run operations.",
  },
];

export const novaOrbitRedGates = [
  ["No access, no AI", "If source systems cannot expose data or actions safely, maturity is capped until APIs, MCPs, or controlled access exist."],
  ["No workflow, no agent", "If the work is not repeatable, owned, and measurable, the next step is discovery, not an agent build."],
  ["No owner, no impact", "If no executive, workflow, IT, or approval owner is named, the project cannot move beyond pilot maturity."],
  ["No evidence, no scale", "If cycle time, quality, cost, risk, or revenue cannot be measured, the next workflow decision is not defensible."],
  ["No reliability, no autonomy", "If outputs cannot be tested, monitored, reviewed, or safely constrained, autonomy is capped until controls exist."],
];

export const novaOrbitOffers = [
  {
    name: "NovaOrbit Standard",
    price: "EUR 10,000",
    term: "2 weeks",
    purpose: "A board-ready maturity assessment and first-workflow direction.",
    deliverables: [
      "Where / What / How maturity score.",
      "4-stage placement and red-gate blockers.",
      "Leadership and stakeholder interviews.",
      "High-level infrastructure and access review.",
      "Top use-case shortlist and first workflow recommendation.",
      "Executive readout and next-step proposal.",
    ],
  },
  {
    name: "NovaOrbit In-Depth",
    price: "EUR 18,000",
    term: "4-6 weeks",
    purpose: "A deeper stack, workflow, integration, governance, and ROI diagnostic.",
    deliverables: [
      "API, MCP, source-system, and data-boundary readiness map.",
      "Workflow economics and ROI model for the top opportunities.",
      "ZAKI agent role and AI app surface design.",
      "Deployment recommendation: NooX, customer cloud, NNGTs cloud, or hybrid.",
      "Governance, approval, and run-model gap analysis.",
      "90-day implementation roadmap and CTO appendix.",
    ],
  },
];

export const novaOrbitMethod = [
  ["01 / Interview", "C-level, IT, security, finance, department owners, and operators define business pressure, ownership, and constraints."],
  ["02 / Inspect", "Current systems, data sources, access paths, APIs, MCP options, deployment posture, and AI adoption are mapped."],
  ["03 / Score", "The company is scored across Where, What, and How, with stage caps for unresolved access, workflow, owner, or evidence gaps."],
  ["04 / Decide", "The readout converts maturity into a first workflow, deployment path, owner map, ROI signal, and implementation proposal."],
];

export const fullStackLayers = [
  {
    label: "01 / Infrastructure",
    title: "Runtime + deployment",
    metric: "NooX / your cloud / NNGTs cloud",
    text: "Compute, model serving, identity, network boundary, and topology chosen around the workflow outcome.",
  },
  {
    label: "02 / Intelligence",
    title: "ZAKI agent layer",
    metric: "memory / tools / approvals",
    text: "Role-aware ZAKI agents with private memory, RAG, approved tools, workflow state, human approvals, and audit evidence.",
  },
  {
    label: "03 / Applications",
    title: "AI apps + workflow surfaces",
    metric: "web / chat / internal tools",
    text: "Usable apps and internal work surfaces that bring ZAKI into existing team routines.",
  },
  {
    label: "04 / Transformation",
    title: "Advisory + operations",
    metric: "assess / build / run",
    text: "Workflow selection, governance, implementation, enablement, monitoring, and continuous improvement under one accountable partner.",
  },
];

export const nooxDeploymentModes = [
  {
    name: "NooX on-prem",
    label: "AI inferencing computer",
    detail:
      "A local inference server for private workloads that need physical control, predictable latency, and a clear operating boundary.",
    points: ["standard or custom server design", "central or decentralized nodes", "load-balanced local inference"],
  },
  {
    name: "Customer cloud",
    label: "client-owned cloud",
    detail:
      "The full stack deployed into the customer's account, network, keys, identity, and compliance perimeter.",
    points: ["AWS / Azure / GCP / OVH", "customer keys and VPC", "NNGTs operated with least privilege"],
  },
  {
    name: "NNGTs cloud SaaS",
    label: "managed cloud",
    detail:
      "Managed NNGTs cloud for teams that want speed, operating support, and a SaaS path before or instead of private infrastructure.",
    points: ["managed tenant options", "EU / GCC posture", "fastest path to launch"],
  },
];

export const nooxBuildModes = [
  ["Standard NooX", "Pre-designed local inference computer for clear private workloads and faster delivery."],
  ["Custom server", "Project-specific hardware design for model size, latency, concurrency, budget, and deployment constraints."],
  ["Central topology", "One stronger inference server serving departments, workflows, and ZAKI agents from a controlled location."],
  ["Decentralized topology", "Multiple inference servers connected through load balancing when resilience, geography, or workload split matters."],
];

export const audienceRoutes = [
  {
    label: "Enterprise buyer",
    title: "Map the first workflow",
    text: "Book NovaOrbit to identify the workflow, owner, ROI signal, boundary, and first production path.",
    href: BOOKING_URL,
    external: true,
  },
  {
    label: "Technical evaluator",
    title: "Choose the runtime",
    text: "Review NooX on-prem, customer cloud, NNGTs cloud SaaS, and central/decentralized inference patterns.",
    href: "/deploy/",
    external: false,
  },
  {
    label: "Investor / diligence",
    title: "Request investor memo",
    text: "Signal interest, then receive the controlled investor asset with NNGTs numbers, ask, and data-room path.",
    href: INVESTOR_REQUEST_URL,
    external: false,
  },
];

export const deploymentDecisionRows = [
  ["Best for", "Private workloads, physical perimeter control, sensitive data, local latency", "Companies that need ownership inside existing cloud governance", "Teams that want speed, managed operations, and SaaS convenience"],
  ["Control level", "Highest: local compute and customer-controlled network", "High: customer account, keys, VPC, and policies", "Managed: NNGTs operates cloud boundary and runtime"],
  ["Topology", "Standard/custom server, central server, or decentralized load-balanced servers", "Cloud-native deployment inside the customer's existing architecture", "Managed tenant with dedicated options when required"],
  ["Speed", "Medium: hardware design, procurement, installation, and acceptance", "Medium-fast: depends on cloud/security access", "Fastest: operated cloud path"],
  ["NNGTs role", "Design, deliver, integrate, monitor, and support local inference", "Deploy, integrate, operate under least privilege, and document handover", "Operate infrastructure, ZAKI layer, updates, support, and scaling"],
];

export const evidenceStandards = [
  ["Public read", "Customer identity, raw screenshots, raw logs, rates, and workflow specifics are withheld from the public site."],
  ["Evidence room", "Qualified buyers can review source artifacts, representative run ledgers, workflow maps, and finance assumptions under MNDA."],
  ["No theatre", "Estimated proof stays labelled as estimated; customer-approved evidence is separated from representative artifact shapes."],
];

export const workforceDemoScenarios = [
  {
    department: "Sales",
    agent: "ZAKI sales researcher",
    tool: "CRM + inbox + company memory",
    approval: "account owner",
    output: "qualified brief and next action",
    roi: "3.5h saved / account cycle",
  },
  {
    department: "Support",
    agent: "ZAKI support resolver",
    tool: "tickets + product docs + policy",
    approval: "support lead",
    output: "grounded reply and escalation path",
    roi: "41% faster first response",
  },
  {
    department: "Finance",
    agent: "ZAKI finance analyst",
    tool: "invoices + ERP export + contract terms",
    approval: "finance controller",
    output: "exception list and variance note",
    roi: "2 review loops removed",
  },
  {
    department: "HR",
    agent: "ZAKI policy assistant",
    tool: "handbook + local policy + employee context",
    approval: "HR business partner",
    output: "policy-grounded answer",
    roi: "same-day employee answers",
  },
  {
    department: "Operations",
    agent: "ZAKI ops coordinator",
    tool: "SOPs + spreadsheets + ticket queue",
    approval: "process owner",
    output: "handoff plan and status ledger",
    roi: "one fewer manual handoff",
  },
];

export const operatorCredentials = [
  {
    label: "Your runtime path",
    value: "owned stack",
    text: "NNGTs builds the operating layer so the customer owns the workflow, data boundary, and deployment posture.",
  },
  {
    label: "Transfer by design",
    value: "transparent stack",
    text: "Architecture, runbooks, audit evidence, and operating decisions stay visible to the customer team.",
  },
  {
    label: "Operator-led",
    value: "strategy to code",
    text: "Enterprise strategy, product, runtime engineering, and implementation stay connected through one accountable team.",
  },
  {
    label: "Reference posture",
    value: "NDA-ready",
    text: "Public proof stays controlled while serious buyers get the reference dossier and implementation path under NDA.",
  },
];

export const ownershipPromises = [
  ["You own the perimeter", "Customer cloud, sovereign tenant, or hybrid boundary defined before the first workflow."],
  ["You own the evidence", "Audit trail, run ledger, savings model, and operating decisions stay inspectable."],
  ["You own the workflow", "Agents are mapped to business owners, approvals, tools, and measurable outcomes."],
  ["We operate with you", "NNGTs runs, monitors, improves, and transfers knowledge into the customer team."],
];

export const advisoryBench = [
  {
    label: "Board governance",
    text: "AI ownership, executive risk framing, policy posture, and decision models for leadership teams.",
  },
  {
    label: "Enterprise architecture",
    text: "Cloud boundary, identity, audit, model routing, data residency, and operating access.",
  },
  {
    label: "DACH + GCC market context",
    text: "Regional buyer expectations, sovereignty posture, partnerships, and enterprise entry points.",
  },
  {
    label: "Finance transformation",
    text: "Workflow economics, productivity baselines, CFO cases, and scale decisions after first proof.",
  },
];

export const investorHighlights = [
  ["Round target", "EUR 750k-1.2M to reach repeatable enterprise motion"],
  ["Current traction", "500 registered users, 5 paying B2C customers, B2C SaaS newly live"],
  ["Pipeline", "10 LOIs / pilot conversations across Germany and enterprise buyers"],
  ["Proof", "German mid-market reference under NDA; 3 departments live; EUR 6k/week benchmark"],
  ["Commercial entry", "EUR 10k Standard or EUR 18k In-Depth NovaOrbit assessment"],
  ["Moat", "Runtime, private deployment pattern, operating model, and product-led acquisition loop"],
];

export const investorMetrics = [
  ["Registered users", "500", "B2C intelligence surface"],
  ["Paying users", "5", "experimental SaaS just live"],
  ["LOIs / pilots", "10", "Germany-led enterprise pull"],
  ["Reference return", "EUR 312k/year", "EUR 6k/week productivity benchmark"],
  ["Entry product", "EUR 10k / EUR 18k", "paid NovaOrbit assessment"],
  ["First workflow", "from EUR 35k", "60-90 day production path"],
];

export const investorUseOfFunds = [
  ["Product", "Harden ZAKI managed-agent workflows, admin console, telemetry, and private deployment packaging."],
  ["GTM", "Convert DACH and GCC pilots into paid NovaOrbit assessments, first workflows, and annual managed-agent contracts."],
  ["Proof", "Produce reference dossiers, ROI models, deployment blueprints, and buyer-facing demo artifacts."],
  ["Team", "Add delivery engineering, customer success, and commercial capacity around founder-led sales."],
];

export const investorTimeline = [
  ["0-90 days", "Close current NovaOrbit opportunities, package the German reference, and ship the investor data room."],
  ["3-6 months", "Convert first-workflow projects into managed-agent annual contracts and repeatable deployment playbooks."],
  ["6-12 months", "Scale DACH/GCC pipeline, launch stronger ZAKI product-led acquisition, and formalize partner channels."],
];

export const investorThesis = [
  {
    title: "AI spend is fragmenting",
    text: "Employees adopt tools faster than companies can govern them. Buyers need owned infrastructure and measurable workflow value.",
  },
  {
    title: "Agents need an operator",
    text: "Model capability is rising, but the hard part is deployment, memory, tools, approvals, telemetry, and business ownership.",
  },
  {
    title: "ZAKI creates the wedge",
    text: "The product surface builds familiarity and acquisition while NNGTs converts enterprise demand into managed workforces.",
  },
  {
    title: "Services fund product depth",
    text: "Paid assessments and workflow builds create evidence, revenue, and reusable architecture before wider managed-agent scale.",
  },
];

export const impressumFields = [
  ["Provider", "NOVA NUGGETS INNOVATION & ARTIFICIAL INTELLIGENCE RESEARCH & CONSULTANCIES L.L.C"],
  ["Represented by", "Alfred Succer, Manager"],
  ["Address", "Biedermannplatz 8, 22083 Hamburg, Germany"],
  ["Email", "hello@novanuggets.com"],
  ["Founder contact", "as@novanuggets.com"],
  ["Phone", "+49 162 94 11131 / +971 527878055"],
  ["Register", "Dubai Department of Economy and Tourism, License No. 1462567, Register No. 2513362, DCCI No. 589810"],
  ["Tax Registration Number", "UAE Corporate Tax TRN 105423388500001"],
  ["Responsible for content", "Alfred Succer, Biedermannplatz 8, 22083 Hamburg, Germany"],
];

export const impressumChecklist = [
  ["Legal entity", "Registered company name and legal form"],
  ["Address", "Summonable business address"],
  ["Representation", "Managing director / authorized representative"],
  ["Register", "Commercial register, court, and registration number if applicable"],
  ["Tax", "UAE Corporate Tax TRN added; confirm if a separate EU/German VAT ID exists"],
  ["Content responsibility", "Responsible person and address for editorial content if required"],
];

export const privacyFields = [
  ["Controller", "NOVA NUGGETS INNOVATION & ARTIFICIAL INTELLIGENCE RESEARCH & CONSULTANCIES L.L.C"],
  ["Contact", "hello@novanuggets.com"],
  ["Purpose", "Responding to inquiries, booking NovaOrbit calls, managing investor requests, and improving the website."],
  ["Data categories", "Contact details, company details, inquiry content, booking metadata, and basic technical logs."],
  ["Cookies", "The current site uses an essential local consent setting. Analytics or marketing cookies require a separate opt-in before launch."],
  ["Retention", "Inquiry and booking data is kept only as long as needed for the business relationship or legal obligations."],
  ["Rights", "Visitors may request access, correction, deletion, restriction, or objection through hello@novanuggets.com."],
];

export const hiddenCosts = [
  {
    value: "60-80%",
    label: "of AI spend stuck in disconnected seats",
    text: "Licenses spread faster than workflow value. Teams prompt more, but operations barely change.",
  },
  {
    value: "0",
    label: "shared company memory across those tools",
    text: "Every prompt starts over. Knowledge stays trapped in vendor accounts instead of becoming an operating asset.",
  },
  {
    value: "unbounded",
    label: "risk from unmanaged employee adoption",
    text: "Employees use AI anyway. Without a governed path, legal risk rises and evidence disappears.",
  },
];

export const categoryOptions = [
  {
    name: "Vendors",
    label: "Microsoft / Google / OpenAI",
    text: "Sell licenses. Your IT connects them. Workflow outcomes are still your problem.",
  },
  {
    name: "Consultancies",
    label: "Big Four / systems integrators",
    text: "Sell decks and roadmaps. Pilots stall when no runtime, owner, or operating evidence exists.",
  },
  {
    name: "Nova Nuggets",
    label: "The operating partner",
    text: "NNGTs diagnoses, builds, deploys, and runs governed AI workflows inside your perimeter. You own the system and the evidence.",
  },
];

export const capabilityPillars = [
  {
    title: "NooX Local Inference",
    text: "Run private inference where latency, data control, and physical perimeter matter.",
    icon: CircuitBoard,
  },
  {
    title: "AI Apps",
    text: "Give teams usable AI surfaces for the workflow, knowledge, and decisions they already own.",
    icon: Building2,
  },
  {
    title: "ZAKI Agents",
    text: "Deploy managed agents for intake, research, summaries, routing, approvals, and daily knowledge work.",
    icon: Orbit,
  },
  {
    title: "Workflow Automation",
    text: "Remove manual handoffs across systems, approvals, and teams.",
    icon: Workflow,
  },
  {
    title: "Private Intelligence",
    text: "Turn documents, policies, and company vocabulary into governed memory and behavior.",
    icon: FileCheck2,
  },
  {
    title: "Integrations",
    text: "Connect the systems where work already happens: email, CRM, tickets, ERP, knowledge bases, chat, and internal APIs.",
    icon: Network,
  },
  {
    title: "Governance",
    text: "Keep access, audit, model routing, quotas, and deployment boundaries visible.",
    icon: ShieldCheck,
  },
  {
    title: "Run Support",
    text: "Operate, monitor, improve, and upgrade the AI workforce after launch.",
    icon: Gauge,
  },
];

export const operatingModel = [
  {
    title: "Assess",
    eyebrow: "NovaOrbit",
    text: "Score where AI can run, what it should do, and how the business captures impact through the NovaOrbit assessment.",
    icon: Orbit,
  },
  {
    title: "Build",
    eyebrow: "First workflow",
    text: "Ship one production workflow with retrieval, tools, approvals, telemetry, and human fallback.",
    icon: Workflow,
  },
  {
    title: "Deploy",
    eyebrow: "Inside your perimeter",
    text: "Run in NooX, customer cloud, or NNGTs cloud with role-based access and governance.",
    icon: ShieldCheck,
  },
  {
    title: "Run",
    eyebrow: "Managed agents",
    text: "Operate employee agents, department agents, monitoring, iteration, and support under one accountable partner.",
    icon: Building2,
  },
];

export const approachSteps = [
  {
    label: "01 / Frame",
    title: "Frame the board decision.",
    text: "Align CEO, CTO, CFO, IT, and the workflow owner on the business pressure, budget logic, risk boundary, and first workflow candidate.",
    output: "Decision brief",
  },
  {
    label: "02 / Diagnose",
    title: "Score Where, What, and How.",
    text: "Interview stakeholders and inspect systems, data sources, APIs, MCP options, deployment posture, adoption, governance, and economics.",
    output: "NovaOrbit score + red gates",
  },
  {
    label: "03 / Design",
    title: "Shape the first workflow.",
    text: "Define the agent role, app surface, access path, approval model, data boundary, reliability requirement, and business metric.",
    output: "Build spec + deployment path",
  },
  {
    label: "04 / Validate",
    title: "Close the scale blockers.",
    text: "Validate access, owner readiness, security posture, model/API behavior, finance baseline, support model, and exception handling.",
    output: "CTO + CFO appendix",
  },
  {
    label: "05 / Build",
    title: "Ship one governed workflow.",
    text: "Build the ZAKI app or managed agent with memory, tools, approvals, run ledger, fallback path, and operating handover.",
    output: "First-workflow release",
  },
  {
    label: "06 / Run",
    title: "Operate the evidence rhythm.",
    text: "Monitor usage, quality, cycle time, exceptions, approvals, savings, and support signals before deciding the next workflow.",
    output: "Managed agent operations",
  },
];

export const approachGates = [
  ["No diagnosis theatre", "Every engagement must end with a decision: assess deeper, build the first workflow, defer, or stop."],
  ["No agent without a boundary", "Access, deployment path, approval model, owner, and fallback must be explicit before build."],
  ["No scale without evidence", "Cycle time, quality, cost, risk, revenue, or service impact must be measurable enough for leadership to trust the next step."],
];

export const workforceRoles = [
  "Executive operator",
  "Sales researcher",
  "Customer support agent",
  "Finance analyst",
  "HR policy assistant",
  "Operations coordinator",
  "Compliance reviewer",
  "Engineering copilot",
];

export const architectureLayers = [
  {
    title: "Inference",
    text: "NooX on-prem, customer cloud, or NNGTs cloud with central or decentralized topology chosen around the first workflow.",
    icon: CircuitBoard,
  },
  {
    title: "Apps",
    text: "Role-specific AI work surfaces that fit the team routine instead of adding another unused tool.",
    icon: Network,
  },
  {
    title: "ZAKI layer",
    text: "Managed agents with memory, task state, tool use, scheduling, approvals, and measurable outputs.",
    icon: Orbit,
  },
  {
    title: "Knowledge",
    text: "RAG, tuned behavior, policy grounding, document memory, and company vocabulary converted into usable context.",
    icon: FileCheck2,
  },
  {
    title: "Governance",
    text: "Access controls, audit trails, observability, deployment controls, and sensitive-data boundaries from day one.",
    icon: Fingerprint,
  },
];

export const deploymentModels = [
  {
    title: "NooX on-prem",
    text: "A local AI inferencing computer for workflows that need physical control, predictable latency, or sovereign posture.",
    bullets: ["Standard NooX or custom server design", "Central or decentralized nodes", "Load-balanced local inference"],
  },
  {
    title: "Customer cloud",
    text: "Full-stack AI deployed into your AWS, Azure, GCP, OVH, or existing cloud account when IT wants ownership of the boundary.",
    bullets: ["Your VPC, subscription, and keys", "Least-privilege NNGTs operations", "Terraform or Pulumi managed"],
  },
  {
    title: "NNGTs cloud SaaS",
    text: "Managed NNGTs cloud when the buyer wants speed, operated infrastructure, and a SaaS-style path to the first workflow.",
    bullets: ["Dedicated tenant options", "EU or GCC posture", "Operated runtime and support"],
  },
];

export const commercialLines = [
  {
    label: "NovaOrbit Standard",
    value: "EUR 10,000",
    detail: "Two-week maturity assessment, first-workflow direction, and executive readout.",
  },
  {
    label: "NovaOrbit In-Depth",
    value: "EUR 18,000",
    detail: "Four-to-six-week stack, access, workflow, governance, and ROI diagnostic.",
  },
  {
    label: "First workflow",
    value: "from EUR 35k",
    detail: "A 60-90 day production path for one measurable workflow.",
  },
  {
    label: "Managed agents",
    value: "annual + infra",
    detail: "ZAKI agents, runtime operations, monitoring, and improvement under an enterprise contract.",
  },
];

export const pricingSteps = [
  {
    tag: "Step 01 · start here",
    name: "NovaOrbit Standard",
    price: "EUR 10,000",
    term: "fixed · 2 weeks",
    text: "Where / What / How maturity score, red-gate blockers, top use cases, and first-workflow recommendation. No demo theatre.",
  },
  {
    tag: "Step 01+ · deeper validation",
    name: "NovaOrbit In-Depth",
    price: "EUR 18,000",
    term: "fixed · 4-6 weeks",
    text: "API/MCP readiness, data boundary, deployment path, agent/app design, governance gaps, and 90-day roadmap.",
  },
  {
    tag: "Step 02 · first win",
    name: "First Workflow",
    price: "from EUR 35,000",
    term: "one-time · 60-90 days",
    text: "One automation, RAG win, or workflow agent delivered end-to-end with measurable operating evidence.",
  },
  {
    tag: "Step 03 · scale",
    name: "Managed Agents",
    price: "EUR 1,200",
    term: "/ employee / year + EUR 4,500/month infra",
    text: "Recurring AI workforce with ZAKI agents per role and department, operated with you inside the agreed perimeter.",
  },
];

export const pricingDecisionRows = [
  {
    label: "Choose Standard if...",
    title: "You need the board-ready read",
    price: "EUR 10,000",
    term: "2 weeks",
    text: "The business needs a maturity baseline, first-workflow direction, and executive readout before committing to build or buying another demo.",
    outcome: "Maturity score, red gates, top workflow, and next-step proposal.",
  },
  {
    label: "Choose In-Depth if...",
    title: "The stack or economics need proof",
    price: "EUR 18,000",
    term: "4-6 weeks",
    text: "Access, APIs/MCPs, deployment boundary, governance, workflow economics, or CTO confidence must be validated before implementation.",
    outcome: "Stack map, ROI model, deployment path, governance gaps, and 90-day roadmap.",
  },
  {
    label: "Move to First Workflow when...",
    title: "The assessment names a buildable path",
    price: "from EUR 35,000",
    term: "60-90 days",
    text: "A workflow owner, access route, app surface, ZAKI role, approval path, and success metric are clear enough to ship into production.",
    outcome: "One governed AI workflow in production with measurable operating evidence.",
  },
  {
    label: "Scale Managed Agents when...",
    title: "Evidence supports the next department",
    price: "annual + infra",
    term: "operated contract",
    text: "The first workflow produces enough usage, quality, cycle-time, and owner evidence to add more roles or departments.",
    outcome: "Managed ZAKI agents, runtime operations, monitoring, and improvement cadence.",
  },
];

export const cfoRows = [
  ["NovaOrbit Standard", "EUR 10,000", "2-week maturity assessment"],
  ["NovaOrbit In-Depth", "EUR 18,000", "4-6 week stack and workflow diagnostic"],
  ["First workflow build", "EUR 35,000", "60-90 days to production"],
  ["Managed agents · 50 seats", "EUR 60,000", "EUR 1,200 / seat / year"],
  ["Infrastructure retainer", "EUR 54,000", "12 months"],
  ["Reference return", "EUR 312,000", "EUR 6k/week benchmark"],
];

export const faqs = [
  {
    q: "What happens after the Snapshot?",
    a: "The Snapshot gives a quick maturity signal. NovaOrbit turns it into the board readout: stage, red gates, first workflow, delivery window, deployment path, owner map, and commercial next step.",
  },
  {
    q: "Is this just a script, API wrapper, or demo?",
    a: "No. The test is whether AI ships into owned work: an approved workflow, app surface, ZAKI role, deployment boundary, run ledger, support owner, and measurable operating evidence.",
  },
  {
    q: "What if we do not have an AI strategy yet?",
    a: "That is exactly what NovaOrbit is for. We map where AI can work, what it should do, and how the business captures measurable impact before anyone buys implementation.",
  },
  {
    q: "We already use ChatGPT or Copilot. Why also Nova Nuggets?",
    a: "Those tools are useful for personal productivity. Nova Nuggets handles company workflows: private memory, integrations, approvals, audit evidence, deployment boundary, and measurable operating value.",
  },
  {
    q: "Will our data leave our environment?",
    a: "Only if the agreed deployment boundary allows it. NovaOrbit decides whether work runs in NooX on-prem, customer cloud, NNGTs cloud, or a hybrid path before the first workflow is built.",
  },
  {
    q: "Who owns the system after delivery?",
    a: "The buyer owns the workflow, operating evidence, deployment boundary, and decision logic. NNGTs can operate and improve the system with you, but the architecture stays inspectable.",
  },
  {
    q: "Will our IT team be on board?",
    a: "The assessment is designed for IT from day one: source-system access, APIs, MCPs, identity, observability, logging, least-privilege permissions, and fallback are part of the readout.",
  },
  {
    q: "How fast can we start?",
    a: "A scoping call can lead to a fixed-price NovaOrbit proposal in five working days. Standard runs in 2 weeks; In-Depth runs in 4-6 weeks; a first production workflow is typically scoped for 60-90 days after the readout.",
  },
  {
    q: "What about GDPR, DSGVO, and data residency?",
    a: "The posture is sovereignty-by-default: data stays inside the agreed customer perimeter, with audit trails and deployment controls designed into the architecture.",
  },
  {
    q: "How do we know the first workflow is worth building?",
    a: "NovaOrbit must name the owner, access route, app surface, ZAKI role, approval path, success metric, and red gates. If those are weak, the answer is validate first, not build.",
  },
];

export const teamMembers = [
  {
    name: "Alfred Succer",
    initials: "AS",
    role: "Founder & CEO · sovereign AI operator",
    text: "Founder of Nova Nuggets and the public voice behind the sovereign AI thesis. Leads product, architecture, commercial strategy, and the ZAKI operating model.",
    linkedin: "https://www.linkedin.com/in/alfred-succer/",
  },
  {
    name: "Tarek Adaoui",
    initials: "TA",
    role: "Business development · commercial and GCC expansion",
    text: "Enterprise relationship building, regional context, and partnership development across the GCC.",
    linkedin: "https://www.linkedin.com/in/tarek-adaoui-a99955159/",
  },
  {
    name: "Amer Succer",
    initials: "AM",
    role: "Technical delivery · IT and implementation",
    text: "Implementation, IT project, and operating-support experience across agent workflows, customer-facing systems, and delivery governance.",
    linkedin: "https://www.linkedin.com/in/amer-succer-930365155/",
  },
  {
    name: "Joseph Zakher",
    initials: "JZ",
    role: "Product design · customer experience",
    text: "Product and interface design experience for SaaS, startup systems, and customer-facing digital products.",
    linkedin: "https://www.linkedin.com/in/zakher/",
  },
];

export const advisorMembers = [
  {
    name: "Luca Fiaschi, PhD",
    initials: "LF",
    role: "AI, data, and agentic systems advisor",
    text: "AI and data executive; Partner at PyMC Labs; former CDAO and VP at Mistplay and HelloFresh.",
    linkedin: "https://www.linkedin.com/in/lfiaschi/",
  },
  {
    name: "Khaled Adawi",
    initials: "KA",
    role: "GCC executive and commercial advisor",
    text: "Senior commercial operator with GCC enterprise experience, including P&G Arabian Peninsula leadership.",
    linkedin: "https://www.linkedin.com/in/khaled-adawi-4ba93245/",
  },
];

export const mediaAppearances = [
  {
    outlet: "Mobile Dev Memo",
    title: "Understanding sovereign AI",
    meta: "Podcast with Eric Seufert · January 2026",
    text: "A founder conversation on controlling where AI runs, where company data lives, and why public LLM workflows create new risk.",
    href: "https://mobiledevmemo.com/podcast-understanding-sovereign-ai-with-alfred-succer/",
    image: "/assets/media/mobile-dev-memo-sovereign-ai.png",
  },
  {
    outlet: "Web3.TV",
    title: "Founder interview",
    meta: "Live video interview",
    text: "Public founder narrative around private intelligence, AI ownership, and the shift from tools to operating infrastructure.",
    href: "https://www.youtube.com/live/BY1P2E02o3M?si=-aI3r0mSWUZbns5D",
    image: "/assets/media/web3-tv-alfred-succer.jpg",
  },
  {
    outlet: "Firas Podcast",
    title: "Arabic AI conversation",
    meta: "Arabic video podcast",
    text: "Regional conversation on Arabic AI, sovereign technology, and building intelligence products for local context.",
    href: "https://youtu.be/1UYbNjWWIG8?si=0d4OzP7eQEQBZAJY",
    image: "/assets/media/firas-podcast-alfred-succer.jpg",
  },
];

export const advisoryOffers = [
  {
    title: "Executive AI Sprint",
    price: "from EUR 2,500",
    text: "A focused founder-led session to define the NovaOrbit baseline, use-case map, and near-term AI workforce path.",
    icon: Presentation,
  },
  {
    title: "Board AI Session",
    price: "from EUR 12,000",
    text: "Board-grade narrative, risk framing, and decision model for AI ownership, sovereignty, and operating design.",
    icon: ClipboardCheck,
  },
  {
    title: "Function Alignment Session",
    price: "from EUR 18,000",
    text: "Department-level working sessions that turn AI ambition into workflow candidates, governance needs, and implementation scope.",
    icon: Target,
  },
];

export const ArrowIcon = ArrowRight;
