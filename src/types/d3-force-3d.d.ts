// Type shim for `d3-force-3d` (the package ships no bundled .d.ts).
//
// d3-force-3d mirrors d3-force's API in three dimensions: simulation nodes
// gain z/vz/fz and forceCenter/forceZ operate in 3D. We declare only the
// surface the Galaxy renderer uses and keep node/link shapes permissive —
// the layout is numeric and validated at runtime. Kept deliberately small so
// it tracks our usage rather than the full upstream API.
declare module "d3-force-3d" {
  export interface SimulationNode {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
    [key: string]: unknown;
  }

  export interface SimulationLink<N = SimulationNode> {
    source: number | string | N;
    target: number | string | N;
    index?: number;
    [key: string]: unknown;
  }

  export interface Force<N = SimulationNode> {
    (alpha?: number): void;
    initialize?(nodes: N[], ...args: unknown[]): void;
  }

  export interface Simulation<N = SimulationNode, L = SimulationLink<N>> {
    nodes(): N[];
    nodes(nodes: N[]): this;
    force(name: string): Force<N> | undefined;
    force(name: string, force: Force<N> | null): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaTarget(): number;
    alphaTarget(target: number): this;
    alphaDecay(decay: number): this;
    alphaMin(min: number): this;
    velocityDecay(decay: number): this;
    numDimensions(n: number): this;
    restart(): this;
    stop(): this;
    tick(iterations?: number): this;
    on(typenames: string, listener: ((this: Simulation<N, L>) => void) | null): this;
    on(typenames: string): ((this: Simulation<N, L>) => void) | undefined;
    find(x: number, y: number, z?: number, radius?: number): N | undefined;
  }

  export function forceSimulation<N = SimulationNode>(
    nodes?: N[],
    numDimensions?: number,
  ): Simulation<N>;

  export interface LinkForce<N = SimulationNode, L = SimulationLink<N>> extends Force<N> {
    links(): L[];
    links(links: L[]): this;
    id(id: (node: N, i: number, nodes: N[]) => string | number): this;
    distance(distance: number | ((link: L, i: number, links: L[]) => number)): this;
    strength(strength: number | ((link: L, i: number, links: L[]) => number)): this;
    iterations(n: number): this;
  }
  export function forceLink<N = SimulationNode, L = SimulationLink<N>>(links?: L[]): LinkForce<N, L>;

  export interface ManyBodyForce<N = SimulationNode> extends Force<N> {
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): this;
    theta(theta: number): this;
    distanceMin(distance: number): this;
    distanceMax(distance: number): this;
  }
  export function forceManyBody<N = SimulationNode>(): ManyBodyForce<N>;

  export interface CenterForce<N = SimulationNode> extends Force<N> {
    x(x: number): this;
    y(y: number): this;
    z(z: number): this;
    strength(s: number): this;
  }
  export function forceCenter<N = SimulationNode>(x?: number, y?: number, z?: number): CenterForce<N>;

  export interface PositionForce<N = SimulationNode> extends Force<N> {
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): this;
  }
  export function forceX<N = SimulationNode>(
    x?: number | ((node: N, i: number, nodes: N[]) => number),
  ): PositionForce<N>;
  export function forceY<N = SimulationNode>(
    y?: number | ((node: N, i: number, nodes: N[]) => number),
  ): PositionForce<N>;
  export function forceZ<N = SimulationNode>(
    z?: number | ((node: N, i: number, nodes: N[]) => number),
  ): PositionForce<N>;

  export interface CollideForce<N = SimulationNode> extends Force<N> {
    radius(radius: number | ((node: N, i: number, nodes: N[]) => number)): this;
    strength(strength: number): this;
    iterations(iterations: number): this;
  }
  export function forceCollide<N = SimulationNode>(
    radius?: number | ((node: N, i: number, nodes: N[]) => number),
  ): CollideForce<N>;
}
