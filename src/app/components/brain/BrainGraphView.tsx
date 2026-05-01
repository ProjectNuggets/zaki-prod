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

const W = 1600;
const H = 900;
const MAX_DISPLAY_NODES = 80;

const NODE_RADIUS: Record<string, number> = {
  core: 16,
  daily: 9,
  conversation: 5,
};

// Per-kind gravity toward canvas center — creates solar-system hierarchy automatically
const KIND_GRAVITY: Record<string, number> = {
  core: 0.045,       // anchored near center
  daily: 0.004,      // mid-ring
  conversation: 0,   // outer ring, free-floating
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
  return NODE_RADIUS[kind] ?? 5;
}

function nodeColor(kind: string): string {
  if (kind === "core") return "#f10202";
  if (kind === "daily") return "#22c55e";
  return "#6b7280";
}

function nodeGlowColor(kind: string): string {
  if (kind === "core") return "rgba(241,2,2,0.3)";
  if (kind === "daily") return "rgba(34,197,94,0.25)";
  return "rgba(107,114,128,0.15)";
}

// Prioritise: all core → most-recent daily → most-recent conversation
function selectDisplayNodes(all: BrainGraphNode[]): BrainGraphNode[] {
  const byKind = (kind: string) =>
    all.filter((n) => n.kind === kind).sort((a, b) => b.created_at - a.created_at);
  const core = byKind("core");
  const daily = byKind("daily");
  const conv = byKind("conversation");
  const other = all.filter((n) => n.kind !== "core" && n.kind !== "daily" && n.kind !== "conversation");

  const result: BrainGraphNode[] = [...core];
  let remaining = MAX_DISPLAY_NODES - result.length;
  if (remaining > 0) {
    const dailySlot = Math.ceil(remaining * 0.6);
    result.push(...daily.slice(0, dailySlot));
    remaining = MAX_DISPLAY_NODES - result.length;
  }
  if (remaining > 0) {
    result.push(...conv.slice(0, remaining));
    remaining = MAX_DISPLAY_NODES - result.length;
  }
  if (remaining > 0) result.push(...other.slice(0, remaining));
  return result;
}

