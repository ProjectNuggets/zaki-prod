import type { Locale } from "./content";

export type RoutePageKind =
  | "home"
  | "agent"
  | "spaces"
  | "product"
  | "pricing"
  | "use-cases"
  | "faq"
  | "story"
  | "legal"
  | "contact";

export type RouteDefinition = {
  pathname: string;
  locale: Locale;
  pageKind: RoutePageKind;
  seoKey: string;
  requiresAlternates: boolean;
  requiresSchema: boolean;
  alternatesGroup?: string;
};

export const routeRegistry: RouteDefinition[] = [
  {
    pathname: "/",
    locale: "en",
    pageKind: "home",
    seoKey: "home",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "home",
  },
  {
    pathname: "/agent/",
    locale: "en",
    pageKind: "agent",
    seoKey: "agent",
    requiresAlternates: false,
    requiresSchema: false,
  },
  {
    pathname: "/spaces/",
    locale: "en",
    pageKind: "spaces",
    seoKey: "spaces",
    requiresAlternates: false,
    requiresSchema: false,
  },
  {
    pathname: "/ar/",
    locale: "ar",
    pageKind: "home",
    seoKey: "home",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "home",
  },
  {
    pathname: "/product/",
    locale: "en",
    pageKind: "product",
    seoKey: "product",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "product",
  },
  {
    pathname: "/ar/product/",
    locale: "ar",
    pageKind: "product",
    seoKey: "product",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "product",
  },
  {
    pathname: "/pricing/",
    locale: "en",
    pageKind: "pricing",
    seoKey: "pricing",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "pricing",
  },
  {
    pathname: "/ar/pricing/",
    locale: "ar",
    pageKind: "pricing",
    seoKey: "pricing",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "pricing",
  },
  {
    pathname: "/use-cases/",
    locale: "en",
    pageKind: "use-cases",
    seoKey: "use-cases",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "use-cases",
  },
  {
    pathname: "/ar/use-cases/",
    locale: "ar",
    pageKind: "use-cases",
    seoKey: "use-cases",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "use-cases",
  },
  {
    pathname: "/faq/",
    locale: "en",
    pageKind: "faq",
    seoKey: "faq",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "faq",
  },
  {
    pathname: "/ar/faq/",
    locale: "ar",
    pageKind: "faq",
    seoKey: "faq",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "faq",
  },
  {
    pathname: "/story/",
    locale: "en",
    pageKind: "story",
    seoKey: "story",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "story",
  },
  {
    pathname: "/ar/story/",
    locale: "ar",
    pageKind: "story",
    seoKey: "story",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "story",
  },
  {
    pathname: "/contact/",
    locale: "en",
    pageKind: "contact",
    seoKey: "contact",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "contact",
  },
  {
    pathname: "/ar/contact/",
    locale: "ar",
    pageKind: "contact",
    seoKey: "contact",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "contact",
  },
  {
    pathname: "/privacy/",
    locale: "en",
    pageKind: "legal",
    seoKey: "privacy",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "privacy",
  },
  {
    pathname: "/ar/privacy/",
    locale: "ar",
    pageKind: "legal",
    seoKey: "privacy",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "privacy",
  },
  {
    pathname: "/terms/",
    locale: "en",
    pageKind: "legal",
    seoKey: "terms",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "terms",
  },
  {
    pathname: "/ar/terms/",
    locale: "ar",
    pageKind: "legal",
    seoKey: "terms",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "terms",
  },
  {
    pathname: "/compliance/",
    locale: "en",
    pageKind: "legal",
    seoKey: "compliance",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "compliance",
  },
  {
    pathname: "/ar/compliance/",
    locale: "ar",
    pageKind: "legal",
    seoKey: "compliance",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "compliance",
  },
];

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function getRouteDefinition(pathname: string) {
  const normalized = normalizePathname(pathname);
  return routeRegistry.find((route) => route.pathname === normalized);
}

export function resolveRenderablePath(pathname: string) {
  return getRouteDefinition(pathname)?.pathname ?? "/";
}

export function getPrerenderRoutes() {
  return routeRegistry.map((route) => route.pathname);
}

export function getAlternatesForRoute(route: RouteDefinition) {
  if (!route.alternatesGroup) {
    return {
      en: route.pathname,
      "x-default": route.pathname,
    };
  }

  const siblings = routeRegistry.filter(
    (candidate) => candidate.alternatesGroup === route.alternatesGroup
  );
  const alternates = Object.fromEntries(
    siblings.map((candidate) => [candidate.locale, candidate.pathname])
  ) as Record<string, string>;

  alternates["x-default"] =
    siblings.find((candidate) => candidate.locale === "en")?.pathname ?? route.pathname;

  return alternates;
}

export function getLocaleSwitchPath(pathname: string, targetLocale: Locale) {
  const route = getRouteDefinition(pathname);
  if (!route) {
    return targetLocale === "ar" ? "/ar/" : "/";
  }
  if (!route.alternatesGroup) {
    return targetLocale === "ar" ? "/ar/" : "/";
  }
  return (
    routeRegistry.find(
      (candidate) =>
        candidate.alternatesGroup === route.alternatesGroup &&
        candidate.locale === targetLocale
    )?.pathname ?? (targetLocale === "ar" ? "/ar/" : "/")
  );
}
