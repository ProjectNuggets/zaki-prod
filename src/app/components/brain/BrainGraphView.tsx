/**
 * BrainGraphView — Canvas 2D + d3-force
 *
 * Architecture: Canvas for rendering (60fps at 500+ nodes), d3-force for
 * physics (battle-tested: alphaDecay=0.0228, velocityDecay=0.4, forceCollide).
 * DOM overlays: tooltip, detail panel (positioned via containerRef).
 *
 * Rendering pipeline each RAF tick:
 *   clearRect → draw edges → draw nodes → draw labels → HUD
 *
 * Interaction: O(n) hit-test on mousemove (fine for ≤500 nodes), pointer
 * capture for drag-pan, non-passive wheel for zoom.
 */

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useBrainGraph, useBrainMemory, useBrainMemoryPrefetch } from "@/queries";
import type { BrainGraphEdge, BrainGraphNode, BrainMemoryDetail } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

interface Props {
  userId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  searchQuery?: string; // driven by BrainPage search bar
}

// d3-force requires mutable x/y — we extend the node ref
interface SimNode extends SimulationNodeDatum {
  id: string;
  ref: BrainGraphNode;
  r: number; // computed radius (importance-scaled)
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  edge: BrainGraphEdge;
}

interface ViewTransform { x: number; y: number; scale: number }

// ── Constants ─────────────────────────────────────────────────

const W = 1600;
const H = 900;
const BASE_R = { core: 14, daily: 8, conversation: 5 } as Record<string, number>;
const COLOR = { core: "#f10202", daily: "#22c55e", conversation: "#6b7280" } as Record<string, string>;
const GLOW  = { core: "rgba(241,2,2,0.35)", daily: "rgba(34,197,94,0.25)", conversation: "rgba(107,114,128,0.12)" } as Record<string, string>;
const EDGE_COLOR = { semantic: "#7b9fd4", reference: "#a89070", session: "#7a7a8a", typed: "#c084fc" } as Record<string, string>;

// ── Utilities ─────────────────────────────────────────────────

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" ? window.innerWidth < 640 : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

/** M1: Derive importance from edge degree until backend delivers importance_score */
function syntheticImportance(node: BrainGraphNode, degree: number, maxDegree: number): number {
  if (typeof node.importance_score === "number") return node.importance_score;
  if (maxDegree === 0) return 0;
  return degree / maxDegree;
}

/** Power-scale importance → radius (sqrt gives good mid-tier distinction) */
function importanceToRadius(kind: string, importance: number): number {
  const base = BASE_R[kind] ?? 5;
  return base + 10 * Math.sqrt(Math.max(0, Math.min(1, importance)));
}

function kindColor(kind: string): string { return COLOR[kind] ?? "#6b7280"; }
function kindGlow(kind: string): string  { return GLOW[kind]  ?? "rgba(107,114,128,0.12)"; }

function isSparse(nodes: BrainGraphNode[], edges: BrainGraphEdge[], degraded: boolean) {
  if (degraded) return true;
  return edges.filter(e => e.type === "semantic").length < nodes.length / 4;
}

function truncate(s: string, n: number) { return s.length <= n ? s : s.slice(0, n - 1) + "…"; }

function matchesSearch(node: BrainGraphNode, q: string) {
  if (!q) return true;
  return node.summary.toLowerCase().includes(q.toLowerCase());
}

// ── Detail Panel ──────────────────────────────────────────────

interface DetailPanelProps {
  node: BrainGraphNode;
  detail: BrainMemoryDetail | null;
  loading: boolean;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}

