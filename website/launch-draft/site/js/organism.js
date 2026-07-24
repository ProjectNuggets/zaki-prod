/* __CS_IIFE__ */
;(function(){
"use strict";
/**
 * Nova Nuggets Living Organism — standalone particle system.
 *
 * A portable, framework-free version of the particle organism from
 * chatzaki.com. Single file, only dependency is three.js (r160+).
 *
 * Usage:
 *   import { createOrganism } from "./organism.js";
 *   const organism = createOrganism(document.querySelector("#bg"), { bloom: true });
 *   organism.setShape("torus");           // sphere | torus | helix | grid | starburst
 *   organism.setShape("text:HELLO");      // any word, any emoji ("text:🦀")
 *   organism.setShape("img:/logo.png");   // any same-origin PNG/SVG silhouette
 *   organism.setColor("#6ef2d6");         // accent override (null = default)
 *   organism.setEnergy(1);                // 0..1 excitement boost
 *   organism.destroy();
 */


/* ------------------------------------------------------------------ */
/* shapes                                                              */
/* ------------------------------------------------------------------ */

const GOLDEN = 2.399963229728653;

function sphere(count, R = 1.65) {
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const theta = i * GOLDEN;
    p[i * 3] = Math.cos(theta) * rad * R;
    p[i * 3 + 1] = y * R;
    p[i * 3 + 2] = Math.sin(theta) * rad * R;
  }
  return p;
}

function torus(count, R = 1.25, r = 0.42) {
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = (i / count) * Math.PI * 2;
    const v = i * GOLDEN;
    const cx = R + r * Math.cos(v);
    p[i * 3] = cx * Math.cos(u);
    p[i * 3 + 1] = cx * Math.sin(u) * 0.85;
    p[i * 3 + 2] = r * Math.sin(v);
  }
  return p;
}

function helix(count, R = 0.9, turns = 4, height = 3.2) {
  const p = new Float32Array(count * 3);
  const strands = 2;
  for (let i = 0; i < count; i++) {
    const s = i % strands;
    const t = i / count;
    const a = t * Math.PI * 2 * turns + s * Math.PI;
    const jitter = () => (Math.random() - 0.5) * 0.16;
    p[i * 3] = Math.cos(a) * R + jitter();
    p[i * 3 + 1] = (t - 0.5) * height + jitter();
    p[i * 3 + 2] = Math.sin(a) * R + jitter();
  }
  return p;
}

function grid(count, size = 3.2) {
  const p = new Float32Array(count * 3);
  const side = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const gx = i % side;
    const gy = Math.floor(i / side);
    p[i * 3] = (gx / (side - 1) - 0.5) * size;
    p[i * 3 + 1] = (gy / (side - 1) - 0.5) * size * 0.62;
    p[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
  }
  return p;
}

function starburst(count, R = 1.7, rays = 12) {
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    if (i % 9 === 0) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * R * 0.14;
      p[i * 3] = Math.cos(a) * d;
      p[i * 3 + 1] = Math.sin(a) * d;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      continue;
    }
    const ray = i % rays;
    const base = (ray / rays) * Math.PI * 2;
    const len = R * (0.72 + 0.28 * Math.abs(Math.sin(ray * 2.39 + 0.8)));
    const t = 0.16 + 0.84 * Math.pow(Math.random(), 0.65);
    const d = t * len;
    const w = (Math.random() - 0.5) * 0.22 * (1.05 - t);
    p[i * 3] = Math.cos(base) * d - Math.sin(base) * w;
    p[i * 3 + 1] = Math.sin(base) * d + Math.cos(base) * w;
    p[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
  }
  return p;
}

