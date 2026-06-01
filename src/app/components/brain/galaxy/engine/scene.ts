import { Color, PerspectiveCamera, Scene, WebGLRenderer } from "three";

export interface SceneBundle {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  dispose(): void;
}

// Stand up the core Three.js scene bound to a canvas. Returns null when no
// WebGL context is available (headless / unsupported) so callers can fall back.
export function createScene(canvas: HTMLCanvasElement): SceneBundle | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(60, 1, 0.1, 8000);
  camera.position.set(0, 0, 1200);

  return {
    renderer,
    scene,
    camera,
    dispose() {
      renderer.dispose();
    },
  };
}

export interface ResolvedColor {
  color: Color;
  alpha: number;
}

// Resolve a CSS custom property (e.g. "--g-edge") to a Three Color + alpha so
// the engine stays token-driven (BRAND_LAW: no hardcoded hex). Handles
// rgb()/rgba()/hex/named; alpha defaults to 1.
export function readCssColor(varName: string, fallback: string): ResolvedColor {
  let raw = fallback;
  if (typeof window !== "undefined" && typeof getComputedStyle === "function") {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (value) raw = value;
  }
  return parseCssColor(raw, fallback);
}

export function parseCssColor(raw: string, fallback: string): ResolvedColor {
  const match = raw.match(/rgba?\(([^)]+)\)/i);
  if (match && match[1]) {
    const parts = match[1].split(",").map((s) => Number.parseFloat(s.trim()));
    const r = parts[0] ?? 0;
    const g = parts[1] ?? 0;
    const b = parts[2] ?? 0;
    const a = parts[3];
    return {
      color: new Color(r / 255, g / 255, b / 255),
      alpha: typeof a === "number" && Number.isFinite(a) ? a : 1,
    };
  }
  try {
    return { color: new Color(raw), alpha: 1 };
  } catch {
    return { color: new Color(fallback), alpha: 1 };
  }
}
