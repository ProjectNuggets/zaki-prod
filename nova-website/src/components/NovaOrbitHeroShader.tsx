import { useEffect, useRef } from "react";

const vertexSource = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_time;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 rawUv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 uv = vec2(rawUv.x * aspect, rawUv.y);
    vec2 pointer = vec2(u_pointer.x * aspect, u_pointer.y);

    float structure = smoothstep(0.12 * aspect, 0.88 * aspect, uv.x);
    float drift = u_time * 0.075;
    float curve = sin(uv.x * 2.15 + drift) * 0.035;

    float laneOne = 1.0 - smoothstep(0.0, 0.016, abs(uv.y - (0.25 + curve)));
    float laneTwo = 1.0 - smoothstep(0.0, 0.012, abs(uv.y - (0.48 - curve * 0.7)));
    float laneThree = 1.0 - smoothstep(0.0, 0.018, abs(uv.y - (0.72 + curve * 0.5)));
    float lanes = max(laneOne * 0.72, max(laneTwo, laneThree * 0.58));

    vec2 scatterCell = floor(vec2(rawUv.x * 54.0, rawUv.y * 34.0));
    float scatter = step(0.965, hash(scatterCell + floor(u_time * 0.24)));
    scatter *= 1.0 - structure;

    float pointerDistance = length(uv - pointer);
    float pointerGlow = (1.0 - smoothstep(0.0, 0.28, pointerDistance)) * 0.48;
    float pulse = 0.82 + sin(u_time * 0.42 + uv.x * 1.7) * 0.18;
    float field = (lanes * structure * pulse) + scatter * 0.65 + pointerGlow;

    float boundary = 1.0 - smoothstep(0.0, 0.006, abs(rawUv.x - 0.72));
    boundary *= smoothstep(0.12, 0.32, rawUv.y) * (1.0 - smoothstep(0.68, 0.88, rawUv.y));

    vec3 ember = vec3(0.79, 0.25, 0.09);
    vec3 sage = vec3(0.31, 0.55, 0.43);
    vec3 paper = vec3(0.96, 0.91, 0.82);
    vec3 color = mix(ember, sage, smoothstep(0.42, 0.95, rawUv.x));
    color = mix(color, paper, pointerGlow * 0.25);

    float vignette = smoothstep(0.0, 0.22, rawUv.x) * (1.0 - smoothstep(0.72, 1.0, rawUv.x));
    float alpha = clamp(field * 0.44 + boundary * 0.15, 0.0, 0.48) * vignette;

    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function NovaOrbitHeroShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // React effects mirror external-system setup/cleanup:
    // https://react.dev/reference/react/useEffect#connecting-to-an-external-system
    // WebGL and animation lifecycle guidance:
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (
      !canvas ||
      !host ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 700px)").matches
    ) {
      return;
    }

    canvas.removeAttribute("data-fallback");

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      premultipliedAlpha: true,
    });

    if (!gl) {
      canvas.dataset.fallback = "true";
      return;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();

    if (!vertexShader || !fragmentShader || !program) {
      canvas.dataset.fallback = "true";
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.dataset.fallback = "true";
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    const buffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const pointerLocation = gl.getUniformLocation(program, "u_pointer");
    const timeLocation = gl.getUniformLocation(program, "u_time");

    if (!buffer || positionLocation < 0 || !resolutionLocation || !pointerLocation || !timeLocation) {
      canvas.dataset.fallback = "true";
      return;
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const pointer = { x: 0.78, y: 0.52 };
    let isVisible = true;
    let frameId = 0;
    let lastFrame = 0;
    let startTime = performance.now();
    let animateUntil = startTime + 160;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 0.58);
      const width = Math.max(1, Math.min(1600, Math.round(rect.width * scale)));
      const height = Math.max(1, Math.min(1000, Math.round(rect.height * scale)));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const render = (time: number) => {
      frameId = 0;
      if (!isVisible || document.hidden) return;

      if (time - lastFrame >= 72) {
        resize();
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(pointerLocation, pointer.x, pointer.y);
        gl.uniform1f(timeLocation, (time - startTime) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        lastFrame = time;
      }

      if (time < animateUntil) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    const start = () => {
      if (!frameId && isVisible && !document.hidden && performance.now() <= animateUntil) {
        startTime = performance.now() - Math.min(lastFrame, 2000);
        frameId = window.requestAnimationFrame(render);
      }
    };

    const stop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const handlePointer = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      pointer.y = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      animateUntil = performance.now() + 520;
      start();
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) start();
        else stop();
      },
      { threshold: 0.04 },
    );
    const resizeObserver = new ResizeObserver(resize);

    intersectionObserver.observe(canvas);
    resizeObserver.observe(canvas);
    host.addEventListener("pointermove", handlePointer, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    resize();
    start();

    return () => {
      stop();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      host.removeEventListener("pointermove", handlePointer);
      document.removeEventListener("visibilitychange", handleVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <div className="orbit-hero-visual" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="orbit-hero-signal orbit-hero-signal-input">
        <span>AI signals</span>
        <i />
      </div>
      <div className="orbit-hero-signal orbit-hero-signal-output">
        <i />
        <span>Owned work</span>
      </div>
    </div>
  );
}
