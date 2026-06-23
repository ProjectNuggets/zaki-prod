import { useEffect } from "react";

const HOME_SCRIPTS = [
  "/zaki/scripts/zaki-home.js",
  "/zaki/scripts/zaki-chapters.js",
  "/zaki/scripts/zaki-constellation.js",
];

const PAGE_SCRIPTS = ["/zaki/scripts/zaki-page.js"];

const HOME_CSS = [
  "/zaki/styles/zaki-foundation.css",
  "/zaki/styles/zaki-home.css",
  "/zaki/styles/zaki-chapters.css",
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
    s.setAttribute("data-zaki", "1");
    document.body.appendChild(s);
    return s;
  });
}

function cleanup(links: (HTMLLinkElement | null)[], scripts: HTMLScriptElement[]) {
  links.forEach((l) => l?.remove());
  scripts.forEach((s) => s.remove());
}

export function useZakiHomePage(bodyStage = "dark") {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.setAttribute("data-stage", bodyStage);
    const links = injectLinks(HOME_CSS);
    const scripts = loadScripts(HOME_SCRIPTS);
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
