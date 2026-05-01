import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
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

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const W = 1000;
const H = 1000;

const NODE_RADIUS: Record<string, number> = {
  core: 14,
  daily: 10,
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

function nodeRadius(kind: string): number {
  return NODE_RADIUS[kind] ?? 7;
}

function nodeColor(kind: string): string {
  if (kind === "core") return "#f10202";
  if (kind === "daily") return "#22c55e";
  return "#94a3b8";
}

function edgeStyle(edge: BrainGraphEdge, bloom: boolean) {
  const opacity = bloom ? 0.5 : 0.1;
  const stroke = "#94a3b8";
  if (edge.type === "semantic") {
    const w = Math.max(0.5, Math.min(2.5, edge.weight * 2));
    return { stroke, strokeOpacity: opacity, strokeDasharray: "4 3", strokeWidth: w };
  }
  if (edge.type === "reference") {
    return { stroke, strokeOpacity: opacity, strokeDasharray: "1 4" };
  }
  return { stroke, strokeOpacity: opacity };
}

// Sunflower/golden-angle spiral — deterministic, avoids corner bias
function sunflowerPlacement(count: number): Array<{ x: number; y: number }> {
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.min(W, H) / 2 - 70;
  return Array.from({ length: count }, (_, i) => {
    const r = maxR * Math.sqrt((i + 0.5) / count);
    const theta = i * GOLDEN;
    return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
  });
}

// Concentric rings by kind for sparse/degraded graphs
function radialByKindPlacement(nodes: BrainGraphNode[]): Array<{ x: number; y: number }> {
  const cx = W / 2;
  const cy = H / 2;
  const radii: Record<string, number> = { core: 100, daily: 240, conversation: 400 };
  const buckets: Record<string, number[]> = {};
  nodes.forEach((n, i) => {
    const k = n.kind in radii ? n.kind : "conversation";
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(i);
  });
  const positions: Array<{ x: number; y: number }> = new Array(nodes.length);
  for (const [kind, indices] of Object.entries(buckets)) {
    const r = radii[kind] ?? 400;
    indices.forEach((nodeIdx, i) => {
      const angle = (i / Math.max(indices.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[nodeIdx] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }
  nodes.forEach((_, i) => {
    if (!positions[i]) positions[i] = { x: cx, y: cy };
  });
  return positions;
}

function isSparseGraph(
  nodes: BrainGraphNode[],
  edges: BrainGraphEdge[],
  semanticDegraded: boolean,
): boolean {
  if (semanticDegraded) return true;
  const semanticCount = edges.filter((e) => e.type === "semantic").length;
  return semanticCount < nodes.length / 4;
}

// ── Detail panel ──────────────────────────────────────────────

interface DetailPanelProps {
  node: BrainGraphNode;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}

function DetailPanel({ node, onClose, t }: DetailPanelProps) {
  const isDeprecated = node.valid_to !== null;
  const color = nodeColor(node.kind);
  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-64 flex-col rounded-r-zaki-lg border-l border-zaki-border bg-zaki-base/96 p-4 shadow-xl backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          {t(`brain.graph.kindLabel.${node.kind}` as never, { defaultValue: node.kind })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-zaki-muted hover:text-zaki-text"
          aria-label={t("brain.graph.detail.close")}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="flex-1 overflow-y-auto text-sm leading-relaxed text-zaki-text">
        {node.summary}
      </p>
      <div className="mt-4 space-y-1.5 border-t border-zaki-border pt-3 text-[11px] text-zaki-muted">
        <div className="flex items-center justify-between gap-2">
          <span>{t("brain.graph.detail.saved")}</span>
          <span className="text-right font-medium text-zaki-text">
            {new Date(node.created_at * 1000).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        {node.session_id && (
          <div className="flex items-center justify-between gap-2">
            <span>{t("brain.graph.detail.session")}</span>
            <span
              className="truncate font-mono text-[10px] text-zaki-text"
              title={node.session_id}
            >
              …{node.session_id.slice(-8)}
            </span>
          </div>
        )}
        {isDeprecated && (
          <div className="mt-2 rounded-full bg-amber-500/10 px-2 py-1 text-center text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            {t("brain.graph.superseded")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BrainGraphView ────────────────────────────────────────────

export function BrainGraphView({ userId, selectedIds, onSelectionChange }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useBrainGraph(userId);
  const isMobile = useIsMobile();

  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [detailNode, setDetailNode] = useState<BrainGraphNode | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStart = useRef<{ x: number; y: number; vt: ViewTransform } | null>(null);
  const rafRef = useRef<number | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const alphaRef = useRef(1.0);
  const viewTransformRef = useRef(viewTransform);
  const didDragRef = useRef(false);

  useEffect(() => {
    viewTransformRef.current = viewTransform;
  }, [viewTransform]);

  // Close detail panel when compose modal takes over (2+ selected)
  useEffect(() => {
    if (selectedIds.length >= 2) setDetailNode(null);
  }, [selectedIds]);

  const sparse = useMemo(
    () =>
      data ? isSparseGraph(data.nodes, data.edges, data.semantic_degraded ?? false) : false,
    [data],
  );

  // Simulation setup and RAF loop
  useEffect(() => {
    if (!data || data.nodes.length === 0) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const positions = sparse
      ? radialByKindPlacement(data.nodes)
      : sunflowerPlacement(data.nodes.length);

    const nodes: SimNode[] = data.nodes.map((n, i) => ({
      id: n.id,
      x: positions[i]?.x ?? W / 2,
      y: positions[i]?.y ?? H / 2,
      vx: 0,
      vy: 0,
      ref: n,
    }));

    simNodesRef.current = nodes;
    alphaRef.current = 1.0;
    setSimNodes([...nodes]);

    if (sparse) return; // Radial layout is static — no physics needed

    const idIdx = new Map(nodes.map((n, i) => [n.id, i]));
    const edges = data.edges.filter((e) => idIdx.has(e.source) && idIdx.has(e.target));

    const REPEL = 4000;
    const REPEL_MAX_D = 280;
    const SPRING_K = 0.15;
    const SPRING_LEN = 90;
    const DAMP = 0.78;
    const CENTER_G = 0.008;
    const ALPHA_DECAY = 0.992;
    const SUB_TICKS = 5;
    const RENDER_EVERY = 3;
    let frame = 0;

    function tick() {
      if (alphaRef.current < 0.005) return;

      const ns = simNodesRef.current;
      const alpha = alphaRef.current;

      for (let sub = 0; sub < SUB_TICKS; sub++) {
        // Repulsion between all pairs (capped distance for performance)
        for (let i = 0; i < ns.length; i++) {
          const a = ns[i]!;
          for (let j = i + 1; j < ns.length; j++) {
            const b = ns[j]!;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy + 0.01;
            const d = Math.sqrt(d2);
            if (d > REPEL_MAX_D) continue;
            const f = (REPEL / d2) * alpha;
            const nx2 = dx / d;
            const ny2 = dy / d;
            a.vx -= nx2 * f;
            a.vy -= ny2 * f;
            b.vx += nx2 * f;
            b.vy += ny2 * f;
          }
        }

        // Spring attraction along edges
        for (const e of edges) {
          const ai = idIdx.get(e.source);
          const bi = idIdx.get(e.target);
          if (ai === undefined || bi === undefined) continue;
          const a = ns[ai]!;
          const b = ns[bi]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const f = SPRING_K * (d - SPRING_LEN) * alpha;
          const nx2 = dx / d;
          const ny2 = dy / d;
          a.vx += nx2 * f;
          a.vy += ny2 * f;
          b.vx -= nx2 * f;
          b.vy -= ny2 * f;
        }

        // Center gravity + integrate + bound
        for (const n of ns) {
          n.vx += (W / 2 - n.x) * CENTER_G * alpha;
          n.vy += (H / 2 - n.y) * CENTER_G * alpha;
          n.vx *= DAMP;
          n.vy *= DAMP;
          n.x = Math.max(30, Math.min(W - 30, n.x + n.vx));
          n.y = Math.max(30, Math.min(H - 30, n.y + n.vy));
        }
      }

      alphaRef.current *= ALPHA_DECAY;
      frame++;
      if (frame % RENDER_EVERY === 0) setSimNodes([...ns]);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [data, sparse]);

  // Non-passive wheel listener (React's onWheel is passive in some versions)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const rect = el.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * W;
      const svgY = ((e.clientY - rect.top) / rect.height) * H;
      setViewTransform((prev) => {
        const newScale = Math.max(0.3, Math.min(5, prev.scale * factor));
        const cx = (svgX - prev.x) / prev.scale;
        const cy = (svgY - prev.y) / prev.scale;
        return { x: svgX - cx * newScale, y: svgY - cy * newScale, scale: newScale };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data]); // re-attach when SVG mounts after data loads

  const nodeById = useMemo(
    () => new Map(simNodes.map((n) => [n.id, n])),
    [simNodes],
  );

  // ── Interaction ─────────────────────────────────────────────

  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    didDragRef.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, vt: { ...viewTransformRef.current } };
    setIsPanning(true);
  }, []);

  const handleSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStart.current) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const dx = (e.clientX - dragStart.current.x) * (W / rect.width);
    const dy = (e.clientY - dragStart.current.y) * (H / rect.height);
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
    if (!didDragRef.current) return;
    setViewTransform({
      ...dragStart.current.vt,
      x: dragStart.current.vt.x + dx,
      y: dragStart.current.vt.y + dy,
    });
  }, []);

  const handleSvgPointerUp = useCallback(() => {
    dragStart.current = null;
    setIsPanning(false);
  }, []);

  const handleSvgDoubleClick = useCallback(() => {
    setViewTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const handleNodePointerDown = useCallback((e: React.PointerEvent) => {
    // Prevent SVG pan from starting when clicking a node
    e.stopPropagation();
    didDragRef.current = false;
  }, []);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, sn: SimNode) => {
      if (didDragRef.current) return;
      if (e.shiftKey) {
        const next = selectedIds.includes(sn.id)
          ? selectedIds.filter((x) => x !== sn.id)
          : [...selectedIds, sn.id];
        onSelectionChange(next);
      } else {
        setDetailNode((prev) => (prev?.id === sn.id ? null : sn.ref));
        onSelectionChange([sn.id]);
      }
    },
    [selectedIds, onSelectionChange],
  );

  // Compute tooltip position in container-relative pixels
  function tooltipPos(sn: SimNode): { left: number; top: number } | null {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return null;
    const svgRect = svgEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    if (svgRect.width === 0) return null;
    const vt = viewTransform;
    const svgViewX = sn.x * vt.scale + vt.x;
    const svgViewY = sn.y * vt.scale + vt.y;
    const clientX = svgRect.left + (svgViewX / W) * svgRect.width;
    const clientY = svgRect.top + (svgViewY / H) * svgRect.height;
    return { left: clientX - containerRect.left, top: clientY - containerRect.top };
  }

  // ── Early returns ────────────────────────────────────────────

  if (isLoading || (!data && !isError)) return null;

  if (isError || !data) {
    return (
      <div className="py-6 text-center text-sm text-zaki-muted">
        {t("brain.error.loadFailed")}
      </div>
    );
  }

  // Mobile: sorted list fallback (no SVG)
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
                className={`rounded-zaki-lg bg-zaki-raised p-3 ${deprecated ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zaki-muted">
                  <span style={{ color: nodeColor(n.kind) }}>●</span>
                  <span>
                    {t(`brain.graph.kindLabel.${n.kind}` as never, { defaultValue: n.kind })}
                  </span>
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

  // Tooltip
  const hoverNode = hoverId ? nodeById.get(hoverId) ?? null : null;
  const hoverPos = hoverNode && !detailNode ? tooltipPos(hoverNode) : null;

  return (
    <div ref={containerRef} className="relative" style={{ touchAction: "none" }}>
      {sparse && (
        <p className="mb-2 rounded-zaki-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          {t("brain.graph.sparseNotice")}
        </p>
      )}
      <p className="mb-2 text-[11px] text-zaki-muted">{t("brain.graph.selectHint")}</p>
      {selectedIds.length > 0 && (
        <p className="mb-2 text-[11px] font-semibold text-zaki-text">
          {t("brain.graph.selected", { count: selectedIds.length })}
        </p>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full max-h-[60vh] rounded-zaki-lg bg-zaki-raised ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        role="img"
        aria-label={t("brain.graph.ariaLabel")}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={handleSvgPointerUp}
        onDoubleClick={handleSvgDoubleClick}
      >
        <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
          {/* Edges */}
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
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2 - 40;
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
          {/* Nodes */}
          {simNodes.map((sn) => {
            const r = nodeRadius(sn.ref.kind);
            const isSelected = selectedIds.includes(sn.id);
            const isHovered = hoverId === sn.id;
            const isDeprecated = sn.ref.valid_to !== null;
            return (
              <g
                key={sn.id}
                transform={`translate(${sn.x},${sn.y})`}
                onPointerDown={handleNodePointerDown}
                onDoubleClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setHoverId(sn.id)}
                onMouseLeave={() => setHoverId((h) => (h === sn.id ? null : h))}
                onClick={(e) => handleNodeClick(e, sn)}
                style={{ cursor: "pointer", opacity: isDeprecated ? 0.45 : 1 }}
                role="button"
                aria-label={t("brain.graph.nodeAriaLabel", { summary: sn.ref.summary })}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailNode((prev) => (prev?.id === sn.id ? null : sn.ref));
                    onSelectionChange([sn.id]);
                  }
                }}
              >
                <circle
                  r={r}
                  fill={nodeColor(sn.ref.kind)}
                  stroke={isSelected ? "#f10202" : "transparent"}
                  strokeWidth={isSelected ? 2.5 : 0}
                  style={{
                    transform: isHovered ? "scale(1.3)" : "scale(1)",
                    transformOrigin: "center",
                    transition: "transform 0.15s ease-out",
                  }}
                />
                <title>{sn.ref.summary}</title>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoverNode && hoverPos && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 max-w-[200px] -translate-x-1/2 -translate-y-full rounded-zaki-md bg-zaki-base/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
          style={{ left: hoverPos.left, top: hoverPos.top - 8 }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: nodeColor(hoverNode.ref.kind) }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zaki-muted">
              {hoverNode.ref.kind}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zaki-text">
            {hoverNode.ref.summary}
          </p>
        </div>
      )}

      {/* Click detail panel */}
      {detailNode && (
        <DetailPanel
          node={detailNode}
          onClose={() => {
            setDetailNode(null);
            onSelectionChange([]);
          }}
          t={t}
        />
      )}

      {/* Fit-to-view hint */}
      <p className="mt-1 text-right text-[10px] text-zaki-muted">
        {t("brain.graph.fitToView")}
      </p>
    </div>
  );
}
