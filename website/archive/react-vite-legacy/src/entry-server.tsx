import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import App from "./App";
import { getRouteSeo } from "./lib/seo";
import { getPrerenderRoutes, resolveRenderablePath, routeRegistry } from "./lib/routeRegistry";
import "./styles/global.css";
import "./styles/v3.css";

export function renderRoute(pathname = "/") {
  const normalizedPath = resolveRenderablePath(pathname);
  const seo = getRouteSeo(normalizedPath);
  const appHtml = renderToString(
    <StaticRouter location={normalizedPath}>
      <App />
    </StaticRouter>
  );

  return {
    appHtml,
    seo,
    locale: seo.lang,
    lang: seo.lang,
    dir: seo.dir,
    structuredData: seo.schema,
  };
}

export { getPrerenderRoutes, routeRegistry };
