import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createGalaxyEngine } from "./engine/galaxyEngine";
import { isWebGLAvailable } from "./engine/scene";
import type { GraphRenderer, GraphRendererOptions, RenderModel } from "./engine/interface";

export interface GalaxyRendererProps {
  model: RenderModel;
  options: GraphRendererOptions;
  className?: string;
}

/** Imperative controls surfaced to the display panel's canvas buttons. */
export interface GalaxyHandle {
  fit(): void;
  relayout(): void;
}

// React wrapper that owns one GraphRenderer engine instance bound to a canvas.
// React owns data + state; the engine owns pixels. The engine is created once
// on mount; model/options changes are pushed imperatively (no scene teardown),
// and a ResizeObserver keeps the drawing buffer in sync with the container.
// Mocked in jsdom tests (no WebGL there); if WebGL is unavailable the engine
// is a no-op and the Tactical/list fallback covers the surface.
export const GalaxyRenderer = forwardRef<GalaxyHandle, GalaxyRendererProps>(function GalaxyRenderer(
  { model, options, className },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GraphRenderer | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // Detect WebGL once; if unavailable, render a fallback instead of a blank
  // canvas (no-GPU / disabled / context-exhausted environments).
  const [webglOk] = useState(() => isWebGLAvailable());

  useImperativeHandle(
    ref,
    () => ({
      fit: () => engineRef.current?.fit(),
      relayout: () => engineRef.current?.relayout(),
    }),
    [],
  );

  useEffect(() => {
    if (!webglOk) return;
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

  if (!webglOk) {
    return (
      <div
        className={className}
        data-testid="brain-graph-canvas-wrap"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          justifyItems: "center",
          alignItems: "start",
          padding: "72px 24px 24px",
        }}
      >
        <div className="zaki-galaxy-fallback" role="status">
          <p className="zaki-galaxy-fallback__title">The 3D graph needs WebGL</p>
          <p className="zaki-galaxy-fallback__body">
            Your browser or device doesn’t have WebGL (3D graphics) available. Everything else —
            your themes, timeline, and memories — is in the overview below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={className}
      data-testid="brain-graph-canvas-wrap"
      data-view={options.view}
      data-node-count={model.nodes.length}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* The canvas is a decorative render of data that's also reachable as DOM
          (search count, hover brief, detail panel, Home list). Hide it from the
          a11y tree rather than expose an unnavigable pixel surface. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
});

export default GalaxyRenderer;
