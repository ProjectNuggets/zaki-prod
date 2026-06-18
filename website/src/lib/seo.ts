import { getContent, type Locale } from "./content";
import {
  getAlternatesForRoute,
  getRouteDefinition,
  resolveRenderablePath,
} from "./routeRegistry";
import {
  getContactContent,
  getLegalContent,
} from "./routeContent";

export const SITE_URL = "https://chatzaki.com";
export const APP_URL = "https://chatzaki.ai";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/slides/1.png`;
export const SEO_UPDATED_AT = "2026-06-17T00:00:00Z";

export type RouteSeo = {
  title: string;
  description: string;
  canonical: string;
  lang: Locale;
  dir: "ltr" | "rtl";
  imageAlt: string;
  localeTag: string;
  altLocaleTag: string;
  keywords: string;
  schema: unknown[];
  alternates: Record<string, string>;
  updatedAt: string;
};

function buildFaqSchema(locale: Locale) {
  const t = getContent(locale);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

function buildCommonSchema(locale: Locale, description: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ZAKI AI",
      url: SITE_URL,
      inLanguage: locale,
      description,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Nova Nuggets",
      url: "https://www.novanuggets.com",
      logo: `${SITE_URL}/favicon.svg`,
      sameAs: ["https://instagram.com/chatzaki.ai"],
    },
  ];
}

function toAbsoluteUrl(pathname: string) {
  if (pathname === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${pathname.endsWith("/") ? pathname.slice(0, -1) : pathname}/`;
}

function buildAlternates(pathname: string) {
  const route = getRouteDefinition(pathname);
  if (!route) {
    return {
      en: `${SITE_URL}/`,
      ar: `${SITE_URL}/ar/`,
      "x-default": `${SITE_URL}/`,
    };
  }

  return Object.fromEntries(
    Object.entries(getAlternatesForRoute(route)).map(([hreflang, href]) => [
      hreflang,
      toAbsoluteUrl(href),
    ])
  );
}

function buildWebPageSchema(name: string, url: string, locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url,
    inLanguage: locale,
    description,
  };
}

