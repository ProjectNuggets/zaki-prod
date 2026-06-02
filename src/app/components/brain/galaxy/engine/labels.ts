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
  dispose(): void;
}

const FONT_SIZE = 12;
const Y_OFFSET = 16; // lift the label above the node
const MAX_CHARS = 42;
// Distance fade — labels are invisible far out and fade in as you dolly closer.
// This is what gives the Obsidian "labels appear as you zoom in" behaviour.
const FADE_NEAR = 260;
const FADE_FAR = 1500;

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

  for (let i = 0; i < maxLabels; i++) {
    const mesh = new Text();
    mesh.fontSize = FONT_SIZE;
    mesh.color = fill.getHex();
    mesh.anchorX = "center";
    mesh.anchorY = "bottom";
    mesh.outlineWidth = "7%";
    mesh.outlineColor = 0x000000;
    mesh.outlineOpacity = 0.65;
    mesh.material.depthTest = false;
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
      const opacity = clamp01((FADE_FAR - dist) / (FADE_FAR - FADE_NEAR));
      slot.mesh.fillOpacity = opacity;
      slot.mesh.outlineOpacity = 0.65 * opacity;
      slot.mesh.visible = opacity > 0.02;
    }
  }

  function dispose(): void {
    for (const slot of slots) {
      // troika's Text.dispose() frees geometry; also dispose the material when
      // it's a disposable (troika's material shape varies by version — guard so
      // a missing dispose() never crashes teardown).
      const mat = slot.mesh.material as { dispose?: () => void } | null | undefined;
      if (mat && typeof mat.dispose === "function") mat.dispose();
      slot.mesh.dispose();
    }
  }

  return { group, render, dispose };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
