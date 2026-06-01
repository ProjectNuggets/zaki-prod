import { useEffect, useRef } from "react";
import { createGalaxyEngine } from "./engine/galaxyEngine";
import type { GraphRenderer, GraphRendererOptions, RenderModel } from "./engine/interface";

export interface GalaxyRendererProps {
  model: RenderModel;
  options: GraphRendererOptions;
  className?: string;
}

// React wrapper that owns one GraphRenderer engine instance bound to a canvas.
// React owns data + state; the engine owns pixels. The engine is created once
// on mount; model/options changes are pushed imperatively (no scene teardown),
// and a ResizeObserver keeps the drawing buffer in sync with the container.
// Mocked in jsdom tests (no WebGL there); if WebGL is unavailable the engine
// is a no-op and the Tactical/list fallback covers the surface.
export function GalaxyRenderer({ model, options, className }: GalaxyRendererProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GraphRenderer | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const engine = createGalaxyEngine(canvas, optionsRef.current);
    engineRef.current = engine;

    const applySize = () => {
      engine.resize(wrap.clientWidth, wrap.clientHeight);
    };
    applySize();
    engine.setModel(model);
    applySize();

    const observer = new ResizeObserver(applySize);
    observer.observe(wrap);

    return () => {
      observer.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
    // Engine is created once; model/options are synced by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setModel(model);
  }, [model]);

  useEffect(() => {
    engineRef.current?.setOptions(options);
  }, [options]);

  return (
    <div
      ref={wrapRef}
      className={className}
      data-testid="brain-graph-canvas-wrap"
      data-view={options.view}
      data-node-count={model.nodes.length}
      style={{ position: "absolute", inset: 0 }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

export default GalaxyRenderer;
