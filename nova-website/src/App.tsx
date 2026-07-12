import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Download } from "lucide-react";
import {
  ArrowIcon,
  BOOKING_URL,
  FOUNDER_EMAIL,
  GENERAL_EMAIL,
  INVESTOR_REQUEST_URL,
  NOVAORBIT_ONE_PAGER_URL,
  NOVAORBIT_WHITE_PAPER_REQUEST_URL,
  SITE_URL,
  ZAKI_URL,
  approachGates,
  approachSteps,
  advisoryOffers,
  advisorMembers,
  advisoryBench,
  architectureLayers,
  audienceRoutes,
  capabilityPillars,
  categoryOptions,
  cfoRows,
  commercialLines,
  commandRoomLanes,
  deploymentModels,
  deploymentDecisionRows,
  evidenceStandards,
  faqs,
  fieldNoteForPath,
  fieldNotes,
  fullStackLayers,
  hiddenCosts,
  impressumFields,
  investorHighlights,
  investorMetrics,
  investorThesis,
  investorTimeline,
  investorUseOfFunds,
  mediaAppearances,
  nooxDeploymentModes,
  nooxBuildModes,
  normalizePath,
  novaOrbitDimensions,
  novaOrbitDownloadAssets,
  novaOrbitMethod,
  novaOrbitOffers,
  novaOrbitRedGates,
  novaOrbitStages,
  operatingModel,
  operatorCredentials,
  orbitDeliverables,
  ownershipPromises,
  primaryNav,
  proofArtifacts,
  proofCaseArtifacts,
  proofCaseRows,
  proofDiligenceRows,
  proofMedia,
  proofQuotes,
  pricingSteps,
  pricingDecisionRows,
  proofPoints,
  privacyFields,
  routeForPath,
  routes,
  sampleReportDecisionRows,
  sampleReportEvidenceRows,
  sampleReportRedGates,
  sampleReportScoreRows,
  sampleReportTechnicalRows,
  sampleReportTimeline,
  sampleReportWorkflowSections,
  teamMembers,
  workforceDemoScenarios,
  workforceRoles,
  type PageSlug,
} from "./lib/content";

type AppProps = {
  path: string;
};

const homeTrustSignals = [
  { value: "2 weeks", label: "Standard NovaOrbit map to board decision" },
  { value: "4-6 weeks", label: "In-Depth stack, access, workflow, and ROI diagnostic" },
  { value: "60-90 days", label: "first production workflow when evidence supports build" },
  { value: "No demos", label: "scripts and API wrappers are not the definition of shipped AI" },
];

const homeModelLayers = [
  {
    label: "01 Where",
    title: "Map where AI can work.",
    text: "NovaOrbit maps deployment, inferencing, APIs, MCP options, data access, identity, and control gaps before a build starts.",
  },
  {
    label: "02 What",
    title: "Define what AI should do.",
    text: "ZAKI agents, AI apps, RAG, orchestration, automations, and workflow surfaces turn the chosen use case into working capability.",
  },
  {
    label: "03 How",
    title: "Prove how the business changes.",
    text: "Workflow owners, approvals, adoption, run support, and ROI evidence show how the business captures value after launch.",
  },
];

const homeDecisionSignals = [
  {
    label: "Where",
    title: "Can AI work here?",
    text: "Deployment boundary, inference, access, APIs, MCPs, identity, logging, and data sensitivity.",
  },
  {
    label: "What",
    title: "What should AI do?",
    text: "First workflow, ZAKI role, app surface, integration depth, approvals, and evaluation criteria.",
  },
  {
    label: "How",
    title: "How does it become capacity?",
    text: "Owner map, business baseline, governance, run ledger, support rhythm, and scale evidence.",
  },
];

const homeWorkflowPath = [
  { name: "Snapshot", term: "today" },
  { name: "NovaOrbit Standard", term: "2 weeks" },
  { name: "In-Depth if needed", term: "4-6 weeks" },
  { name: "First workflow", term: "60-90 days" },
  { name: "ZAKI agent/app", term: "ship" },
  { name: "Private deployment", term: "launch" },
  { name: "Operated evidence", term: "first 30 days" },
];

const novaOrbitProductionPath = [
  {
    label: "01 / Readout",
    term: "2 weeks",
    title: "Board and CTO decision",
    text: "Stage, red gates, strongest dimension, weakest dimension, first workflow, and commercial next step.",
  },
  {
    label: "02 / Close gates",
    term: "4-6 weeks if needed",
    title: "Access, owner, evidence, reliability",
    text: "Resolve the blockers that would turn implementation into another unmanaged pilot.",
  },
  {
    label: "03 / Shape workflow",
    term: "60-90 days",
    title: "Role, app surface, approvals",
    text: "Turn the selected workflow into a ZAKI role, user surface, tool boundary, and evaluation set.",
  },
  {
    label: "04 / Ship and operate",
    term: "first 30 days",
    title: "Deploy, monitor, improve",
    text: "Run inside the agreed perimeter with a ledger, support rhythm, and evidence for the next scale decision.",
  },
];

const zakiRolePreviews = [
  {
    role: "ZAKI Support Triage",
    boundary: "Tickets, product docs, policy",
    evidence: "Resolution quality, escalation rate",
    approval: "Support lead",
  },
  {
    role: "ZAKI Finance Reviewer",
    boundary: "Invoices, ERP export, contracts",
    evidence: "Exceptions found, loops removed",
    approval: "Finance controller",
  },
  {
    role: "ZAKI Compliance Reader",
    boundary: "Policies, controls, evidence pack",
    evidence: "Source-backed review notes",
    approval: "Compliance owner",
  },
  {
    role: "ZAKI Ops Monitor",
    boundary: "SOPs, dashboards, queue state",
    evidence: "Handoffs, delays, exceptions",
    approval: "Process owner",
  },
];

const partnerMarks = [
  { name: "AWS", logo: "/assets/partners/aws.svg" },
  { name: "GoML", logo: "/assets/partners/goml.svg" },
  { name: "Google Cloud", logo: "/assets/partners/googlecloud.svg" },
  { name: "Hugging Face", logo: "/assets/partners/huggingface.svg" },
  { name: "Ollama", logo: "/assets/partners/ollama.svg" },
  { name: "vLLM", logo: "/assets/partners/vllm.svg" },
  { name: "Kubernetes", logo: "/assets/partners/kubernetes.svg" },
  { name: "Prometheus", logo: "/assets/partners/prometheus.svg" },
  { name: "Docker", logo: "/assets/partners/docker.svg" },
  { name: "NVIDIA", logo: "/assets/partners/nvidia.svg" },
  { name: "Grafana", logo: "/assets/partners/grafana.svg" },
  { name: "Terraform", logo: "/assets/partners/terraform.svg" },
];

const SIGNATURE_SCRAMBLE_ALPHABET = "NOVAUGETS0123456789";
const SIGNATURE_SCRAMBLE_FRAMES = 9;
const SIGNATURE_SCRAMBLE_INTERVAL_MS = 58;

function signatureScrambleFrame(text: string, frame: number, totalFrames: number) {
  const characters = Array.from(text);
  const progress = frame / totalFrames;

  return characters
    .map((character, index) => {
      if (character === " " || character === "\n") {
        return character;
      }

      const settleAt = (index + 1) / (characters.length + 1);
      if (progress >= settleAt || frame >= totalFrames) {
        return character;
      }

      return SIGNATURE_SCRAMBLE_ALPHABET[(index + frame * 5) % SIGNATURE_SCRAMBLE_ALPHABET.length];
    })
    .join("");
}

function SignatureScrambleText({
  text,
  className,
  variant = "editorial",
  dir,
  ariaHidden = false,
}: {
  text: string;
  className?: string;
  variant?: string;
  dir?: "ltr" | "rtl";
  ariaHidden?: boolean;
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setDisplayText(text);
    setIsScrambling(false);

    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    setIsScrambling(true);
    for (let frame = 0; frame <= SIGNATURE_SCRAMBLE_FRAMES; frame += 1) {
      const timer = window.setTimeout(() => {
        setDisplayText(signatureScrambleFrame(text, frame, SIGNATURE_SCRAMBLE_FRAMES));
        if (frame === SIGNATURE_SCRAMBLE_FRAMES) {
          setIsScrambling(false);
        }
      }, frame * SIGNATURE_SCRAMBLE_INTERVAL_MS);
      timersRef.current.push(timer);
    }

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [text]);

  return (
    <span
      aria-hidden={ariaHidden ? "true" : undefined}
      className={className}
      data-scrambling={isScrambling ? "true" : "false"}
      data-variant={variant}
      dir={dir}
    >
      {displayText}
    </span>
  );
}

function ScrambleBrandTitle() {
  return (
    <h1 className="hero-title hero-scramble-title" aria-label="Nova Nuggets">
      <SignatureScrambleText text={"Nova\nNuggets"} ariaHidden dir="ltr" />
    </h1>
  );
}

const heroRouteItems = [
  {
    id: "orbit",
    title: "Close the Last Mile",
    eyebrow: "NovaOrbit",
    href: "/nova-orbit/",
    text: "Assess where AI can run, what it should do, and how the business captures measurable impact.",
    cta: "See framework",
  },
  {
    id: "deploy",
    title: "Control the Runtime",
    eyebrow: "NooX + cloud",
    href: "/deploy/",
    text: "Place inference where the workload needs it: on-prem NooX, your cloud, or NNGTs cloud.",
    cta: "Compare deployment",
  },
  {
    id: "workforce",
    title: "Run Governed Agents",
    eyebrow: "Agents + apps",
    href: "/ai-workforce/",
    text: "Turn one workflow into ZAKI agents with memory, tools, approvals, outputs, and evidence.",
    cta: "See agent loop",
  },
  {
    id: "proof",
    title: "Review the Evidence",
    eyebrow: "Evidence",
    href: "/proof/",
    text: "See the public proof shape, then request the NDA dossier when diligence starts.",
    cta: "View proof",
  },
  {
    id: "notes",
    title: "Learn the Playbook",
    eyebrow: "Learn",
    href: "/field-notes/",
    text: "Read field notes on AI workforces, private AI infrastructure, RAG, sovereign AI, and NooX.",
    cta: "Read notes",
  },
];

export function App({ path }: AppProps) {
  const route = routeForPath(path);
  const current = route.slug;

  useEffect(() => {
    document.documentElement.lang = "en";
    document.body.dataset.page = current;
    document.title = route.title;

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = route.description;
    }

    const pageUrl = new URL(route.path, SITE_URL).toString();
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      canonical.href = pageUrl;
    }

    const metaUpdates: Record<string, string> = {
      'meta[property="og:title"]': route.title,
      'meta[property="og:description"]': route.description,
      'meta[property="og:url"]': pageUrl,
      'meta[name="twitter:title"]': route.title,
      'meta[name="twitter:description"]': route.description,
    };

    Object.entries(metaUpdates).forEach(([selector, content]) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element) {
        element.content = content;
      }
    });
  }, [current, route.description, route.path, route.title]);

  return (
    <div className="site-shell">
      <SiteHeader current={current} />
      <main id="main">
        {current === "home" && <HomePage />}
        {current === "nova-orbit" && <NovaOrbitPage />}
        {current === "nova-orbit-sample-report" && <NovaOrbitSampleReportPage />}
        {current === "what-we-do" && <WhatWeDoPage />}
        {current === "deploy" && <DeployPage />}
        {current === "proof" && <ProofPage />}
        {current === "pricing" && <PricingPage />}
        {current === "team" && <TeamPage />}
        {current === "advisory" && <AdvisoryPage />}
        {current === "approach" && <ApproachPage />}
        {current === "ai-workforce" && <WorkforcePage />}
        {current === "architecture" && <ArchitecturePage />}
        {current === "contact" && <ContactPage />}
        {current === "investors" && <InvestorsPage />}
        {current === "impressum" && <ImpressumPage />}
        {current === "privacy" && <PrivacyPage />}
        {current === "nova-orbit-snapshot" && <NovaOrbitSnapshotPage />}
        {current === "field-notes" && <FieldNotesPage />}
        {current.startsWith("field-note-") && <FieldNotePage path={route.path} />}
      </main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}

function SiteHeader({ current }: { current: PageSlug }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 18);

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [current]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header
      className="site-header"
      data-scrolled={scrolled ? "true" : "false"}
      data-menu={menuOpen ? "true" : "false"}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <a className="brand-lockup" href="/" aria-label="Nova Nuggets home">
        <img src="/assets/nova-nuggets-logo-cut-transparent.png" alt="" />
        <span>Nova Nuggets</span>
      </a>
      <button
        className="nav-menu-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        aria-controls="site-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
      </button>
      <nav id="site-navigation" className="site-nav" aria-label="Primary navigation">
        {primaryNav.map((item) => (
          <a
            key={item.path}
            href={item.path}
            onClick={() => setMenuOpen(false)}
            aria-current={
              current === item.slug || (item.slug === "field-notes" && current.startsWith("field-note-"))
                ? "page"
                : undefined
            }
          >
            <span className="nav-link-stack" aria-hidden="true">
              <span>{item.label}</span>
              <span>{item.label}</span>
            </span>
            <span className="sr-only">{item.label}</span>
          </a>
        ))}
      </nav>
      <div className="nav-actions" aria-label="Primary website actions">
        <a className="nav-brief" href="/nova-orbit-snapshot/" onClick={() => setMenuOpen(false)}>
          Run Snapshot
        </a>
        <a
          className="nav-cta"
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => setMenuOpen(false)}
        >
          Book NovaOrbit
        </a>
      </div>
    </header>
  );
}

function HomePage() {
  return (
    <>
      <Hero />
      <ProofBand points={homeTrustSignals} />
      <HomeLivePathSection />
      <HomeStackSection />
      <HomeProofSection />
      <FinalCta />
    </>
  );
}