// Sunflower/golden-angle — deterministic, avoids corner bias
function sunflowerPlacement(count: number): Array<{ x: number; y: number }> {
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.min(W, H) / 2 - 80;
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
  const radii: Record<string, number> = { core: 100, daily: 260, conversation: 420 };
  const buckets: Record<string, number[]> = {};
  nodes.forEach((n, i) => {
    const k = n.kind in radii ? n.kind : "conversation";
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(i);
  });
  const positions: Array<{ x: number; y: number }> = new Array(nodes.length);
  for (const [kind, indices] of Object.entries(buckets)) {
    const r = radii[kind] ?? 420;
    indices.forEach((idx, i) => {
      const angle = (i / Math.max(indices.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[idx] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
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

function truncateLabel(text: string, max = 24): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

// ── Edge opacity logic — the relationship reveal system ──────
function computeEdgeOpacity(
  edge: BrainGraphEdge,
  hoverId: string | null,
  focusId: string | null, // node clicked (detail open or selected)
  connectedIds: Set<string> | null,
): number {
  if (focusId && connectedIds) {
    // Spotlight mode: show only edges connecting to focused node
    const directEdge = edge.source === focusId || edge.target === focusId;
    return directEdge ? 0.9 : 0.04;
  }
  if (hoverId) {
    // Hover mode: illuminate this node's web
    if (edge.source === hoverId || edge.target === hoverId) return 0.72;
    return 0.05;
  }
  // Default: visible but calm
  return edge.type === "semantic" ? 0.28 : 0.16;
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
    <div className="absolute inset-y-0 right-0 z-20 flex w-64 flex-col border-l border-white/10 bg-black/75 p-4 shadow-2xl backdrop-blur-lg">
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          {t(`brain.graph.kindLabel.${node.kind}` as never, { defaultValue: node.kind })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-white/40 transition-colors hover:text-white"
          aria-label={t("brain.graph.detail.close")}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="flex-1 overflow-y-auto text-sm leading-relaxed text-white/90">
        {node.summary}
      </p>
      <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-[11px] text-white/40">
        <div className="flex items-center justify-between gap-2">
          <span>{t("brain.graph.detail.saved")}</span>
          <span className="font-medium text-white/70">
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
            <span className="truncate font-mono text-[10px] text-white/60" title={node.session_id}>
              …{node.session_id.slice(-8)}
            </span>
          </div>
        )}
        {isDeprecated && (
          <div className="mt-2 rounded-full bg-amber-500/15 px-2 py-1 text-center text-[10px] font-semibold text-amber-400">
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

  useEffect(() => {
    if (selectedIds.length >= 2) setDetailNode(null);
  }, [selectedIds]);

  // Display nodes (capped + prioritised)
  const displayNodes = useMemo(
    () => (data ? selectDisplayNodes(data.nodes) : []),
    [data],
  );
  const hiddenCount = (data?.nodes.length ?? 0) - displayNodes.length;

  const sparse = useMemo(
    () =>
      data
        ? isSparseGraph(displayNodes, data.edges, data.semantic_degraded ?? false)
        : false,
    [data, displayNodes],
  );

  // Edges filtered to display nodes only
  const displayEdges = useMemo(() => {
    if (!data) return [];
    const ids = new Set(displayNodes.map((n) => n.id));
    return data.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [data, displayNodes]);

  // IDs connected to the focused node (for spotlight mode)
  const focusId = detailNode?.id ?? (selectedIds.length === 1 ? selectedIds[0] : null) ?? null;
  const connectedIds = useMemo<Set<string> | null>(() => {
    if (!focusId) return null;
    const connected = new Set<string>([focusId]);
    displayEdges.forEach((e) => {
      if (e.source === focusId) connected.add(e.target);
      if (e.target === focusId) connected.add(e.source);
    });
    return connected;
  }, [focusId, displayEdges]);

  // Simulation setup
  useEffect(() => {
    if (displayNodes.length === 0) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (sparse) {
      const positions = radialByKindPlacement(displayNodes);
      const nodes: SimNode[] = displayNodes.map((n, i) => ({
        id: n.id,
        x: positions[i]?.x ?? W / 2,
        y: positions[i]?.y ?? H / 2,
        vx: 0, vy: 0, ref: n,
      }));
      simNodesRef.current = nodes;
      alphaRef.current = 0;
      setSimNodes([...nodes]);
      return;
    }

    // Degree-sorted sunflower: most-connected nodes land near center,
    // isolated nodes at periphery → physics converges significantly faster
    const degree = new Map<string, number>();
    displayEdges.forEach((e) => {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    });
    const sortedForPlacement = [...displayNodes].sort(
      (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
    );
    const positions = sunflowerPlacement(sortedForPlacement.length);
    // Build nodes in degree order so high-degree nodes get center positions
    const nodesByDegree: SimNode[] = sortedForPlacement.map((n, i) => ({
      id: n.id,
      x: positions[i]?.x ?? W / 2,
      y: positions[i]?.y ?? H / 2,
      vx: 0, vy: 0, ref: n,
    }));

    const idIdx = new Map(nodesByDegree.map((n, i) => [n.id, i]));
    const edges = displayEdges.filter((e) => idIdx.has(e.source) && idIdx.has(e.target));

    // Tuned to match d3-force proportions for 60–80 nodes in 1600×900.
    // Warm-start runs 200 ticks sync so first render already shows a settled layout.
    const REPEL = 12000;
    const REPEL_MAX_D = 500;
    const SPRING_K = 0.05;
    const SPRING_LEN = 150;
    const DAMP = 0.60;        // closer to d3's velocityDecay=0.4 → faster convergence
    const ALPHA_DECAY = 0.978; // d3-like: reaches 0.004 in ~190 ticks
    const WARM_TICKS = 200;   // pre-run synchronously before first render
    const SUB_TICKS = 4;
    const RENDER_EVERY = 2;
    let frame = 0;

    function applyForces(ns: SimNode[], alpha: number) {
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
          a.vx -= nx2 * f; a.vy -= ny2 * f;
          b.vx += nx2 * f; b.vy += ny2 * f;
        }
      }
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
        a.vx += nx2 * f; a.vy += ny2 * f;
        b.vx -= nx2 * f; b.vy -= ny2 * f;
      }
      for (const n of ns) {
        const G = (KIND_GRAVITY[n.ref.kind] ?? 0) * alpha;
        n.vx += (W / 2 - n.x) * G;
        n.vy += (H / 2 - n.y) * G;
        n.vx *= DAMP; n.vy *= DAMP;
        n.x = Math.max(40, Math.min(W - 40, n.x + n.vx));
        n.y = Math.max(40, Math.min(H - 40, n.y + n.vy));
      }
    }

    // Warm-start: 200 silent ticks so the first frame shows a settled layout
    let alpha = 1.0;
    for (let t = 0; t < WARM_TICKS; t++) {
      for (let sub = 0; sub < SUB_TICKS; sub++) applyForces(nodesByDegree, alpha);
      alpha *= ALPHA_DECAY;
    }

    simNodesRef.current = nodesByDegree;
    alphaRef.current = alpha;
    setSimNodes([...nodesByDegree]); // first render: already settled

    function tick() {
      if (alphaRef.current < 0.004) return;
      const ns = simNodesRef.current;
      for (let sub = 0; sub < SUB_TICKS; sub++) applyForces(ns, alphaRef.current);
      alphaRef.current *= ALPHA_DECAY;
      frame++;
      if (frame % RENDER_EVERY === 0) setSimNodes([...ns]);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [displayNodes, displayEdges, sparse]);

  // Non-passive wheel for zoom
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const rect = el.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * W;
      const svgY = ((e.clientY - rect.top) / rect.height) * H;
      setViewTransform((prev) => {
        const newScale = Math.max(0.2, Math.min(8, prev.scale * factor));
        const cx = (svgX - prev.x) / prev.scale;
        const cy = (svgY - prev.y) / prev.scale;
        return { x: svgX - cx * newScale, y: svgY - cy * newScale, scale: newScale };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data]);

  const nodeById = useMemo(
    () => new Map(simNodes.map((n) => [n.id, n])),
    [simNodes],
  );

  // Z-ordering: conversation → daily → core (core renders on top)
  const orderedNodes = useMemo(() => {
    const order: Record<string, number> = { conversation: 0, daily: 1, core: 2 };
    return [...simNodes].sort(
      (a, b) => (order[a.ref.kind] ?? 0) - (order[b.ref.kind] ?? 0),
    );
  }, [simNodes]);

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
        const closing = detailNode?.id === sn.id;
        setDetailNode(closing ? null : sn.ref);
        onSelectionChange(closing ? [] : [sn.id]);
      }
    },
    [selectedIds, onSelectionChange, detailNode],
  );

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
    return {
      left: svgRect.left - containerRect.left + (svgViewX / W) * svgRect.width,
      top: svgRect.top - containerRect.top + (svgViewY / H) * svgRect.height,
    };
  }

  // ── Early returns ─────────────────────────────────────────────

  if (isLoading || (!data && !isError)) return null;

  if (isError || !data) {
    return (
      <div className="py-6 text-center text-sm text-zaki-muted">
        {t("brain.error.loadFailed")}
      </div>
    );
  }

  // Mobile: sorted list fallback
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

  const hoverNode = hoverId ? nodeById.get(hoverId) ?? null : null;
  const hoverPos = hoverNode && !detailNode ? tooltipPos(hoverNode) : null;

  return (
    <div ref={containerRef} className="relative" style={{ touchAction: "none" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full overflow-hidden rounded-zaki-xl ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ height: "72vh", minHeight: 480 }}
        role="img"
        aria-label={t("brain.graph.ariaLabel")}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={handleSvgPointerUp}
        onDoubleClick={handleSvgDoubleClick}
      >
        <defs>
          {/* Deep-space background */}
          <radialGradient id="brain-bg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#191210" />
            <stop offset="55%" stopColor="#0f0c0a" />
            <stop offset="100%" stopColor="#070503" />
          </radialGradient>

          {/* Bloom filters per kind */}
          <filter id="glow-core" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-daily" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* CSS: semantic edge flow + selection pulse */}
          <style>{`
            .brain-edge-flow { animation: brain-edge-flow 4s linear infinite; }
            @keyframes brain-edge-flow { to { stroke-dashoffset: -10; } }
            .brain-pulse { animation: brain-pulse 2.2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
            @keyframes brain-pulse { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:0.05; transform:scale(2.4); } }
          `}</style>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="url(#brain-bg)" />

        {/* HUD — hint text inside canvas, bottom-left */}
        <text
          x={20}
          y={H - 20}
          fontSize={11}
          fill="rgba(255,255,255,0.25)"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {t("brain.graph.selectHint")} · {t("brain.graph.fitToView")}
        </text>

        {/* Node count / hidden notice */}
        {hiddenCount > 0 && (
          <text
            x={20}
            y={30}
            fontSize={11}
            fill="rgba(255,255,255,0.3)"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {`Showing ${displayNodes.length} of ${data.nodes.length} memories`}
          </text>
        )}

        {/* Kind legend — bottom right */}
        <g transform={`translate(${W - 20}, ${H - 14})`} style={{ pointerEvents: "none" }}>
          {(["core", "daily", "conversation"] as const).map((kind, i) => (
            <g key={kind} transform={`translate(${-i * 95}, 0)`}>
              <circle r={5} fill={nodeColor(kind)} />
              <text
                x={9}
                fontSize={10}
                fill="rgba(255,255,255,0.35)"
                dominantBaseline="middle"
                style={{ userSelect: "none" }}
              >
                {t(`brain.graph.kindLabel.${kind}` as never, { defaultValue: kind })}
              </text>
            </g>
          ))}
        </g>

        {/* Selected node count badge */}
        {selectedIds.length > 0 && (
          <text
            x={W / 2}
            y={30}
            textAnchor="middle"
            fontSize={12}
            fill="rgba(241,2,2,0.9)"
            fontWeight="600"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {t("brain.graph.selected", { count: selectedIds.length })}
          </text>
        )}

        {/* Sparse notice */}
        {sparse && (
          <text
            x={W / 2}
            y={50}
            textAnchor="middle"
            fontSize={11}
            fill="rgba(245,158,11,0.7)"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {t("brain.graph.sparseNotice")}
          </text>
        )}

        <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>

          {/* Edges — rendered before nodes so nodes sit on top */}
          {displayEdges.map((e) => {
            const a = nodeById.get(e.source);
            const b = nodeById.get(e.target);
            if (!a || !b) return null;

            const opacity = computeEdgeOpacity(e, hoverId, focusId, connectedIds);
            // Semantic = blue-tinted, reference = warm gray, session = slate
            const stroke =
              e.type === "semantic" ? "#7b9fd4" : e.type === "reference" ? "#a89070" : "#8a8a9a";
            const isFlow = e.type === "semantic";

            if (e.type === "semantic") {
              const w = Math.max(0.7, Math.min(3, e.weight * 2.5));
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2 - 50;
              return (
                <path
                  key={`${e.source}:${e.target}:${e.type}`}
                  d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={opacity}
                  strokeWidth={w}
                  strokeDasharray="6 4"
                  className={isFlow ? "brain-edge-flow" : undefined}
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
                stroke={stroke}
                strokeOpacity={opacity}
                strokeWidth={0.9}
                strokeDasharray={e.type === "reference" ? "1 5" : undefined}
              />
            );
          })}

          {/* Nodes (ordered: conversation → daily → core) */}
          {orderedNodes.map((sn) => {
            const r = nodeRadius(sn.ref.kind);
            const isSelected = selectedIds.includes(sn.id);
            const isHovered = hoverId === sn.id;
            const isDeprecated = sn.ref.valid_to !== null;
            const isCore = sn.ref.kind === "core";
            const isDaily = sn.ref.kind === "daily";
            const glowId = isCore ? "glow-core" : isDaily ? "glow-daily" : "glow-soft";
            const showLabel = isCore || isHovered;
            // Dim unconnected nodes in spotlight mode
            const dimNode =
              connectedIds !== null && !connectedIds.has(sn.id) && sn.id !== focusId;

            return (
              <g
                key={sn.id}
                transform={`translate(${sn.x},${sn.y})`}
                onPointerDown={handleNodePointerDown}
                onDoubleClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setHoverId(sn.id)}
                onMouseLeave={() => setHoverId((h) => (h === sn.id ? null : h))}
                onClick={(e) => handleNodeClick(e, sn)}
                style={{
                  cursor: "pointer",
                  opacity: isDeprecated ? 0.35 : dimNode ? 0.15 : 1,
                  transition: "opacity 0.25s ease",
                }}
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
                {/* Selection pulse ring */}
                {isSelected && (
                  <circle r={r + 5} fill="none" stroke="#f10202" strokeWidth="1.5" className="brain-pulse" />
                )}

                {/* Glow halo */}
                <circle
                  r={r * 1.8}
                  fill={nodeGlowColor(sn.ref.kind)}
                  filter={`url(#${glowId})`}
                  style={{
                    transform: isHovered ? "scale(1.5)" : "scale(1)",
                    transformOrigin: "center",
                    transformBox: "fill-box",
                    transition: "transform 0.2s ease-out",
                  }}
                />

                {/* Core node */}
                <circle
                  r={r}
                  fill={nodeColor(sn.ref.kind)}
                  stroke={isSelected ? "#f10202" : isHovered ? "rgba(255,255,255,0.6)" : "transparent"}
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0}
                  style={{
                    transform: isHovered ? "scale(1.3)" : "scale(1)",
                    transformOrigin: "center",
                    transformBox: "fill-box",
                    transition: "transform 0.15s ease-out",
                  }}
                />

                {/* Label */}
                {showLabel && (
                  <text
                    y={r + 13}
                    textAnchor="middle"
                    fontSize={isCore ? 11 : 10}
                    fill={isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)"}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {truncateLabel(sn.ref.summary)}
                  </text>
                )}

                <title>{sn.ref.summary}</title>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip — glass card above node */}
      {hoverNode && hoverPos && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 max-w-[220px] -translate-x-1/2 -translate-y-full rounded-zaki-lg border border-white/10 bg-black/85 px-3 py-2 shadow-2xl backdrop-blur-xl"
          style={{ left: hoverPos.left, top: hoverPos.top - 12 }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: nodeColor(hoverNode.ref.kind) }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              {hoverNode.ref.kind}
            </span>
          </div>
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-white/90">
            {hoverNode.ref.summary}
          </p>
        </div>
      )}

      {/* Click detail panel — inset overlay on canvas right */}
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
    </div>
  );
}
