import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBrainGraph } from "@/queries";
import type { BrainGraphEdge, BrainGraphNode } from "@/lib/api";

interface Props {
  userId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ref: BrainGraphNode;
}

const NODE_RADIUS: Record<string, number> = {
  core: 12,
  daily: 9,
  conversation: 7,
};

function useIsMobile() {
  const [m, setM] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  useEffect(() => {
    const onR = () => setM(window.innerWidth < 640);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return m;
}

export function BrainGraphView({ userId, selectedIds, onSelectionChange }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useBrainGraph(userId);
  const isMobile = useIsMobile();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const [simNodes, setSimNodes] = useState<SimNode[]>([]);

  // Initialize + run spring physics for ~300 iterations, then freeze.
  useEffect(() => {
    if (!data || data.nodes.length === 0) return;
    const W = 800;
    const H = 500;
    const nodes: SimNode[] = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const r = 150 + (i % 3) * 50;
      return {
        id: n.id,
        x: W / 2 + Math.cos(angle) * r,
        y: H / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        ref: n,
      };
    });
    const idIdx = new Map(nodes.map((n, i) => [n.id, i]));
    const edges = data.edges.filter(
      (e) => idIdx.has(e.source) && idIdx.has(e.target),
    );
    const REPEL = 1500;
    const SPRING = 0.02;
    const SPRING_LEN = 80;
    const DAMP = 0.85;

    for (let iter = 0; iter < 300; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!a) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          if (!b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy + 0.01;
          const f = REPEL / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
      for (const e of edges) {
        const ai = idIdx.get(e.source);
        const bi = idIdx.get(e.target);
        if (ai === undefined || bi === undefined) continue;
        const a = nodes[ai];
        const b = nodes[bi];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const f = SPRING * (d - SPRING_LEN);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      for (const n of nodes) {
        n.vx *= DAMP;
        n.vy *= DAMP;
        n.x += n.vx;
        n.y += n.vy;
        // Bound
        n.x = Math.max(40, Math.min(W - 40, n.x));
        n.y = Math.max(40, Math.min(H - 40, n.y));
      }
    }
    setSimNodes(nodes);
  }, [data]);

  const nodeById = useMemo(
    () => new Map(simNodes.map((n) => [n.id, n])),
    [simNodes],
  );

  function nodeRadius(kind: string) {
    return NODE_RADIUS[kind] ?? 7;
  }

  function nodeColor(kind: string) {
    if (kind === "core") return "#f10202";
    if (kind === "daily") return "#22c55e";
    return "#94a3b8";
  }

  function edgeStyle(edge: BrainGraphEdge, bloom: boolean) {
    const opacity = bloom ? 0.4 : 0.08;
    const stroke = "#94a3b8";
    if (edge.type === "semantic") {
      return { stroke, strokeOpacity: opacity, strokeDasharray: "4 3" };
    }
    if (edge.type === "reference") {
      return { stroke, strokeOpacity: opacity, strokeDasharray: "1 4" };
    }
    return { stroke, strokeOpacity: opacity };
  }

  function handleNodeClick(e: React.MouseEvent, id: string) {
    if (e.shiftKey) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      onSelectionChange(next);
    } else {
      onSelectionChange([id]);
    }
  }

  if (isLoading || (!data && !isError)) return null;

  if (isError || !data) {
    return (
      <div className="py-6 text-center text-sm text-zaki-muted">
        {t("brain.error.loadFailed")}
      </div>
    );
  }

  // Mobile fallback: vertical sorted list
  if (isMobile) {
    const sorted = [...data.nodes].sort((a, b) => b.created_at - a.created_at);
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-zaki-text">
          {t("brain.graph.mobileTitle")}
        </h3>
        <ul className="space-y-2">
          {sorted.map((n) => {
            const deprecated = n.valid_to !== null;
            return (
              <li
                key={n.id}
                className={`rounded-zaki-lg bg-zaki-raised p-3 ${
                  deprecated ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zaki-muted">
                  <span style={{ color: nodeColor(n.kind) }}>●</span>
                  <span>{t(`brain.graph.kindLabel.${n.kind}` as never, { defaultValue: n.kind })}</span>
                  {deprecated && (
                    <span className="rounded-full bg-zaki-base px-1.5 py-0.5">
                      {t("brain.graph.superseded")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zaki-text">{n.summary}</p>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="mb-2 text-[11px] text-zaki-muted">{t("brain.graph.selectHint")}</p>
      {selectedIds.length > 0 && (
        <p className="mb-2 text-[11px] font-semibold text-zaki-text">
          {t("brain.graph.selected", { count: selectedIds.length })}
        </p>
      )}
      <svg
        viewBox="0 0 800 500"
        className="w-full max-h-[60vh] rounded-zaki-lg bg-zaki-raised"
        role="img"
        aria-label="memory-graph"
      >
        <g>
          {data.edges.map((e) => {
            const a = nodeById.get(e.source);
            const b = nodeById.get(e.target);
            if (!a || !b) return null;
            const bloom =
              hoverId === e.source ||
              hoverId === e.target ||
              selectedIds.includes(e.source) ||
              selectedIds.includes(e.target);
            const style = edgeStyle(e, bloom);
            if (e.type === "semantic") {
              // curved
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2 - 30;
              return (
                <path
                  key={`${e.source}:${e.target}:${e.type}`}
                  d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                  fill="none"
                  {...style}
                />
              );
            }
            return (
              <line
                key={`${e.source}:${e.target}:${e.type}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                {...style}
              />
            );
          })}
        </g>
        <g>
          {simNodes.map((sn) => {
            const r = nodeRadius(sn.ref.kind);
            const isSelected = selectedIds.includes(sn.id);
            const isDeprecated = sn.ref.valid_to !== null;
            return (
              <g
                key={sn.id}
                transform={`translate(${sn.x},${sn.y})`}
                onMouseEnter={() => setHoverId(sn.id)}
                onMouseLeave={() => setHoverId((h) => (h === sn.id ? null : h))}
                onClick={(e) => handleNodeClick(e, sn.id)}
                style={{ cursor: "pointer", opacity: isDeprecated ? 0.45 : 1 }}
              >
                <circle
                  r={r}
                  fill={nodeColor(sn.ref.kind)}
                  stroke={isSelected ? "#f10202" : "transparent"}
                  strokeWidth={isSelected ? 3 : 0}
                />
                <title>{sn.ref.summary}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
