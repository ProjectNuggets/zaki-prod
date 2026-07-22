/**
 * Route-shape regression tests.
 *
 * The dashboard (`/`) and the Spaces routes all render ChatArea. React only
 * preserves the mounted component when the element TYPE at the route outlet
 * stays the same, so these routes must share one element type. When `/` used
 * its own wrapper component, navigating dashboard → new thread remounted
 * ChatArea mid-send: the unmount cleanup aborted the in-flight anonymous
 * first turn AFTER the BFF had already metered it — the visitor paid a unit
 * and never saw a reply (launch-close sweep, Defect 1).
 */
import { describe, expect, it } from "@jest/globals";
import type { ReactElement } from "react";
import { router } from "./routes";

type RouteEntry = {
  index?: boolean;
  path?: string;
  element?: ReactElement;
  children?: RouteEntry[];
};

function getAppChildren(): RouteEntry[] {
  const root = (router.routes as unknown as RouteEntry[]).find(
    (route) => route.path === "/"
  );
  expect(root?.children?.length).toBeGreaterThan(0);
  return root?.children ?? [];
}

function findRoute(children: RouteEntry[], match: (route: RouteEntry) => boolean) {
  const route = children.find(match);
  expect(route?.element).toBeTruthy();
  return route as RouteEntry & { element: ReactElement };
}

describe("ChatArea route continuity", () => {
  it("keeps one element type across the dashboard and every Spaces route so in-flight chat streams survive the dashboard → thread navigation", () => {
    const children = getAppChildren();
    const indexRoute = findRoute(children, (route) => route.index === true);
    const spacesRoute = findRoute(children, (route) => route.path === "spaces");
    const spaceDetailRoute = findRoute(
      children,
      (route) => route.path === "spaces/:spaceId"
    );
    const threadRoute = findRoute(
      children,
      (route) => route.path === "spaces/:spaceId/threads/:threadId"
    );

    expect(indexRoute.element.type).toBe(threadRoute.element.type);
    expect(spacesRoute.element.type).toBe(threadRoute.element.type);
    expect(spaceDetailRoute.element.type).toBe(threadRoute.element.type);
  });
});