function DetailPanel({ node, detail, loading, onClose, t }: DetailPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const color = kindColor(node.kind);
  const isDeprecated = node.valid_to !== null;

  // Use M3 full content when available, fall back to graph-node summary
  const content = detail?.content ?? node.summary;
  const importance = detail?.importance_score;
  const confidence = detail?.confidence_score;
  const source = detail?.source;
  const linked = detail?.linked_memories ?? [];
  const history = detail?.valid_history ?? [];

  const linkTypeColor: Record<string, string> = {
    updates: "bg-blue-500/15 text-blue-400",
    extends: "bg-green-500/15 text-green-400",
    derives: "bg-purple-500/15 text-purple-400",
    contradicts: "bg-red-500/15 text-red-400",
  };

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-72 flex-col border-l border-white/10 bg-black/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          {t(`brain.graph.kindLabel.${node.kind}` as never, { defaultValue: node.kind })}
        </span>
        <div className="flex items-center gap-2">
          {typeof importance === "number" && (
            <div className="flex items-center gap-1" title={`Importance: ${(importance * 100).toFixed(0)}%`}>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#f10202]" style={{ width: `${importance * 100}%` }} />
              </div>
            </div>
          )}
          <button type="button" onClick={onClose} className="rounded-full p-1 text-white/40 transition-colors hover:text-white" aria-label={t("brain.graph.detail.close")}>
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && !detail ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-white/10" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-white/10" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-white/90">{content}</p>
        )}

        {/* Source attribution — M4 */}
        {source && (
          <div className="mt-4 rounded-zaki-md border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t("brain.graph.detail.source")}
            </p>
            <p className="mt-1 text-[11px] text-white/60">
              {new Date(source.timestamp * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {source.snippet && (
              <p className="mt-1 line-clamp-2 text-[11px] italic text-white/50">"{source.snippet}"</p>
            )}
          </div>
        )}

        {/* Linked memories — M3 */}
        {linked.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t("brain.graph.detail.linked")}
            </p>
            <div className="space-y-1.5">
              {linked.map((lm, i) => (
                <div key={i} className="flex items-start gap-2 rounded-zaki-md bg-white/5 px-2.5 py-2">
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${linkTypeColor[lm.link_type] ?? "bg-white/10 text-white/50"}`}>
                    {lm.link_type}
                  </span>
                  <p className="line-clamp-2 text-[11px] text-white/70">{lm.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Valid history — collapsible */}
        {history.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setHistoryOpen(o => !o)}
              className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60"
            >
              {t("brain.graph.detail.priorVersions", { count: history.length })}
              {historyOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {historyOpen && (
              <div className="mt-2 space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="rounded-zaki-md border border-white/10 bg-white/5 px-2.5 py-2">
                    <p className="mb-1 text-[10px] text-white/40">
                      {new Date(h.valid_from * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {h.valid_to ? ` → ${new Date(h.valid_to * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                    </p>
                    <p className="text-[11px] text-white/60">{h.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3 text-[11px] text-white/40">
        <div className="flex items-center justify-between">
          <span>{t("brain.graph.detail.saved")}</span>
          <span className="font-medium text-white/70">
            {new Date(node.created_at * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        {node.session_id && (
          <div className="mt-1 flex items-center justify-between">
            <span>{t("brain.graph.detail.session")}</span>
            <span className="font-mono text-[10px] text-white/60" title={node.session_id}>…{node.session_id.slice(-8)}</span>
          </div>
        )}
        {typeof confidence === "number" && (
          <div className="mt-1 flex items-center justify-between">
            <span>{t("brain.graph.detail.confidence")}</span>
            <span className="font-medium text-white/70">{(confidence * 100).toFixed(0)}%</span>
          </div>
        )}
        {isDeprecated && (
          <div className="mt-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-center text-[10px] font-semibold text-amber-400">
            {t("brain.graph.superseded")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BrainGraphView ────────────────────────────────────────────

export function BrainGraphView({ userId, selectedIds, onSelectionChange, searchQuery = "" }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useBrainGraph(userId);
  const isMobile = useIsMobile();

  // Canvas + container refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number | null>(null);

  // d3 simulation ref — stable across renders
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);

  // Interaction state
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const viewTransformRef = useRef<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const hoveredNodeRef = useRef<SimNode | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ cx: number; cy: number; vt: ViewTransform } | null>(null);
  const didDragRef   = useRef(false);

  // Keep refs in sync with state for use in canvas render loop
  useEffect(() => { viewTransformRef.current = viewTransform; }, [viewTransform]);
  useEffect(() => { hoveredNodeRef.current = hoveredNode; }, [hoveredNode]);

  // M3 drilldown
  const detailNode = useMemo(
    () => simNodesRef.current.find(n => n.id === detailNodeId)?.ref ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailNodeId, simNodesRef.current.length],
  );
  const { data: memoryDetail, isLoading: memoryLoading } = useBrainMemory(userId, detailNodeId);
  const prefetchMemory = useBrainMemoryPrefetch(userId);

  // Focus set for spotlight rendering
  const focusId = detailNodeId ?? (selectedIds.length === 1 ? selectedIds[0] : null);
  const connectedIds = useMemo<Set<string> | null>(() => {
    if (!focusId || !simLinksRef.current.length) return null;
    const s = new Set<string>([focusId]);
    simLinksRef.current.forEach(l => {
      const src = (l.source as SimNode).id;
      const tgt = (l.target as SimNode).id;
      if (src === focusId) s.add(tgt);
      if (tgt === focusId) s.add(src);
    });
    return s;
  }, [focusId]);

  // Close detail when compose modal takes over
  useEffect(() => {
    if (selectedIds.length >= 2) setDetailNodeId(null);
  }, [selectedIds]);

  // ── d3-force simulation setup ────────────────────────────────

  useEffect(() => {
    if (!data || data.nodes.length === 0) return;

    // Cancel any running RAF
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    const sparse = isSparse(data.nodes, data.edges, data.semantic_degraded ?? false);

    // S2: Load persisted node positions from localStorage (keyed by userId)
    const POSITIONS_KEY = `brain-graph-positions-${userId}`;
    const savedPositions = (() => {
      try {
        const raw = localStorage.getItem(POSITIONS_KEY);
        if (!raw) return null;
        const arr = JSON.parse(raw) as Array<{ id: string; x: number; y: number }>;
        return new Map(arr.map(p => [p.id, { x: p.x, y: p.y }]));
      } catch { return null; }
    })();

    // Build degree map for M1 synthetic importance + initial placement sort
    const degree = new Map<string, number>();
    data.edges.forEach(e => {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    });
    const maxDegree = Math.max(1, ...degree.values());

    // Sort by degree desc so high-connectivity nodes get center sunflower positions
    const sorted = [...data.nodes].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));

    // Initial placement
    const cx = W / 2, cy = H / 2;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    const maxR = Math.min(W, H) / 2 - 80;

    const nodes: SimNode[] = sorted.map((n, i) => {
      const imp = syntheticImportance(n, degree.get(n.id) ?? 0, maxDegree);
      const r = importanceToRadius(n.kind, imp);

      // S2: prefer persisted position; fall back to physics initial placement
      const saved = savedPositions?.get(n.id);

      let x: number, y: number;
      if (saved) {
        x = saved.x; y = saved.y;
      } else if (sparse) {
        // Radial by kind
        const radii: Record<string, number> = { core: 100, daily: 260, conversation: 420 };
        const kindNodes = sorted.filter(m => m.kind === n.kind);
        const ki = kindNodes.indexOf(n);
        const kr = radii[n.kind] ?? 420;
        const angle = (ki / Math.max(kindNodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
        x = cx + kr * Math.cos(angle);
        y = cy + kr * Math.sin(angle);
      } else {
        // Sunflower spiral (degree-sorted → connected nodes near center)
        const spiralR = maxR * Math.sqrt((i + 0.5) / sorted.length);
        const theta = i * GOLDEN;
        x = cx + spiralR * Math.cos(theta);
        y = cy + spiralR * Math.sin(theta);
      }

      return { id: n.id, ref: n, r, x, y, vx: 0, vy: 0 };
    });

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    const links: SimLink[] = data.edges
      .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
      .map(e => ({ source: nodeById.get(e.source)!, target: nodeById.get(e.target)!, edge: e }));

    simNodesRef.current = nodes;
    simLinksRef.current = links;

    if (simRef.current) simRef.current.stop();

    if (sparse) {
      // Radial layout is static — no simulation needed
      draw();
      return;
    }

    // d3-force: battle-tested constants + custom per-kind gravity
    const sim = forceSimulation<SimNode, SimLink>(nodes)
      .force("charge", forceManyBody<SimNode>().strength(n => {
        // Stronger repulsion for larger nodes
        return -180 - n.r * 12;
      }))
      .force("link", forceLink<SimNode, SimLink>(links)
        .id(n => n.id)
        .distance(l => {
          const a = l.source as SimNode;
          const b = l.target as SimNode;
          return 100 + a.r + b.r;
        })
        .strength(0.4))
      .force("collide", forceCollide<SimNode>().radius(n => n.r + 6).strength(0.8))
      .force("center", forceCenter(cx, cy).strength(0.04))
      .force("kindGravity", (alpha: number) => {
        // Per-kind pull toward center: core strong, daily mild, conversation free
        const G: Record<string, number> = { core: 0.08, daily: 0.015, conversation: 0 };
        nodes.forEach(n => {
          const g = (G[n.ref.kind] ?? 0) * alpha;
          if (g === 0) return;
          n.vx = (n.vx ?? 0) + (cx - (n.x ?? cx)) * g;
          n.vy = (n.vy ?? 0) + (cy - (n.y ?? cy)) * g;
        });
      })
      .alphaDecay(0.0228)    // d3 default — ~300 ticks to convergence
      .velocityDecay(0.4)    // d3 default — good damping
      .alphaMin(0.001);

    simRef.current = sim;

    // Warm-start: run 200 ticks silently so first frame shows settled layout
    sim.tick(200);
    simNodesRef.current = [...nodes]; // snapshot after warm-start

    // RAF render + simulation tick loop
    let frame = 0;
    let positionsSaved = !!savedPositions; // skip initial save if we just restored
    function savePositions() {
      try {
        const payload = nodes.map(n => ({ id: n.id, x: Math.round(n.x ?? 0), y: Math.round(n.y ?? 0) }));
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(payload));
      } catch { /* storage quota exceeded — ignore */ }
    }
    function loop() {
      if (sim.alpha() > sim.alphaMin()) {
        sim.tick();
        simNodesRef.current = [...nodes];
        positionsSaved = false;
      } else if (!positionsSaved) {
        // Simulation settled — persist final layout (S2)
        positionsSaved = true;
        savePositions();
      }
      draw();
      if (++frame % 60 === 0) {
        // S1 idle prefetch: every ~1s, prefetch M3 for nodes near cursor
        const vt = viewTransformRef.current;
        const visible = simNodesRef.current.filter(n => {
          const sx = (n.x ?? 0) * vt.scale + vt.x;
          const sy = (n.y ?? 0) * vt.scale + vt.y;
          return sx >= -50 && sx <= W + 50 && sy >= -50 && sy <= H + 50;
        }).slice(0, 10);
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(() => prefetchMemory(visible.map(n => ({ id: n.id }))));
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      sim.stop();
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      // S2: persist on unmount so positions survive navigation away
      savePositions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Canvas draw ───────────────────────────────────────────────

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const vt = viewTransformRef.current;
    const hovered = hoveredNodeRef.current;
    const nodes = simNodesRef.current;
    const links = simLinksRef.current;
    const dpr = window.devicePixelRatio || 1;
    const scaleX = (width / dpr) / W;
    const scaleY = (height / dpr) / H;

    // Background — deep-space gradient via simple fill (gradient is static)
    ctx.fillStyle = "#0d0a08";
    ctx.fillRect(0, 0, width, height);

    // Apply viewport transform
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(vt.x * scaleX * W / W, vt.y * scaleY * H / H);
    ctx.scale(vt.scale, vt.scale);
    ctx.scale(scaleX, scaleY);

    // Determine edge opacity based on interaction state
    function edgeOpacity(link: SimLink): number {
      const src = (link.source as SimNode).id;
      const tgt = (link.target as SimNode).id;
      if (connectedIds) {
        return (connectedIds.has(src) && connectedIds.has(tgt)) ? 0.85 : 0.04;
      }
      if (hovered) {
        const hid = hovered.id;
        return (src === hid || tgt === hid) ? 0.72 : 0.05;
      }
      // Search filter
      if (searchQuery) {
        const srcMatch = matchesSearch(nodes.find(n => n.id === src)?.ref ?? { summary: "" } as BrainGraphNode, searchQuery);
        const tgtMatch = matchesSearch(nodes.find(n => n.id === tgt)?.ref ?? { summary: "" } as BrainGraphNode, searchQuery);
        if (srcMatch && tgtMatch) return 0.5;
        if (srcMatch || tgtMatch) return 0.12;
        return 0.03;
      }
      return link.edge.type === "semantic" ? 0.28 : 0.16;
    }

    // Draw edges
    links.forEach(link => {
      const a = link.source as SimNode;
      const b = link.target as SimNode;
      if (a.x == null || a.y == null || b.x == null || b.y == null) return;
      const opacity = edgeOpacity(link);
      const stroke = EDGE_COLOR[link.edge.type] ?? "#7a7a8a";
      const w = link.edge.type === "semantic" && "weight" in link.edge
        ? Math.max(0.6, Math.min(3, link.edge.weight * 2))
        : 0.8;

      ctx.globalAlpha = opacity;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = w;

      if (link.edge.type === "semantic") {
        // Curved quadratic bezier
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - 40;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (link.edge.type === "reference") {
        ctx.setLineDash([1, 5]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // Z-order: conversation → daily → core on top
    const order: Record<string, number> = { conversation: 0, daily: 1, core: 2 };
    const sorted = [...nodes].sort((a, b) => (order[a.ref.kind] ?? 0) - (order[b.ref.kind] ?? 0));

    sorted.forEach(node => {
      if (node.x == null || node.y == null) return;
      const { x, y, r } = node;
      const color = kindColor(node.ref.kind);
      const glow = kindGlow(node.ref.kind);
      const isSelected = selectedIds.includes(node.id);
      const isHovered = hovered?.id === node.id;
      const isDeprecated = node.ref.valid_to !== null;
      const isFocused = focusId === node.id;
      const isDimmed = connectedIds ? !connectedIds.has(node.id) : false;
      const searchActive = !!searchQuery;
      const matchesQ = matchesSearch(node.ref, searchQuery);

      // Node opacity
      let alpha = 1;
      if (isDeprecated) alpha = 0.35;
      else if (isDimmed) alpha = 0.12;
      else if (searchActive && !matchesQ) alpha = 0.15;
      ctx.globalAlpha = alpha;

      // Glow halo via shadowBlur
      const glowR = isHovered ? r * 2.2 : r * 1.6;
      ctx.shadowColor = glow;
      ctx.shadowBlur = isHovered ? 28 : (node.ref.kind === "core" ? 18 : 10);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Selection pulse ring — drawn as extra outer circle
      if (isSelected || isFocused) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#f10202";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7 * alpha;
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Main node circle
      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? r * 1.25 : r, 0, Math.PI * 2);
      ctx.fill();

      // Hover ring
      if (isHovered) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Search match pulse ring
      if (searchActive && matchesQ) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Node label: always for core, on hover for others
      if (node.ref.kind === "core" || isHovered) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)";
        ctx.font = `${node.ref.kind === "core" ? 11 : 10}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(truncate(node.ref.summary, 24), x, y + r + 4);
      }

      // S4: Backlinks on hover — incoming edge count from links
      if (isHovered) {
        const incoming = links.filter(l => (l.target as SimNode).id === node.id).length;
        if (incoming > 0) {
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(`← ${incoming}`, x, y + r + 18);
        }
      }
    });

    ctx.restore();

    // HUD — drawn in screen space (no viewport transform)
    ctx.save();
    ctx.scale(dpr, dpr);
    const hw = width / dpr, hh = height / dpr;

    // Bottom-left: hint
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${t("brain.graph.selectHint")} · ${t("brain.graph.fitToView")}`, 16, hh - 14);

    // Bottom-right: legend
    const kinds = ["core", "daily", "conversation"] as const;
    let lx = hw - 14;
    kinds.forEach(k => {
      const label = t(`brain.graph.kindLabel.${k}` as never, { defaultValue: k });
      ctx.font = "10px system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      lx -= tw + 20;
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, lx + 12, hh - 14);
      ctx.fillStyle = kindColor(k);
      ctx.beginPath();
      ctx.arc(lx + 5, hh - 20, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Top: selected count or search result count
    if (selectedIds.length > 0) {
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(241,2,2,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(t("brain.graph.selected", { count: selectedIds.length }), hw / 2, 14);
    }

    ctx.restore();
  }

  // ── Non-passive wheel for zoom ────────────────────────────────

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const rect = el.getBoundingClientRect();
      // Convert cursor to canvas logical space
      const cx = ((e.clientX - rect.left) / rect.width) * W;
      const cy = ((e.clientY - rect.top) / rect.height) * H;
      setViewTransform(prev => {
        const s = Math.max(0.2, Math.min(8, prev.scale * factor));
        return {
          x: cx - (cx - prev.x) * (s / prev.scale),
          y: cy - (cy - prev.y) * (s / prev.scale),
          scale: s,
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Pointer interaction ───────────────────────────────────────

  const hitTest = useCallback((clientX: number, clientY: number): SimNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const vt = viewTransformRef.current;
    // Convert client → simulation space
    const sx = ((clientX - rect.left) / rect.width) * W;
    const sy = ((clientY - rect.top) / rect.height) * H;
    const simX = (sx - vt.x) / vt.scale;
    const simY = (sy - vt.y) / vt.scale;
    let best: SimNode | null = null;
    let bestD = Infinity;
    simNodesRef.current.forEach(n => {
      if (n.x == null || n.y == null) return;
      const d = Math.hypot(simX - n.x, simY - n.y);
      if (d < n.r + 8 && d < bestD) { best = n; bestD = d; }
    });
    return best;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    didDragRef.current = false;
    dragStartRef.current = { cx: e.clientX, cy: e.clientY, vt: { ...viewTransformRef.current } };
    setIsPanning(true);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Hover hit-test
    const hit = hitTest(e.clientX, e.clientY);
    if (hit?.id !== hoveredNodeRef.current?.id) {
      setHoveredNode(hit);
    }
    // Pan
    if (!dragStartRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - dragStartRef.current.cx) * (W / rect.width);
    const dy = (e.clientY - dragStartRef.current.cy) * (H / rect.height);
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
    if (!didDragRef.current) return;
    setViewTransform({
      ...dragStartRef.current.vt,
      x: dragStartRef.current.vt.x + dx,
      y: dragStartRef.current.vt.y + dy,
    });
  }, [hitTest]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!didDragRef.current) {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) {
        if (e.shiftKey) {
          onSelectionChange(selectedIds.includes(hit.id) ? selectedIds.filter(x => x !== hit.id) : [...selectedIds, hit.id]);
        } else {
          const closing = detailNodeId === hit.id;
          setDetailNodeId(closing ? null : hit.id);
          onSelectionChange(closing ? [] : [hit.id]);
        }
      } else {
        // Click on empty space — deselect
        setDetailNodeId(null);
        onSelectionChange([]);
      }
    }
    dragStartRef.current = null;
    setIsPanning(false);
  }, [hitTest, selectedIds, onSelectionChange, detailNodeId]);

  const handleDoubleClick = useCallback(() => {
    setViewTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  // Re-draw whenever interaction state changes
  useEffect(() => { draw(); });

  // ── Canvas sizing (DPR-aware) ─────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tooltip position ──────────────────────────────────────────

  function tooltipPos(node: SimNode): { left: number; top: number } | null {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || node.x == null || node.y == null) return null;
    const cr = canvas.getBoundingClientRect();
    const ctr = container.getBoundingClientRect();
    const vt = viewTransformRef.current;
    const sx = (node.x * vt.scale + vt.x) * (cr.width / W);
    const sy = (node.y * vt.scale + vt.y) * (cr.height / H);
    return { left: cr.left - ctr.left + sx, top: cr.top - ctr.top + sy };
  }

  // ── Early returns ─────────────────────────────────────────────

  if (isLoading || (!data && !isError)) return null;
  if (isError || !data) {
    return <div className="py-6 text-center text-sm text-zaki-muted">{t("brain.error.loadFailed")}</div>;
  }

  // Mobile: list fallback
  if (isMobile) {
    const sorted = [...data.nodes].sort((a, b) => b.created_at - a.created_at);
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-zaki-text">{t("brain.graph.mobileTitle")}</h3>
        <ul className="space-y-2">
          {sorted.map(n => (
            <li key={n.id} className={`rounded-zaki-lg bg-zaki-raised p-3 ${n.valid_to !== null ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zaki-muted">
                <span style={{ color: kindColor(n.kind) }}>●</span>
                <span>{t(`brain.graph.kindLabel.${n.kind}` as never, { defaultValue: n.kind })}</span>
                {n.valid_to !== null && <span className="rounded-full bg-zaki-base px-1.5 py-0.5">{t("brain.graph.superseded")}</span>}
              </div>
              <p className="mt-1 text-sm text-zaki-text">{n.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const hoverPos = hoveredNode && !detailNodeId ? tooltipPos(hoveredNode) : null;

  return (
    <div ref={containerRef} className="relative" style={{ touchAction: "none" }}>
      <canvas
        ref={canvasRef}
        className={`w-full rounded-zaki-xl ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ height: "72vh", minHeight: 480, display: "block" }}
        aria-label={t("brain.graph.ariaLabel")}
        role="img"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      />

      {/* Hover tooltip */}
      {hoveredNode && hoverPos && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 max-w-[220px] -translate-x-1/2 -translate-y-full rounded-zaki-lg border border-white/10 bg-black/85 px-3 py-2 shadow-2xl backdrop-blur-xl"
          style={{ left: hoverPos.left, top: hoverPos.top - 12 }}
        >
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: kindColor(hoveredNode.ref.kind) }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{hoveredNode.ref.kind}</span>
            {hoveredNode.ref.source_snippet && (
              <span className="ml-auto text-[9px] text-white/30">{t("brain.graph.detail.source")}</span>
            )}
          </div>
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-white/90">{hoveredNode.ref.summary}</p>
          {hoveredNode.ref.source_snippet && (
            <p className="mt-1 line-clamp-1 text-[10px] italic text-white/40">"{hoveredNode.ref.source_snippet}"</p>
          )}
        </div>
      )}

      {/* M3 Detail panel — full drilldown */}
      {detailNodeId && detailNode && (
        <DetailPanel
          node={detailNode}
          detail={memoryDetail ?? null}
          loading={memoryLoading}
          onClose={() => { setDetailNodeId(null); onSelectionChange([]); }}
          t={t}
        />
      )}
    </div>
  );
}
