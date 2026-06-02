import type { Camera } from "three";
import { Group, Vector3 } from "three";
import { Text } from "troika-three-text";
import { readCssColor } from "./scene";

export interface LabelEntry {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
}

export interface LabelLayer {
  group: Group;
  /** Assign the (already prioritized + capped) entries to the pool and render. */
  render(entries: LabelEntry[], camera: Camera): void;
  /** "Text fade" slider — higher = labels persist further out. */
  setFadeScale(threshold: number): void;
  dispose(): void;
}

const FONT_SIZE = 12;
const Y_OFFSET = 16; // lift the label above the node
const MAX_CHARS = 42;
// Distance fade — labels are invisible far out and fade in as you dolly closer.
// This is what gives the Obsidian "labels appear as you zoom in" behaviour.
const FADE_NEAR = 260;
const FADE_FAR = 1500;
// The "Text fade" slider is centered on this baseline → at the default the fade
// distance is exactly FADE_FAR; higher persists labels further, lower sooner.
const FADE_BASELINE = 0.6;

interface Slot {
  mesh: Text;
  text: string;
}

// Pooled troika SDF text. A fixed pool of Text meshes is reassigned each frame
// to the highest-priority nodes (hover / focus / neighbors / hubs); re-tessellation
// (sync) only happens when a slot's text actually changes, so per-frame cost is
// just position + billboard + opacity.
export function createLabelLayer(maxLabels: number): LabelLayer {
  const group = new Group();
  const fill = readCssColor("--v2-ink-1", "#ece7df").color;
  const slots: Slot[] = [];
  const worldPos = new Vector3();
  let fadeFar = FADE_FAR;

  for (let i = 0; i < maxLabels; i++) {
    const mesh = new Text();
    mesh.fontSize = FONT_SIZE;
    mesh.color = fill.getHex();
    mesh.anchorX = "center";
    mesh.anchorY = "bottom";
    mesh.outlineWidth = "7%";
    mesh.outlineColor = 0x000000;
    mesh.outlineOpacity = 0.65;
    // Drawn after the graph; the scene writes no depth (additive nodes/edges +
    // depthWrite:false), so renderOrder alone keeps labels legibly on top.
    // (Don't touch mesh.material here: with an outline, troika's `material` is
    // an array, so property writes silently no-op.)
    mesh.renderOrder = 10;
    mesh.visible = false;
    mesh.sync();
    group.add(mesh);
    slots.push({ mesh, text: "" });
  }

  function render(entries: LabelEntry[], camera: Camera): void {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const entry = entries[i];
      if (!entry) {
        if (slot.mesh.visible) slot.mesh.visible = false;
        continue;
      }
      slot.mesh.visible = true;
      slot.mesh.position.set(entry.x, entry.y + Y_OFFSET, entry.z);
      slot.mesh.quaternion.copy(camera.quaternion); // billboard

      if (slot.text !== entry.text) {
        slot.text = entry.text;
        slot.mesh.text =
          entry.text.length > MAX_CHARS ? `${entry.text.slice(0, MAX_CHARS - 1)}…` : entry.text;
        slot.mesh.sync();
      }

      // World position — labels live under the (breathing) graphGroup, so the
      // local position would give a wrong camera distance.
      slot.mesh.getWorldPosition(worldPos);
      const dist = camera.position.distanceTo(worldPos);
      const span = Math.max(1, fadeFar - FADE_NEAR);
      const opacity = clamp01((fadeFar - dist) / span);
      slot.mesh.fillOpacity = opacity;
      slot.mesh.outlineOpacity = 0.65 * opacity;
      slot.mesh.visible = opacity > 0.02;
    }
  }

  function dispose(): void {
    for (const slot of slots) {
      // troika's Text.dispose() frees geometry but not the derived material(s).
      // With an outline, `material` is an array [outline, main]; otherwise a
      // single material. Dispose whatever disposables are present.
      const raw = slot.mesh.material as unknown;
      const mats = Array.isArray(raw) ? raw : [raw];
      for (const m of mats) {
        const d = (m as { dispose?: () => void } | null | undefined)?.dispose;
        if (typeof d === "function") d.call(m);
      }
      slot.mesh.dispose();
    }
  }

  function setFadeScale(threshold: number): void {
    const t = threshold > 0 ? threshold : FADE_BASELINE;
    fadeFar = FADE_FAR * (t / FADE_BASELINE);
  }

  return { group, render, setFadeScale, dispose };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
