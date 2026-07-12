import { useEffect, useRef } from "react";

type VisualConfig = {
  code: string;
  core: string;
  status: string;
  labels: [string, string, string, string];
  variant: string;
};

const journey = [
  { id: "diagnose", label: "Diagnose", detail: "Find the first workflow", href: "/nova-orbit/" },
  { id: "design", label: "Design", detail: "Shape the owned system", href: "/what-we-do/" },
  { id: "deploy", label: "Deploy", detail: "Choose the boundary", href: "/deploy/" },
  { id: "operate", label: "Operate", detail: "Run governed agents", href: "/ai-workforce/" },
  { id: "prove", label: "Prove", detail: "Measure the decision", href: "/proof/" },
] as const;

function visualFor(kicker: string): VisualConfig {
  const key = kicker.toLowerCase();

  if (key.includes("snapshot") || key.includes("sample") || key === "novaorbit") {
    return {
      code: "01 / ORBIT",
      core: "SCORE",
      status: "12 gates active",
      labels: ["Where", "What", "How", "Evidence"],
      variant: "orbit",
    };
  }
  if (key.includes("deploy") || key.includes("architecture")) {
    return {
      code: "03 / BOUNDARY",
      core: "RUN",
      status: "perimeter mapped",
      labels: ["NooX", "Your cloud", "NNGTs cloud", "Hybrid"],
      variant: "deploy",
    };
  }
  if (key.includes("proof")) {
    return {
      code: "05 / EVIDENCE",
      core: "PROVE",
      status: "ledger online",
      labels: ["Cycle time", "Quality", "Risk", "Return"],
      variant: "proof",
    };
  }
  if (key.includes("pricing") || key.includes("contact") || key.includes("advisory")) {
    return {
      code: "06 / DECISION",
      core: "START",
      status: "path qualified",
      labels: ["Snapshot", "Standard", "In-Depth", "First workflow"],
      variant: "decision",
    };
  }
  if (key.includes("workforce") || key.includes("team")) {
    return {
      code: "04 / OPERATE",
      core: "OWN",
      status: "human control on",
      labels: ["Memory", "Tools", "Approval", "Run ledger"],
      variant: "operate",
    };
  }
  if (key.includes("investor")) {
    return {
      code: "07 / SCALE",
      core: "GROW",
      status: "evidence to scale",
      labels: ["Product", "Enterprise", "Runtime", "Recurring"],
      variant: "scale",
    };
  }
  if (key.includes("field") || key.includes("privacy") || key.includes("impressum")) {
    return {
      code: "08 / RECORD",
      core: "READ",
      status: "source visible",
      labels: ["Context", "Method", "Boundary", "Decision"],
      variant: "record",
    };
  }

  return {
    code: "02 / SYSTEM",
    core: "BUILD",
    status: "workflow shaped",
    labels: ["Runtime", "Memory", "Agent", "Interface"],
    variant: "system",
  };
}

function currentJourneyStep(kicker: string) {
  const key = kicker.toLowerCase();
  if (key.includes("orbit") || key.includes("snapshot") || key.includes("sample")) return "diagnose";
  if (key.includes("deploy") || key.includes("architecture")) return "deploy";
  if (key.includes("workforce") || key.includes("team")) return "operate";
  if (key.includes("proof") || key.includes("investor") || key.includes("field")) return "prove";
  return "design";
}

export function ArticleHeroVisual({ kicker }: { kicker: string }) {
  const visual = visualFor(kicker);

  return (
    <div className="article-system-visual" data-visual={visual.variant} aria-hidden="true">
      <div className="article-system-topline">
        <span>{visual.code}</span>
        <span><i /> {visual.status}</span>
      </div>
      <div className="article-system-stage">
        <div className="article-system-grid" />
        <div className="article-system-ring article-system-ring-outer" />
        <div className="article-system-ring article-system-ring-inner" />
        <div className="article-system-axis article-system-axis-x" />
        <div className="article-system-axis article-system-axis-y" />
        <div className="article-system-core">
          <span>Nova Nuggets</span>
          <strong>{visual.core}</strong>
          <small>owned AI work</small>
        </div>
        {visual.labels.map((label, index) => (
          <div className={`article-system-node article-system-node-${index + 1}`} key={label}>
            <i />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>
      <div className="article-system-footer">
        <span>assess</span><i /><span>build</span><i /><span>deploy</span><i /><span>run</span>
      </div>
    </div>
  );
}

export function RouteJourney({ kicker }: { kicker: string }) {
  const current = currentJourneyStep(kicker);

  return (
    <nav className="route-journey" aria-label="Nova Nuggets delivery journey">
      <span className="route-journey-label">Your path</span>
      <div className="route-journey-track">
        {journey.map((step, index) => (
          <a href={step.href} aria-current={step.id === current ? "step" : undefined} key={step.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </a>
        ))}
      </div>
    </nav>
  );
}

export function SiteProgress() {
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const distance = Math.max(1, root.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / distance));
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="site-flow-progress" ref={progressRef} aria-hidden="true" />;
}

export function PageFlowMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("#main > section:not(.hero):not(.article-hero)")
    );
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    sections.forEach((section, index) => {
      section.dataset.flowReveal = "true";
      section.style.setProperty("--flow-order", String(index % 4));
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-flow-visible"));
      return undefined;
    }

    root.classList.add("flow-motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-flow-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      root.classList.remove("flow-motion-ready");
    };
  }, []);

  return null;
}