export function getRouteSeo(pathname: string): RouteSeo {
  const route = resolveRenderablePath(pathname);
  const routeDefinition = getRouteDefinition(route);
  const locale: Locale = routeDefinition?.locale ?? (route.startsWith("/ar") ? "ar" : "en");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alternates = buildAlternates(route);
  const faqSchema = buildFaqSchema(locale);
  const localeTag = locale === "ar" ? "ar_AR" : "en_US";
  const altLocaleTag =
    routeDefinition?.requiresAlternates && locale === "ar"
      ? "en_US"
      : routeDefinition?.requiresAlternates
        ? "ar_AR"
        : localeTag;

  if (route === "/product/" || route === "/ar/product/") {
    const description =
      locale === "ar"
        ? "لوحة منتج زكي V2: Chat وAgent وBrain عامة، Learn وHire بيتا خاصة، وDesign قائمة انتظار حتى تكتمل مساراتها."
        : "ZAKI is an intelligence layer for people building their next chapter: Agent acts, Spaces keep work focused, and Brain remembers what matters.";
    return {
      title:
        locale === "ar"
          ? "منتج زكي | Chat وAgent وBrain"
          : "ZAKI Product — One login. One memory. Every surface.",
      description,
      canonical: locale === "ar" ? `${SITE_URL}/ar/product/` : `${SITE_URL}/product/`,
      lang: locale,
      dir,
      imageAlt: locale === "ar" ? "صفحة منتج زكي" : "ZAKI product page",
      localeTag,
      altLocaleTag,
      keywords:
        locale === "ar"
          ? "زكي, منتج زكي, ZAKI Agent, ZAKI Brain, Chat"
          : "ZAKI product, ZAKI Agent, ZAKI Brain, AI Chat, persistent intelligence",
      schema: [
        ...buildCommonSchema(locale, description),
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "ZAKI Product",
          url: locale === "ar" ? `${SITE_URL}/ar/product/` : `${SITE_URL}/product/`,
          inLanguage: locale,
          description,
        },
        faqSchema,
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (
    route === "/pricing/" ||
    route === "/ar/pricing/" ||
    route === "/use-cases/" ||
    route === "/ar/use-cases/"
  ) {
    const isPricing = route.includes("/pricing/");
    const title = isPricing
      ? locale === "ar"
        ? "أسعار زكي | ابدأ مجانًا"
        : "ZAKI Pricing | Start Free"
        : locale === "ar"
        ? "استخدامات زكي | Chat وAgent وBrain"
        : "ZAKI Use Cases — Less overhead. More momentum.";
    const description = isPricing
      ? locale === "ar"
        ? "ابدأ من Chat مجانًا، واستخدم Agent وBrain للاستمرارية والذاكرة عندما يحتاج العمل إلى حساب."
        : "ZAKI pricing: Free, Personal USD 15, Pro USD 45, Pro MAX USD 99. Start free and upgrade for more room, deeper memory, and priority."
      : locale === "ar"
        ? "استخدم زكي للكتابة والبحث والعمل ثنائي اللغة والمتابعة والذاكرة، مع بقاء Learn وHire بيتا وDesign انتظار."
        : "How founders, adventurers, and operators use ZAKI: an agent that acts, spaces for focused work, and a memory that carries context forward.";
    const pricingTitle =
      locale === "ar" ? "أسعار زكي | ابدأ مجانًا" : "ZAKI Pricing — Every live product included.";
    const canonical = toAbsoluteUrl(route);
    return {
      title: isPricing ? pricingTitle : title,
      description,
      canonical,
      lang: locale,
      dir,
      imageAlt: title,
      localeTag,
      altLocaleTag,
      keywords: isPricing
        ? "ZAKI pricing, AI chat pricing, ZAKI Agent pricing"
        : "ZAKI use cases, AI assistant use cases, bilingual AI work",
      schema: [
        ...buildCommonSchema(locale, description),
        buildWebPageSchema(title, canonical, locale, description),
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (route === "/faq/" || route === "/ar/faq/") {
    const description =
      locale === "ar"
        ? "اعرف الفرق بين زكي وSpaces، ما الذي تتضمنه البيتا العامة، ولماذا هي تجريبية، ومتى تبدأ الاشتراكات."
        : "Learn the difference between ZAKI and Spaces, what the current Agent preview includes, why it is experimental, and when subscriptions arrive.";
    return {
      title:
        locale === "ar"
          ? "الأسئلة الشائعة | زكي وSpaces"
          : "ZAKI FAQ | Chat, Agent, and Personal AI",
      description,
      canonical: locale === "ar" ? `${SITE_URL}/ar/faq/` : `${SITE_URL}/faq/`,
      lang: locale,
      dir,
      imageAlt: locale === "ar" ? "صفحة الأسئلة الشائعة لزكي" : "ZAKI FAQ page",
      localeTag,
      altLocaleTag,
      keywords:
        locale === "ar"
          ? "الأسئلة الشائعة, زكي, Spaces, تحديثات زكي"
          : "ZAKI FAQ, Spaces, ZAKI Agent, Personal AI FAQ",
      schema: [...buildCommonSchema(locale, description), faqSchema],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (route === "/story/" || route === "/ar/story/") {
    const description =
      locale === "ar"
        ? "لماذا يوجد زكي: كيف يجمع بين Spaces كمساحات عمل منظّمة وبين زكي كوكيل ذكاء شخصي مستمر يتشكل علنًا."
        : "Why ZAKI exists: the last mile between people and AI is continuity. ZAKI started as a promise to remember, support, and show up.";
    const canonical = toAbsoluteUrl(route);
    return {
      title:
        locale === "ar"
          ? "لماذا زكي | ZAKI · ذكاء عربي أولًا"
          : "ZAKI Story — It started as a promise.",
      description,
      canonical,
      lang: locale,
      dir,
      imageAlt: locale === "ar" ? "صفحة حكاية زكي" : "ZAKI story page",
      localeTag,
      altLocaleTag,
      keywords:
        locale === "ar"
          ? "حكاية زكي, قصة زكي, ذكاء عربي, ZAKI story"
          : "ZAKI story, Arabic AI story, why ZAKI, building in public",
      schema: [
        ...buildCommonSchema(locale, description),
        buildWebPageSchema("Why ZAKI", canonical, locale, description),
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (route === "/contact/" || route === "/ar/contact/") {
    const content = getContactContent(locale);
    const canonical = toAbsoluteUrl(route);
    return {
      title: content.seo.title,
      description: content.seo.description,
      canonical,
      lang: locale,
      dir,
      imageAlt: content.seo.imageAlt,
      localeTag,
      altLocaleTag,
      keywords: content.seo.keywords,
      schema: [
        ...buildCommonSchema(locale, content.seo.description),
        buildWebPageSchema(content.title, canonical, locale, content.seo.description),
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (
    route === "/privacy/" ||
    route === "/ar/privacy/" ||
    route === "/terms/" ||
    route === "/ar/terms/" ||
    route === "/compliance/" ||
    route === "/ar/compliance/"
  ) {
    const legalKey =
      route.includes("/privacy/")
        ? "privacy"
        : route.includes("/terms/")
          ? "terms"
          : "compliance";
    const content = getLegalContent(legalKey, locale);
    const canonical = toAbsoluteUrl(route);
    return {
      title: content.seo.title,
      description: content.seo.description,
      canonical,
      lang: locale,
      dir,
      imageAlt: content.seo.imageAlt,
      localeTag,
      altLocaleTag,
      keywords: content.seo.keywords,
      schema: [
        ...buildCommonSchema(locale, content.seo.description),
        buildWebPageSchema(content.title, canonical, locale, content.seo.description),
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  const description =
    locale === "ar"
      ? "زكي هو وكيل ذكاء شخصي بذاكرة مستمرة، أتمتة مجدولة، وثلاثة أوضاع تختار النموذج المناسب لمهمتك تلقائيًا. ابدأ مجانًا."
      : "ZAKI is the intelligence layer for your next chapter: one login for an agent that acts, spaces for focused work, and a memory you own.";

  return {
    title:
      locale === "ar"
        ? "زكي | مساعد شخصي ذكي ومشغّل سلس"
        : "ZAKI — Never build alone",
    description,
    canonical: locale === "ar" ? `${SITE_URL}/ar/` : `${SITE_URL}/`,
    lang: locale,
    dir,
    imageAlt: locale === "ar" ? "واجهة زكي الرئيسية" : "ZAKI homepage experience",
    localeTag,
    altLocaleTag,
      keywords:
        locale === "ar"
          ? "زكي, ZAKI, Spaces, مساعد شخصي ذكي, ذكاء مستمر"
          : "ZAKI, Spaces, Personal AI Operator, smooth operator, persistent AI",
    schema: [
      ...buildCommonSchema(locale, description),
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "ZAKI AI",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: ["en", "ar"],
        description,
        url: SITE_URL,
        offers: [
          {
            "@type": "Offer",
            category: "Chat",
            price: "0",
            priceCurrency: "USD",
            url: `${APP_URL}/?source=website_schema&intent=dashboard`,
          },
          {
            "@type": "Offer",
            category: "Agent",
            price: "0",
            priceCurrency: "USD",
            url: `${APP_URL}/?source=website_schema&intent=dashboard`,
          },
        ],
        featureList: [
          locale === "ar" ? "Spaces متاحة الآن" : "Spaces are live now",
          locale === "ar" ? "ZAKI Agent بذاكرة واستمرارية" : "ZAKI experimental current Agent preview",
          locale === "ar" ? "ذاكرة ومتابعة عبر Agent" : "account memory and follow-through",
          locale === "ar" ? "ذاكرة وتحكم أوضح" : "Clearer memory and control",
        ],
      },
    ],
    alternates,
    updatedAt: SEO_UPDATED_AT,
  };
}