function TechnologyScrollerSection() {
  const repeatedMarks = [...partnerMarks, ...partnerMarks];

  return (
    <section className="technology-strip" aria-label="Partners and infrastructure ecosystem">
      <div className="technology-marquee" aria-label="Selected partners and technologies">
        <div className="technology-marquee-track">
          {repeatedMarks.map((mark, index) => (
            <span
              className="technology-mark"
              key={`${mark.name}-${index}`}
              aria-hidden={index >= partnerMarks.length ? "true" : undefined}
              aria-label={index >= partnerMarks.length ? undefined : mark.name}
              role={index >= partnerMarks.length ? undefined : "img"}
              data-duplicate={index >= partnerMarks.length ? "true" : "false"}
            >
              <img src={mark.logo} alt="" loading="eager" decoding="async" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Hero() {
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let context: { revert: () => void } | undefined;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return undefined;

    void import("gsap").then(({ gsap }) => {
      if (!mounted || !heroRef.current) return;

      context = gsap.context(() => {
        const timeline = gsap.timeline({ defaults: { duration: 0.72, ease: "power3.out" } });

        timeline.from(".hero-kicker, .hero-title, .hero-definition, .hero-copy, .hero-actions", {
          autoAlpha: 0,
          y: 26,
          stagger: 0.075,
        });
      }, heroRef.current);
    });

    return () => {
      mounted = false;
      context?.revert();
    };
  }, []);

  return (
    <section ref={heroRef} className="hero hero-brand">
      <div className="hero-inner">
        <p className="hero-kicker">Innovation and Artificial Intelligence Research and Consultancies</p>
        <ScrambleBrandTitle />
        <dl className="hero-definition" aria-label="Nova Nuggets brand definition">
          <div>
            <dt>nova</dt>
            <dd>from Latin <em>novus</em>: new. A star that suddenly brightens; a signal of evolution, transformation, and explosive growth.</dd>
          </div>
          <div>
            <dt>nugget</dt>
            <dd>a small lump of gold; a concentrated piece of useful insight, wisdom, or clever knowledge.</dd>
          </div>
        </dl>
        <p className="hero-copy">
          AI that actually ships: not scripts, API wrappers, or demos. NovaOrbit maps the work,
          ZAKI runs the agents, and private infrastructure keeps it owned.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="/nova-orbit-snapshot/">
            Run NovaOrbit Snapshot <ArrowIcon size={18} aria-hidden="true" />
          </a>
          <a className="button button-secondary" href="/nova-orbit/">
            See NovaOrbit
          </a>
        </div>
      </div>
    </section>
  );
}

function HomeLivePathSection() {
  return (
    <section className="home-live-path-section" aria-labelledby="home-live-path-title">
      <div className="home-live-path-copy">
        <p className="section-kicker">Diagnostic active</p>
        <h2 id="home-live-path-title">No AI theatre. A shipping clock.</h2>
        <p>
          Snapshot now, Standard in 2 weeks, In-Depth in 4-6 weeks when the stack needs proof,
          and a first production workflow in 60-90 days when the gates are clear.
        </p>
      </div>
      <div className="home-live-diagnostic" aria-label="Live NovaOrbit diagnostic path">
        <div className="home-live-status" aria-hidden="true">
          <span />
          <strong>
            <SignatureScrambleText text="Assessment engine live" variant="signal" />
          </strong>
        </div>
        <div className="home-decision-grid">
          {homeDecisionSignals.map((decision, index) => (
            <article key={decision.label}>
              <span>
                {String(index + 1).padStart(2, "0")} / {decision.label}
              </span>
              <h3>{decision.title}</h3>
              <p>{decision.text}</p>
            </article>
          ))}
        </div>
        <div className="home-workflow-path" aria-label="From Snapshot to operated evidence">
          {homeWorkflowPath.map((step, index) => (
            <p key={step.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.name}</strong>
              <small>{step.term}</small>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroRouteAccordion({
  active,
  onActivate,
}: {
  active: number | null;
  onActivate: (index: number | null) => void;
}) {
  const hoverIntentRef = useRef<number | null>(null);
  const clearIntentRef = useRef<number | null>(null);

  const clearHoverIntent = () => {
    if (hoverIntentRef.current !== null) {
      window.clearTimeout(hoverIntentRef.current);
      hoverIntentRef.current = null;
    }
  };

  const clearLeaveIntent = () => {
    if (clearIntentRef.current !== null) {
      window.clearTimeout(clearIntentRef.current);
      clearIntentRef.current = null;
    }
  };

  const activateRoute = (index: number | null) => {
    clearHoverIntent();
    clearLeaveIntent();
    onActivate(index);
  };

  const scheduleActivate = (index: number) => {
    clearHoverIntent();
    clearLeaveIntent();

    hoverIntentRef.current = window.setTimeout(() => {
      onActivate(index);
      hoverIntentRef.current = null;
    }, 110);
  };

  const scheduleClear = () => {
    clearHoverIntent();
    clearLeaveIntent();

    clearIntentRef.current = window.setTimeout(() => {
      onActivate(null);
      clearIntentRef.current = null;
    }, 140);
  };

  useEffect(() => {
    return () => {
      clearHoverIntent();
      clearLeaveIntent();
    };
  }, []);

  return (
    <nav
      className="hero-route-accordion"
      aria-label="Explore Nova Nuggets"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;

        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          activateRoute(null);
        }
      }}
      onPointerLeave={scheduleClear}
    >
      <div className="hero-route-track">
        {heroRouteItems.map((item, index) => (
          <a
            key={item.id}
            className="hero-route-panel"
            data-active={active === index ? "true" : "false"}
            data-route={item.id}
            href={item.href}
            onFocus={() => activateRoute(index)}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse" || event.pointerType === "pen") {
                scheduleActivate(index);
              }
            }}
          >
            <span className="hero-route-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="hero-route-visual" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="hero-route-collapsed-title" aria-hidden="true">
              {item.title}
            </span>
            <span className="hero-route-label">
              <span>{item.eyebrow}</span>
              <strong>{item.title}</strong>
            </span>
            <span className="hero-route-detail">
              <span>{item.text}</span>
              <em>
                {item.cta} <ArrowIcon size={15} aria-hidden="true" />
              </em>
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

type WorkforceDemoScenario = (typeof workforceDemoScenarios)[number];

type ZakiCommandFrameProps = {
  active: number;
  activePhase: number;
  current: WorkforceDemoScenario;
  onInteractionChange: (paused: boolean) => void;
  onPhaseSelect: (index: number) => void;
  onSelect: (index: number) => void;
  className?: string;
  emptyTopline?: boolean;
  label?: string;
};

type WorkforceOrbitNode = {
  id: string;
  label: string;
  value: string;
  detail: string;
  position: string;
  kind: "memory" | "tool" | "approval" | "output" | "evidence" | "ledger";
  x: number;
  y: number;
};

const orbitNodePositions = [
  { position: "memory", x: 30, y: 20 },
  { position: "tool", x: 70, y: 20 },
  { position: "approval", x: 84, y: 50 },
  { position: "output", x: 70, y: 80 },
  { position: "evidence", x: 30, y: 80 },
  { position: "ledger", x: 16, y: 50 },
] as const;

function getWorkforceOrbitNodes(current: WorkforceDemoScenario): WorkforceOrbitNode[] {
  return [
    {
      id: "memory",
      label: "Private memory",
      value: "Approved company context",
      detail: "ZAKI starts from role-scoped knowledge, not a blank prompt or unmanaged employee account.",
      kind: "memory",
      ...orbitNodePositions[0],
    },
    {
      id: "tool",
      label: "Approved tools",
      value: current.tool,
      detail: "The agent can only reach the systems and actions designed for that workflow.",
      kind: "tool",
      ...orbitNodePositions[1],
    },
    {
      id: "approval",
      label: "Human control",
      value: current.approval,
      detail: "A named owner stays in control before sensitive work moves forward.",
      kind: "approval",
      ...orbitNodePositions[2],
    },
    {
      id: "output",
      label: "Useful output",
      value: current.output,
      detail: "Each run creates a concrete artifact the team can review, use, send, or improve.",
      kind: "output",
      ...orbitNodePositions[3],
    },
    {
      id: "evidence",
      label: "Business evidence",
      value: current.roi,
      detail: "One business metric travels with the workflow so leaders know what is worth scaling.",
      kind: "evidence",
      ...orbitNodePositions[4],
    },
    {
      id: "ledger",
      label: "Audit trail",
      value: "Run log + control trail",
      detail: "Memory used, tools called, approvals, exceptions, and outputs remain inspectable.",
      kind: "ledger",
      ...orbitNodePositions[5],
    },
  ];
}

function ZakiCommandFrame({
  active,
  activePhase,
  current,
  onInteractionChange,
  onPhaseSelect,
  onSelect,
  className,
  emptyTopline = false,
  label = "Owned AI workforce command preview",
}: ZakiCommandFrameProps) {
  const rootClassName = ["hero-command", className].filter(Boolean).join(" ");
  const orbitNodes = getWorkforceOrbitNodes(current);
  const activeNode = orbitNodes[activePhase] ?? orbitNodes[0];
  const previousPhase = (activePhase + orbitNodes.length - 1) % orbitNodes.length;
  const nextPhase = (activePhase + 1) % orbitNodes.length;

  return (
    <div className={rootClassName} aria-label={label}>
      <div className="command-frame">
        <div
          className={emptyTopline ? "hero-command-topline hero-command-topline-empty" : "hero-command-topline"}
          aria-hidden={emptyTopline ? "true" : undefined}
        >
          {emptyTopline ? (
            <>
              <span />
              <span />
            </>
          ) : (
            <>
              <span>ZAKI workforce command</span>
              <span>memory / tools / approvals / ledger</span>
            </>
          )}
        </div>
        <div className="hero-command-map">
          <div className="hero-perimeter" aria-hidden="true">
            <span>customer perimeter</span>
          </div>
          <div className="hero-department-tabs" role="tablist" aria-label="Department agent examples">
            {workforceDemoScenarios.map((scenario, index) => (
              <button
                key={scenario.department}
                type="button"
                role="tab"
                aria-selected={active === index}
                onClick={() => onSelect(index)}
              >
                {scenario.department}
              </button>
            ))}
          </div>
          <div className="hero-orbit-stage" style={{ "--active-x": `${activeNode.x}%`, "--active-y": `${activeNode.y}%` } as CSSProperties}>
            <span className="hero-command-ring ring-one" aria-hidden="true" />
            <span className="hero-command-ring ring-two" aria-hidden="true" />
            <span className="hero-command-ring ring-three" aria-hidden="true" />
            <svg className="hero-orbit-lines" viewBox="0 0 100 100" aria-hidden="true">
              {orbitNodes.map((node, index) => (
                <line
                  key={node.id}
                  x1="50"
                  y1="50"
                  x2={node.x}
                  y2={node.y}
                  data-active={activePhase === index ? "true" : "false"}
                />
              ))}
            </svg>
            <span className="hero-orbit-signal" aria-hidden="true" />
            <div className="hero-command-core">
              <img src="/assets/nova-nuggets-logo-cut-transparent.png" alt="" />
              <strong>{current.agent}</strong>
              <span>{current.department} workflow</span>
            </div>
            {orbitNodes.map((node, index) => {
              const isActive = activePhase === index;
              const isRelated = index === previousPhase || index === nextPhase;

              return (
                <button
                  key={node.id}
                  type="button"
                  className="hero-orbit-node"
                  data-position={node.position}
                  data-kind={node.kind}
                  data-active={isActive ? "true" : "false"}
                  data-related={isRelated ? "true" : "false"}
                  style={{ "--node-x": `${node.x}%`, "--node-y": `${node.y}%` } as CSSProperties}
                  aria-label={`${node.label}: ${node.value}. ${node.detail}`}
                  aria-pressed={isActive}
                  onBlur={() => onInteractionChange(false)}
                  onClick={() => onPhaseSelect(index)}
                  onFocus={() => {
                    onInteractionChange(true);
                    onPhaseSelect(index);
                  }}
                  onMouseEnter={() => {
                    onInteractionChange(true);
                    onPhaseSelect(index);
                  }}
                  onMouseLeave={() => onInteractionChange(false)}
                >
                  <span className="hero-orbit-node-dot" aria-hidden="true" />
                  <span className="hero-orbit-node-copy">
                    <span>{String(index + 1).padStart(2, "0")} {node.label}</span>
                    <strong>{node.value}</strong>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="hero-orbit-detail" aria-label={`${activeNode.label}: ${activeNode.value}. ${activeNode.detail}`} aria-live="polite">
            <span>{activeNode.label}</span>
            <strong>{activeNode.value}</strong>
            <p>{activeNode.detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeStackSection() {
  const [activeRoute, setActiveRoute] = useState<number | null>(null);

  return (
    <section className="home-stack-section" aria-labelledby="home-stack-title">
      <div className="home-stack-copy">
        <p className="section-kicker">NovaOrbit assessment</p>
        <h2 id="home-stack-title">Find where AI creates value. Build the system to capture it.</h2>
        <p>
          NovaOrbit assesses where AI can run, what it should do, and how the business captures
          impact. Start with the two-week Standard assessment, then go deeper when the stack,
          access, and ROI need validation.
        </p>
        <div className="home-model-actions" aria-label="NovaOrbit assessment actions">
          <a className="button button-primary" href="/nova-orbit/">
            See NovaOrbit <ArrowIcon size={18} aria-hidden="true" />
          </a>
          <a className="button button-secondary" href="/nova-orbit-snapshot/">
            Run Snapshot
          </a>
        </div>
      </div>
      <div className="home-stack-grid" aria-label="Nova Nuggets full-stack AI layers">
        {homeModelLayers.map((layer) => (
          <article key={layer.title}>
            <span>{layer.label}</span>
            <h3>{layer.title}</h3>
            <p>{layer.text}</p>
          </article>
        ))}
      </div>
      <div className="home-route-system">
        <div>
          <p className="section-kicker">Choose the first move</p>
          <h3>Assess first. Build only where AI can work.</h3>
        </div>
        <HeroRouteAccordion active={activeRoute} onActivate={setActiveRoute} />
      </div>
    </section>
  );
}

function NooxProofSection({ visual = "operations" }: { visual?: "product" | "operations" }) {
  const image =
    visual === "product"
      ? {
          src: "/assets/noox/noox-product-cinematic.png",
          alt: "NooX on-premise AI server cinematic product render with blueprint construction lines.",
          width: 1672,
          height: 941,
        }
      : {
          src: "/assets/noox/noox-operations-room.png",
          alt: "NooX private AI appliance connected inside a local AI operations environment.",
          width: 1672,
          height: 941,
        };

  return (
    <section className="noox-proof-section" data-visual={visual} aria-labelledby="noox-proof-title">
      <div className="noox-proof-media">
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
        />
      </div>
      <div className="noox-proof-copy">
        <p className="section-kicker">Private runtime</p>
        <h2 id="noox-proof-title">Put AI where the workload can run safely.</h2>
        <p>
          NooX and our cloud deployment paths give teams predictable latency, private model
          serving, and a clear data boundary. We choose the runtime around the workflow, not the
          other way around.
        </p>
        <div className="noox-proof-facts" aria-label="NooX delivery options">
          <p>
            <span>fast path</span>
            standard NooX
          </p>
          <p>
            <span>designed path</span>
            custom per project
          </p>
          <p>
            <span>scale pattern</span>
            central or decentralized
          </p>
          <p>
            <span>boundary</span>
            on-prem, client cloud, or NNGTs cloud
          </p>
        </div>
        <a className="proof-link" href="/deploy/">
          See deployment models <ArrowIcon size={17} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function DataBoundarySection() {
  return (
    <section className="data-boundary-section" aria-labelledby="data-boundary-title">
      <div className="data-boundary-copy">
        <p className="section-kicker">Control outcome</p>
        <h2 id="data-boundary-title">Keep data private while work moves faster.</h2>
        <p>
          Customer data, model context, vectors, approvals, and run logs stay inside the chosen
          perimeter while ZAKI agents move approved work through the tools teams already use.
        </p>
        <div className="data-boundary-ledger" aria-label="Private AI data boundary controls">
          <p>
            <span>inside</span>
            customer data and memory
          </p>
          <p>
            <span>controlled</span>
            approvals and model routing
          </p>
          <p>
            <span>moving</span>
            approved work and evidence
          </p>
        </div>
      </div>
      <div className="data-boundary-media">
        <img
          src="/assets/noox/noox-data-frozen.png"
          alt="NooX appliance visually sealed inside a transparent frozen data boundary."
          width="1536"
          height="1024"
          loading="lazy"
        />
      </div>
    </section>
  );
}

function HiddenCostSection() {
  return (
    <section className="section section-light">
      <SectionIntro
        kicker="The hidden cost"
        title="Most companies spend on AI. Few capture value from it."
        text="ChatGPT seats, Copilot licenses, point bots, and SaaS add-ons spread quickly. Value appears when AI is connected to company memory, workflow ownership, and a deployment boundary the business can govern."
      />
      <div className="cost-grid">
        {hiddenCosts.map((cost) => (
          <article key={cost.value}>
            <strong>{cost.value}</strong>
            <h3>{cost.label}</h3>
            <p>{cost.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CategorySection() {
  return (
    <section className="section category-section">
      <SectionIntro
        kicker="The category"
        title="Three ways to buy AI. Only one is accountable for the workflow."
        text="Vendors sell seats. Consultancies sell roadmaps. NNGTs diagnoses, builds, deploys, and runs governed AI work inside your perimeter."
      />
      <div className="category-grid">
        {categoryOptions.map((option) => (
          <article key={option.name} className={option.name === "Nova Nuggets" ? "featured" : ""}>
            <p>{option.label}</p>
            <h3>{option.name}</h3>
            <span>{option.text}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function CapabilitySection() {
  return (
    <section className="section section-light">
      <SectionIntro
        kicker="What we do"
        title="Everything needed to turn one workflow into governed AI work."
        text="The offer combines classic AI delivery with the operating fabric that makes agents useful, controlled, measurable, and ready to scale."
      />
      <div className="capability-grid">
        {capabilityPillars.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FullStackSection() {
  return (
    <section className="section full-stack-section">
      <div className="full-stack-copy">
        <p className="section-kicker">Full-stack AI outcomes</p>
        <h2>One system from runtime to measurable work.</h2>
        <p>
          NNGTs designs infrastructure, ZAKI agents, applications, and operating model together so
          every deployment has a workflow owner, a data boundary, and a business metric.
        </p>
      </div>
      <div className="full-stack-visual" aria-label="NNGTs full-stack AI delivery model">
        <div className="full-stack-system">
          <span>NNGTs outcome system</span>
          <strong>Runtime + Agents + Apps + Operations</strong>
          <small>built around one workflow before scaling to many</small>
        </div>
        <div className="full-stack-layers">
          {fullStackLayers.map((layer) => (
            <article key={layer.title}>
              <span>{layer.label}</span>
              <h3>{layer.title}</h3>
              <strong>{layer.metric}</strong>
              <p>{layer.text}</p>
            </article>
          ))}
        </div>
        <div className="deployment-mode-strip" aria-label="Deployment modes">
          {nooxDeploymentModes.map((mode) => (
            <article key={mode.name}>
              <span>{mode.label}</span>
              <h3>{mode.name}</h3>
              <p>{mode.detail}</p>
              <ul>
                {mode.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="noox-design-strip" aria-label="NooX design patterns">
          {nooxBuildModes.map(([name, detail]) => (
            <p key={name}>
              <span>{name}</span>
              {detail}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofBand({
  points = proofPoints,
}: {
  points?: Array<{ value: string; label: string }>;
}) {
  return (
    <section className="proof-band" aria-label="Company proof points">
      {points.map((point) => (
        <div key={point.value}>
          <strong>{point.value}</strong>
          <span>{point.label}</span>
        </div>
      ))}
    </section>
  );
}

function HomeProofSection() {
  return (
    <section className="home-proof-section" aria-labelledby="home-proof-title">
      <div className="home-proof-copy">
        <p className="section-kicker">Proof path</p>
        <h2 id="home-proof-title">See the signal. Request the evidence.</h2>
        <p>
          The public site shows the shape of operating proof. Serious buyers can request the NDA
          path with workflow economics, deployment boundary, agent ledger, and scale recommendation.
        </p>
      </div>
      <div className="home-proof-ledger" aria-label="Reference dossier preview">
        {proofArtifacts.map((artifact) => (
          <article key={artifact.title}>
            <span>{artifact.label}</span>
            <h3>{artifact.title}</h3>
            <p>{artifact.text}</p>
          </article>
        ))}
      </div>
      <div className="home-proof-actions">
        <a
          className="button button-primary"
          href={`mailto:${GENERAL_EMAIL}?subject=MNDA%20%2B%20NDA%20reference%20dossier%20request`}
        >
          Request NDA evidence dossier <ArrowIcon size={18} aria-hidden="true" />
        </a>
        <a className="button button-secondary" href="/proof/">
          View public proof
        </a>
      </div>
    </section>
  );
}

function AudienceRouteSection() {
  return (
    <section className="audience-route-section" aria-label="Choose your path">
      {audienceRoutes.map((route) => (
        <a
          key={route.title}
          href={route.href}
          target={route.external ? "_blank" : undefined}
          rel={route.external ? "noreferrer" : undefined}
        >
          <span>{route.label}</span>
          <strong>{route.title}</strong>
          <p>{route.text}</p>
        </a>
      ))}
    </section>
  );
}

function WorkforceDemoSection() {
  const [active, setActive] = useState(0);
  const [activePhase, setActivePhase] = useState(0);
  const [isOrbitPaused, setIsOrbitPaused] = useState(false);
  const orbitResumeTimer = useRef<number | null>(null);
  const current = workforceDemoScenarios[active];

  const holdOrbit = () => {
    setIsOrbitPaused(true);

    if (orbitResumeTimer.current !== null) {
      window.clearTimeout(orbitResumeTimer.current);
    }

    orbitResumeTimer.current = window.setTimeout(() => {
      setIsOrbitPaused(false);
      orbitResumeTimer.current = null;
    }, 3200);
  };

  const selectDepartment = (index: number) => {
    setActive(index);
    setActivePhase(0);
    holdOrbit();
  };

  const selectPhase = (index: number) => {
    setActivePhase(index);
    holdOrbit();
  };

  useEffect(() => {
    if (isOrbitPaused) return undefined;

    const timer = window.setInterval(() => {
      setActivePhase((phase) => {
        if (phase >= orbitNodePositions.length - 1) {
          setActive((index) => (index + 1) % workforceDemoScenarios.length);
          return 0;
        }

        return phase + 1;
      });
    }, 1400);

    return () => window.clearInterval(timer);
  }, [isOrbitPaused]);

  useEffect(() => {
    return () => {
      if (orbitResumeTimer.current !== null) {
        window.clearTimeout(orbitResumeTimer.current);
      }
    };
  }, []);

  return (
    <section className="section workforce-demo-section">
      <div className="workforce-demo-copy">
        <p className="section-kicker">ZAKI operating loop</p>
        <h2>Watch one agent become useful work.</h2>
        <p>
          Start with a department. ZAKI turns private memory, approved tools, human control,
          useful output, business evidence, and an audit trail into one repeatable workflow.
        </p>
      </div>
      <ZakiCommandFrame
        active={active}
        activePhase={activePhase}
        current={current}
        onInteractionChange={setIsOrbitPaused}
        onPhaseSelect={selectPhase}
        onSelect={selectDepartment}
        className="workforce-command-preview"
        emptyTopline
        label="Interactive ZAKI workforce command map"
      />
    </section>
  );
}

function CommandRoomSection() {
  const [active, setActive] = useState(0);
  const current = commandRoomLanes[active];

  return (
    <section className="section command-room-section" aria-labelledby="command-room-title">
      <div className="command-copy">
        <p className="section-kicker">Signature system</p>
        <h2 id="command-room-title">Turn one painful workflow into governed AI work.</h2>
        <p>
          NNGTs connects the owner, data boundary, ZAKI agent, approvals, tools, and evidence so
          leadership can decide what scales next.
        </p>
      </div>
      <div className="command-stage" aria-label="NNGTs operating room workflow preview">
        <div className="command-controls" role="tablist" aria-label="Operating room sequence">
          {commandRoomLanes.map((lane, index) => (
            <button
              key={lane.label}
              type="button"
              role="tab"
              aria-selected={active === index}
              onClick={() => setActive(index)}
            >
              <span>{lane.label}</span>
              <strong>{lane.metric}</strong>
            </button>
          ))}
        </div>
        <div className="command-visual">
          <div className="command-feed" aria-hidden="true">
            <span>source: CRM / inbox / documents</span>
            <span>agent: ZAKI sales researcher</span>
            <span>approval: department owner</span>
            <span>ledger: ROI + audit evidence</span>
          </div>
          <div className="command-core">
            <img src="/assets/nova-nuggets-logo-cut-transparent.png" alt="" />
            <strong>{current.metric}</strong>
            <span>{current.label}</span>
          </div>
          <div className="command-detail" role="tabpanel">
            <p>{current.label}</p>
            <h3>{current.title}</h3>
            <span>{current.detail}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrbitDeliverablesSection() {
  return (
    <section id="orbit-output" className="section orbit-output-section">
      <div className="orbit-output-copy">
        <p className="section-kicker">NovaOrbit outcome</p>
        <h2>Leave with a buildable first-workflow plan.</h2>
        <p>
          NovaOrbit is the paid path from AI ambition to a production decision: which workflow to
          build, where it runs, who owns it, and how success is measured.
        </p>
        <a className="proof-link proof-link-dark" href="/pricing/">
          See engagement path <ArrowIcon size={17} aria-hidden="true" />
        </a>
        <a className="proof-link proof-link-dark" href="/nova-orbit-sample-report/">
          Preview sample report <ArrowIcon size={17} aria-hidden="true" />
        </a>
      </div>
      <div className="orbit-output-visual" aria-label="NovaOrbit deliverable preview">
        <div className="dossier-cover">
          <span>NovaOrbit dossier</span>
          <strong>Where / What / How plan</strong>
          <small>Standard: 2 weeks / In-Depth: 4-6 weeks</small>
        </div>
        <div className="deliverable-list">
          {orbitDeliverables.map((item) => (
            <article key={item.title}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OperatingModel() {
  return (
    <section className="section section-light" id="approach">
      <SectionIntro
        kicker="Operating model"
        title="Move from AI experiments to owned workflow capacity."
        text="NNGTs starts with workflows that already cost time or money, then installs agents where governance, context, and accountability are strongest."
      />
      <div className="process-rail">
        {operatingModel.map((item, index) => {
          const Icon = item.icon;
          return (
            <article className="process-item" key={item.title}>
              <span className="step-number">0{index + 1}</span>
              <Icon size={24} aria-hidden="true" />
              <p>{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <span>{item.text}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ApproachSpineSection() {
  return (
    <section className="section approach-spine-section">
      <SectionIntro
        kicker="Engagement spine"
        title="A gated method from ambition to production work."
        text="Approach is the delivery logic: who aligns, what gets inspected, what must be validated, and when Nova Nuggets should build or operate the first workflow."
      />
      <div className="approach-spine" aria-label="Nova Nuggets engagement spine">
        {approachSteps.map((step) => (
          <article key={step.label}>
            <span>{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <strong>{step.output}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApproachGateSection() {
  return (
    <section className="section section-light approach-gate-section">
      <div className="approach-gate-copy">
        <p className="section-kicker">Gate rules</p>
        <h2>Methodology is credible only if it can say no.</h2>
        <p>
          These rules keep NovaOrbit from becoming a workshop and keep first-workflow builds from
          turning into unmanaged pilots.
        </p>
      </div>
      <div className="approach-gate-grid" aria-label="Nova Nuggets approach gates">
        {approachGates.map(([title, text]) => (
          <article key={title}>
            <span>Gate</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkforceSection() {
  return (
    <section className="section section-dark split-section">
      <div>
        <p className="section-kicker">ZAKI managed agents</p>
        <h2>Give every role governed AI capacity.</h2>
      </div>
      <div className="role-matrix" aria-label="Example managed ZAKI agent roles">
        {workforceRoles.map((role) => (
          <span key={role}>{role}</span>
        ))}
      </div>
      <div className="zaki-role-preview" aria-label="ZAKI role preview">
        {zakiRolePreviews.map((item) => (
          <article key={item.role}>
            <span>Managed role</span>
            <h3>{item.role}</h3>
            <p>
              <strong>Boundary</strong>
              {item.boundary}
            </p>
            <p>
              <strong>Evidence</strong>
              {item.evidence}
            </p>
            <p>
              <strong>Approval</strong>
              {item.approval}
            </p>
          </article>
        ))}
      </div>
      <p className="section-note">
        ZAKI creates familiarity for employees. NNGTs turns that surface into governed agents,
        department workflows, and measurable operating capacity.
      </p>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section className="section architecture-section">
      <SectionIntro
        kicker="Reference architecture"
        title="Architecture that survives model changes."
        text="The durable value is the operating layer around the model: memory, tools, policy, deployment control, observability, and the last mile between AI and human work."
      />
      <div className="architecture-map">
        {architectureLayers.map((layer) => {
          const Icon = layer.icon;
          return (
            <article key={layer.title}>
              <Icon size={26} aria-hidden="true" />
              <h3>{layer.title}</h3>
              <p>{layer.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DeploymentSection() {
  return (
    <section className="section deploy-section">
      <SectionIntro
        kicker="Deployment models"
        title="Choose the deployment path that protects the workflow."
        text="The architecture starts with data residency, identity, audit, operating access, and inference posture. Model choice comes after the boundary is clear."
      />
      <div className="deploy-grid">
        {deploymentModels.map((model) => (
          <article key={model.title}>
            <h3>{model.title}</h3>
            <p>{model.text}</p>
            <ul>
              {model.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function DeploymentDecisionSection() {
  const modes = nooxDeploymentModes.map((mode) => mode.name);

  return (
    <section className="section deployment-decision-section">
      <SectionIntro
        kicker="Deployment decision"
        title="Choose the perimeter before choosing the model."
        text="The right architecture depends on data sensitivity, cloud maturity, speed, control, and operating ownership. NovaOrbit turns those tradeoffs into a concrete deployment decision."
      />
      <div className="deployment-matrix" role="table" aria-label="Deployment model decision matrix">
        <div className="deployment-matrix-head" role="row">
          <span role="columnheader">Decision</span>
          {modes.map((mode) => (
            <strong role="columnheader" key={mode}>{mode}</strong>
          ))}
        </div>
        {deploymentDecisionRows.map(([label, ...cells]) => (
          <div className="deployment-matrix-row" role="row" key={label}>
            <span role="rowheader">{label}</span>
            {cells.map((cell, index) => (
              <p role="cell" key={`${label}-${modes[index]}`}>{cell}</p>
            ))}
          </div>
        ))}
      </div>
      <div className="deployment-decision-cards" aria-label="Mobile deployment model decision cards">
        {nooxDeploymentModes.map((mode, modeIndex) => (
          <article key={mode.name}>
            <span>{mode.label}</span>
            <h3>{mode.name}</h3>
            {deploymentDecisionRows.map(([label, ...cells]) => (
              <p key={`${mode.name}-${label}`}>
                <strong>{label}</strong>
                {cells[modeIndex]}
              </p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

function NooxTopologySection() {
  return (
    <section className="section noox-topology-section">
      <div className="noox-topology-copy">
        <p className="section-kicker">NooX infrastructure</p>
        <h2>Choose the infrastructure pattern that protects the workflow.</h2>
        <p>
          Some clients need one central inference server. Others need decentralized servers with
          load balancing for resilience, geography, or workload separation. The topology follows
          the business outcome.
        </p>
      </div>
      <div className="topology-suite">
        <figure className="topology-appliance">
          <img
            src="/assets/noox/noox-appliance-clean.png"
            alt="Standard NooX private AI inferencing appliance."
            width="900"
            height="900"
            loading="lazy"
          />
          <figcaption>
            <span>standard noox</span>
            Physical private inference when the customer perimeter requires local control.
          </figcaption>
        </figure>
        <div className="topology-visual" aria-label="NooX topology options">
          <div className="topology-node topology-core">
            <span>NooX</span>
            <strong>AI inferencing computer</strong>
          </div>
          <div className="topology-line line-a" />
          <div className="topology-line line-b" />
          <div className="topology-line line-c" />
          {nooxBuildModes.map(([name, detail]) => (
            <article key={name}>
              <span>{name}</span>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofSection({ includeDossier = false }: { includeDossier?: boolean }) {
  return (
    <section className="section proof-section" id="proof-dossier">
      <div className="proof-copy">
        <p className="section-kicker">Proof · live</p>
        <h2>Measured workflow proof. Evidence path available.</h2>
        <p>
          Ninety days from assessment to measurable savings. One workflow automated end-to-end. Three
          departments using managed ZAKI agents inside the customer perimeter. Public figures stay
          sanitized; serious buyers can request the controlled evidence room.
        </p>
        <a
          className="proof-link"
          href={`mailto:${GENERAL_EMAIL}?subject=MNDA%20%2B%20NDA%20reference%20dossier%20request`}
        >
          Request evidence room <ArrowIcon size={17} aria-hidden="true" />
        </a>
      </div>
      <div className="proof-numbers">
        {proofPoints.map((point) => (
          <article key={point.value}>
            <strong>{point.value}</strong>
            <span>{point.label}</span>
          </article>
        ))}
      </div>
      {includeDossier && (
        <div className="proof-dossier" aria-label="NDA reference dossier contents">
          <div>
            <p className="section-kicker">Reference dossier</p>
            <h3>What serious buyers can inspect after MNDA.</h3>
          </div>
          <div className="dossier-grid">
            {proofArtifacts.map((artifact) => (
              <article key={artifact.title}>
                <span>{artifact.label}</span>
                <h4>{artifact.title}</h4>
                <p>{artifact.text}</p>
              </article>
            ))}
          </div>
        </div>
      )}
      <div className="evidence-standard" aria-label="Evidence standard">
        {evidenceStandards.map(([label, text]) => (
          <p key={label}>
            <span>{label}</span>
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}

function ProofCaseSection() {
  return (
    <section className="section proof-case-section">
      <div className="proof-case-copy">
        <p className="section-kicker">Reference Alpha · sanitized</p>
        <h2>A case file, not a logo claim.</h2>
        <p>
          The public read protects customer identity. The case file still shows the workflow logic,
          evidence artifacts, and scale decision a serious buyer can test.
        </p>
      </div>
      <div className="proof-case-file" aria-label="Reference Alpha anonymized case file">
        <div className="proof-case-file-head">
          <p>
            <span>Reference</span>
            <strong>German mid-market workflow</strong>
            <small>identity withheld publicly</small>
          </p>
          <p>
            <span>Status</span>
            <strong>Evidence room ready</strong>
            <small>MNDA-controlled review</small>
          </p>
        </div>
        <div className="proof-case-grid">
          {proofCaseRows.map((row) => (
            <article key={row.label}>
              <span>{row.label}</span>
              <h3>{row.title}</h3>
              <p>{row.text}</p>
            </article>
          ))}
        </div>
        <div className="proof-artifact-board">
          {proofCaseArtifacts.map((artifact) => (
            <article key={artifact.title}>
              <div className="proof-artifact-window" aria-hidden="true">
                <span>{artifact.label}</span>
                <strong>{artifact.metric}</strong>
                <i />
                <i />
                <i />
              </div>
              <h3>{artifact.title}</h3>
              <p>{artifact.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofDiligenceSection() {
  return (
    <section className="section proof-diligence-section">
      <div className="proof-diligence-copy">
        <p className="section-kicker">Diligence room</p>
        <h2>Open the evidence room when diligence starts.</h2>
        <p>
          Qualified buyers get the artifact path that lets leadership, IT, finance, and compliance
          test whether the assessment and first workflow are defensible.
        </p>
        <a
          className="button button-primary"
          href={`mailto:${GENERAL_EMAIL}?subject=${encodeURIComponent("MNDA + NovaOrbit evidence room request")}`}
        >
          Request evidence room <ArrowIcon size={18} aria-hidden="true" />
        </a>
      </div>
      <div className="proof-diligence-grid">
        {proofDiligenceRows.map((row) => (
          <article key={row.label}>
            <span>{row.label}</span>
            <h3>{row.title}</h3>
            <p>{row.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProofMediaSection() {
  return (
    <section className="section proof-media-section">
      <SectionIntro
        kicker="Proof media"
        title="Evidence a serious buyer can evaluate."
        text="The public site shows sanitized artifact shapes. The controlled room adds source artifacts, run logs, workflow maps, screenshots, and finance context."
      />
      <div className="proof-media-grid">
        {proofMedia.map((item, index) => (
          <article key={item.title} className={`proof-media-card proof-media-card-${index + 1}`}>
            <div className="artifact-window" aria-hidden="true">
              <span>{item.label}</span>
              <strong>{item.metric}</strong>
              <div className="artifact-bars">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="artifact-redactions">
                <b />
                <b />
                <b />
              </div>
            </div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
      <div className="proof-quote-grid">
        {proofQuotes.map((item) => (
          <blockquote key={item.label}>
            <p>“{item.quote}”</p>
            <cite>{item.label} · anonymized reference</cite>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

function OwnershipPromiseSection() {
  return (
    <section className="section ownership-section">
      <div>
        <p className="section-kicker">Ownership promise</p>
        <h2>Own the workflow, evidence, and boundary.</h2>
      </div>
      <div className="ownership-grid">
        {ownershipPromises.map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OperatorCredibilitySection() {
  return (
    <section className="section operator-section">
      <div className="operator-copy">
        <p className="section-kicker">Why us</p>
        <h2>NNGTs turns ownership into shipped work.</h2>
        <p>
          The promise is not “we know AI.” It is “your company owns the workflow, evidence,
          deployment boundary, and operating model after the first implementation.”
        </p>
      </div>
      <div className="operator-grid">
        {operatorCredentials.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <h3>{item.value}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdvisoryBenchSection() {
  return (
    <section className="section advisor-section">
      <SectionIntro
        kicker="Advisor layer"
        title="Senior judgment around the places AI programs usually fail."
        text="Named advisors can be shared during diligence when approved. Publicly, the important signal is the expertise wrapped around delivery."
      />
      <div className="advisor-grid">
        {advisoryBench.map((advisor) => (
          <article key={advisor.label}>
            <h3>{advisor.label}</h3>
            <p>{advisor.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CommercialSection() {
  return (
    <section className="section commercial-section">
      <div className="commercial-copy">
        <p className="section-kicker">Start path</p>
        <h2>Start with the assessment that leads to production.</h2>
        <p>
          The first engagement identifies the workflow, stack changes, owner, and value case, then
          converts into first-workflow build and managed AI operations when the economics are clear.
        </p>
      </div>
      <div className="commercial-table" role="table" aria-label="Nova Nuggets commercial lines">
        {commercialLines.map((line) => (
          <div role="row" key={line.label}>
            <span role="cell">{line.label}</span>
            <strong role="cell">{line.value}</strong>
            <p role="cell">{line.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="section pricing-section">
      <SectionIntro
        kicker="Pricing"
        title="Predictable entry. Clear production path. No token surprises."
        text="The funnel is simple: paid assessment, first workflow, managed agents. Every serious buyer knows what happens next."
      />
      <div className="pricing-grid">
        {pricingSteps.map((step) => (
          <article key={step.name}>
            <p>{step.tag}</p>
            <h3>{step.name}</h3>
            <strong>{step.price}</strong>
            <span>{step.term}</span>
            <em>{step.text}</em>
          </article>
        ))}
      </div>
      <div className="cfo-panel">
        <h3>Year-one CFO view</h3>
        <div>
          {cfoRows.map(([label, value, detail]) => (
            <p key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </p>
          ))}
        </div>
      </div>
      <div className="pricing-cta">
        <p>
          NovaOrbit is not a workshop. It produces the maturity score, red-gate blockers, workflow
          map, deployment direction, and first-workflow proposal.
        </p>
        <a className="button button-primary" href={BOOKING_URL} target="_blank" rel="noreferrer">
          Get the fixed-price assessment proposal <ArrowIcon size={18} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function PricingDecisionSection() {
  return (
    <section className="section pricing-decision-section">
      <SectionIntro
        kicker="Commercial decision"
        title="Pick the smallest paid step that makes the next build obvious."
        text="Pricing should reduce risk for the buyer: 2 weeks for the board read, 4-6 weeks when the stack needs proof, and 60-90 days only when a workflow can actually ship."
      />
      <div className="pricing-decision-grid">
        {pricingDecisionRows.map((step) => (
          <article key={step.label}>
            <span>{step.label}</span>
            <h3>{step.title}</h3>
            <strong>{step.price}</strong>
            <small>{step.term}</small>
            <p>{step.text}</p>
            <em>{step.outcome}</em>
          </article>
        ))}
      </div>
      <div className="pricing-board-note">
        <p>
          The rule is simple: do not buy scripts, API wrappers, or demos. Buy implementation only
          when the workflow, access path, owner map, and evidence model are strong enough to make delivery accountable.
        </p>
        <a className="button button-primary" href={BOOKING_URL} target="_blank" rel="noreferrer">
          Request fixed-price proposal <ArrowIcon size={18} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="section faq-section">
      <SectionIntro
        kicker="FAQ"
        title="The questions serious buyers ask first."
        text="Short answers for leadership, IT, finance, and compliance before the scoping call."
      />
      <div className="faq-list">
        {faqs.map((item) => (
          <article key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section className="section team-section">
      <SectionIntro
        kicker="Team"
        title="Operators, not slide sellers."
        text="The company is built around a simple delivery promise: assessment, runtime, deployment, and run support stay connected."
      />
      <div className="team-grid">
        {teamMembers.map((member) => (
          <article key={member.name}>
            <div className="team-portrait" aria-hidden="true">
              <span>{member.initials}</span>
            </div>
            <h3>{member.name}</h3>
            <p>{member.role}</p>
            <span>{member.text}</span>
            <a className="profile-link" href={member.linkedin} target="_blank" rel="noreferrer">
              LinkedIn <ArrowIcon size={15} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdvisorPeopleSection() {
  return (
    <section className="section advisor-people-section">
      <SectionIntro
        kicker="Advisors"
        title="Senior operators around the highest-risk decisions."
        text="NNGTs adds external judgment where enterprise AI programs usually break: data foundations, governance, agent reliability, and regional commercial execution."
      />
      <div className="advisor-people-grid">
        {advisorMembers.map((advisor) => (
          <article key={advisor.name}>
            <div className="team-portrait" aria-hidden="true">
              <span>{advisor.initials}</span>
            </div>
            <h3>{advisor.name}</h3>
            <p>{advisor.role}</p>
            <span>{advisor.text}</span>
            <a className="profile-link" href={advisor.linkedin} target="_blank" rel="noreferrer">
              LinkedIn <ArrowIcon size={15} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function MediaSignalSection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="public-thesis" className={`section media-section${compact ? " media-section-compact" : ""}`}>
      <SectionIntro
        kicker="Public thesis"
        title="The founder has been saying the quiet part out loud."
        text="NNGTs' public position is not generic AI optimism. It is a specific argument for sovereignty, owned infrastructure, and private operating environments."
      />
      <div className="media-grid">
        {mediaAppearances.map((item) => (
          <article key={item.href}>
            <img className="media-thumb" src={item.image} alt="" loading="lazy" />
            <span>{item.outlet}</span>
            <h3>{item.title}</h3>
            <p>{item.meta}</p>
            <small>{item.text}</small>
            <a className="profile-link" href={item.href} target="_blank" rel="noreferrer">
              Open source <ArrowIcon size={15} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeamVisualProofSection() {
  return (
    <section className="section team-proof-section">
      <div className="team-proof-copy">
        <p className="section-kicker">Founder credibility</p>
        <h2>Named operators, public thesis, visible accountability.</h2>
        <p>
          The site should feel like there are real people behind the runtime. Until we add formal
          photography, the credibility layer points to named profiles, advisors, and public media.
        </p>
      </div>
      <div className="team-proof-wall" aria-label="Founder and advisor credibility wall">
        {[...teamMembers.slice(0, 2), ...advisorMembers].map((person) => (
          <a key={person.name} href={person.linkedin} target="_blank" rel="noreferrer">
            <span>{person.initials}</span>
            <strong>{person.name}</strong>
            <small>{person.role}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function FounderSignalSection() {
  return (
    <section className="section founder-signal-section">
      <div>
        <p className="section-kicker">People behind the system</p>
        <h2>Built by operators with a public sovereignty thesis.</h2>
        <p>
          The product story is backed by named founders, advisors, and public conversations about
          private AI, not a faceless implementation shop.
        </p>
      </div>
      <div className="founder-signal-links">
        <a href="/team/">Meet the team <ArrowIcon size={16} aria-hidden="true" /></a>
        <a href="/team/#public-thesis">Founder media <ArrowIcon size={16} aria-hidden="true" /></a>
      </div>
    </section>
  );
}

function AdvisorySection() {
  return (
    <section className="section advisory-section">
      <SectionIntro
        kicker="Advisory"
        title="For teams that need alignment before implementation."
        text="Premium working sessions for boards, leadership teams, and transformation owners who need to frame the AI workforce decision."
      />
      <div className="advisory-grid">
        {advisoryOffers.map((offer) => {
          const Icon = offer.icon;
          return (
            <article key={offer.title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{offer.title}</h3>
              <strong>{offer.price}</strong>
              <p>{offer.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NovaOrbitPage() {
  return (
    <ArticlePage
      kicker="NovaOrbit"
      title="Close the last mile between AI and human work."
      text="NovaOrbit is the AI maturity assessment that shows where AI can run, what it should do, and how your business turns it into measurable operating capacity."
      showFinalCta={false}
      showHeroActions
    >
      <NovaOrbitChapterNav />
      <NovaOrbitThesisSection />
      <NovaOrbitDimensionsSection />
      <NovaOrbitCurveSection />
      <NovaOrbitMaturityMapSection />
      <NovaOrbitProductionPathSection />
      <NovaOrbitOffersSection />
      <NovaOrbitMethodSection />
      <OrbitDeliverablesSection />
      <NovaOrbitDownloadSection />
      <BuyerCtaStrip />
    </ArticlePage>
  );
}

const novaOrbitChapterLinks = [
  { href: "#orbit-last-mile", label: "Last mile" },
  { href: "#orbit-framework", label: "Framework" },
  { href: "#orbit-map", label: "Map" },
  { href: "#orbit-production", label: "Path" },
  { href: "#orbit-offers", label: "Offers" },
  { href: "#orbit-method", label: "Method" },
  { href: "#orbit-output", label: "Output" },
  { href: "#orbit-assets", label: "Assets" },
];

function NovaOrbitChapterNav() {
  return (
    <nav className="nova-orbit-chapter-nav" aria-label="NovaOrbit page chapters">
      <span>Orbit path</span>
      {novaOrbitChapterLinks.map((link, index) => (
        <a key={link.href} href={link.href}>
          {String(index + 1).padStart(2, "0")} {link.label}
        </a>
      ))}
    </nav>
  );
}

function NovaOrbitThesisSection() {
  return (
    <section id="orbit-last-mile" className="section nova-orbit-thesis">
      <div>
        <p className="section-kicker">The last mile</p>
        <h2>Models are capable. Companies still need the operating layer.</h2>
      </div>
      <div className="nova-orbit-thesis-copy">
        <p>
          The bottleneck is no longer whether AI can answer. The bottleneck is whether AI can work
          inside the company with the right context, systems, approvals, interfaces, owners, and
          evidence.
        </p>
      </div>
    </section>
  );
}

function NovaOrbitDimensionsSection() {
  return (
    <section id="orbit-framework" className="section section-light nova-orbit-dimensions">
      <SectionIntro
        kicker="Framework"
        title="Where. What. How."
        text="Three questions are simple enough for the board and rigorous enough for the CTO. Each dimension carries four benchmarks that convert maturity into action."
      />
      <div className="nova-orbit-dimension-grid">
        {novaOrbitDimensions.map((dimension) => {
          const Icon = dimension.icon;
          return (
            <article key={dimension.title}>
              <Icon size={26} aria-hidden="true" />
              <span>{dimension.question}</span>
              <h3>{dimension.title}</h3>
              <p>{dimension.text}</p>
              <ul>
                {dimension.gates.map((gate) => (
                  <li key={gate}>{gate}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NovaOrbitCurveSection() {
  return (
    <section id="orbit-curve" className="section nova-orbit-curve-section">
      <SectionIntro
        kicker="Maturity curve + red gates"
        title="From scattered tools to owned AI workforce, without false maturity."
        text="The score places the company on a four-stage curve, then caps maturity when access, ownership, evidence, or reliability would make implementation unsafe."
      />
      <div className="nova-orbit-curve-grid">
        <div className="nova-orbit-stage-rail">
          {novaOrbitStages.map((stage) => (
            <article key={stage.title}>
              <span>{stage.label}</span>
              <h3>{stage.title}</h3>
              <p>{stage.text}</p>
            </article>
          ))}
        </div>
        <div className="nova-orbit-red-gate-panel">
          <div>
            <p className="section-kicker">Red gates</p>
            <h3>No false maturity.</h3>
            <p>
              NovaOrbit does not average away critical blockers. The final stage stays capped until
              the blockers that would break implementation are resolved.
            </p>
          </div>
          <div className="nova-orbit-red-gates">
            {novaOrbitRedGates.map(([title, text]) => (
              <p key={title}>
                <span>{title}</span>
                {text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NovaOrbitMaturityMapSection() {
  const demoSnapshot = buildSnapshot(novaOrbitDemoAnswers);

  return (
    <section id="orbit-map" className="section nova-orbit-map-section">
      <div className="nova-orbit-map-copy">
        <p className="section-kicker">Maturity gap map</p>
        <h2>The assessment turns 12 benchmarks into a build decision.</h2>
        <p>
          This is the board-and-CTO view: current maturity, red-gate caps, next target,
          definitive actions, and the commercial path from assessment to first workflow.
        </p>
      </div>
      <div className="nova-orbit-map-board">
        <MaturityOutcomeStrip snapshot={demoSnapshot} />
        <NovaOrbitMaturityMap snapshot={demoSnapshot} variant="demo" />
      </div>
    </section>
  );
}

function NovaOrbitProductionPathSection() {
  return (
    <section id="orbit-production" className="section section-light nova-orbit-production-section">
      <div className="nova-orbit-production-copy">
        <p className="section-kicker">After the map</p>
        <h2>From maturity read to shipped workflow.</h2>
        <p>
          The assessment is not the finish line. It is the buyer-safe way to decide what ships:
          2-week Standard, 4-6-week In-Depth when needed, then a 60-90-day first workflow with operating evidence.
        </p>
      </div>
      <div className="nova-orbit-production-path" aria-label="NovaOrbit production path">
        {novaOrbitProductionPath.map((step) => (
          <article key={step.label}>
            <span>{step.label}</span>
            <small>{step.term}</small>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NovaOrbitOffersSection() {
  return (
    <section id="orbit-offers" className="section section-light nova-orbit-offers">
      <SectionIntro
        kicker="Engagements"
        title="Two ways to start, one path to implementation."
        text="Standard is the fast maturity assessment. In-Depth validates the stack, workflows, access, governance, and economics before the first build."
      />
      <div className="nova-orbit-offer-grid">
        {novaOrbitOffers.map((offer) => (
          <article key={offer.name}>
            <span>{offer.term}</span>
            <h3>{offer.name}</h3>
            <strong>{offer.price}</strong>
            <p>{offer.purpose}</p>
            <ul>
              {offer.deliverables.map((deliverable) => (
                <li key={deliverable}>{deliverable}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function NovaOrbitMethodSection() {
  return (
    <section id="orbit-method" className="section nova-orbit-method-section">
      <SectionIntro
        kicker="Method"
        title="Interviews plus technical discovery."
        text="The assessment combines C-level alignment, stakeholder interviews, stack review, workflow mapping, and business case design."
      />
      <div className="nova-orbit-method-list">
        {novaOrbitMethod.map(([label, text]) => (
          <article key={label}>
            <span>{label}</span>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NovaOrbitDownloadSection() {
  return (
    <section id="orbit-assets" className="section section-light orbit-download-section">
      <SectionIntro
        kicker="Sales materials"
        title="Take the framework into the room."
        text="Use the one-pager as the board pre-read, the workbook as the operating tool, and request the white paper when a buyer needs the full methodology."
      />
      <div className="orbit-download-grid">
        {novaOrbitDownloadAssets.map((asset) => (
          <a key={asset.href} href={asset.href} download>
            <Download size={24} aria-hidden="true" />
            <span>{asset.label}</span>
            <h3>{asset.title}</h3>
            <p>{asset.text}</p>
            <strong>{asset.format}</strong>
          </a>
        ))}
      </div>
      <div className="orbit-download-actions">
        <a className="button button-primary" href={BOOKING_URL} target="_blank" rel="noreferrer">
          Book assessment <ArrowIcon size={18} aria-hidden="true" />
        </a>
        <a className="button button-secondary" href={NOVAORBIT_WHITE_PAPER_REQUEST_URL}>
          Request white paper
        </a>
      </div>
    </section>
  );
}

function NovaOrbitSampleReportPage() {
  return (
    <ArticlePage
      kicker="Sample report"
      title="A NovaOrbit readout should make the next build obvious."
      text="Preview a fictional assessment report for Atlas Components GmbH. It shows the maturity stage, red gates, first workflow, deployment path, ROI confidence, and 90-day implementation path."
      showFinalCta={false}
      showHeroActions
    >
      <SampleReportCeoReadout />
      <SampleReportMaturityMapSection />
      <SampleReportDecisionMemoSection />
      <section className="section sample-report-overview">
        <div className="sample-report-copy">
          <p className="section-kicker">Fictional example</p>
          <h2>Atlas Components: Stage 3 candidate, capped before scale.</h2>
          <p>
            The sample demonstrates the standard NovaOrbit logic: the company is ready for a
            governed first workflow, but scale is capped until system access, reliability, and
            finance evidence are validated.
          </p>
          <div className="sample-report-actions">
            <a className="button button-primary" href={BOOKING_URL} target="_blank" rel="noreferrer">
              Book NovaOrbit <ArrowIcon size={18} aria-hidden="true" />
            </a>
            <a className="button button-secondary" href="/nova-orbit-snapshot/">
              Run Snapshot
            </a>
          </div>
        </div>
        <div className="sample-report-sheet" aria-label="NovaOrbit sample report summary">
          <div className="sample-report-sheet-head">
            <img src="/assets/nova-nuggets-logo-cut-transparent.png" alt="" />
            <span>NovaOrbit assessment readout</span>
          </div>
          <div className="sample-report-client">
            <span>Fictional client</span>
            <strong>Atlas Components GmbH</strong>
          </div>
          <div className="sample-report-stage">
            <span>Overall read</span>
            <strong>Operational AI candidate</strong>
            <p>Recommended first workflow: RFQ response and quotation preparation.</p>
          </div>
          <div className="sample-report-decision-grid">
            <p>
              <span>Decision</span>
              Build v1 after access validation.
            </p>
            <p>
              <span>Stage cap</span>
              No scale until evidence and reliability controls exist.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-light sample-report-score-section">
        <SectionIntro
          kicker="Scorecard"
          title="The score is useful because it changes the action."
          text="NovaOrbit does not use maturity as a vanity number. Each dimension links the current state to a concrete implementation condition."
        />
        <div className="sample-score-table" role="table" aria-label="NovaOrbit sample scorecard" tabIndex={0}>
          <div className="sample-score-row sample-score-head" role="row">
            <span role="columnheader">Dimension</span>
            <span role="columnheader">Score</span>
            <span role="columnheader">Stage</span>
            <span role="columnheader">Blocker</span>
            <span role="columnheader">Next action</span>
          </div>
          {sampleReportScoreRows.map((row) => (
            <div className="sample-score-row" role="row" key={row.dimension}>
              <strong role="rowheader" data-label="Dimension">{row.dimension}</strong>
              <span role="cell" data-label="Score">{row.score}</span>
              <span role="cell" data-label="Stage">{row.stage}</span>
              <p role="cell" data-label="Blocker">{row.blocker}</p>
              <p role="cell" data-label="Next action">{row.action}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section sample-report-gates-section">
        <div className="sample-report-gates-copy">
          <p className="section-kicker">Red gates</p>
          <h2>Scale is blocked until the weak assumptions are closed.</h2>
          <p>
            This is where the framework becomes defensible. Access, ownership, evidence, and
            reliability are not averaged away by stronger scores elsewhere.
          </p>
        </div>
        <div className="sample-report-gates">
          {sampleReportRedGates.map((gate) => (
            <article key={gate.gate}>
              <span>{gate.status}</span>
              <h3>{gate.gate}</h3>
              <p>{gate.impact}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-light sample-report-workflow-section">
        <SectionIntro
          kicker="First workflow"
          title="From assessment to a buildable AI app and agent."
          text="The sample shows how NovaOrbit turns interviews and technical discovery into the first workflow decision, not a generic recommendation deck."
        />
        <div className="sample-report-workflow-grid">
          {sampleReportWorkflowSections.map((section) => (
            <article key={section.label}>
              <span>{section.label}</span>
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section sample-report-timeline-section">
        <SectionIntro
          kicker="90-day path"
          title="The output ends with work owners can execute."
          text="The roadmap names what must happen, who must participate, and what evidence is required before the next scale decision."
        />
        <div className="sample-report-timeline">
          {sampleReportTimeline.map((item) => (
            <article key={item.window}>
              <span>{item.window}</span>
              <h3>{item.objective}</h3>
              <p>
                <strong>Actions</strong>
                {item.actions}
              </p>
              <p>
                <strong>Evidence</strong>
                {item.evidence}
              </p>
            </article>
          ))}
        </div>
      </section>
      <SampleReportAppendixSection />
      <NovaOrbitDownloadSection />
      <BuyerCtaStrip />
    </ArticlePage>
  );
}

function SampleReportMaturityMapSection() {
  const sampleSnapshot = buildSnapshot(atlasSampleReportAnswers);

  return (
    <section className="section section-light sample-report-map-section">
      <div className="sample-report-map-copy">
        <p className="section-kicker">Board map</p>
        <h2>The report makes the maturity cap impossible to miss.</h2>
        <p>
          The same 12-benchmark map appears in the buyer output: stage signal, target state,
          red-gate caps, definitive actions, and the commercial next step.
        </p>
      </div>
      <div className="sample-report-map-board">
        <MaturityOutcomeStrip snapshot={sampleSnapshot} />
        <NovaOrbitMaturityMap snapshot={sampleSnapshot} variant="sample" />
      </div>
    </section>
  );
}

function SampleReportDecisionMemoSection() {
  return (
    <section className="section sample-decision-section">
      <SectionIntro
        kicker="Decision memo"
        title="The readout separates what to build, what to validate, and what not to scale."
        text="The report should create executive alignment without hiding technical conditions. This is the page a CEO can forward before the decision meeting."
      />
      <div className="sample-decision-grid">
        {sampleReportDecisionRows.map((row) => (
          <article key={row.label}>
            <span>{row.label}</span>
            <h3>{row.title}</h3>
            <p>{row.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SampleReportAppendixSection() {
  return (
    <section className="section section-light sample-appendix-section">
      <div className="sample-appendix-copy">
        <p className="section-kicker">CTO + CFO appendix</p>
        <h2>Enough depth for technical and financial challenge.</h2>
        <p>
          A credible assessment cannot stop at stage language. It must name the stack constraints,
          access assumptions, inference path, evaluation model, and value evidence required before
          implementation.
        </p>
      </div>
      <div className="sample-appendix-grid" aria-label="Sample report technical and financial appendix">
        <div>
          <span>CTO appendix</span>
          {sampleReportTechnicalRows.map((row) => (
            <p key={row.label}>
              <strong>{row.label}</strong>
              <em>{row.value}</em>
              {row.text}
            </p>
          ))}
        </div>
        <div>
          <span>CFO evidence</span>
          {sampleReportEvidenceRows.map((row) => (
            <p key={row.label}>
              <strong>{row.label}</strong>
              <em>{row.value}</em>
              {row.text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function SampleReportCeoReadout() {
  const readoutItems = [
    ["Client", "Atlas Components GmbH", "fictional mid-market manufacturer"],
    ["Board decision", "Build v1 after access validation", "do not scale until evidence closes"],
    ["Maturity read", "Stage 3 candidate", "capped by access and evidence"],
    ["Red-gate cap", "Stage 2 before scale", "system access, reliability, finance baseline"],
    ["First workflow", "RFQ response and quotation preparation", "sales-owned, CTO-governed"],
    ["Next 30 days", "Close access, evals, owners, ROI baseline", "then scope first workflow"],
  ];

  return (
    <section className="section sample-ceo-readout" aria-label="CEO readout">
      <div>
        <p className="section-kicker">CEO readout</p>
        <h2>One screen for the board decision.</h2>
        <p>
          The sample report starts with the answer leadership needs: current maturity, cap,
          first workflow, blockers, and what Nova Nuggets should build next.
        </p>
      </div>
      <div className="sample-ceo-grid">
        {readoutItems.map(([label, value, detail]) => (
          <p key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </p>
        ))}
      </div>
      <div className="sample-ceo-commercial">
        <span>Commercial next step</span>
        <strong>NovaOrbit In-Depth</strong>
        <p>Validate stack, access, reliability, finance evidence, and 90-day implementation path before scale.</p>
      </div>
    </section>
  );
}

function WhatWeDoPage() {
  return (
    <ArticlePage
      kicker="What we do"
      title="AI tools are not an AI workforce."
      text="Nova Nuggets turns disconnected AI adoption into a governed operating layer: agents, memory, workflows, infrastructure, and run support."
      showHeroActions
    >
      <HiddenCostSection />
      <FullStackSection />
      <CategorySection />
      <CapabilitySection />
      <OperatingModel />
      <WorkforceSection />
    </ArticlePage>
  );
}

function DeployPage() {
  return (
    <ArticlePage
      kicker="Deploy"
      title="A full-stack AI system inside the right perimeter."
      text="We deploy NooX AI inferencing computers, ZAKI managed agents, applications, governance, and operations through on-prem, customer-cloud, or NNGTs-cloud models."
      showFinalCta={false}
      showHeroActions
    >
      <NooxProofSection />
      <DataBoundarySection />
      <DeploymentDecisionSection />
      <NooxTopologySection />
      <DeploymentSection />
      <BuyerCtaStrip />
    </ArticlePage>
  );
}

function ProofPage() {
  return (
    <ArticlePage
      kicker="Proof"
      title="Work gets measurably faster, not just AI fluent."
      text="The first reference is anonymized, but the shape matters: 90 days from assessment to savings, three departments live, measurable productivity impact."
      showFinalCta={false}
      showHeroActions
      heroClassName="article-hero-proof"
    >
      <ProofSection includeDossier />
      <ProofCaseSection />
      <ProofDiligenceSection />
      <ProofMediaSection />
      <BuyerCtaStrip />
    </ArticlePage>
  );
}

function PricingPage() {
  return (
    <ArticlePage
      kicker="Pricing"
      title="Paid assessment. First workflow. Managed agents."
      text="NovaOrbit Standard is EUR 10,000 for 2 weeks. In-Depth is EUR 18,000 for 4-6 weeks. First workflow builds and managed agents follow only when evidence supports them."
      showFinalCta={false}
      showHeroActions
    >
      <PricingDecisionSection />
      <FaqSection />
      <BuyerCtaStrip />
    </ArticlePage>
  );
}

function TeamPage() {
  return (
    <ArticlePage
      kicker="Team"
      title="The operating partner model only works if operators build it."
      text="Nova Nuggets combines enterprise strategy, runtime engineering, regional execution, and product delivery."
      showHeroActions
    >
      <TeamSection />
      <TeamVisualProofSection />
      <MediaSignalSection />
      <AdvisorPeopleSection />
      <OperatorCredibilitySection />
      <AdvisoryBenchSection />
      <AdvisorySection />
    </ArticlePage>
  );
}

function AdvisoryPage() {
  return (
    <ArticlePage
      kicker="Advisory"
      title="Board-grade AI transformation without pretending a workshop is the finish line."
      text="Advisory is the entry point when the organization needs alignment before a full NovaOrbit assessment."
      showHeroActions
    >
      <AdvisorySection />
      <CategorySection />
    </ArticlePage>
  );
}

function ApproachPage() {
  return (
    <ArticlePage
      kicker="Approach"
      title="The method has gates before it has agents."
      text="This route explains how Nova Nuggets moves a buyer from NovaOrbit diagnosis to first-workflow build and managed operations without skipping ownership, access, reliability, or evidence."
      showHeroActions
      showFinalCta={false}
    >
      <ApproachSpineSection />
      <ApproachGateSection />
      <BuyerCtaStrip />
    </ArticlePage>
  );
}

function WorkforcePage() {
  return (
    <ArticlePage
      kicker="AI workforce"
      title="ZAKI agents become a managed company workforce."
      text="The goal is not to give employees another tab. The goal is to place useful, governed, role-aware agents where work already happens."
      showFinalCta={false}
      showHeroActions
    >
      <WorkforceDemoSection />
      <WorkforceSection />
      <BuyerCtaStrip />
    </ArticlePage>
  );
}

function ArchitecturePage() {
  return (
    <ArticlePage
      kicker="Architecture"
      title="Own the runtime, the memory, the policies, and the workflow."
      text="Nova Nuggets combines traditional AI delivery with the operating fabric that makes agents useful: RAG, fine-tuning, process automation, deployment controls, and run support."
      showHeroActions
    >
      <ArchitectureSection />
      <CommercialSection />
    </ArticlePage>
  );
}

function ContactPage() {
  return (
    <ArticlePage
      kicker="Contact"
      title="Request a NovaOrbit qualification brief."
      text="Use this when there is a real workflow, department, or transformation mandate worth assessing through NovaOrbit and turning into owned AI work."
      showHeroActions
    >
      <section className="contact-panel">
        <div>
          <p className="section-kicker">Buyer fit</p>
          <h2>Come with the workflow, stack, owner, and decision window.</h2>
          <p>
            The first response should be useful before a call: whether Standard, In-Depth, an NDA
            evidence path, or a first-workflow SOW is the right next step.
          </p>
          <div className="contact-cred">
            <span>Dubai + Hamburg</span>
            <span>qualification response in 2 working days</span>
            <span>proposal in 5 working days after fit</span>
            <span>{GENERAL_EMAIL}</span>
            <span>{FOUNDER_EMAIL}</span>
            <span>+49 162 94 11131</span>
            <span>+971 527878055</span>
          </div>
        </div>
        <form
          className="qualification-form"
          action={`mailto:${GENERAL_EMAIL}?subject=${encodeURIComponent("NovaOrbit qualification brief")}`}
          method="post"
          encType="text/plain"
          aria-label="NovaOrbit qualification form"
        >
          <label>
            Assessment path
            <select name="assessment_path" required defaultValue="">
              <option value="" disabled>
                Select likely next step
              </option>
              <option>NovaOrbit Standard - EUR 10,000 / 2 weeks</option>
              <option>NovaOrbit In-Depth - EUR 18,000 / 4-6 weeks</option>
              <option>First Workflow SOW after assessment</option>
              <option>NDA evidence room request</option>
              <option>Not sure yet</option>
            </select>
          </label>
          <label>
            Your role
            <select name="role" required defaultValue="">
              <option value="" disabled>
                Select role
              </option>
              <option>CEO / Founder / Managing Director</option>
              <option>CTO / CIO / Head of IT</option>
              <option>COO / Operations leader</option>
              <option>CFO / Finance leader</option>
              <option>Transformation / AI lead</option>
              <option>Department owner</option>
            </select>
          </label>
          <label>
            Work email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Company
            <input name="company" type="text" required autoComplete="organization" />
          </label>
          <label>
            Workflow to assess
            <textarea
              name="workflow"
              rows={4}
              required
              placeholder="Example: RFQ response, claims intake, support triage, sales research, compliance review"
            />
          </label>
          <label>
            Current stack and access context
            <textarea
              name="stack_access"
              rows={4}
              placeholder="ERP, CRM, Microsoft/Google, data sources, APIs, MCPs, export limits, security constraints"
            />
          </label>
          <label>
            Decision window
            <select name="decision_window" required defaultValue="">
              <option value="" disabled>
                Select timeline
              </option>
              <option>This month</option>
              <option>Next 30-60 days</option>
              <option>This quarter</option>
              <option>Exploratory only</option>
            </select>
          </label>
          <label className="contact-checkbox">
            <input name="nda_dossier_requested" type="checkbox" value="yes" />
            <span>Also request the NDA evidence path.</span>
          </label>
          <button className="button button-primary" type="submit">
            Send qualification brief <ArrowIcon size={18} aria-hidden="true" />
          </button>
        </form>
      </section>
    </ArticlePage>
  );
}

function InvestorsPage() {
  return (
    <ArticlePage
      kicker="Investors"
      title="Nova Nuggets is building the operating layer for owned AI workforces."
      text="A focused investor page for the category thesis, proof points, commercial model, and ZAKI product wedge."
      showHeroActions
    >
      <section className="section investor-section">
        <div className="investor-panel">
          <p className="section-kicker">Snapshot</p>
          <h2>Product-led surface. Enterprise operating revenue. Private deployment moat.</h2>
          <div className="investor-table" role="table" aria-label="Nova Nuggets investor snapshot">
            {investorHighlights.map(([label, value]) => (
              <p role="row" key={label}>
                <span role="cell">{label}</span>
                <strong role="cell">{value}</strong>
              </p>
            ))}
          </div>
        </div>
        <div className="investor-metric-grid">
          {investorMetrics.map(([label, value, detail]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>
        <div className="investor-thesis">
          {investorThesis.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <div className="investor-plan-grid">
          <div>
            <p className="section-kicker">Use of funds</p>
            <h2>Turn proof into repeatable enterprise motion.</h2>
          </div>
          <div className="investor-plan-list">
            {investorUseOfFunds.map(([label, text]) => (
              <p key={label}>
                <span>{label}</span>
                <strong>{text}</strong>
              </p>
            ))}
          </div>
        </div>
        <div className="investor-timeline" aria-label="Investor execution timeline">
          {investorTimeline.map(([label, text]) => (
            <article key={label}>
              <span>{label}</span>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="investor-cta">
          <p>
            The next investor asset is a controlled memo and data room: deck, product proof,
            customer evidence, pipeline, terms, and reference path under NDA.
          </p>
          <a className="button button-primary" href={INVESTOR_REQUEST_URL}>
            Request investor memo <ArrowIcon size={18} aria-hidden="true" />
          </a>
          <a className="button button-secondary" href={BOOKING_URL} target="_blank" rel="noreferrer">
            Request investor briefing
          </a>
        </div>
      </section>
    </ArticlePage>
  );
}

type SnapshotAnswerId =
  | "w1_deployment"
  | "w2_inference"
  | "w3_access"
  | "w4_control"
  | "a1_workflow"
  | "a2_agent"
  | "a3_surface"
  | "a4_integration"
  | "h1_ownership"
  | "h2_business"
  | "h3_governance"
  | "h4_run";

type SnapshotStage = 1 | 2 | 3 | 4;
type SnapshotAnswerValue = "1" | "2" | "3" | "4";
type SnapshotDimension = "where" | "what" | "how";
type SnapshotArchetype =
  | "Foundation-First NovaOrbit"
  | "Controlled First Workflow"
  | "Operational AI Scale Candidate"
  | "Owned AI Workforce Candidate";
type SnapshotAnswers = Partial<Record<SnapshotAnswerId, SnapshotAnswerValue>>;

type SnapshotQuestion = {
  id: SnapshotAnswerId;
  code: string;
  bench: string;
  label: string;
  dimension: SnapshotDimension;
  prompt: string;
  why: string;
  actionByStage: Record<SnapshotStage, string>;
  options: Array<{
    value: SnapshotAnswerValue;
    label: string;
    detail: string;
  }>;
};

type SnapshotDimensionSummary = {
  dimension: SnapshotDimension;
  answered: number;
  stage: SnapshotStage;
  score: number;
};

type SnapshotRedGateResult = {
  id: string;
  label: string;
  cap: SnapshotStage;
  questionId: SnapshotAnswerId;
  action: string;
};

type SnapshotBenchmarkRow = {
  id: SnapshotAnswerId;
  code: string;
  bench: string;
  dimension: SnapshotDimension;
  stage: SnapshotStage;
  targetStage: SnapshotStage;
  answered: boolean;
  action: string;
  redGate?: SnapshotRedGateResult;
};

type SnapshotBrief = {
  archetype?: SnapshotArchetype;
  confidence: "High" | "Medium" | "Needs clarification";
  answeredCount: number;
  allAnswered: boolean;
  rawStage: SnapshotStage;
  finalStage: SnapshotStage;
  redGateCap: SnapshotStage;
  targetStage: SnapshotStage;
  dimensionSummaries: SnapshotDimensionSummary[];
  maturityRows: SnapshotBenchmarkRow[];
  redGates: SnapshotRedGateResult[];
  strongestDimension: SnapshotDimension;
  weakestDimension: SnapshotDimension;
  strongestDimensionLabel: string;
  weakestDimensionLabel: string;
  commercialNextStep: string;
  deliveryWindow: string;
  buildWindow: string;
  firstWorkflow: string;
  agent: string;
  deployment: string;
  whyFits: string;
  blockers: string[];
  controls: string[];
  prepare: string[];
  attendees: string[];
  next30: string[];
};

const snapshotStageLabels: Record<SnapshotStage, string> = {
  1: "Ad Hoc AI",
  2: "Connected AI",
  3: "Operational AI",
  4: "Owned AI Workforce",
};

const snapshotStageNames: SnapshotStage[] = [1, 2, 3, 4];

const snapshotDimensionMeta: Record<SnapshotDimension, { label: string; title: string; question: string }> = {
  where: {
    label: "Where",
    title: "Infrastructure & Access",
    question: "Where can AI work?",
  },
  what: {
    label: "What",
    title: "Apps & Agents",
    question: "What should AI do?",
  },
  how: {
    label: "How",
    title: "Operations & Impact",
    question: "How does value become operating capacity?",
  },
};

const snapshotDimensions: SnapshotDimension[] = ["where", "what", "how"];

function stageOptions(one: string, two: string, three: string, four: string): SnapshotQuestion["options"] {
  return [
    { value: "1", label: one, detail: "Stage 1 signal" },
    { value: "2", label: two, detail: "Stage 2 signal" },
    { value: "3", label: three, detail: "Stage 3 signal" },
    { value: "4", label: four, detail: "Stage 4 signal" },
  ];
}

const snapshotQuestions: SnapshotQuestion[] = [
  {
    id: "w1_deployment",
    code: "W1",
    bench: "Deployment Boundary",
    label: "01 / W1",
    dimension: "where",
    prompt: "How clear is the deployment boundary?",
    why: "NovaOrbit starts by deciding where AI can safely run: local NooX, customer cloud, or NNGTs cloud.",
    actionByStage: {
      1: "Name the deployment boundary owner and decide what data cannot leave the perimeter.",
      2: "Turn the preferred boundary into a written deployment decision.",
      3: "Validate support, residency, and fallback before first build.",
      4: "Use the operating boundary as the default deployment standard.",
    },
    options: stageOptions(
      "No approved boundary",
      "Preferred boundary, not decided",
      "Boundary and owner defined",
      "Boundary operating with support"
    ),
  },
  {
    id: "w2_inference",
    code: "W2",
    bench: "Inference Readiness",
    label: "02 / W2",
    dimension: "where",
    prompt: "How ready is model serving and inference?",
    why: "Latency, cost, fallback, and model routing decide whether the first AI workflow can run predictably.",
    actionByStage: {
      1: "Estimate volume, latency, cost envelope, and model-routing needs.",
      2: "Validate the model/API approach under expected usage.",
      3: "Add monitoring, fallback, and cost thresholds to the run plan.",
      4: "Treat inference telemetry as part of the operating dashboard.",
    },
    options: stageOptions(
      "No volume or cost view",
      "Rough model/API approach",
      "Cost, latency, fallback estimated",
      "Inference monitored in production"
    ),
  },
  {
    id: "w3_access",
    code: "W3",
    bench: "Access Readiness",
    label: "03 / W3",
    dimension: "where",
    prompt: "Can AI access the right systems safely?",
    why: "No access means no useful agent. APIs, MCPs, exports, permissions, and audit paths set the practical ceiling.",
    actionByStage: {
      1: "Identify source systems and the minimum access route for the first workflow.",
      2: "Move from manual exports to an approved read path.",
      3: "Approve least-privilege API, MCP, database, or controlled upload access.",
      4: "Keep access audited, scoped, and reviewed as the workflow scales.",
    },
    options: stageOptions(
      "Access path unknown",
      "Manual exports only",
      "API/MCP/read path approved",
      "Least-privilege audited access"
    ),
  },
  {
    id: "w4_control",
    code: "W4",
    bench: "Control Plane",
    label: "04 / W4",
    dimension: "where",
    prompt: "Are identity, logs, and audit ready?",
    why: "AI needs a control plane: identity, permissions, logging, retention, and a run ledger for decisions.",
    actionByStage: {
      1: "Define identity, logging, audit, and retention requirements.",
      2: "Connect existing identity/logging tools to the first workflow scope.",
      3: "Design the run ledger before launch.",
      4: "Review the ledger and control evidence as part of operations.",
    },
    options: stageOptions(
      "No AI logging or identity",
      "Basic identity and logs exist",
      "Audit and run ledger designed",
      "Controls live and reviewed"
    ),
  },
  {
    id: "a1_workflow",
    code: "A1",
    bench: "Workflow Fit",
    label: "05 / A1",
    dimension: "what",
    prompt: "Is the first workflow specific and repeatable?",
    why: "A vague use case does not become an agent. The first workflow needs repetition, ownership, value, and examples.",
    actionByStage: {
      1: "Run workflow discovery before proposing an AI build.",
      2: "Document the workflow steps, exceptions, volume, and owner.",
      3: "Create acceptance criteria and a first-workflow shortlist.",
      4: "Use operating evidence to expand from one workflow to the next.",
    },
    options: stageOptions(
      "Use case is vague",
      "Workflow named, not mapped",
      "Repeatable workflow is measurable",
      "Workflow evidence and exceptions known"
    ),
  },
  {
    id: "a2_agent",
    code: "A2",
    bench: "Agent Role",
    label: "06 / A2",
    dimension: "what",
    prompt: "Is the AI agent role constrained?",
    why: "The agent needs allowed outputs, forbidden actions, escalation rules, evaluations, and autonomy limits.",
    actionByStage: {
      1: "Define the agent role before discussing autonomy.",
      2: "Write allowed outputs, forbidden actions, and fallback rules.",
      3: "Create an evaluation set and approval thresholds.",
      4: "Use reliability evidence to adjust autonomy safely.",
    },
    options: stageOptions(
      "Agent role undefined",
      "Draft outputs only",
      "Allowed and forbidden actions set",
      "Evals, fallback, autonomy caps live"
    ),
  },
  {
    id: "a3_surface",
    code: "A3",
    bench: "App Surface",
    label: "07 / A3",
    dimension: "what",
    prompt: "Where will humans use and approve the AI work?",
    why: "The app surface turns model capability into usable work: inbox, dashboard, approval flow, or embedded workflow.",
    actionByStage: {
      1: "Choose the first user surface and owner.",
      2: "Prototype the core states and approval moments.",
      3: "Define screens, states, actions, and exception handling.",
      4: "Use user feedback and operating data to improve the surface.",
    },
    options: stageOptions(
      "No user surface",
      "Chat or prompt prototype",
      "Workflow surface defined",
      "Surface used with feedback loop"
    ),
  },
  {
    id: "a4_integration",
    code: "A4",
    bench: "Integration Depth",
    label: "08 / A4",
    dimension: "what",
    prompt: "How deep should the first integration go?",
    why: "Read-only can move quickly. Writeback and multi-system action require stronger approvals, logging, and rollback.",
    actionByStage: {
      1: "Start with a read-only path or controlled upload.",
      2: "Validate the first read path before adding action.",
      3: "Approve the read-only integration and audit trail.",
      4: "Allow writeback only with approval, audit, and rollback.",
    },
    options: stageOptions(
      "No integration path",
      "Read-only preferred, unvalidated",
      "Read/API path approved",
      "Approved writeback with audit"
    ),
  },
  {
    id: "h1_ownership",
    code: "H1",
    bench: "Ownership",
    label: "09 / H1",
    dimension: "how",
    prompt: "Who owns the outcome?",
    why: "The assessment fails if ownership is abstract. Sponsor, workflow owner, IT, finance, and approval owners must be named.",
    actionByStage: {
      1: "Name the executive sponsor and workflow owner before build.",
      2: "Turn sponsorship into an owner map with decision rights.",
      3: "Confirm executive, workflow, IT, finance, and approval owners.",
      4: "Run the owner cadence through evidence reviews.",
    },
    options: stageOptions(
      "No accountable owner",
      "Executive sponsor only",
      "Owner map named",
      "Owners running cadence"
    ),
  },
  {
    id: "h2_business",
    code: "H2",
    bench: "Business Case",
    label: "10 / H2",
    dimension: "how",
    prompt: "Can the business value be measured?",
    why: "NovaOrbit should produce CFO-safe value language: baseline, proxy, finance review, and post-launch evidence.",
    actionByStage: {
      1: "Create a baseline for volume, cost, cycle time, quality, or revenue.",
      2: "Separate proxy value from finance-reviewed value.",
      3: "Validate assumptions with finance and the workflow owner.",
      4: "Run a value ledger after launch and review before scale.",
    },
    options: stageOptions(
      "No baseline",
      "Proxy value only",
      "Finance-reviewed baseline",
      "Value ledger live"
    ),
  },
  {
    id: "h3_governance",
    code: "H3",
    bench: "Governance",
    label: "11 / H3",
    dimension: "how",
    prompt: "Are governance and escalation rules explicit?",
    why: "Policy, approvals, exceptions, compliance posture, and escalation determine whether AI can move past pilot maturity.",
    actionByStage: {
      1: "Define the governance posture for the first workflow.",
      2: "Convert informal rules into approval and escalation criteria.",
      3: "Document oversight, exception handling, and risk posture.",
      4: "Monitor policy adherence and improve the run model.",
    },
    options: stageOptions(
      "No AI governance",
      "Informal rules",
      "Governance and escalation defined",
      "Policy monitored and improved"
    ),
  },
  {
    id: "h4_run",
    code: "H4",
    bench: "Run Model",
    label: "12 / H4",
    dimension: "how",
    prompt: "Who runs, monitors, and improves the AI workflow?",
    why: "Operational AI needs support, adoption, monitoring, quality review, and continuous improvement after launch.",
    actionByStage: {
      1: "Name the run owner before moving beyond prototype.",
      2: "Define pilot support, monitoring, and adoption responsibilities.",
      3: "Create the support rhythm and quality review cadence.",
      4: "Operate the workflow with monitored improvement loops.",
    },
    options: stageOptions(
      "No run owner",
      "Pilot support only",
      "Support and monitoring owner named",
      "Operating rhythm live"
    ),
  },
];

const snapshotRedGateRules: Array<{
  id: string;
  label: string;
  questionId: SnapshotAnswerId;
  cap: SnapshotStage;
  action: string;
  activeWhen: (stage: SnapshotStage) => boolean;
}> = [
  {
    id: "access",
    label: "No access, no AI",
    questionId: "w3_access",
    cap: 2,
    action: "Validate source-system access before implementation.",
    activeWhen: (stage) => stage <= 2,
  },
  {
    id: "workflow",
    label: "No workflow, no agent",
    questionId: "a1_workflow",
    cap: 2,
    action: "Map the workflow and acceptance criteria before build.",
    activeWhen: (stage) => stage <= 2,
  },
  {
    id: "owner",
    label: "No owner, no impact",
    questionId: "h1_ownership",
    cap: 2,
    action: "Name the accountable owner map before implementation.",
    activeWhen: (stage) => stage <= 2,
  },
  {
    id: "evidence",
    label: "No evidence, no scale",
    questionId: "h2_business",
    cap: 3,
    action: "Create finance-reviewed baseline evidence before scale.",
    activeWhen: (stage) => stage <= 2,
  },
  {
    id: "reliability",
    label: "No reliability, no autonomy",
    questionId: "a2_agent",
    cap: 3,
    action: "Define evaluations, fallback, and autonomy limits before delegated action.",
    activeWhen: (stage) => stage <= 2,
  },
];

const novaOrbitDemoAnswers: SnapshotAnswers = {
  w1_deployment: "3",
  w2_inference: "3",
  w3_access: "2",
  w4_control: "3",
  a1_workflow: "3",
  a2_agent: "2",
  a3_surface: "3",
  a4_integration: "3",
  h1_ownership: "3",
  h2_business: "2",
  h3_governance: "3",
  h4_run: "3",
};

const atlasSampleReportAnswers: SnapshotAnswers = {
  w1_deployment: "3",
  w2_inference: "3",
  w3_access: "2",
  w4_control: "2",
  a1_workflow: "4",
  a2_agent: "2",
  a3_surface: "3",
  a4_integration: "2",
  h1_ownership: "3",
  h2_business: "2",
  h3_governance: "3",
  h4_run: "2",
};

function clampSnapshotStage(value: number): SnapshotStage {
  return Math.min(4, Math.max(1, Math.round(value))) as SnapshotStage;
}

function getDimensionName(dimension: SnapshotDimension) {
  const meta = snapshotDimensionMeta[dimension];
  return `${meta.label}: ${meta.title}`;
}

function getSnapshotQuestion(questionId: SnapshotAnswerId) {
  return snapshotQuestions.find((question) => question.id === questionId) ?? snapshotQuestions[0];
}

function getSnapshotLabel(questionId: SnapshotAnswerId, value?: SnapshotAnswerValue) {
  if (!value) return "Not answered yet";
  return getSnapshotQuestion(questionId).options.find((option) => option.value === value)?.label ?? value;
}

function getSnapshotStage(question: SnapshotQuestion, answers: SnapshotAnswers): SnapshotStage {
  const answer = answers[question.id];
  return answer ? (Number(answer) as SnapshotStage) : 1;
}

function medianSnapshotStage(stages: SnapshotStage[]) {
  const sorted = [...stages].sort((a, b) => a - b);
  return sorted[1] ?? 1;
}

function getSnapshotArchetype(finalStage: SnapshotStage): SnapshotArchetype {
  if (finalStage <= 1) return "Foundation-First NovaOrbit";
  if (finalStage === 2) return "Controlled First Workflow";
  if (finalStage === 3) return "Operational AI Scale Candidate";
  return "Owned AI Workforce Candidate";
}

function buildSnapshot(answers: SnapshotAnswers): SnapshotBrief {
  const answeredCount = snapshotQuestions.filter((question) => Boolean(answers[question.id])).length;
  const allAnswered = answeredCount === snapshotQuestions.length;
  const baseRows = snapshotQuestions.map((question) => {
    const stage = getSnapshotStage(question, answers);
    return {
      id: question.id,
      code: question.code,
      bench: question.bench,
      dimension: question.dimension,
      stage,
      targetStage: stage,
      answered: Boolean(answers[question.id]),
      action: answers[question.id] ? question.actionByStage[stage] : "Answer this benchmark to place it on the maturity map.",
    };
  });
  const dimensionSummaries = snapshotDimensions.map((dimension) => {
    const rows = baseRows.filter((row) => row.dimension === dimension);
    const answered = rows.filter((row) => row.answered).length;
    const score = rows.reduce((total, row) => total + row.stage, 0) / rows.length;
    return {
      dimension,
      answered,
      score,
      stage: clampSnapshotStage(score),
    };
  });
  const rawStage = medianSnapshotStage(dimensionSummaries.map((summaryItem) => summaryItem.stage));
  const activeRedGates = snapshotRedGateRules.flatMap((rule) => {
    const stage = baseRows.find((row) => row.id === rule.questionId)?.stage ?? 1;
    const answered = Boolean(answers[rule.questionId]);
    if (!answered || !rule.activeWhen(stage)) return [];
    return [{ id: rule.id, label: rule.label, cap: rule.cap, questionId: rule.questionId, action: rule.action }];
  });
  const redGateCap = activeRedGates.length
    ? (Math.min(...activeRedGates.map((gate) => gate.cap)) as SnapshotStage)
    : 4;
  const finalStage = allAnswered ? (Math.min(rawStage, redGateCap) as SnapshotStage) : rawStage;
  const targetStage = clampSnapshotStage(Math.min(4, finalStage + 1));
  const maturityRows = baseRows.map((row) => {
    const redGate = activeRedGates.find((gate) => gate.questionId === row.id);
    return {
      ...row,
      targetStage: Math.max(row.stage, targetStage) as SnapshotStage,
      redGate,
      action: redGate?.action ?? row.action,
    };
  });
  const strongestDimension = dimensionSummaries.reduce((best, item) => (item.stage > best.stage ? item : best)).dimension;
  const weakestDimension = dimensionSummaries.reduce((weakest, item) => (item.stage < weakest.stage ? item : weakest)).dimension;
  const dimensionScores = dimensionSummaries.map((item) => item.stage);
  const dimensionsAreTied = Math.min(...dimensionScores) === Math.max(...dimensionScores);
  const dimensionTieLabel = answeredCount === 0 ? "Awaiting benchmark answers" : "Balanced across dimensions";
  const strongestDimensionLabel = dimensionsAreTied ? dimensionTieLabel : getDimensionName(strongestDimension);
  const weakestDimensionLabel = dimensionsAreTied ? dimensionTieLabel : getDimensionName(weakestDimension);
  const archetype = allAnswered ? getSnapshotArchetype(finalStage) : undefined;
  const confidence = answeredCount === snapshotQuestions.length
    ? "High"
    : answeredCount >= 8
      ? "Medium"
      : "Needs clarification";
  const priorityRows = maturityRows
    .filter((row) => row.answered && (row.stage < targetStage || row.redGate))
    .sort((a, b) => Number(Boolean(b.redGate)) - Number(Boolean(a.redGate)) || a.stage - b.stage)
    .slice(0, 5);
  const blockers = activeRedGates.length
    ? activeRedGates.map((gate) => `${gate.label}: ${gate.action}`)
    : priorityRows.map((row) => `${row.code} ${row.bench}: ${row.action}`);
  const commercialNextStep = !allAnswered
    ? "Complete the 12-benchmark Snapshot"
    : activeRedGates.length >= 2 || finalStage <= 2
      ? "NovaOrbit In-Depth"
      : "NovaOrbit Standard";
  const deliveryWindow = !allAnswered
    ? "Snapshot now"
    : commercialNextStep === "NovaOrbit In-Depth"
      ? "4-6 weeks to build decision"
      : "2 weeks to board readout";
  const buildWindow = activeRedGates.length ? "60-90 days after gates close" : "60-90 days to production";
  const workflowIsReady = Boolean(maturityRows.find((row) => row.id === "a1_workflow" && row.stage >= 3));
  const firstWorkflow = workflowIsReady
    ? activeRedGates.length
      ? "Controlled first workflow build after red gates close"
      : finalStage >= 4
        ? "Next workflow scale candidate"
        : "Controlled first workflow build"
    : "Workflow discovery before first agent build";
  const agent = maturityRows.find((row) => row.id === "a2_agent" && row.stage >= 3)
    ? "ZAKI workflow agent with defined permissions and fallback"
    : "ZAKI role definition before autonomous work";
  const deployment = maturityRows.find((row) => row.id === "w3_access" && row.stage >= 3)
    ? "Approved access route with deployment boundary validation"
    : "Access and deployment boundary validation before build";
  const whyFits = allAnswered
    ? `Current read: ${snapshotStageLabels[finalStage]}. ${activeRedGates.length ? "Red gates cap maturity until resolved." : "No red-gate cap is currently active."}`
    : "Answer all 12 benchmarks to generate the maturity gap map and commercial next step.";

  return {
    archetype,
    confidence,
    answeredCount,
    allAnswered,
    rawStage,
    finalStage,
    redGateCap,
    targetStage,
    dimensionSummaries,
    maturityRows,
    redGates: activeRedGates,
    strongestDimension,
    weakestDimension,
    strongestDimensionLabel,
    weakestDimensionLabel,
    commercialNextStep,
    deliveryWindow,
    buildWindow,
    firstWorkflow,
    agent,
    deployment,
    whyFits,
    blockers: blockers.length ? blockers : ["Confirm baseline evidence and access owners before implementation starts."],
    controls: [
      "Deployment boundary, source access, and model-routing decision.",
      "Agent role, app surface, and approval model.",
      "Governance, run ledger, and reliability evidence.",
      "Finance-safe value baseline and post-launch review cadence.",
    ],
    prepare: priorityRows.length
      ? priorityRows.map((row) => `${row.code} ${row.bench}: ${row.action}`)
      : ["Bring source-system access notes, workflow examples, owner map, and value baseline."],
    attendees: [
      "Executive sponsor.",
      "Workflow owner.",
      "IT / security owner.",
      "Finance owner.",
      ...(activeRedGates.some((gate) => gate.id === "access" || gate.id === "reliability")
        ? ["Compliance or data protection owner."]
        : []),
    ],
    next30: activeRedGates.length
      ? [
          "Week 1: close red-gate owners, source systems, access model, and business baseline.",
          "Week 2: validate deployment boundary, agent role, approvals, and evaluation set.",
          "Week 3: design the first ZAKI workflow surface and run ledger.",
          "Week 4: decide Standard readout, In-Depth diagnostic, or implementation scope.",
        ]
      : [
          "Week 1: confirm source systems, owner map, access model, and value baseline.",
          "Week 2: select workflow candidate, deployment boundary, approval model, and evaluation set.",
          "Week 3: design the ZAKI workflow surface, run ledger, and rollout rhythm.",
          "Week 4: decide Standard readout, first workflow scope, or managed-agent scale path.",
        ],
  };
}

const snapshotPdfWidth = 842;
const snapshotPdfHeight = 595;

function pdfText(value: string | number) {
  return String(value)
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfText(value: string, maxChars: number) {
  const words = value.replace(/[^\x20-\x7E]/g, "-").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function pdfFill(color: string) {
  return `${color} rg`;
}

function pdfStroke(color: string) {
  return `${color} RG`;
}

function pdfRect(x: number, y: number, width: number, height: number, fill: string, stroke?: string) {
  const commands = [pdfFill(fill), `${x} ${y} ${width} ${height} re f`];
  if (stroke) commands.push(pdfStroke(stroke), `${x} ${y} ${width} ${height} re S`);
  return commands.join("\n");
}

function pdfLine(x1: number, y1: number, x2: number, y2: number, color = "0.80 0.76 0.68") {
  return `${pdfStroke(color)}\n${x1} ${y1} m ${x2} ${y2} l S`;
}

function pdfWrite(
  commands: string[],
  text: string | number,
  x: number,
  y: number,
  size = 10,
  font: "F1" | "F2" = "F1",
  color = "0.10 0.08 0.06"
) {
  commands.push(`${pdfFill(color)}\nBT /${font} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`);
}

function pdfWriteWrapped(
  commands: string[],
  text: string,
  x: number,
  y: number,
  maxChars: number,
  size = 10,
  lineHeight = 14,
  font: "F1" | "F2" = "F1",
  color = "0.10 0.08 0.06",
  maxLines = 4
) {
  wrapPdfText(text, maxChars)
    .slice(0, maxLines)
    .forEach((line, index) => {
      pdfWrite(commands, line, x, y - index * lineHeight, size, font, color);
    });
}

function snapshotPdfHeader(commands: string[], title: string, dark = false) {
  const textColor = dark ? "0.96 0.93 0.87" : "0.10 0.08 0.06";
  const mutedColor = dark ? "0.68 0.64 0.58" : "0.44 0.39 0.34";
  pdfWrite(commands, "Nova Nuggets / NovaOrbit", 44, 552, 9, "F2", "0.79 0.35 0.17");
  pdfWrite(commands, title, 44, 526, 24, "F2", textColor);
  pdfWrite(commands, "Generated locally from Snapshot answers. No answers are stored by Nova Nuggets.", 44, 506, 9, "F1", mutedColor);
}

type SnapshotPdfListSection = {
  title: string;
  items: string[];
  maxChars: number;
  preferredColumn?: 0 | 1;
};

function pdfListItemHeight(item: string, maxChars: number) {
  const lineCount = Math.max(1, wrapPdfText(item, maxChars).length);
  return 18 + (lineCount - 1) * 10;
}

function pdfWriteListItem(commands: string[], item: string, x: number, y: number, maxChars: number) {
  const lines = wrapPdfText(item, maxChars);
  pdfWrite(commands, "-", x + 6, y, 9, "F2", "0.79 0.35 0.17");
  lines.forEach((line, index) => {
    pdfWrite(commands, line, x + 24, y - index * 10, 8.5, "F1", "0.44 0.39 0.34");
  });
}

function buildSnapshotDecisionPages(snapshot: SnapshotBrief, paper: string) {
  const pages: string[] = [];
  const columns = [
    { x: 44, maxChars: 58 },
    { x: 456, maxChars: 46 },
  ];
  const topY = 468;
  const bottomY = 68;
  let pageIndex = 0;
  let columnIndex = 0;
  let cursorY = topY;
  let pageCommands: string[] = [];

  const createPage = () => {
    pageCommands = [pdfRect(0, 0, snapshotPdfWidth, snapshotPdfHeight, paper)];
    snapshotPdfHeader(pageCommands, pageIndex === 0 ? "Decision actions" : "Decision actions continued");
    pdfWrite(
      pageCommands,
      `Page ${pageIndex + 3}`,
      760,
      552,
      8,
      "F2",
      "0.79 0.35 0.17"
    );
    pageCommands.push(pdfLine(421, 472, 421, 74, "0.86 0.80 0.72"));
  };

  const commitPage = () => {
    pages.push(pageCommands.join("\n"));
  };

  const advanceColumn = () => {
    if (columnIndex === 0) {
      columnIndex = 1;
      cursorY = topY;
      return;
    }

    commitPage();
    pageIndex += 1;
    columnIndex = 0;
    cursorY = topY;
    createPage();
  };

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight >= bottomY) return false;
    advanceColumn();
    return true;
  };

  const writeSection = (section: SnapshotPdfListSection) => {
    const items = section.items.length ? section.items : ["No action required."];
    let titleWrittenForSegment = false;

    if (section.preferredColumn === 1 && columnIndex === 0 && cursorY < topY) {
      advanceColumn();
    }

    items.forEach((item, itemIndex) => {
      const getMaxChars = () => Math.min(section.maxChars, columns[columnIndex].maxChars);
      let maxChars = getMaxChars();
      let itemHeight = pdfListItemHeight(item, maxChars);
      let requiredHeight = (titleWrittenForSegment ? 0 : 26) + itemHeight;
      if (ensureSpace(requiredHeight) && itemIndex > 0) {
        titleWrittenForSegment = false;
      }
      maxChars = getMaxChars();
      itemHeight = pdfListItemHeight(item, maxChars);
      requiredHeight = (titleWrittenForSegment ? 0 : 26) + itemHeight;
      if (ensureSpace(requiredHeight) && itemIndex > 0) {
        titleWrittenForSegment = false;
      }

      if (!titleWrittenForSegment) {
        const title = itemIndex > 0 ? `${section.title} continued` : section.title;
        pdfWrite(pageCommands, title, columns[columnIndex].x, cursorY, 13, "F2");
        cursorY -= 22;
        titleWrittenForSegment = true;
      }

      pdfWriteListItem(pageCommands, item, columns[columnIndex].x, cursorY, maxChars);
      cursorY -= itemHeight;

      if (cursorY - 8 < bottomY && itemIndex < items.length - 1) {
        advanceColumn();
        titleWrittenForSegment = false;
      }
    });

    cursorY -= 12;
  };

  createPage();

  const sections: SnapshotPdfListSection[] = [
    {
      title: "Red gates",
      items: snapshot.redGates.length
        ? snapshot.redGates.map((gate) => `${gate.label}: ${gate.action}`)
        : ["No red-gate cap is currently active."],
      maxChars: columns[0].maxChars,
    },
    { title: "Priority actions", items: snapshot.prepare, maxChars: columns[0].maxChars },
    { title: "Controls to design", items: snapshot.controls, maxChars: columns[0].maxChars },
    { title: "Suggested attendees", items: snapshot.attendees, maxChars: columns[1].maxChars, preferredColumn: 1 },
    { title: "First 30 days", items: snapshot.next30, maxChars: columns[1].maxChars },
  ];

  sections.forEach(writeSection);
  commitPage();

  return pages;
}

function buildSnapshotPdf(snapshot: SnapshotBrief) {
  const dark = "0.06 0.05 0.04";
  const paper = "0.96 0.92 0.84";
  const ink = "0.10 0.08 0.06";
  const muted = "0.44 0.39 0.34";
  const terra = "0.79 0.35 0.17";
  const line = "0.80 0.76 0.68";
  const pages: string[] = [];

  const pageOne: string[] = [pdfRect(0, 0, snapshotPdfWidth, snapshotPdfHeight, dark)];
  snapshotPdfHeader(pageOne, "Personalized maturity gap map", true);
  pdfWrite(pageOne, `Stage ${snapshot.finalStage}`, 46, 438, 52, "F2", paper);
  pdfWrite(pageOne, snapshotStageLabels[snapshot.finalStage], 50, 412, 17, "F2", "0.92 0.86 0.76");
  pdfWriteWrapped(pageOne, snapshot.whyFits, 50, 386, 88, 11, 15, "F1", "0.72 0.68 0.60", 2);

  const summaryCards = [
    ["Raw stage", `Stage ${snapshot.rawStage}`],
    ["Red-gate cap", snapshot.redGates.length ? `Stage ${snapshot.redGateCap}` : "No active cap"],
    ["Target", `Stage ${snapshot.targetStage}`],
    ["Delivery clock", snapshot.deliveryWindow],
  ];
  summaryCards.forEach(([label, value], index) => {
    const x = 44 + index * 190;
    pageOne.push(pdfRect(x, 300, 170, 74, "0.09 0.07 0.05", "0.30 0.25 0.21"));
    pdfWrite(pageOne, label, x + 14, 348, 8, "F2", terra);
    pdfWriteWrapped(pageOne, value, x + 14, 324, 20, 18, 20, "F2", paper, 2);
  });

  pdfWrite(pageOne, "Dimension read", 44, 258, 16, "F2", paper);
  snapshot.dimensionSummaries.forEach((item, index) => {
    const y = 226 - index * 46;
    pdfWrite(pageOne, getDimensionName(item.dimension), 44, y + 10, 10, "F2", "0.86 0.80 0.70");
    for (let stage = 1; stage <= 4; stage += 1) {
      const fill = stage <= item.stage ? terra : "0.24 0.21 0.18";
      pageOne.push(pdfRect(340 + stage * 44, y, 32, 14, fill));
    }
    pdfWrite(pageOne, `S${item.stage} / ${item.answered} of 4`, 576, y + 2, 10, "F2", paper);
  });

  pdfWrite(pageOne, "Commercial next step", 44, 70, 8, "F2", terra);
  pdfWriteWrapped(pageOne, snapshot.commercialNextStep, 44, 46, 30, 20, 22, "F2", paper, 2);
  pdfWrite(pageOne, "First workflow", 310, 70, 8, "F2", terra);
  pdfWriteWrapped(pageOne, snapshot.firstWorkflow, 310, 48, 32, 12, 15, "F1", "0.86 0.80 0.70", 3);
  pdfWrite(pageOne, "Build window", 620, 70, 8, "F2", terra);
  pdfWriteWrapped(pageOne, snapshot.buildWindow, 620, 48, 25, 12, 15, "F1", "0.86 0.80 0.70", 3);

  pages.push(pageOne.join("\n"));

  const pageTwo: string[] = [pdfRect(0, 0, snapshotPdfWidth, snapshotPdfHeight, paper)];
  snapshotPdfHeader(pageTwo, "12 benchmark map");
  pdfWrite(pageTwo, "Code", 44, 470, 8, "F2", terra);
  pdfWrite(pageTwo, "Stage", 104, 470, 8, "F2", terra);
  pdfWrite(pageTwo, "Benchmark and action", 166, 470, 8, "F2", terra);
  pageTwo.push(pdfLine(44, 456, 798, 456, line));
  snapshot.maturityRows.forEach((row, index) => {
    const y = 432 - index * 32;
    pageTwo.push(pdfLine(44, y - 10, 798, y - 10, "0.86 0.80 0.72"));
    pdfWrite(pageTwo, row.code, 44, y, 8, "F2", terra);
    pdfWrite(pageTwo, `S${row.stage}`, 108, y, 12, "F2", ink);
    pdfWriteWrapped(pageTwo, `${row.bench}: ${row.action}`, 166, y + 3, 92, 9, 11, "F1", ink, 2);
    if (row.redGate) {
      pdfWrite(pageTwo, `cap S${row.redGate.cap}`, 740, y, 8, "F2", terra);
    }
  });
  pages.push(pageTwo.join("\n"));

  pages.push(...buildSnapshotDecisionPages(snapshot, paper));

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  const pageObjectNumbers: number[] = [];

  pages.forEach((content) => {
    const contentObjectNumber = objects.length + 1;
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageObjectNumber = objects.length + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${snapshotPdfWidth} ${snapshotPdfHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    );
    pageObjectNumbers.push(pageObjectNumber);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function downloadSnapshotPdf(snapshot: SnapshotBrief) {
  const blob = buildSnapshotPdf(snapshot);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `novaorbit-snapshot-stage-${snapshot.finalStage}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function NovaOrbitSnapshotPage() {
  const [answers, setAnswers] = useState<SnapshotAnswers>({});
  const [activeStep, setActiveStep] = useState(0);
  const [showBrief, setShowBrief] = useState(false);
  const [copied, setCopied] = useState(false);
  const advanceTimer = useRef<number | undefined>(undefined);
  const reportRef = useRef<HTMLElement | null>(null);
  const snapshot = buildSnapshot(answers);
  const activeQuestion = snapshotQuestions[activeStep];
  const activeAnswer = answers[activeQuestion.id];
  const answeredCount = snapshot.answeredCount;
  const hasSnapshotAnswers = answeredCount > 0;
  const firstUnansweredIndex = snapshotQuestions.findIndex((question) => !answers[question.id]);
  const maxReachableStep = firstUnansweredIndex === -1 ? snapshotQuestions.length - 1 : firstUnansweredIndex;
  const progress = Math.round((answeredCount / snapshotQuestions.length) * 100);
  const previewStageLabel = hasSnapshotAnswers ? `Stage ${snapshot.finalStage}` : "Pending";
  const previewStageSubLabel = hasSnapshotAnswers ? snapshotStageLabels[snapshot.finalStage] : "Awaiting answers";
  const previewRawStage = hasSnapshotAnswers
    ? `Stage ${snapshot.rawStage} / ${snapshotStageLabels[snapshot.rawStage]}`
    : "Answer the first benchmark to begin";
  const previewSignal = hasSnapshotAnswers
    ? snapshot.blockers[0]
    : "Answer each benchmark to build a defensible maturity map.";
  const summary = [
    "NovaOrbit Maturity Gap Map",
    `Current stage: Stage ${snapshot.finalStage} - ${snapshotStageLabels[snapshot.finalStage]}`,
    `Raw stage: Stage ${snapshot.rawStage} - ${snapshotStageLabels[snapshot.rawStage]}`,
    `Red-gate cap: Stage ${snapshot.redGateCap}`,
    `Commercial next step: ${snapshot.commercialNextStep}`,
    `Delivery window: ${snapshot.deliveryWindow}`,
    `Build window: ${snapshot.buildWindow}`,
    `Confidence: ${snapshot.confidence}`,
    `Strongest dimension: ${snapshot.strongestDimensionLabel}`,
    `Weakest dimension: ${snapshot.weakestDimensionLabel}`,
    "",
    "Dimension read",
    ...snapshot.dimensionSummaries.map(
      (item) => `${getDimensionName(item.dimension)}: Stage ${item.stage} - ${snapshotStageLabels[item.stage]} (${item.answered}/4 benchmarks answered)`
    ),
    "",
    "12 benchmarks",
    ...snapshot.maturityRows.map(
      (row) =>
        `${row.code} ${row.bench}: Stage ${row.stage} - ${snapshotStageLabels[row.stage]}; action: ${row.action}`
    ),
    "",
    "Red gates",
    ...(snapshot.redGates.length
      ? snapshot.redGates.map((gate) => `${gate.label}: caps at Stage ${gate.cap}; ${gate.action}`)
      : ["No red-gate cap active in this Snapshot."]),
    "",
    "Priority actions",
    ...snapshot.prepare,
  ].join("\n");
  const mailto = `mailto:${GENERAL_EMAIL}?subject=${encodeURIComponent("NovaOrbit Maturity Gap Map")}&body=${encodeURIComponent(`${summary}\n\nPlease contact me about a NovaOrbit scoping call.`)}`;

  useEffect(
    () => () => {
      if (advanceTimer.current) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!showBrief) return;

    window.requestAnimationFrame(() => {
      const report = reportRef.current;
      if (!report) return;

      const header = document.querySelector<HTMLElement>(".site-header");
      const headerOffset = (header?.getBoundingClientRect().bottom ?? 0) + 24;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const reportTop = window.scrollY + report.getBoundingClientRect().top - headerOffset;

      window.scrollTo({
        top: Math.max(0, reportTop),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  }, [showBrief]);

  function handleSnapshotAnswer(questionId: SnapshotAnswerId, value: SnapshotAnswerValue) {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
    }

    setAnswers((current) => ({ ...current, [questionId]: value }));
    setShowBrief(false);
    setCopied(false);

    advanceTimer.current = window.setTimeout(() => {
      if (activeStep === snapshotQuestions.length - 1) {
        setShowBrief(true);
      } else {
        setActiveStep((step) => Math.min(snapshotQuestions.length - 1, step + 1));
      }
    }, 180);
  }

  return (
    <ArticlePage
      kicker="NovaOrbit Snapshot"
      title="Generate your NovaOrbit maturity gap map."
      text="Score 12 benchmarks across Where, What, and How. The output maps stage, red gates, gaps, and the next action before a sales call."
      compactHero
    >
      <section className="orbit-snapshot-section" aria-labelledby="orbit-snapshot-title">
        {!showBrief && (
          <>
            <div className="snapshot-intro">
              <p className="section-kicker">Evaluation logic</p>
              <h2 id="orbit-snapshot-title">12 benchmarks. One build decision.</h2>
              <p>
                Each answer places one benchmark on the four-stage curve and turns the gap into a
                concrete action.
              </p>
              <div className="snapshot-dimensions" aria-label="Evaluation dimension progress">
                {snapshot.dimensionSummaries.map((item) => (
                  <p key={item.dimension}>
                    <span>{getDimensionName(item.dimension)}</span>
                    <strong>
                      {item.answered}/4
                      {item.answered === 4 ? ` / S${item.stage}` : ""}
                    </strong>
                  </p>
                ))}
              </div>
              <div className="snapshot-privacy">
                <span>No tracking</span>
                <span>No stored answers</span>
                <span>Structured for NovaOrbit</span>
              </div>
            </div>

            <div className="snapshot-console">
              <div className="snapshot-progress" aria-label={`Step ${activeStep + 1} of ${snapshotQuestions.length}`}>
                <span>{activeQuestion.label}</span>
                <strong>{progress}%</strong>
                <i style={{ width: `${progress}%` }} />
              </div>
              <div className="snapshot-step-map" aria-label="Snapshot steps">
                {snapshotQuestions.map((question, index) => (
                  <button
                    key={question.id}
                    type="button"
                    disabled={index > maxReachableStep}
                    aria-current={activeStep === index ? "step" : undefined}
                    aria-label={`Go to ${question.label}`}
                    onClick={() => {
                      setActiveStep(index);
                      setShowBrief(false);
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="snapshot-question">
                <span>
                  {snapshotDimensionMeta[activeQuestion.dimension].label} / {activeQuestion.code} / {activeQuestion.bench}
                </span>
                <p>{activeQuestion.prompt}</p>
                <small>{activeQuestion.why}</small>
                <div className="snapshot-options">
                  {activeQuestion.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={activeAnswer === option.value}
                      onClick={() => handleSnapshotAnswer(activeQuestion.id, option.value)}
                    >
                      <span aria-hidden="true">
                        {activeAnswer === option.value ? "Selected" : `Stage ${option.value}`}
                      </span>
                      <strong>{option.label}</strong>
                      <small>{option.detail}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="snapshot-controls">
                <button
                  type="button"
                  disabled={activeStep === 0}
                  onClick={() => {
                    if (advanceTimer.current) {
                      window.clearTimeout(advanceTimer.current);
                    }
                    setActiveStep((step) => Math.max(0, step - 1));
                  }}
                >
                  Previous
                </button>
              </div>
            </div>

            <aside className="snapshot-output" aria-label="NovaOrbit deployment brief preview">
              <div className="snapshot-score">
                <span>Current read</span>
                <strong>
                  {previewStageLabel}
                  <small>{previewStageSubLabel}</small>
                </strong>
                <p>
                  {answeredCount}/{snapshotQuestions.length} benchmarks answered / {snapshot.confidence} confidence
                </p>
              </div>
              <div className="snapshot-output-grid">
                <p>
                  <span>Raw stage</span>
                  {previewRawStage}
                </p>
                <p>
                  <span>Red-gate cap</span>
                  {snapshot.redGates.length ? `Stage ${snapshot.redGateCap}` : "No active cap yet"}
                </p>
                <p>
                  <span>Weakest dimension</span>
                  {snapshot.weakestDimensionLabel}
                </p>
                <p>
                  <span>Commercial next step</span>
                  {snapshot.commercialNextStep}
                </p>
                <p>
                  <span>Delivery window</span>
                  {snapshot.deliveryWindow}
                </p>
                <p>
                  <span>First workflow</span>
                  {snapshot.firstWorkflow}
                </p>
                <p>
                  <span>Build window</span>
                  {snapshot.buildWindow}
                </p>
                <p>
                  <span>Current signal</span>
                  {previewSignal}
                </p>
              </div>
            </aside>
          </>
        )}

        {showBrief && (
          <section ref={reportRef} className="snapshot-report" aria-label="Generated NovaOrbit maturity gap map">
            <div className="snapshot-report-head">
              <p className="section-kicker">Generated map</p>
              <h3 aria-label={snapshot.archetype ?? "NovaOrbit readiness map"}>
                <SignatureScrambleText
                  text={snapshot.archetype ?? "NovaOrbit readiness map"}
                  className="signature-scramble"
                  variant="signal"
                  ariaHidden
                />
              </h3>
              <p>{snapshot.whyFits}</p>
            </div>
            <MaturityOutcomeStrip snapshot={snapshot} />
            <NovaOrbitMaturityMap snapshot={snapshot} variant="snapshot" />
            <div className="snapshot-score-grid">
              {snapshot.dimensionSummaries.map((item) => (
                <p key={item.dimension}>
                  <span>{getDimensionName(item.dimension)}</span>
                  <strong>
                    S{item.stage}
                    <small>{snapshotStageLabels[item.stage]}</small>
                  </strong>
                </p>
              ))}
            </div>
            <SnapshotNextPathSection snapshot={snapshot} />
            <div className="snapshot-report-grid">
              <div className="snapshot-report-panel">
                <h4>Recommendation</h4>
                <p>
                  <span>Final stage</span>
                  Stage {snapshot.finalStage}: {snapshotStageLabels[snapshot.finalStage]}
                </p>
                <p>
                  <span>Commercial step</span>
                  {snapshot.commercialNextStep}
                </p>
                <p>
                  <span>Delivery window</span>
                  {snapshot.deliveryWindow}
                </p>
                <p>
                  <span>First workflow</span>
                  {snapshot.firstWorkflow}
                </p>
                <p>
                  <span>Build window</span>
                  {snapshot.buildWindow}
                </p>
                <p>
                  <span>ZAKI role</span>
                  {snapshot.agent}
                </p>
                <p>
                  <span>Deployment path</span>
                  {snapshot.deployment}
                </p>
              </div>
              <div className="snapshot-report-panel">
                <h4>Red gates</h4>
                {snapshot.redGates.length ? (
                  snapshot.redGates.map((gate) => (
                    <p key={gate.id}>
                      {gate.label}: caps at Stage {gate.cap}. {gate.action}
                    </p>
                  ))
                ) : (
                  <p>No red-gate cap is currently active.</p>
                )}
              </div>
              <div className="snapshot-report-panel">
                <h4>Priority actions</h4>
                {snapshot.prepare.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <div className="snapshot-report-panel">
                <h4>Controls to design</h4>
                {snapshot.controls.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <div className="snapshot-report-panel">
                <h4>Suggested attendees</h4>
                {snapshot.attendees.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <div className="snapshot-report-panel">
                <h4>First 30 days</h4>
                {snapshot.next30.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <SnapshotHandoffSection snapshot={snapshot} />
            <div className="snapshot-report-actions">
              <button
                type="button"
                onClick={() => {
                  setShowBrief(false);
                  setActiveStep(snapshotQuestions.length - 1);
                }}
              >
                Edit answers
              </button>
              <a className="button button-primary" href={mailto}>
                Request NovaOrbit review <ArrowIcon size={18} aria-hidden="true" />
              </a>
              <a className="button button-secondary" href={NOVAORBIT_ONE_PAGER_URL} download>
                Download framework PDF
              </a>
              <button type="button" onClick={() => downloadSnapshotPdf(snapshot)}>
                Download result PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(summary).catch(() => undefined);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy map"}
              </button>
              <p className="snapshot-export-note">
                Framework PDF is the generic board pre-read. Result PDF is generated locally from these answers.
              </p>
            </div>
          </section>
        )}
      </section>
    </ArticlePage>
  );
}

function SnapshotNextPathSection({ snapshot }: { snapshot: SnapshotBrief }) {
  const pathItems = [
    {
      label: "Now",
      term: "Snapshot: today",
      title: `Stage ${snapshot.finalStage}: ${snapshotStageLabels[snapshot.finalStage]}`,
      text: snapshot.redGates.length
        ? `${snapshot.redGates.length} red gate${snapshot.redGates.length === 1 ? "" : "s"} must close before the maturity claim can move.`
        : "No red-gate cap is active; the next decision can focus on first workflow scope.",
    },
    {
      label: "Next",
      term: `Delivery window: ${snapshot.deliveryWindow}`,
      title: snapshot.commercialNextStep,
      text:
        snapshot.commercialNextStep === "NovaOrbit In-Depth"
          ? "Validate access, deployment boundary, reliability, owners, and value evidence before implementation."
          : "Run the board-ready assessment readout and convert the strongest workflow into a build decision.",
    },
    {
      label: "Build",
      term: `Build window: ${snapshot.buildWindow}`,
      title: snapshot.firstWorkflow,
      text: "Translate the selected workflow into a ZAKI role, app surface, approval path, and evidence ledger.",
    },
    {
      label: "Operate",
      term: "Run ledger: first 30 days",
      title: "Private deployment and run evidence",
      text: "Deploy inside the agreed perimeter, monitor output quality, and use the ledger to decide the next workflow.",
    },
  ];

  return (
    <section className="snapshot-next-path" aria-label="Path from this Snapshot result">
      <div>
        <p className="section-kicker">Your path from this result</p>
        <h4>From map to owned AI workflow.</h4>
      </div>
      <div className="snapshot-next-path-grid">
        {pathItems.map((item, index) => (
          <article key={item.label}>
            <span>
              {String(index + 1).padStart(2, "0")} / {item.label}
            </span>
            <small>{item.term}</small>
            <h5>{item.title}</h5>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SnapshotHandoffSection({ snapshot }: { snapshot: SnapshotBrief }) {
  const meaning = [
    {
      label: "Stage read",
      text: `The organization reads as Stage ${snapshot.finalStage}: ${snapshotStageLabels[snapshot.finalStage]}.`,
    },
    {
      label: "Blocker logic",
      text: snapshot.redGates.length
        ? `${snapshot.redGates.length} red gate${snapshot.redGates.length === 1 ? "" : "s"} cap the next maturity claim until resolved.`
        : "No red-gate cap is active; the next decision can focus on first workflow scope.",
    },
    {
      label: "Why this offer",
      text:
        snapshot.commercialNextStep === "NovaOrbit In-Depth"
          ? "In-Depth is recommended because access, reliability, evidence, or ownership must be validated before implementation."
          : "Standard is enough when the buyer needs a board-ready read and first-workflow direction before build.",
    },
  ];
  const callChecklist = [
    "Named workflow owner and executive sponsor.",
    "System list, API/MCP/export constraints, and data sensitivity notes.",
    "Three to five workflow examples or current work artifacts.",
    "Current cycle-time, cost, quality, risk, or revenue baseline.",
    "Security, finance, and IT owners who can approve the next decision.",
  ];

  return (
    <section className="snapshot-handoff" aria-label="Snapshot sales handoff">
      <div>
        <p className="section-kicker">What this means</p>
        {meaning.map((item) => (
          <p key={item.label}>
            <span>{item.label}</span>
            {item.text}
          </p>
        ))}
      </div>
      <div>
        <p className="section-kicker">Bring this to the call</p>
        {callChecklist.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  );
}

function MaturityOutcomeStrip({ snapshot }: { snapshot: SnapshotBrief }) {
  return (
    <div className="snapshot-report-summary maturity-outcome-strip" aria-label="NovaOrbit outcome summary">
      <p>
        <span>Final read</span>
        <strong>
          Stage {snapshot.finalStage}
          <small>{snapshotStageLabels[snapshot.finalStage]}</small>
        </strong>
      </p>
      <p>
        <span>Gate cap</span>
        <strong>
          {snapshot.redGates.length ? `Stage ${snapshot.redGateCap}` : "None"}
          <small>{snapshot.redGates.length ? `${snapshot.redGates.length} active gate${snapshot.redGates.length === 1 ? "" : "s"}` : "No active cap"}</small>
        </strong>
      </p>
      <p>
        <span>Next target</span>
        <strong>
          Stage {snapshot.targetStage}
          <small>{snapshotStageLabels[snapshot.targetStage]}</small>
        </strong>
      </p>
      <p>
        <span>Commercial step</span>
        <strong>
          {snapshot.commercialNextStep}
          <small>Recommended offer</small>
        </strong>
      </p>
    </div>
  );
}

function NovaOrbitMaturityMap({
  snapshot,
  variant = "standard",
}: {
  snapshot: SnapshotBrief;
  variant?: "standard" | "demo" | "snapshot" | "sample";
}) {
  return (
    <div
      className={`maturity-map maturity-map-${variant}`}
      role="group"
      aria-label="NovaOrbit maturity gap map"
      tabIndex={0}
    >
      <div className="maturity-map-head">
        <span>Benchmark</span>
        <div className="maturity-map-axis" aria-label="Maturity stages">
          {snapshotStageNames.map((stage) => (
            <span key={stage}>
              S{stage}
              <small>{snapshotStageLabels[stage]}</small>
            </span>
          ))}
        </div>
        <span>Definitive action</span>
      </div>
      {snapshotDimensions.map((dimension) => (
        <div className="maturity-map-group" key={dimension}>
          <div className="maturity-map-group-title">
            <span>{snapshotDimensionMeta[dimension].label}</span>
            <strong>{snapshotDimensionMeta[dimension].title}</strong>
            <small>{snapshotDimensionMeta[dimension].question}</small>
          </div>
          {snapshot.maturityRows
            .filter((row) => row.dimension === dimension)
            .map((row) => {
              const currentLeft = `${((row.stage - 1) / 3) * 100}%`;
              const targetLeft = `${((row.targetStage - 1) / 3) * 100}%`;
              const gapLeft = `${((Math.min(row.stage, row.targetStage) - 1) / 3) * 100}%`;
              const gapWidth = `${(Math.abs(row.targetStage - row.stage) / 3) * 100}%`;

              return (
                <div
                  className={`maturity-map-row${row.redGate ? " maturity-map-row-capped" : ""}`}
                  key={row.id}
                  style={
                    {
                      "--current-left": currentLeft,
                      "--target-left": targetLeft,
                      "--gap-left": gapLeft,
                      "--gap-width": gapWidth,
                    } as CSSProperties
                  }
                >
                  <div className="maturity-benchmark">
                    <span>{row.code}</span>
                    <strong>{row.bench}</strong>
                    <small>
                      Stage {row.stage}: {snapshotStageLabels[row.stage]}
                    </small>
                  </div>
                  <div
                    className="maturity-track"
                    role="img"
                    aria-label={`${row.code} ${row.bench}: Stage ${row.stage} ${snapshotStageLabels[row.stage]}, target Stage ${row.targetStage}`}
                  >
                    <span className="maturity-grid-lines" aria-hidden="true" />
                    <span className="maturity-stage-labels" aria-hidden="true">
                      {snapshotStageNames.map((stage) => (
                        <span key={stage}>S{stage}</span>
                      ))}
                    </span>
                    <span className="maturity-gap-line" aria-hidden="true" />
                    <span className="maturity-marker maturity-marker-current" aria-hidden="true" />
                    <span className="maturity-marker maturity-marker-target" aria-hidden="true" />
                    {row.redGate && <span className="maturity-cap" aria-hidden="true">Cap</span>}
                  </div>
                  <p className="maturity-action">
                    {row.redGate && <span>{row.redGate.label}</span>}
                    {row.action}
                  </p>
                </div>
              );
            })}
        </div>
      ))}
      <div className="maturity-map-legend" aria-label="Maturity map legend">
        <span><i className="legend-current" /> Current benchmark stage</span>
        <span><i className="legend-target" /> Next credible target</span>
        <span><i className="legend-cap" /> Red-gate maturity cap</span>
      </div>
    </div>
  );
}

function FieldNotesPage() {
  return (
    <ArticlePage
      kicker="Field Notes"
      title="Field notes for serious AI operators."
      text="Monthly, founder-led notes on private AI infrastructure, ZAKI managed agents, NooX inference, RAG, sovereign deployment, and the operating model behind useful AI."
    >
      <section className="field-notes-index">
        <div className="field-notes-feature">
          <p className="section-kicker">Editorial system</p>
          <h2>Make the thinking visible before the sales call.</h2>
          <p>
            Field Notes stay secondary to the product journey. Each one sharpens a buyer decision
            that NovaOrbit later scores: where AI runs, what the agent does, and how value becomes
            evidence.
          </p>
          <div className="field-notes-framework" aria-label="Field Notes decision map">
            <p>
              <span>Where</span>
              Infrastructure boundary, inference, APIs, identity, and logs.
            </p>
            <p>
              <span>What</span>
              Agent role, memory, tools, approvals, and output state.
            </p>
            <p>
              <span>How</span>
              Workflow owner, operating change, value signal, and scale decision.
            </p>
          </div>
        </div>
        <div className="field-notes-grid">
          {fieldNotes.map((note) => (
            <a key={note.path} href={note.path}>
              <span>{note.dimension}</span>
              <h3>{note.title}</h3>
              <p>{note.decision}</p>
              <small>
                {note.readingTime} / {note.audience}
              </small>
            </a>
          ))}
        </div>
      </section>
    </ArticlePage>
  );
}

function FieldNotePage({ path }: { path: string }) {
  const note = fieldNoteForPath(path) ?? fieldNotes[0];
  const related = fieldNotes.filter((item) => item.path !== note.path).slice(0, 3);

  return (
    <ArticlePage
      kicker={`Field Notes / ${note.label}`}
      title={note.title}
      text={note.deck}
    >
      <article className="field-note-article">
        <aside className="field-note-meta" aria-label="Field note metadata">
          <span>{note.dimension}</span>
          <span>{note.date}</span>
          <span>{note.readingTime}</span>
          <span>{note.audience}</span>
        </aside>
        <div className="field-note-body">
          <p className="field-note-thesis">{note.thesis}</p>
          <div className="field-note-decision" aria-label="Buyer decision brief">
            <p>
              <span>Decision</span>
              {note.decision}
            </p>
            <p>
              <span>Board question</span>
              {note.boardQuestion}
            </p>
            <p>
              <span>Operating move</span>
              {note.operatingMove}
            </p>
          </div>
          {note.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          <div className="field-note-keywords" aria-label="Covered topics">
            {note.keywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
          <div className="field-note-cta">
            <p>
              If this is the problem your company is facing, the next step is to map one workflow,
              its data boundary, and the operating evidence required to scale.
            </p>
            <a className="button button-primary" href={note.cta.href}>
              {note.cta.label} <ArrowIcon size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      </article>
      <section className="related-notes" aria-labelledby="related-notes-title">
        <div>
          <p className="section-kicker">Read next</p>
          <h2 id="related-notes-title">Build the whole picture.</h2>
        </div>
        <div className="related-notes-grid">
          {related.map((item) => (
            <a key={item.path} href={item.path}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
            </a>
          ))}
        </div>
      </section>
    </ArticlePage>
  );
}

function ImpressumPage() {
  return (
    <ArticlePage
      kicker="Impressum"
      title="Legal Notice / Impressum."
      text="Provider identification, contact details, representation, registration, and content responsibility for Nova Nuggets."
      showFinalCta={false}
    >
      <section className="section legal-section">
        <div>
          <p className="section-kicker">Provider information</p>
          <h2>Information pursuant to § 5 DDG.</h2>
          <p>
            Legal provider information for the Nova Nuggets digital service and company presence.
          </p>
        </div>
        <div className="legal-table" role="table" aria-label="Impressum fields">
          {impressumFields.map(([label, value]) => (
            <p role="row" key={label}>
              <span role="cell">{label}</span>
              <strong role="cell">{value}</strong>
            </p>
          ))}
        </div>
      </section>
    </ArticlePage>
  );
}

function PrivacyPage() {
  return (
    <ArticlePage
      kicker="Privacy"
      title="Privacy notice."
      text="A practical privacy notice for website visitors, inquiries, booking requests, and investor conversations. A German legal review should finalize this before production launch."
      showFinalCta={false}
    >
      <section className="section legal-section">
        <div>
          <p className="section-kicker">Data handling</p>
          <h2>Minimal data, clear purpose, explicit consent for anything beyond essential use.</h2>
          <p>
            The current website does not need tracking to convert. Essential local storage is used
            to remember cookie consent; analytics and marketing pixels should only be added after
            the consent model is finalized.
          </p>
        </div>
        <div className="legal-table" role="table" aria-label="Privacy notice fields">
          {privacyFields.map(([label, value]) => (
            <p role="row" key={label}>
              <span role="cell">{label}</span>
              <strong role="cell">{value}</strong>
            </p>
          ))}
        </div>
      </section>
    </ArticlePage>
  );
}

function ArticlePage({
  kicker,
  title,
  text,
  children,
  showFinalCta = true,
  compactHero = false,
  showHeroActions = false,
  heroClassName,
}: {
  kicker: string;
  title: string;
  text: string;
  children: ReactNode;
  showFinalCta?: boolean;
  compactHero?: boolean;
  showHeroActions?: boolean;
  heroClassName?: string;
}) {
  const articleHeroClassName = [compactHero ? "article-hero article-hero-compact" : "article-hero", heroClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <section className={articleHeroClassName}>
        <p className="section-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{text}</p>
        {showHeroActions && (
          <div className="article-hero-actions" aria-label="Primary buyer actions">
            <a className="button button-primary" href="/nova-orbit-snapshot/">
              Run Snapshot <ArrowIcon size={18} aria-hidden="true" />
            </a>
            <a className="button button-secondary" href={BOOKING_URL} target="_blank" rel="noreferrer">
              Book NovaOrbit
            </a>
          </div>
        )}
      </section>
      {children}
      {showFinalCta && <FinalCta />}
    </>
  );
}

function SectionIntro({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <div className="section-intro">
      <p className="section-kicker">{kicker}</p>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function BuyerCtaStrip() {
  return (
    <section className="buyer-cta-strip" aria-label="NovaOrbit buyer actions">
      <div>
        <p className="section-kicker">Buyer path</p>
        <h2>Run the Snapshot. Read the map. Book the assessment.</h2>
      </div>
      <div className="buyer-cta-actions">
        <a className="button button-primary" href="/nova-orbit-snapshot/">
          Run Snapshot <ArrowIcon size={18} aria-hidden="true" />
        </a>
        <a className="button button-secondary" href={NOVAORBIT_ONE_PAGER_URL} download>
          Download framework PDF
        </a>
        <a className="button button-secondary" href={BOOKING_URL} target="_blank" rel="noreferrer">
          Book NovaOrbit
        </a>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="final-cta">
      <div>
        <p className="section-kicker">Next step</p>
        <h2>Build the AI workforce your company can actually own.</h2>
      </div>
      <div className="final-actions">
        <a className="button button-primary" href={BOOKING_URL} target="_blank" rel="noreferrer">
          Book NovaOrbit <ArrowIcon size={18} aria-hidden="true" />
        </a>
        <a className="button button-secondary" href="/nova-orbit-snapshot/">
          Run NovaOrbit Snapshot
        </a>
        <a
          className="button button-secondary"
          href={`mailto:${GENERAL_EMAIL}?subject=MNDA%20%2B%20NDA%20reference%20dossier%20request`}
        >
          Request NDA dossier
        </a>
        <a className="button button-secondary" href={ZAKI_URL}>
          Visit ZAKI
        </a>
      </div>
    </section>
  );
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem("nngts_cookie_consent") !== "essential");
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <aside className="cookie-banner" aria-label="Cookie notice">
      <div>
        <strong>Privacy-first website</strong>
        <p>
          We use essential local storage to remember this choice. Analytics and marketing cookies
          are not active.
        </p>
      </div>
      <div className="cookie-actions">
        <a href="/privacy/">Privacy notice</a>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem("nngts_cookie_consent", "essential");
            setVisible(false);
          }}
        >
          Accept essential
        </button>
      </div>
    </aside>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <img src="/assets/nova-nuggets-logo-transparent.png" alt="Nova Nuggets" />
        <p>Owned AI workforces. Dubai + Hamburg.</p>
      </div>
      <nav aria-label="Footer navigation">
        {routes
          .filter((route) => !route.slug.startsWith("field-note-") && route.slug !== "pricing")
          .map((route) => (
            <a key={route.path} href={normalizePath(route.path)}>
              {route.label}
            </a>
          ))}
        <a href={ZAKI_URL}>ZAKI</a>
      </nav>
    </footer>
  );
}