function textShape(count, text, fontFamily = "bold sans-serif", worldWidth = 4.2) {
  const W = 640;
  const H = 240;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let px = 190;
  do {
    ctx.font = `600 ${px}px ${fontFamily}`;
    px -= 8;
  } while (ctx.measureText(text).width > W * 0.92 && px > 40);
  ctx.fillText(text, W / 2, H / 2);

  const data = ctx.getImageData(0, 0, W, H).data;
  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4] > 120) candidates.push(x, y);
    }
  }
  const n = candidates.length / 2;
  if (n === 0) return sphere(count);
  const p = new Float32Array(count * 3);
  const scale = worldWidth / W;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * n);
    const x = candidates[j * 2] + (Math.random() - 0.5) * 1.5;
    const y = candidates[j * 2 + 1] + (Math.random() - 0.5) * 1.5;
    p[i * 3] = (x - W / 2) * scale;
    p[i * 3 + 1] = -(y - H / 2) * scale;
    p[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
  }
  return p;
}

async function imageShape(count, url, worldWidth = 3.6) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });
  const W = 480;
  const H = Math.max(1, Math.round((img.height / img.width) * W));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const j = (y * W + x) * 4;
      const lum = data[j] * 0.3 + data[j + 1] * 0.6 + data[j + 2] * 0.1;
      if (data[j + 3] > 100 && lum > 40) candidates.push(x, y);
    }
  }
  const n = candidates.length / 2;
  if (n === 0) return sphere(count);
  const p = new Float32Array(count * 3);
  const scale = worldWidth / W;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * n);
    const x = candidates[j * 2] + (Math.random() - 0.5) * 1.5;
    const y = candidates[j * 2 + 1] + (Math.random() - 0.5) * 1.5;
    p[i * 3] = (x - W / 2) * scale;
    p[i * 3 + 1] = -(y - H / 2) * scale;
    p[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
  }
  return p;
}

/* ------------------------------------------------------------------ */
/* shaders                                                             */
/* ------------------------------------------------------------------ */

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uFreq;
uniform float uAmp;
uniform float uIntro;
uniform float uMorph;
uniform float uEnergy;
uniform float uDpr;
uniform float uAspect;
uniform vec2 uMouse;
attribute float aRand;
attribute vec3 aTarget;
varying float vGlow;
varying float vRand;

${NOISE}

