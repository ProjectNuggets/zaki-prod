import React from "react";
import { renderToString } from "react-dom/server";
import { App } from "./App";
import { routeForPath, routes } from "./lib/content";

export { routes };

export function renderRoute(pathname: string) {
  const route = routeForPath(pathname);
  return {
    appHtml: renderToString(<App path={route.path} />),
    route,
    lang: "en",
  };
}
