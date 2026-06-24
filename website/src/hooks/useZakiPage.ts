import { useEffect } from "react";

// Vendored UMD globals for the immersive "mind" layer. Kept in public/zaki/vendor
// (never imported under src/) so WebGL/Lenis stay strictly client-only and never
// reach the SSR/prerender path (vite ssr.noExternal:true would bundle + crash them).
// Load order matters: gsap -> ScrollTrigger -> lenis, before zaki-mind.js.
const VENDOR_SCRIPTS = [
  "/zaki/vendor/gsap.min.js",
  "/zaki/vendor/ScrollTrigger.min.js",
  "/zaki/vendor/lenis.umd.js",
];

const HOME_SCRIPTS = [
  "/zaki/scripts/zaki-home.js",
  "/zaki/scripts/zaki-chapters.js",
  "/zaki/scripts/zaki-mind.js",         // after home+chapters (reads their hooks), before constellation
  "/zaki/scripts/zaki-constellation.js",
];

const PAGE_SCRIPTS = ["/zaki/scripts/zaki-page.js"];

const HOME_CSS = [
  "/zaki/styles/zaki-foundation.css",
  "/zaki/styles/zaki-home.css",
  "/zaki/styles/zaki-chapters.css",
  "/zaki/styles/zaki-mind.css",
];

function injectLinks(hrefs: string[]): HTMLLinkElement[] {
  return hrefs.map((href) => {
    if (document.querySelector(`link[data-zaki][href="${href}"]`)) return null as unknown as HTMLLinkElement;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-zaki", "1");
    document.head.prepend(link);
    return link;
  });
}

function loadScripts(srcs: string[]): HTMLScriptElement[] {
  return srcs.map((src) => {
    const s = document.createElement("script");
    s.src = src;
    // Dynamically-created scripts default to async=true (load-order = arbitrary).
    // Force ordered execution so vendor libs (gsap/ScrollTrigger/lenis) are ready
    // before zaki-mind.js, and zaki-home/chapters run before zaki-mind reads them.
    s.async = false;
    s.setAttribute("data-zaki", "1");
    document.body.appendChild(s);
    return s;
  });
}

function cleanup(links: (HTMLLinkElement | null)[], scripts: HTMLScriptElement[]) {
  // Critical SPA-leak fix: removing the <script> elements does NOT cancel their
  // rAF / observers / Lenis / GL contexts. Tear those down first.
  if (typeof window !== "undefined") {
    (window as unknown as { __zakiMind?: { destroy?: () => void } }).__zakiMind?.destroy?.();
  }
  links.forEach((l) => l?.remove());
  scripts.forEach((s) => s.remove());
}

export function useZakiHomePage(bodyStage = "dark") {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.setAttribute("data-stage", bodyStage);
    const links = injectLinks(HOME_CSS);
    const scripts = loadScripts([...VENDOR_SCRIPTS, ...HOME_SCRIPTS]);
    return () => {
      cleanup(links, scripts);
      document.body.removeAttribute("data-stage");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useZakiProductPage(cssFile: string, scriptFile: string) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.setAttribute("data-stage", "dark");
    const links = injectLinks([
      "/zaki/styles/zaki-foundation.css",
      "/zaki/styles/zaki-home.css",
      cssFile,
    ]);
    const scripts = loadScripts([...PAGE_SCRIPTS, scriptFile]);
    return () => {
      cleanup(links, scripts);
      document.body.removeAttribute("data-stage");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
