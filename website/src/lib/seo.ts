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
export const SEO_UPDATED_AT = "2026-04-14T00:00:00Z";

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

function buildBreadcrumbSchema(crumbs: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
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

function buildComparisonSchema(
  seoKey: "vs-chatgpt" | "zaki-vs-spaces" | "best-arabic-ai-assistant" | "zaki-vs-openclaw",
  canonical: string
) {
  if (seoKey === "best-arabic-ai-assistant") {
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Best Arabic AI Assistant in 2026",
      url: canonical,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Spaces" },
        { "@type": "ListItem", position: 2, name: "ChatGPT" },
        { "@type": "ListItem", position: 3, name: "Daleela" },
        { "@type": "ListItem", position: 4, name: "Labiba" },
        { "@type": "ListItem", position: 5, name: "Yasmina AI" },
      ],
    };
  }

  if (seoKey === "zaki-vs-spaces") {
    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "ZAKI vs Spaces",
      url: canonical,
      description:
        "ZAKI is the persistent AI counterpart for planning, memory, and continuity. Spaces are the structured workspaces for focused execution.",
    };
  }

  if (seoKey === "zaki-vs-openclaw") {
    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "ZAKI vs OpenClaw",
      url: canonical,
      description:
        "A technical comparison of ZAKI's underlying runtime direction and OpenClaw across memory, tooling, ACP, and operational discipline.",
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Spaces vs ChatGPT Comparison",
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
        ? "زكي هو البيتا العامة لذكاء مستمر بذاكرة لكل مستخدم ومراحل عمل مرئية، مع ذاكرة ومتابعة عبر Agent أثناء البيتا."
        : "ZAKI is the current Agent preview for persistent AI with per-user memory, visible work phases, and account memory and follow-through through Agent.";
    return {
      title:
        locale === "ar"
          ? "زكي | البيتا العامة لمشغّل ذكاء شخصي"
          : "ZAKI | Personal Assistant AI & Smooth Operator",
      description,
      canonical: locale === "ar" ? `${SITE_URL}/ar/zaki-bot/` : `${SITE_URL}/zaki-bot/`,
      lang: locale,
      dir,
      imageAlt: locale === "ar" ? "صفحة زكي التجريبية" : "ZAKI Agent page",
      localeTag,
      altLocaleTag,
      keywords:
        locale === "ar"
          ? "زكي, ZAKI, مشغّل ذكاء شخصي, تحديثات زكي, مساعد ذكاء شخصي"
          : "ZAKI, Personal AI Operator, ZAKI Agent, persistent intelligence, smooth operator",
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
        : "Why ZAKI exists: combining Spaces as structured workspaces with ZAKI as a current Agent preview for persistent personal intelligence.";
    const canonical = toAbsoluteUrl(route);
    return {
      title:
        locale === "ar"
          ? "لماذا زكي | ZAKI · ذكاء عربي أولًا"
          : "Why ZAKI | Arabic-First AI with Product Discipline",
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

  if (route === "/autism-guidance/" || route === "/ar/autism-guidance/") {
    const description =
      locale === "ar"
        ? "صفحة ثنائية اللغة لإثبات مفهوم مساعد زكي للإرشاد حول التوحّد: للتثقيف، وتنظيم الملاحظات، والاستعداد للتقييم، لا للتشخيص الرسمي."
        : "A bilingual proof-of-concept page for ZAKI's autism guidance assistant: designed for education, structured observations, and assessment preparation, not formal diagnosis.";
    const canonical = toAbsoluteUrl(route);
    return {
      title:
        locale === "ar"
          ? "زكي | مساعد للإرشاد حول التوحّد"
          : "ZAKI | Autism Guidance Assistant",
      description,
      canonical,
      lang: locale,
      dir,
      imageAlt:
        locale === "ar"
          ? "صفحة زكي للإرشاد حول التوحّد"
          : "ZAKI autism guidance proof-of-concept page",
      localeTag,
      altLocaleTag,
      keywords:
        locale === "ar"
          ? "زكي, التوحّد, إرشاد التوحّد, الاستعداد للتقييم, مساعد ثنائي اللغة"
          : "ZAKI, autism guidance, autism assessment preparation, bilingual autism assistant, autism support",
      schema: [
        ...buildCommonSchema(locale, description),
        buildWebPageSchema(
          locale === "ar" ? "زكي | مساعد للإرشاد حول التوحّد" : "ZAKI | Autism Guidance Assistant",
          canonical,
          locale,
          description
        ),
      ],
      alternates,
      updatedAt: SEO_UPDATED_AT,
    };
  }

  if (
    route === "/vs-chatgpt/" ||
    route === "/zaki-vs-spaces/" ||
    route === "/best-arabic-ai-assistant/" ||
    route === "/zaki-vs-openclaw/"
  ) {
    const comparisonKey =
      route === "/vs-chatgpt/"
        ? "vs-chatgpt"
        : route === "/zaki-vs-spaces/"
          ? "zaki-vs-spaces"
          : route === "/best-arabic-ai-assistant/"
            ? "best-arabic-ai-assistant"
            : "zaki-vs-openclaw";
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
        buildBreadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: content.title, url: canonical },
        ]),
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
        buildBreadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "How To", url: `${SITE_URL}/how-to/` },
          { name: content.title, url: canonical },
        ]),
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
      : "ZAKI is a personal AI agent with persistent memory, scheduled automation, and three modes that route to the right model for every task. Start free.";

  return {
    title:
      locale === "ar"
        ? "زكي | مساعد شخصي ذكي ومشغّل سلس"
        : "ZAKI | Personal Assistant AI & Smooth Operator",
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
