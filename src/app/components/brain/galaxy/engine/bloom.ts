import { Vector2 } from "three";
import type { Camera, Scene, WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export interface BloomComposer {
  render(): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

// Additive bloom: bright (additively-blended) nodes bleed soft halos and dense
// clusters self-brighten into hot cores — the "galaxy" core look. Threshold is
// low because node colors over the dark canvas are already the brightest thing.
const BLOOM_STRENGTH = 0.85;
const BLOOM_RADIUS = 0.55;
const BLOOM_THRESHOLD = 0.12;

export function createBloomComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  width: number,
  height: number,
): BloomComposer {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new Vector2(Math.max(1, width), Math.max(1, height)),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloom);
  composer.setSize(Math.max(1, width), Math.max(1, height));

  return {
    render: () => composer.render(),
    setSize: (w, h) => composer.setSize(Math.max(1, w), Math.max(1, h)),
    dispose: () => {
      bloom.dispose();
      composer.dispose();
    },
  };
}
