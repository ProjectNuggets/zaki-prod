import { getContent, type Locale } from "./content";
import {
  getAlternatesForRoute,
  getRouteDefinition,
  resolveRenderablePath,
} from "./routeRegistry";
import {
  getComparisonContent,
  getContactContent,
  getHowToContent,
  getLegalContent,
} from "./routeContent";

export const SITE_URL = "https://chatzaki.com";
export const APP_URL = "https://app.chatzaki.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/slides/1.png`;
export const SEO_UPDATED_AT = "2026-03-14T00:00:00Z";

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

function buildHowToSchema(slug: Parameters<typeof getHowToContent>[0], canonical: string) {
  const content = getHowToContent(slug);
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: content.title,
    url: canonical,
    step: content.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.text,
    })),
  };
}

function buildComparisonSchema(seoKey: "vs-chatgpt" | "best-arabic-ai-assistant", canonical: string) {
  if (seoKey === "best-arabic-ai-assistant") {
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Best Arabic AI Assistant in 2026",
      url: canonical,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ZAKI Chat" },
        { "@type": "ListItem", position: 2, name: "ChatGPT" },
        { "@type": "ListItem", position: 3, name: "Daleela" },
        { "@type": "ListItem", position: 4, name: "Labiba" },
        { "@type": "ListItem", position: 5, name: "Yasmina AI" },
      ],
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "ZAKI Chat vs ChatGPT Comparison",
    url: canonical,
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

  if (route === "/zaki-bot/" || route === "/ar/zaki-bot/") {
    const description =
      locale === "ar"
        ? "زكي هو البيتا العامة لمشغّل ذكاء شخصي تجريبي: مستمر، تقني، ومدعوم بـ Nullalis مع 5 رسائل مجانية كل 24 ساعة."
        : "ZAKI is the experimental public beta of a Personal AI Operator: persistent, technical, and powered by Nullalis with 5 free messages every 24 hours.";
    return {
      title:
        locale === "ar"
          ? "زكي | البيتا العامة لمشغّل ذكاء شخصي"
          : "ZAKI | Public Beta for a Personal AI Operator",
      description,
      canonical: locale === "ar" ? `${SITE_URL}/ar/zaki-bot/` : `${SITE_URL}/zaki-bot/`,
      lang: locale,
      dir,
      imageAlt: locale === "ar" ? "صفحة زكي التجريبية" : "ZAKI experimental beta page",
      localeTag,
      altLocaleTag,
      keywords:
        locale === "ar"
          ? "زكي, ZAKI, مشغّل ذكاء شخصي, BOT beta, Nullalis, مساعد ذكاء شخصي"
          : "ZAKI, Personal AI Operator, BOT beta, Nullalis, Arabic AI product",
      schema: [
        ...buildCommonSchema(locale, description),
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "ZAKI",
          url: locale === "ar" ? `${SITE_URL}/ar/zaki-bot/` : `${SITE_URL}/zaki-bot/`,
          inLanguage: locale,
          description,
        },
        faqSchema,
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (route === "/faq/" || route === "/ar/faq/") {
    const description =
      locale === "ar"
        ? "اعرف الفرق بين ZAKI Chat وزكي، ما الذي تتضمنه البيتا العامة، ولماذا هي تجريبية، ومتى تبدأ الاشتراكات."
        : "Learn the difference between ZAKI Chat and ZAKI, what the public beta includes, why it is experimental, and when subscriptions arrive.";
    return {
      title:
        locale === "ar"
          ? "الأسئلة الشائعة | ZAKI Chat وزكي"
          : "ZAKI FAQ | Chat, Beta, and Personal AI",
      description,
      canonical: locale === "ar" ? `${SITE_URL}/ar/faq/` : `${SITE_URL}/faq/`,
      lang: locale,
      dir,
      imageAlt: locale === "ar" ? "صفحة الأسئلة الشائعة لزكي" : "ZAKI FAQ page",
      localeTag,
      altLocaleTag,
      keywords:
        locale === "ar"
          ? "الأسئلة الشائعة, زكي, ZAKI Chat, بيتا زكي, Nullalis"
          : "ZAKI FAQ, ZAKI Chat, ZAKI beta, Nullalis, Personal AI FAQ",
      schema: [...buildCommonSchema(locale, description), faqSchema],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (route === "/story/" || route === "/ar/story/") {
    const description =
      locale === "ar"
        ? "حكاية زكي: لماذا بُني ذكاء اصطناعي عربي أولًا، وكيف يتشكّل علنًا مع مجتمعه."
        : "The ZAKI story: why we built Arabic-first AI, how it's shaped in public, and where it's going.";
    const canonical = toAbsoluteUrl(route);
    return {
      title:
        locale === "ar"
          ? "حكايتنا | ZAKI — ذكاء عربي أولًا"
          : "Our Story | ZAKI — Arabic-First AI",
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
        buildWebPageSchema("Our Story", canonical, locale, description),
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (route === "/vs-chatgpt/" || route === "/best-arabic-ai-assistant/") {
    const comparisonKey = route === "/vs-chatgpt/" ? "vs-chatgpt" : "best-arabic-ai-assistant";
    const content = getComparisonContent(comparisonKey);
    const canonical = toAbsoluteUrl(route);
    return {
      title: content.seo.title,
      description: content.seo.description,
      canonical,
      lang: "en",
      dir: "ltr",
      imageAlt: content.seo.imageAlt,
      localeTag: "en_US",
      altLocaleTag: "en_US",
      keywords: content.seo.keywords,
      schema: [
        ...buildCommonSchema("en", content.seo.description),
        buildWebPageSchema(content.title, canonical, "en", content.seo.description),
        buildComparisonSchema(comparisonKey, canonical),
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (route.startsWith("/how-to/")) {
    const slug = route.replace(/^\/how-to\//, "").replace(/\/$/, "") as Parameters<typeof getHowToContent>[0];
    const content = getHowToContent(slug);
    const canonical = toAbsoluteUrl(route);
    return {
      title: content.seo.title,
      description: content.seo.description,
      canonical,
      lang: "en",
      dir: "ltr",
      imageAlt: content.seo.imageAlt,
      localeTag: "en_US",
      altLocaleTag: "en_US",
      keywords: content.seo.keywords,
      schema: [
        ...buildCommonSchema("en", content.seo.description),
        buildWebPageSchema(content.title, canonical, "en", content.seo.description),
        buildHowToSchema(slug, canonical),
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
      ? "زكي يجمع بين ZAKI Chat المتاح اليوم وبين زكي، مشغّل الذكاء الشخصي التجريبي القادم. دردشة عملية الآن، ومشغّل شخصي للمستقبل."
      : "ZAKI combines ZAKI Chat, the practical live workspace, with ZAKI, the experimental Personal AI Operator. Daily AI now, operator future next.";

  return {
    title:
      locale === "ar"
        ? "زكي | دردشة يومية الآن ومشغّل شخصي للمستقبل"
        : "ZAKI | Daily AI Now, Personal Operator Next",
    description,
    canonical: locale === "ar" ? `${SITE_URL}/ar/` : `${SITE_URL}/`,
    lang: locale,
    dir,
    imageAlt: locale === "ar" ? "واجهة زكي الرئيسية" : "ZAKI homepage experience",
    localeTag,
    altLocaleTag,
    keywords:
      locale === "ar"
        ? "زكي, ZAKI, ZAKI Chat, مساعد ذكاء شخصي, AI عربي, Nullalis"
        : "ZAKI, ZAKI Chat, Personal AI Operator, Arabic AI, Nullalis, bilingual AI",
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
            category: "Student",
            price: "8",
            priceCurrency: "USD",
            url: `${APP_URL}/pricing?auth=signup`,
          },
          {
            "@type": "Offer",
            category: "Personal",
            price: "13",
            priceCurrency: "USD",
            url: `${APP_URL}/pricing?auth=signup`,
          },
        ],
        featureList: [
          locale === "ar" ? "ZAKI Chat متاح الآن" : "ZAKI Chat is live now",
          locale === "ar" ? "زكي بيتا عامة تجريبية" : "ZAKI experimental public beta",
          locale === "ar" ? "5 رسائل مجانية كل 24 ساعة" : "5 free messages every 24 hours",
          locale === "ar" ? "ذاكرة وتحكم أوضح" : "Clearer memory and control",
        ],
      },
    ],
    alternates,
    updatedAt: SEO_UPDATED_AT,
  };
}
