import { renderToString } from "react-dom/server";
import { LandingApp } from "./components/LandingApp";
import { getSeoData, getStructuredData, normalizeLocale } from "./seo";

export function renderLanding(locale = "en") {
  const normalizedLocale = normalizeLocale(locale);
  const seo = getSeoData(normalizedLocale);
  const structuredData = getStructuredData(normalizedLocale);
  const appHtml = renderToString(<LandingApp initialLocale={normalizedLocale} />);

  return {
    appHtml,
    locale: normalizedLocale,
    lang: seo.lang,
    dir: seo.dir || "ltr",
    seo,
    structuredData,
  };
}
