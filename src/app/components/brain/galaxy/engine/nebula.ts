import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { readCssColor } from "./scene";

export interface Nebula {
  mesh: Mesh;
  update(timeSeconds: number): void;
  dispose(): void;
}

// Full-sphere FBM gas cloud behind the graph — the deep-space "amber nebula".
// Rendered on the inside of a large sphere (BackSide), depth-test off so it
// always sits behind the nodes. Tinted from the stage-adaptive ember + sunken
// tokens so it tracks dark/light. Subtle by design; the bloom does the glow.
const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform float uTime;
  uniform vec3 uEmber;
  uniform vec3 uDeep;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float n = fbm(dir * 2.2 + vec3(0.0, uTime * 0.015, uTime * 0.008));
    n = smoothstep(0.32, 0.85, n);
    vec3 col = mix(uDeep, uEmber, n * 0.55);
    float alpha = 0.18 + 0.42 * n;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createNebula(): Nebula {
  const ember = readCssColor("--g-ember", "rgba(210,68,48,1)").color;
  const deep = readCssColor("--v2-bg-sunken", "#050403").color;

  const geometry = new SphereGeometry(3200, 48, 48);
  const material = new ShaderMaterial({
    side: BackSide,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uEmber: { value: new Color().copy(ember) },
      uDeep: { value: new Color().copy(deep) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  return {
    mesh,
    update(timeSeconds: number) {
      const u = material.uniforms.uTime;
      if (u) u.value = timeSeconds;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
