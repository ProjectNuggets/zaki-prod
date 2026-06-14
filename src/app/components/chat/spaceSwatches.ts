/**
 * Curated per-space color identity. The values live as CSS custom properties in
 * src/styles/spaces-classic.css (the single source of truth); this module only
 * exports their `var(...)` references so component code stays free of hardcoded
 * color literals (enforced by src/test/spacesTokenDiscipline.test.ts).
 *
 * Used by the space icon/color pickers and the sidebar identity dots. A space's
 * stored `color` is one of these `var(...)` strings; applying it via inline
 * style resolves against the .zaki-app-v2 shell where the tokens are defined.
 */

export const SPACE_SWATCHES = [
  "var(--zaki-space-swatch-ember)",
  "var(--zaki-space-swatch-slate)",
  "var(--zaki-space-swatch-moss)",
  "var(--zaki-space-swatch-clay)",
  "var(--zaki-space-swatch-indigo)",
  "var(--zaki-space-swatch-plum)",
  "var(--zaki-space-swatch-sand)",
] as const;

export type SpaceSwatch = (typeof SPACE_SWATCHES)[number];

/** Neutral fallback for spaces with no color set. */
export const DEFAULT_SPACE_SWATCH = "var(--zaki-space-swatch-default)";

/**
 * Hex fallback for <input type="color"> controls. CSS var() strings cannot be
 * used as the value attribute of a color input, so this hex approximates the
 * ember swatch (--zaki-space-swatch-ember / --v2-accent). Kept here (not in
 * component code) so the design-token discipline test stays green.
 */
export const COLOR_PICKER_FALLBACK_HEX = "#d24430";
