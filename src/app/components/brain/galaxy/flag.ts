import { useEffect, useState } from "react";

// Brain "Galaxy" renderer flag (P0).
//
// The new Three.js renderer is built incrementally behind this flag so the
// shipping cytoscape page stays the default until the Galaxy view reaches
// parity. The P9 cutover removes the flag and makes Galaxy the only renderer.
//
// Resolution order:
//   1. ?galaxy=1 / ?galaxy=0 in the URL (per-visit override, shareable)
//   2. localStorage "zaki.brain.galaxy" === "0" → explicit opt-out
//   3. default: TRUE — the new Brain (Home + Explore) is the default surface;
//      the legacy cytoscape page remains reachable via ?galaxy=0 until removed.
const STORAGE_KEY = "zaki.brain.galaxy";

export function readGalaxyFlag(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const q = new URLSearchParams(window.location.search).get("galaxy");
    if (q === "1" || q === "true") return true;
    if (q === "0" || q === "false") return false;
    if (window.localStorage.getItem(STORAGE_KEY) === "0") return false;
    return true;
  } catch {
    return true;
  }
}

/** React hook form — resolves once on mount (jsdom-safe; defaults to false). */
export function useGalaxyFlag(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => readGalaxyFlag());
  useEffect(() => {
    setEnabled(readGalaxyFlag());
  }, []);
  return enabled;
}