void main() {
  vec3 dir = normalize(position);
  vec3 base = mix(position, aTarget, uMorph);
  vec3 pos = base * uIntro;

  float t = uTime * 0.18;
  float n = snoise(dir * uFreq + vec3(0.0, t, t * 0.6));
  float amp = uAmp * (1.0 + uEnergy * 0.5) * (1.0 - uMorph * 0.82);
  pos += dir * n * amp * uIntro;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vec4 proj = projectionMatrix * mv;
  vec2 ndc = proj.xy / proj.w;

  vec2 toMouse = (ndc - uMouse) * vec2(uAspect, 1.0);
  float md = length(toMouse);
  float push = smoothstep(0.45, 0.0, md);
  mv.xy += normalize(ndc - uMouse + 1e-4) * push * 0.5;

  gl_Position = projectionMatrix * mv;

  vGlow = smoothstep(-0.4, 1.0, n);
  vRand = aRand;
  float size = (1.7 + vGlow * 3.0 + push * 3.5) * (1.0 + uEnergy * 0.55) * max(uDpr, 1.25);
  gl_PointSize = size * (5.4 / -mv.z) * (0.35 + 0.65 * uIntro);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlphaMul;
varying float vGlow;
varying float vRand;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.05, d);
  vec3 col = mix(uColorA, uColorB, vGlow * (0.55 + 0.45 * vRand));
  gl_FragColor = vec4(col, min(alpha * (0.45 + 0.55 * vGlow) * uAlphaMul, 1.0));
}
`;

/* ------------------------------------------------------------------ */
/* engine                                                              */
/* ------------------------------------------------------------------ */

const FACE_CAMERA = new Set(["grid", "starburst"]); // text:/img: always face

function createOrganism(container, options = {}) {
  const THREE = window.THREE;
  const opts = {
    count: options.count ?? 24000,
    colorA: options.colorA ?? "#cdd6d9",
    colorB: options.colorB ?? "#b6ff2e",
    background: options.background ?? null, // null = transparent
    freq: options.freq ?? 1.5,
    amp: options.amp ?? 0.32,
    speed: options.speed ?? 1.0,
    rotation: options.rotation ?? 0.04,
    mouse: options.mouse ?? true,
    fontFamily: options.fontFamily ?? "bold sans-serif",
    dprMax: options.dprMax ?? 1.75,
    // "additive" glows on dark backgrounds; use "normal" with dark
    // particle colors for light/yellow backgrounds
    blending: options.blending ?? "additive",
    // opacity multiplier — raise (~2.5) for ink-on-light looks
    alpha: options.alpha ?? 1,
  };

  /* renderer / scene */
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: opts.background === null,
    // The launch shell now runs a compact, single-scene budget. Let the
    // browser select its stable default GPU lane instead of forcing the most
    // demanding context on embedded Chromium runtimes.
    powerPreference: "default",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.dprMax));
  if (opts.background !== null) renderer.setClearColor(new THREE.Color(opts.background), 1);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.z = 6;

  /* geometry */
  const positions = sphere(opts.count);
  const rands = new Float32Array(opts.count);
  for (let i = 0; i < opts.count; i++) rands[i] = Math.random();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));
  const targetAttr = new THREE.BufferAttribute(positions.slice(), 3);
  geometry.setAttribute("aTarget", targetAttr);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uFreq: { value: opts.freq },
      uAmp: { value: opts.amp },
      uIntro: { value: 0 },
      uMorph: { value: 0 },
      uEnergy: { value: 0 },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, opts.dprMax) },
      uAspect: { value: 1 },
      uMouse: { value: new THREE.Vector2(10, 10) },
      uColorA: { value: new THREE.Color(opts.colorA) },
      uColorB: { value: new THREE.Color(opts.colorB) },
      uAlphaMul: { value: opts.alpha },
    },
    transparent: true,
    depthWrite: false,
    blending: opts.blending === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  /* state */
  const u = material.uniforms;
  const baseColor = new THREE.Color(opts.colorB);
  const colorTarget = new THREE.Color(opts.colorB);
  const colorScratch = new THREE.Color();
  const mouseTarget = new THREE.Vector2(10, 10);
  const shapeCache = new Map();
  const state = {
    shape: null,
    morphKey: null,
    morphTarget: 0,
    energy: 0,
    energyCur: 0,
    params: { freq: opts.freq, amp: opts.amp, speed: opts.speed, rotation: opts.rotation },
    cur: { freq: opts.freq, amp: opts.amp, speed: opts.speed, rotation: opts.rotation },
    destroyed: false,
  };

  function buildShape(key) {
    const hit = shapeCache.get(key);
    if (hit) return hit;
    let pts;
    if (key === "torus") pts = torus(opts.count);
    else if (key === "helix") pts = helix(opts.count);
    else if (key === "grid") pts = grid(opts.count);
    else if (key === "starburst") pts = starburst(opts.count);
    else if (key.startsWith("text:")) pts = textShape(opts.count, key.slice(5), opts.fontFamily);
    else if (key.startsWith("img:")) {
      imageShape(opts.count, key.slice(4))
        .then((sampled) => {
          shapeCache.set(key, sampled);
          if (state.morphKey === key) {
            targetAttr.array.set(sampled);
            targetAttr.needsUpdate = true;
          }
        })
        .catch((e) => console.warn("[organism] image shape failed:", e));
      return sphere(opts.count); // placeholder until sampled
    } else pts = sphere(opts.count);
    shapeCache.set(key, pts);
    return pts;
  }

  /* sizing */
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    u.uAspect.value = w / h;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* input */
  let mouseEnabled = true;
  function onMove(e) {
    if (!mouseEnabled) return;
    mouseTarget.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1)
    );
  }
  if (opts.mouse) window.addEventListener("pointermove", onMove);

  /* loop */
  const clock = new THREE.Clock();
  let raf = 0;

  function frame() {
    if (state.destroyed) return;
    if (state.paused) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.exp(-2.2 * dt);

    // shape state machine — release, then adopt
    const desired = state.shape;
    if (desired !== state.morphKey) {
      state.morphTarget = 0;
      if (u.uMorph.value < 0.04) {
        state.morphKey = desired;
        if (desired) {
          targetAttr.array.set(buildShape(desired));
          targetAttr.needsUpdate = true;
        }
      }
    } else {
      state.morphTarget = desired ? 1 : 0;
    }
    u.uMorph.value += (state.morphTarget - u.uMorph.value) * (1 - Math.exp(-3.2 * dt));
    state.energyCur += (state.energy - state.energyCur) * (1 - Math.exp(-4 * dt));
    u.uEnergy.value = state.energyCur;

    // parameters
    const c = state.cur;
    const p = state.params;
    c.freq += (p.freq - c.freq) * k;
    c.amp += (p.amp - c.amp) * k;
    c.speed += (p.speed - c.speed) * k;
    c.rotation += (p.rotation - c.rotation) * k;
    colorScratch.copy(colorTarget);
    u.uColorB.value.lerp(colorScratch, k);

    u.uTime.value += dt * c.speed * (1 + state.energyCur * 0.8);
    u.uFreq.value = c.freq;
    u.uAmp.value = c.amp;
    u.uMouse.value.lerp(mouseTarget, 1 - Math.exp(-4 * dt));
    u.uIntro.value += (1 - u.uIntro.value) * (1 - Math.exp(-1.4 * dt));

    // rotation — face the camera while holding a flat shape
    const flat =
      state.morphKey &&
      (FACE_CAMERA.has(state.morphKey) ||
        state.morphKey.startsWith("text:") ||
        state.morphKey.startsWith("img:"));
    if (flat && u.uMorph.value > 0.1) {
      let r = points.rotation.y % (Math.PI * 2);
      if (r > Math.PI) r -= Math.PI * 2;
      if (r < -Math.PI) r += Math.PI * 2;
      points.rotation.y = r * Math.exp(-3 * dt);
      points.rotation.x *= Math.exp(-3 * dt);
    } else {
      points.rotation.y += dt * c.rotation;
    }

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  /* public api */
  const api = {
    el: renderer.domElement,

    /** sphere | torus | helix | grid | starburst | text:WORD | img:/path.png | null */
    setShape(key) {
      state.shape = key || null;
    },

    /** accent hex color, or null to restore the default */
    setColor(hex) {
      colorTarget.set(hex || baseColor);
    },

    /** 0..1 — boosts amplitude, speed and point size */
    setEnergy(v) {
      state.energy = Math.max(0, Math.min(1, v));
    },

    /** fine-tune the mood: {freq, amp, speed, rotation} */
    setParams(partial) {
      Object.assign(state.params, partial);
    },

    /** enable/disable cursor deformation (the guided tour turns it off) */
    setMouse(v) {
      mouseEnabled = !!v;
      if (!v) mouseTarget.set(10, 10);
    },

    /** retint both palette stops live (theme changes re-use this) */
    setPalette(a, b) {
      if (a) u.uColorA.value.set(a);
      if (b) {
        baseColor.set(b);
        colorTarget.set(b);
        u.uColorB.value.set(b);
      }
    },

    /** stop/restart the render loop (offscreen organisms cost nothing) */
    pause() {
      state.paused = true;
    },

    resume() {
      if (!state.paused) return;
      state.paused = false;
      if (!state.destroyed && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
    },

    destroy() {
      state.destroyed = true;
      if (typeof window !== "undefined" && window.__csOrganisms) {
        const idx = window.__csOrganisms.indexOf(api);
        if (idx !== -1) window.__csOrganisms.splice(idx, 1);
      }
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (opts.mouse) window.removeEventListener("pointermove", onMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // dispose releases Three resources, but does not guarantee that the
      // browser immediately returns the WebGL context. The launch shell
      // intentionally recreates a single scene as visitors move between
      // chapters, so release that context deterministically when supported.
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
  if (typeof window !== "undefined") {
    (window.__csOrganisms = window.__csOrganisms || []).push(api);
  }
  return api;
}

if (typeof window !== "undefined") { window.createOrganism = createOrganism; }

})();
