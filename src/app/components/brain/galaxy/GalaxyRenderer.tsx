import { useEffect, useRef } from "react";
import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { GraphRendererOptions, RenderModel } from "./engine/interface";

export interface GalaxyRendererProps {
  model: RenderModel;
  options: GraphRendererOptions;
  className?: string;
}

// P0 skeleton: stands up a Three.js scene bound to a canvas, sizes it to its
// container, and disposes cleanly on unmount. Node fields, edge filaments, and
// post-processing (bloom/nebula) are layered in P1–P2. Dependency-light on
// purpose — core `three` only; jsm post-fx arrives in P2. Mocked in jsdom
// tests (no WebGL there); if WebGL is unavailable at runtime it no-ops and the
// Tactical/list fallback covers the surface.
export function GalaxyRenderer({ model, options, className }: GalaxyRendererProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return; // No WebGL context (headless/unsupported) — fallback handles it.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new Scene();
    const camera = new PerspectiveCamera(60, 1, 0.1, 6000);
    camera.position.set(0, 0, 1200);

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    return () => {
      observer.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={className}
      data-testid="brain-graph-canvas-wrap"
      data-view={options.view}
      data-node-count={model.nodes.length}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

export default GalaxyRenderer;
