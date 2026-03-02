import { content } from "./components/landingContent";

export const APP_URL = "https://app.chatzaki.com";
export const SITE_URL = "https://chatzaki.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/slides/1.png`;
export const SEO_UPDATED_AT = "2026-03-02T00:00:00Z";

export function normalizeLocale(locale) {
  return locale === "ar" ? "ar" : "en";
}

export function getCanonicalUrl(locale) {
  return normalizeLocale(locale) === "ar" ? `${SITE_URL}/ar/` : `${SITE_URL}/`;
}

export function getAlternateLanguageUrls() {
  return {
    en: `${SITE_URL}/`,
    ar: `${SITE_URL}/ar/`,
    "x-default": `${SITE_URL}/`,
  };
}

export function getSeoData(locale) {
  const normalized = normalizeLocale(locale);
  if (normalized === "ar") {
    return {
      title: "زكي AI | مساعد شخصي عربي آمن وواعٍ بالسياق",
      description:
        "زكي هو Personal Assistant AI بالعربية والإنجليزية، بذاكرة تحت تحكمك، وبنهج آمن وسيادي للاستخدام اليومي والعمل.",
      keywords:
        "زكي, ZAKI AI, مساعد شخصي, Personal Assistant AI, AI Agent, ذكاء اصطناعي عربي, ذكاء سيادي, مساعد آمن, Arabic AI Assistant",
      canonical: getCanonicalUrl("ar"),
      localeTag: "ar_AR",
      altLocaleTag: "en_US",
      imageAlt: "واجهة زكي الذكية باللغة العربية",
      updatedAt: SEO_UPDATED_AT,
      lang: "ar",
      dir: "rtl",
    };
  }

  return {
    title: "ZAKI AI | Personal Assistant AI for Arabic and English",
    description:
      "ZAKI is a personal assistant AI for Arabic and English workflows, built for cultural context, memory control, AI-agent workflows, and sovereign-by-design deployment.",
    keywords:
      "ZAKI AI, personal assistant AI, Arabic AI assistant, AI agent, sovereign AI, culturally aware AI, bilingual AI, Arabic chatbot alternative",
    canonical: getCanonicalUrl("en"),
    localeTag: "en_US",
    altLocaleTag: "ar_AR",
    imageAlt: "ZAKI AI landing experience",
    updatedAt: SEO_UPDATED_AT,
    lang: "en",
    dir: "ltr",
  };
}

export function getStructuredData(locale) {
  const normalized = normalizeLocale(locale);
  const t = content[normalized] || content.en;
  const seo = getSeoData(normalized);

  return {
    website: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ZAKI AI",
      url: SITE_URL,
      inLanguage: normalized,
      description: seo.description,
      publisher: {
        "@type": "Organization",
        name: "Nova Nuggets",
        url: "https://www.novanuggets.com",
      },
    },
    organization: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Nova Nuggets",
      url: "https://www.novanuggets.com",
      logo: `${SITE_URL}/favicon.svg`,
      sameAs: ["https://instagram.com/chatzaki.ai"],
    },
    app: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ZAKI AI",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: ["en", "ar"],
      description: seo.description,
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
        {
          "@type": "Offer",
          category: "Gift Code",
          price: "15",
          priceCurrency: "USD",
          url: `${APP_URL}/pricing?auth=signup&intent=gift_code&source=website_pricing`,
        },
      ],
      featureList: [
        normalized === "ar" ? "مساعد شخصي واعٍ ثقافيًا" : "Culturally aware personal assistant",
        normalized === "ar" ? "ذاكرة تحت تحكم المستخدم" : "User-controlled memory",
        normalized === "ar" ? "دعم العربية والإنجليزية" : "Arabic and English support",
        normalized === "ar" ? "خارطة AI Agents تنفيذية" : "AI-agent workflow roadmap",
      ],
      publisher: {
        "@type": "Organization",
        name: "Nova Nuggets",
      },
    },
    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (Array.isArray(t.faq?.items) ? t.faq.items : []).slice(0, 6).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    newsroom: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: normalized === "ar" ? "غرفة أخبار زكي" : "ZAKI Newsroom",
      itemListElement: (Array.isArray(t.updatesCarousel?.slides) ? t.updatesCarousel.slides : []).map(
        (slide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Thing",
            name: slide.title,
            description: slide.description,
            url: slide.link?.url || `${seo.canonical}#updates-carousel`,
          },
        })
      ),
    },
  };
}

export function renderJsonLdScripts(locale) {
  const blocks = getStructuredData(locale);
  return Object.entries(blocks)
    .map(
      ([key, value]) =>
        `<script type="application/ld+json" id="zaki-${key}-jsonld">${JSON.stringify(value)}</script>`
    )
    .join("\n");
}
