import type { Locale } from "./content";

export type RoutePageKind =
  | "home"
  | "bot"
  | "faq"
  | "story"
  | "autism-guidance"
  | "comparison"
  | "howto"
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
    pathname: "/ar/",
    locale: "ar",
    pageKind: "home",
    seoKey: "home",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "home",
  },
  {
    pathname: "/zaki-bot/",
    locale: "en",
    pageKind: "bot",
    seoKey: "bot",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "bot",
  },
  {
    pathname: "/ar/zaki-bot/",
    locale: "ar",
    pageKind: "bot",
    seoKey: "bot",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "bot",
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
    pathname: "/autism-guidance/",
    locale: "en",
    pageKind: "autism-guidance",
    seoKey: "autism-guidance",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "autism-guidance",
  },
  {
    pathname: "/ar/autism-guidance/",
    locale: "ar",
    pageKind: "autism-guidance",
    seoKey: "autism-guidance",
    requiresAlternates: true,
    requiresSchema: true,
    alternatesGroup: "autism-guidance",
  },
  {
    pathname: "/vs-chatgpt/",
    locale: "en",
    pageKind: "comparison",
    seoKey: "vs-chatgpt",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/zaki-vs-spaces/",
    locale: "en",
    pageKind: "comparison",
    seoKey: "zaki-vs-spaces",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/best-arabic-ai-assistant/",
    locale: "en",
    pageKind: "comparison",
    seoKey: "best-arabic-ai-assistant",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/zaki-vs-openclaw/",
    locale: "en",
    pageKind: "comparison",
    seoKey: "zaki-vs-openclaw",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/how-to/write-arabic-emails-ai/",
    locale: "en",
    pageKind: "howto",
    seoKey: "howto-write-arabic-emails-ai",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/how-to/translate-dialects-arabic-english/",
    locale: "en",
    pageKind: "howto",
    seoKey: "howto-translate-dialects-arabic-english",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/how-to/create-social-media-content-arabic/",
    locale: "en",
    pageKind: "howto",
    seoKey: "howto-create-social-media-content-arabic",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/how-to/how-zaki-and-spaces-work/",
    locale: "en",
    pageKind: "howto",
    seoKey: "howto-how-zaki-and-spaces-work",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/how-to/what-to-use-spaces-for/",
    locale: "en",
    pageKind: "howto",
    seoKey: "howto-what-to-use-spaces-for",
    requiresAlternates: false,
    requiresSchema: true,
  },
  {
    pathname: "/how-to/what-to-use-zaki-for/",
    locale: "en",
    pageKind: "howto",
    seoKey: "howto-what-to-use-zaki-for",
    requiresAlternates: false,
    requiresSchema: true,
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
