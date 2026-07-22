import { useEffect, useRef, useState } from "react";

type JourneyStep = "understand" | "assess" | "deploy" | "prove";

const journeySteps: Array<{
  id: JourneyStep;
  index: string;
  label: string;
  description: string;
  href: string;
}> = [
  {
    id: "understand",
    index: "01",
    label: "Understand",
    description: "See the operating system",
    href: "/what-we-do/",
  },
  {
    id: "assess",
    index: "02",
    label: "Assess",
    description: "Map the build decision",
    href: "/nova-orbit/",
  },
  {
    id: "deploy",
    index: "03",
    label: "Deploy",
    description: "Install the owned workflow",
    href: "/deploy/",
  },
  {
    id: "prove",
    index: "04",
    label: "Prove",
    description: "Inspect operating evidence",
    href: "/proof/",
  },
];

const operatingLayerSteps = [
  ["01", "Model", "Capability"],
  ["02", "Context", "Company memory"],
  ["03", "Systems", "Tools + access"],
  ["04", "Approvals", "Human control"],
  ["05", "Owner", "Named accountability"],
  ["06", "Evidence", "Measured output"],
  ["07", "Work", "Owned capacity"],
];

const architectureFlow = [
  ["01", "Sources", "CRM, documents, APIs"],
  ["02", "Knowledge", "RAG, memory, policy"],
  ["03", "ZAKI agent", "Reason, use tools, act"],
  ["04", "Approval", "Human and policy gates"],
  ["05", "Work surface", "App, chat, embedded flow"],
  ["06", "Evidence", "Audit, quality, ROI"],
];

function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Motion is progressively enabled only when visible and when the user has not requested less:
    // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
    // https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
    const element = ref.current;
    if (!element || revealed) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12%", threshold: 0.18 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [revealed]);

  return { ref, revealed };
}

export function BuyerJourneyRail({ current }: { current: JourneyStep }) {
  return (
    <nav id="buyer-journey" className="buyer-journey" aria-label="Nova Nuggets buyer journey">
      <div className="buyer-journey-intro">
        <span>Buyer path</span>
        <strong>From signal to owned operating capacity.</strong>
      </div>
      <ol>
        {journeySteps.map((step) => {
          const isCurrent = step.id === current;
          return (
            <li key={step.id} data-current={isCurrent ? "true" : "false"}>
              <a href={step.href} aria-current={isCurrent ? "step" : undefined}>
                <span>{step.index}</span>
                <strong>{step.label}</strong>
                <small>{step.description}</small>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function OperatingLayerBridge() {
  const { ref, revealed } = useRevealOnce<HTMLDivElement>();

  return (
    <div
      className="operating-layer-bridge"
      ref={ref}
      data-revealed={revealed ? "true" : "false"}
      aria-label="The operating layer between model capability and owned company work"
    >
      <div className="operating-layer-track" aria-hidden="true">
        <span />
      </div>
      <ol>
        {operatingLayerSteps.map(([index, title, detail]) => (
          <li key={index}>
            <span>{index}</span>
            <strong>{title}</strong>
            <small>{detail}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ArchitectureSystemFlow() {
  const { ref, revealed } = useRevealOnce<HTMLElement>();

  return (
    <section
      className="section architecture-flow-section"
      ref={ref}
      data-revealed={revealed ? "true" : "false"}
      aria-labelledby="architecture-flow-title"
    >
      <div className="architecture-flow-copy">
        <p className="section-kicker">One governed run</p>
        <h2 id="architecture-flow-title">Follow the work, not the model logo.</h2>
        <p>
          Durable architecture is a controlled path from source context to useful output and
          operating evidence. Models can change without breaking the company-owned workflow.
        </p>
      </div>
      <div className="architecture-flow-board">
        <div className="architecture-flow-boundary" aria-hidden="true">
          <span>Company-controlled boundary</span>
        </div>
        <div className="architecture-flow-line" aria-hidden="true">
          <span />
        </div>
        <ol>
          {architectureFlow.map(([index, title, detail]) => (
            <li key={index}>
              <span>{index}</span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </li>
          ))}
        </ol>
        <div className="architecture-flow-ledger" aria-label="Evidence generated by the system">
          <span>Run ledger</span>
          <p>source · action · approval · result · owner · business signal</p>
        </div>
      </div>
    </section>
  );
}
