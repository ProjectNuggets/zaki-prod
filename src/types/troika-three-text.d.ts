// Type shim for `troika-three-text` (ships no bundled .d.ts).
// Declares only the Text surface the label layer uses. Text extends Mesh, so
// position/quaternion/visible/renderOrder/add are inherited; `material` is
// narrowed to a single Material (troika uses one).
declare module "troika-three-text" {
  import { Material, Mesh } from "three";

  export class Text extends Mesh {
    text: string;
    fontSize: number;
    font: string | null;
    color: number | string;
    anchorX: number | string;
    anchorY: number | string;
    outlineWidth: number | string;
    outlineColor: number | string;
    outlineOpacity: number;
    fillOpacity: number;
    material: Material;
    sync(callback?: () => void): void;
    dispose(): void;
  }

  export function preloadFont(
    options: { font?: string; characters?: string | string[] },
    callback: () => void,
  ): void;
}
