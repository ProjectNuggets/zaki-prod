import { useEffect, useMemo, useRef, useState } from "react";
import { content, resolveLocale } from "./landingContent";

const APP_URL = "https://app.chatzaki.com";
const SITE_URL = "https://chatzaki.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/slides/1.png`;
const SEO_UPDATED_AT = "2026-02-25T00:00:00Z";
const HORIZONTAL_SLIDE_IMAGES = [
  { src: "/slides/1.png" },
  { src: "/slides/2.png" },
  { src: "/slides/3.png" },
  { src: "/slides/4.png" },
  { src: "/slides/5.png" },
  { src: "/slides/6.png" },
];

function upsertMeta(attr, key, content) {
  if (typeof document === "undefined") return;
  const selector = `meta[${attr}="${key}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function upsertLink(rel, href, hreflang) {
  if (typeof document === "undefined") return;
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", rel);
    if (hreflang) node.setAttribute("hreflang", hreflang);
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

function upsertJsonLd(id, payload) {
  if (typeof document === "undefined") return;
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("script");
    node.setAttribute("type", "application/ld+json");
    node.setAttribute("id", id);
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(payload);
}

function Logo() {
  return (
    <div className="inline-flex h-[42px] w-[70px] items-center justify-center rounded-l-[18px] bg-transparent">
      <svg
        aria-label="ZAKI"
        className="h-[27px] w-auto"
        fill="none"
        viewBox="0 0 44 30"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M43.636 10.909c0 6.025-4.884 10.909-10.909 10.909v-5.454a5.455 5.455 0 0 0 5.455-5.455H43.636ZM21.818 10.909c0 6.025-4.884 10.909-10.909 10.909v-5.454a5.455 5.455 0 0 0 5.455-5.455h5.454ZM10.909 21.818C4.885 21.818 0 16.934 0 10.909h5.455a5.455 5.455 0 0 0 5.454 5.455v5.454ZM21.818 10.909C21.818 4.885 26.702 0 32.727 0v5.455a5.455 5.455 0 0 0-5.454 5.454h-5.455Z" fill="#D24430" />
        <path d="M38.182 2.727A2.727 2.727 0 1 1 43.636 2.727 2.727 2.727 0 0 1 38.182 2.727Z" fill="#D24430" />
        <path d="M10.909 27.273a2.727 2.727 0 1 1 5.455 0 2.727 2.727 0 0 1-5.455 0Z" fill="#D24430" />
        <path d="M5.455 27.273a2.727 2.727 0 1 1 5.454 0 2.727 2.727 0 0 1-5.454 0Z" fill="#D24430" />
      </svg>
    </div>
  );
}

function NavPill({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center whitespace-nowrap px-2.5 text-[13px] font-medium leading-5 text-[#67604f] transition hover:text-[#2f2a24]"
    >
      {children}
    </button>
  );
}

function FaqItem({ item, isOpen, onToggle, index }) {
  const answerId = `faq-answer-${index}`;

  return (
    <article
      data-faq-item="true"
      data-faq-index={index}
      className={`rounded-2xl border p-5 shadow-[0_8px_28px_rgba(15,12,11,0.06)] transition-colors duration-300 ${
        isOpen ? "border-[#e5d8c8] bg-[#F7F2EA]" : "border-[#ece3d6] bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="flex w-full items-center justify-between gap-3 text-start"
      >
        <h3 className="text-[17px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#2f2a24]">{item.question}</h3>
        <span className="text-[18px] text-[#8f8f97]">{isOpen ? "−" : "+"}</span>
      </button>
      <div
        id={answerId}
        className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <p className="min-h-0 text-[15px] leading-7 tracking-[-0.003em] text-[#5f574d]">{item.answer}</p>
      </div>
    </article>
  );
}

function SlideVisual({ src, alt }) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-3xl border border-[#e6d7c4] bg-white shadow-[0_16px_34px_rgba(15,12,11,0.06)] lg:h-[430px]">
      {!broken ? (
        <>
          <img
            src={src}
            alt={alt}
            className="sr-only"
            onError={() => setBroken(true)}
            loading="lazy"
            decoding="async"
            fetchPriority={src.endsWith("/1.png") ? "high" : "auto"}
          />
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url(${src})`,
              backgroundRepeat: "repeat-x",
              backgroundSize: "auto 100%",
              backgroundPosition: "center top",
            }}
          />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_10%_0%,#f2e8db_0%,#fbfaf8_58%)]" />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#a0896d]">Image Slot</p>
              <p className="mt-2 text-sm text-[#7f7f88]">Drop your slide image here</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function LandingApp() {
  const locale = useMemo(resolveLocale, []);
  const t = content[locale] || content.en;
  const pricing = t.pricing || {
    heading: "",
    subheading: "",
    interval: { monthly: "Monthly", yearly: "Yearly" },
    plans: [],
    note: "",
  };
  const updatesCarousel = t.updatesCarousel || {
    heading: "",
    subheading: "",
    batchLabel: "",
    statusLabels: { done: "Done", next: "Next" },
    slides: [],
  };
  const updateTagLabels =
    locale === "ar"
      ? { launch: "إطلاق", milestone: "إنجاز", feature: "ميزة", next: "القادم" }
      : { launch: "Launch", milestone: "Milestone", feature: "Feature", next: "Next" };
  const prompts = t.hero.rotatingPrompts || [t.hero.placeholder];
  const [prompt, setPrompt] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeletingPrompt, setIsDeletingPrompt] = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [pricingInterval, setPricingInterval] = useState("monthly");
  const [activeSlide, setActiveSlide] = useState(1);
  const [activeUpdateSlide, setActiveUpdateSlide] = useState(1);
  const [isUpdatesDragging, setIsUpdatesDragging] = useState(false);
  const [whyScale, setWhyScale] = useState(0.97);
  const [whyWeight, setWhyWeight] = useState(480);
  const whyRef = useRef(null);
  const updatesSectionRef = useRef(null);
  const updatesViewportRef = useRef(null);
  const updatesTrackRef = useRef(null);
  const updatesCarouselRef = useRef(null);
  const updatesGsapRef = useRef(null);
  const updatesOffsetRef = useRef(0);
  const updatesMaxOffsetRef = useRef(0);
  const updatesDraggingRef = useRef(false);
  const updatesDragStartXRef = useRef(0);
  const updatesDragStartOffsetRef = useRef(0);
  const horizontalSectionRef = useRef(null);
  const horizontalViewportRef = useRef(null);
  const horizontalTrackRef = useRef(null);

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitPrompt = (event) => {
    event.preventDefault();
    const query = prompt.trim() ? `&prompt=${encodeURIComponent(prompt.trim())}` : "";
    window.location.href = `${APP_URL}/?auth=signup${query}`;
  };

  const switchLangHref = locale === "ar" ? "/" : "/?lang=ar";
  const dir = t.dir;
  const langFlag = locale === "ar" ? "🇸🇾" : "🇬🇧";
  const legalBasePath = locale === "ar" ? "/ar" : "";
  const seo = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "زكي AI | مساعد شخصي عربي آمن وواعٍ بالسياق",
            description:
              "زكي هو Personal Assistant AI بالعربية والإنجليزية، بذاكرة تحت تحكمك، وبنهج آمن وسيادي للاستخدام اليومي والعمل.",
            keywords:
              "زكي, ZAKI AI, مساعد شخصي, Personal Assistant AI, AI Agent, ذكاء اصطناعي عربي, ذكاء سيادي, مساعد آمن, Arabic AI Assistant",
            canonical: `${SITE_URL}/?lang=ar`,
            localeTag: "ar_AR",
            altLocaleTag: "en_US",
            imageAlt: "واجهة زكي الذكية باللغة العربية",
            updatedAt: SEO_UPDATED_AT,
          }
        : {
            title: "ZAKI AI | Personal Assistant AI for Arabic and English",
            description:
              "ZAKI is a personal assistant AI for Arabic and English workflows, built for cultural context, memory control, AI-agent workflows, and sovereign-by-design deployment.",
            keywords:
              "ZAKI AI, personal assistant AI, Arabic AI assistant, AI agent, sovereign AI, culturally aware AI, bilingual AI, Arabic chatbot alternative",
            canonical: `${SITE_URL}/`,
            localeTag: "en_US",
            altLocaleTag: "ar_AR",
            imageAlt: "ZAKI AI landing experience",
            updatedAt: SEO_UPDATED_AT,
          },
    [locale]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = seo.title;
    upsertMeta("name", "description", seo.description);
    upsertMeta(
      "name",
      "keywords",
      seo.keywords
    );
    upsertMeta("name", "author", "Nova Nuggets");
    upsertMeta("name", "application-name", "ZAKI AI");
    upsertMeta("name", "apple-mobile-web-app-title", "ZAKI AI");
    upsertMeta(
      "name",
      "robots",
      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );
    upsertMeta("name", "theme-color", "#fcfcfd");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "ZAKI AI");
    upsertMeta("property", "og:title", seo.title);
    upsertMeta("property", "og:description", seo.description);
    upsertMeta("property", "og:url", seo.canonical);
    upsertMeta("property", "og:image", DEFAULT_OG_IMAGE);
    upsertMeta("property", "og:image:secure_url", DEFAULT_OG_IMAGE);
    upsertMeta("property", "og:image:type", "image/png");
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("property", "og:image:alt", seo.imageAlt);
    upsertMeta("property", "og:locale", seo.localeTag);
    upsertMeta("property", "og:locale:alternate", seo.altLocaleTag);
    upsertMeta("property", "og:updated_time", seo.updatedAt);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:site", "@chat_zaki");
    upsertMeta("name", "twitter:creator", "@chat_zaki");
    upsertMeta("name", "twitter:title", seo.title);
    upsertMeta("name", "twitter:description", seo.description);
    upsertMeta("name", "twitter:image", DEFAULT_OG_IMAGE);
    upsertMeta("name", "twitter:image:alt", seo.imageAlt);

    upsertLink("canonical", seo.canonical);
    upsertLink("alternate", `${SITE_URL}/`, "en");
    upsertLink("alternate", `${SITE_URL}/?lang=ar`, "ar");
    upsertLink("alternate", `${SITE_URL}/`, "x-default");

    upsertJsonLd("zaki-seo-jsonld", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ZAKI AI",
      url: SITE_URL,
      inLanguage: locale === "ar" ? "ar" : "en",
      description: seo.description,
      publisher: {
        "@type": "Organization",
        name: "Nova Nuggets",
        url: "https://www.novanuggets.com",
      },
    });

    upsertJsonLd("zaki-org-jsonld", {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Nova Nuggets",
      url: "https://www.novanuggets.com",
      logo: `${SITE_URL}/favicon.svg`,
      sameAs: ["https://instagram.com/chat_zaki"],
    });

    upsertJsonLd("zaki-app-jsonld", {
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
          url: `${APP_URL}/pricing?auth=signup`,
        },
        {
          "@type": "Offer",
          category: "Personal",
          url: `${APP_URL}/pricing?auth=signup`,
        },
      ],
      featureList: [
        locale === "ar" ? "مساعد شخصي واعٍ ثقافيًا" : "Culturally aware personal assistant",
        locale === "ar" ? "ذاكرة تحت تحكم المستخدم" : "User-controlled memory",
        locale === "ar" ? "دعم العربية والإنجليزية" : "Arabic and English support",
        locale === "ar" ? "خارطة AI Agents تنفيذية" : "AI-agent workflow roadmap",
      ],
      publisher: {
        "@type": "Organization",
        name: "Nova Nuggets",
      },
    });

    upsertJsonLd("zaki-faq-jsonld", {
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
    });

    upsertJsonLd("zaki-newsroom-jsonld", {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: locale === "ar" ? "غرفة أخبار زكي" : "ZAKI Newsroom",
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
    });
  }, [locale, seo]);

  useEffect(() => {
    setPrompt("");
    setPromptIndex(0);
    setIsDeletingPrompt(false);
    setActiveUpdateSlide(1);
    setIsUpdatesDragging(false);
  }, [locale]);

  useEffect(() => {
    const currentPrompt = prompts[promptIndex % prompts.length] || "";

    const typeDelay = 42;
    const deleteDelay = 22;
    const holdAfterType = 1400;
    const holdAfterDelete = 260;

    let timeout;

    if (!isDeletingPrompt && prompt === currentPrompt) {
      timeout = setTimeout(() => setIsDeletingPrompt(true), holdAfterType);
    } else if (isDeletingPrompt && prompt.length === 0) {
      timeout = setTimeout(() => {
        setIsDeletingPrompt(false);
        setPromptIndex((prev) => (prev + 1) % prompts.length);
      }, holdAfterDelete);
    } else {
      timeout = setTimeout(() => {
        setPrompt((prev) =>
          isDeletingPrompt
            ? prev.slice(0, -1)
            : currentPrompt.slice(0, prev.length + 1)
        );
      }, isDeletingPrompt ? deleteDelay : typeDelay);
    }

    return () => clearTimeout(timeout);
  }, [prompt, isDeletingPrompt, promptIndex, prompts]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!whyRef.current) return;
      const rect = whyRef.current.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const start = viewport * 0.85;
      const end = viewport * 0.2;
      const raw = (start - rect.top) / (start - end);
      const progress = Math.max(0, Math.min(1, raw));
      setWhyScale(0.97 + progress * 0.05);
      setWhyWeight(Math.round(480 + progress * 170));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (openFaq < 0) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== "function") {
        setOpenFaq(-1);
        return;
      }

      const faqCard = target.closest("[data-faq-item='true']");
      if (!faqCard) {
        setOpenFaq(-1);
        return;
      }

      const indexAttr = faqCard.getAttribute("data-faq-index");
      const clickedIndex = Number(indexAttr);
      if (Number.isNaN(clickedIndex) || clickedIndex !== openFaq) {
        setOpenFaq(-1);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openFaq]);

  useEffect(() => {
    if (isDesktop) return;
    const container = updatesCarouselRef.current;
    const totalSlides = updatesCarousel.slides.length;
    if (!container || totalSlides === 0) return;

    const cards = Array.from(container.querySelectorAll("[data-update-card='true']"));
    if (cards.length === 0) return;

    const syncActiveFromScroll = () => {
      const centerPoint = container.scrollLeft + container.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const distance = Math.abs(cardCenter - centerPoint);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveUpdateSlide(closestIndex + 1);
    };

    syncActiveFromScroll();
    container.addEventListener("scroll", syncActiveFromScroll, { passive: true });
    window.addEventListener("resize", syncActiveFromScroll);
    return () => {
      container.removeEventListener("scroll", syncActiveFromScroll);
      window.removeEventListener("resize", syncActiveFromScroll);
    };
  }, [updatesCarousel.slides.length, locale, isDesktop]);

  useEffect(() => {
    let mounted = true;
    import("gsap").then(({ gsap }) => {
      if (!mounted) return;
      updatesGsapRef.current = gsap;
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const viewportEl = updatesViewportRef.current;
    const trackEl = updatesTrackRef.current;
    if (!viewportEl || !trackEl) return;

    const totalSlides = updatesCarousel.slides.length || 1;
    const syncBounds = () => {
      updatesMaxOffsetRef.current = Math.max(trackEl.scrollWidth - viewportEl.clientWidth, 0);
      updatesOffsetRef.current = Math.max(0, Math.min(updatesOffsetRef.current, updatesMaxOffsetRef.current));
      trackEl.style.transform = `translate3d(${-updatesOffsetRef.current}px,0,0)`;
      const progress =
        updatesMaxOffsetRef.current === 0 ? 0 : updatesOffsetRef.current / updatesMaxOffsetRef.current;
      const slide = Math.min(totalSlides, Math.max(1, Math.round(progress * (totalSlides - 1)) + 1));
      setActiveUpdateSlide(slide);
    };

    syncBounds();
    window.addEventListener("resize", syncBounds);
    return () => window.removeEventListener("resize", syncBounds);
  }, [isDesktop, updatesCarousel.slides.length, locale]);

  useEffect(() => {
    let ctx;
    let mounted = true;

    const initHorizontalScroll = async () => {
      if (!isDesktop) return;
      if (!horizontalSectionRef.current || !horizontalViewportRef.current || !horizontalTrackRef.current) return;
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (!mounted) return;

      gsap.registerPlugin(ScrollTrigger);

      const sectionEl = horizontalSectionRef.current;
      const viewportEl = horizontalViewportRef.current;
      const trackEl = horizontalTrackRef.current;
      const getMaxTranslate = () => Math.max(trackEl.scrollWidth - viewportEl.clientWidth, 0);

      ctx = gsap.context(() => {
        gsap.set(trackEl, { x: 0 });
        gsap.to(trackEl, {
          x: () => -getMaxTranslate(),
          ease: "none",
          scrollTrigger: {
            trigger: sectionEl,
            start: "top top",
            end: () => `+=${getMaxTranslate()}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const total = t.horizontal.cards.length;
              const slide = Math.min(total, Math.max(1, Math.round(self.progress * (total - 1)) + 1));
              setActiveSlide(slide);
            },
          },
        });
      }, sectionEl);

      ScrollTrigger.refresh();
    };

    initHorizontalScroll();

    return () => {
      mounted = false;
      if (ctx) ctx.revert();
    };
  }, [t.horizontal.cards.length, isDesktop]);

  const goToUpdateSlide = (index) => {
    if (isDesktop) return;
    const container = updatesCarouselRef.current;
    if (!container) return;
    const cards = container.querySelectorAll("[data-update-card='true']");
    if (!cards.length) return;
    const nextIndex = Math.max(0, Math.min(index, cards.length - 1));
    cards[nextIndex].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    setActiveUpdateSlide(nextIndex + 1);
  };

  const setDesktopUpdatesOffset = (nextOffset, animate = true) => {
    const trackEl = updatesTrackRef.current;
    if (!trackEl) return;
    const clamped = Math.max(0, Math.min(nextOffset, updatesMaxOffsetRef.current));
    updatesOffsetRef.current = clamped;
    const total = updatesCarousel.slides.length || 1;
    const progress = updatesMaxOffsetRef.current === 0 ? 0 : clamped / updatesMaxOffsetRef.current;
    const slide = Math.min(total, Math.max(1, Math.round(progress * (total - 1)) + 1));
    setActiveUpdateSlide(slide);

    if (animate && updatesGsapRef.current) {
      updatesGsapRef.current.to(trackEl, {
        x: -clamped,
        duration: 0.35,
        ease: "power2.out",
        overwrite: true,
      });
      return;
    }
    trackEl.style.transform = `translate3d(${-clamped}px,0,0)`;
  };

  const snapUpdatesToNearestCard = () => {
    if (!isDesktop) return;
    const trackEl = updatesTrackRef.current;
    if (!trackEl) return;
    const cards = Array.from(trackEl.querySelectorAll("[data-update-card='true']"));
    if (!cards.length) return;
    const base = cards[0].offsetLeft;
    let nearest = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card) => {
      const candidate = Math.max(0, card.offsetLeft - base);
      const distance = Math.abs(candidate - updatesOffsetRef.current);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearest = candidate;
      }
    });
    setDesktopUpdatesOffset(nearest, true);
  };

  const onUpdatesDesktopPointerDown = (event) => {
    if (!isDesktop || event.pointerType !== "mouse" || event.button !== 0) return;
    updatesDraggingRef.current = true;
    setIsUpdatesDragging(true);
    updatesDragStartXRef.current = event.clientX;
    updatesDragStartOffsetRef.current = updatesOffsetRef.current;
    if (updatesViewportRef.current?.setPointerCapture) {
      updatesViewportRef.current.setPointerCapture(event.pointerId);
    }
  };

  const onUpdatesDesktopPointerMove = (event) => {
    if (!isDesktop || !updatesDraggingRef.current) return;
    event.preventDefault();
    const deltaX = event.clientX - updatesDragStartXRef.current;
    setDesktopUpdatesOffset(updatesDragStartOffsetRef.current - deltaX, false);
  };

  const onUpdatesDesktopPointerUp = (event) => {
    if (!isDesktop || !updatesDraggingRef.current) return;
    updatesDraggingRef.current = false;
    setIsUpdatesDragging(false);
    snapUpdatesToNearestCard();
    if (
      updatesViewportRef.current?.releasePointerCapture &&
      updatesViewportRef.current?.hasPointerCapture?.(event.pointerId)
    ) {
      updatesViewportRef.current.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div dir={dir} className="zaki-page min-h-screen overflow-x-hidden bg-[#fcfcfd] text-[#23252c]">
      <div className="zaki-hero-glow" aria-hidden="true" />
      <div className="zaki-left-beams" aria-hidden="true" />
      <div className="zaki-pattern" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1140px] px-4 pb-20 pt-10 md:px-8">
        <a
          href={switchLangHref}
          aria-label={locale === "ar" ? "Switch to English" : "Switch to Arabic"}
          className="fixed right-4 top-10 z-50 hidden h-10 w-10 items-center justify-center rounded-full border border-[#ddd5ca] bg-white/95 text-xl shadow-[0_2px_8px_rgba(15,12,11,0.1)] transition-transform duration-200 hover:scale-105 md:inline-flex md:right-8"
        >
          <span>{langFlag}</span>
        </a>

        <header className="fixed left-1/2 top-10 z-40 flex h-[52px] w-[calc(100%-24px)] max-w-[860px] -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#e7dfd3] bg-white/90 px-2 shadow-[0_2px_7px_rgba(15,12,11,0.05)] backdrop-blur-sm md:w-auto md:max-w-[calc(100%-24px)] md:px-3">
          <div className="shrink-0 flex items-center">
            <Logo />
          </div>

          <nav className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-max min-w-full items-center justify-center gap-1">
              <NavPill onClick={() => scrollToId("why")}>{t.nav.why}</NavPill>
              <NavPill onClick={() => scrollToId("horizontal-showcase")}>{t.nav.story}</NavPill>
              <NavPill onClick={() => scrollToId("contact")}>{t.nav.faq}</NavPill>
            </div>
          </nav>

          <a
            href={`${APP_URL}/pricing?auth=signup&plan=personal&interval=monthly&autostart=1&source=website_nav`}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#a33227] bg-[#d24430] px-3.5 text-[12px] font-semibold !text-white transition hover:bg-[#be3e2d] hover:!text-white"
            style={{ color: "#ffffff" }}
          >
            {t.hero.cta}
          </a>

          <div className="shrink-0 flex items-center md:hidden">
            <a
              href={switchLangHref}
              aria-label={locale === "ar" ? "Switch to English" : "Switch to Arabic"}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[#ddd5ca] bg-white px-2 text-[11px] font-semibold text-[#5c5f6a]"
            >
              {locale === "ar" ? "EN" : "AR"}
            </a>
          </div>
        </header>

        <section id="about" className="relative mx-auto mt-[clamp(190px,22vh,320px)] max-w-[920px] text-center md:mt-[clamp(220px,24vh,340px)]">
          <h1 className="text-balance text-[clamp(2rem,5vw,3.625rem)] font-semibold leading-[1.13] tracking-[-0.03em] text-[#312920]">
            {t.hero.title}
          </h1>

          <form
            onSubmit={submitPrompt}
            className="zaki-input-form mx-auto mt-8 w-full max-w-[760px]"
          >
            <div className="rounded-[20px] border border-[#e5d3bd] bg-[#efe2d3] shadow-[0px_16px_36px_rgba(15,15,15,0.06)]">
              <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] leading-4 text-[#88735A]">
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-white text-[#88735A]">⚡</span>
                <span>{t.hero.hint}</span>
              </div>

              <div className="rounded-b-[20px] rounded-t-[18px] border-t border-[#e6d5bf] bg-white px-3 py-3">
                <label htmlFor="prompt" className="sr-only">Prompt</label>
                <textarea
                  id="prompt"
                  value={prompt}
                  readOnly
                  placeholder=""
                  className="h-[44px] w-full resize-none bg-transparent px-1 py-1.5 text-sm leading-6 text-[#B28D67] outline-none placeholder:text-[#B28D67]"
                />

                <div className="flex items-center justify-between px-1 pt-2">
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="inline-flex size-8 items-center justify-center rounded-[10px] border border-[#eadfce] bg-[#f3eadf] text-[24px] leading-none text-[#c6a37d] transition hover:bg-[#eee2d3]"
                    aria-label="Clear prompt"
                  >+</button>

                  <button
                    type="submit"
                    className="inline-flex size-8 items-center justify-center rounded-[10px] bg-[#5a4a36] text-sm text-white transition hover:bg-[#483b2a]"
                    aria-label={t.hero.submit}
                  >↑</button>
                </div>
              </div>
            </div>
          </form>

          {/* Founding Campaign Banner */}
          <div className="mx-auto mt-[clamp(9rem,18vh,16rem)] w-full max-w-[520px] md:mt-[clamp(12rem,24vh,28rem)]">
            <div className="relative overflow-hidden rounded-2xl border border-[#e5d3bd] bg-gradient-to-b from-[#fdf8f2] to-[#f7f0e6] px-5 py-5 shadow-[0_8px_24px_rgba(15,12,11,0.06)]">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D24430] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
                <span className="inline-block size-1.5 rounded-full bg-white" />
                {t.earlyAccess.badge}
              </div>

              <h3 className="mt-3 text-[21px] font-semibold leading-tight tracking-[-0.01em] text-[#2f2a24]">
                {t.earlyAccess.heading}
              </h3>

              <p className="mt-2 text-[13px] leading-relaxed text-[#7a6f62]">{t.earlyAccess.description}</p>

              <ul className={`mt-3 flex list-disc flex-col gap-1 text-[13px] text-[#5f574d] ${locale === "ar" ? "pr-4 text-right" : "pl-4 text-left"}`}>
                {(t.earlyAccess.highlights || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="mt-4 block w-full rounded-xl bg-[#D24430] py-2.5 text-center text-[13px] font-semibold text-white transition hover:bg-[#be3e2d]"
              >
                {t.earlyAccess.cta}
              </button>
              <p className="mt-2 text-center text-[12px] text-[#8a7d6f]">{t.earlyAccess.secondary}</p>
              <div className="mt-3 rounded-xl border border-[#e7dbc9] bg-white/70 px-3 py-2">
                <div className="text-[12px] font-semibold text-[#5f574d]">{t.earlyAccess.campaignLabel}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6f6255]">{t.earlyAccess.campaignTeaser}</p>
              </div>
              <p className="mt-3 whitespace-pre-line text-center text-[12px] leading-relaxed text-[#6f6255]">
                {t.earlyAccess.instagramNote}{" "}
                <a
                  href="https://instagram.com/chat_zaki"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#D24430] underline decoration-[#D24430]/50 underline-offset-2"
                >
                  @chat_zaki
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-[clamp(9rem,18vh,16rem)] max-w-[900px] md:mt-[clamp(12rem,24vh,28rem)]" id="why" ref={whyRef}>
          <div
            className={`mx-auto max-w-[760px] text-[#2f3139] transition-[transform,font-weight] duration-150 ease-out will-change-transform ${
              locale === "ar" ? "text-right" : "text-left"
            }`}
            style={{
              transform: `scale(${whyScale})`,
              transformOrigin: "top center",
              fontWeight: whyWeight,
              fontVariationSettings: `'wght' ${whyWeight}`,
            }}
          >
            <p className="text-[clamp(1.25rem,2.4vw,1.45rem)] font-semibold leading-[1.45] tracking-[-0.01em]">
              {t.why.heading}
            </p>
            <p className="mt-1 text-[clamp(1.25rem,2.4vw,1.45rem)] font-semibold leading-[1.45] tracking-[-0.01em]">
              {t.why.subheading}
            </p>

            <p className="mt-9 text-[clamp(1rem,1.8vw,1.25rem)] leading-[1.7] text-[#3a3d48]">{t.why.intro}</p>

            <p className="mt-8 text-[clamp(1rem,1.8vw,1.25rem)] font-semibold leading-[1.45] text-[#2f3139]">
              {t.why.builtLine}{" "}
              <span className="inline-flex items-center gap-1.5 align-baseline">
                <svg
                  className="h-[18px] w-[18px] max-md:h-[16px] max-md:w-[16px]"
                  fill="none"
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="ZAKI favicon"
                >
                  <path d="M28 8C30.2091 8 32 6.20914 32 4C32 1.79086 30.2091 0 28 0C25.7909 0 24 1.79086 24 4C24 6.20914 25.7909 8 28 8Z" fill="#D24430"/>
                  <path d="M0 16C0 7.164 7.1632 0 16 0V8C11.5816 8 8 11.5824 8 16H0Z" fill="#D24430"/>
                  <path d="M32 16C32 24.836 24.8368 32 16 32V24C20.4184 24 24 20.4176 24 16H32Z" fill="#D24430"/>
                </svg>
                <span className="text-[clamp(1.125rem,2.2vw,1.5rem)] leading-none">😎</span>
              </span>
            </p>

            <p className="mt-8 text-[clamp(1rem,1.8vw,1.25rem)] leading-[1.7] text-[#3a3d48]">
              {t.why.description} <span className="text-[clamp(1.125rem,2.2vw,1.375rem)] leading-none">🫵🏼</span>
            </p>
            <p className="mt-6 text-[clamp(1rem,1.8vw,1.25rem)] leading-[1.7] text-[#3a3d48]">{t.why.workflow}</p>

            <p className="mt-6 text-[clamp(1rem,1.8vw,1.25rem)] leading-[1.6] text-[#3a3d48]">{t.why.friction}</p>
            <p className="mt-1 text-[clamp(1rem,1.8vw,1.25rem)] leading-[1.5] text-[#3a3d48]">{t.why.postFriction}</p>

            <p className="mt-8 text-[clamp(1rem,1.8vw,1.25rem)] leading-[1.6] text-[#3a3d48]">
              {t.why.human}{" "}
              <span className="text-[clamp(1.125rem,2.2vw,1.5rem)] leading-none" aria-label="United Kingdom, Saudi Arabia, Lebanon, Syria">🇬🇧🇸🇦🇱🇧🇸🇾</span>
            </p>
          </div>
        </section>

        <section
          id="updates-carousel"
          className="relative z-20 mt-[clamp(4rem,9vh,7rem)] w-screen max-w-none overflow-hidden bg-[#f7f2ea] md:mt-[clamp(5rem,10vh,8rem)]"
          style={{ left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw" }}
          ref={updatesSectionRef}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <img
              src="/assets/newsroom-bg.png"
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          {isDesktop ? (
            <div dir="ltr" className="relative z-10 h-[520px] overflow-hidden pb-8">
              <div className="relative z-10 mx-auto max-w-[1080px] px-6 pb-4 pt-10 md:px-12">
                <div className="text-left">
                  <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.02em] text-[#2f2a24]">
                    {updatesCarousel.heading}
                  </h2>
                  <p className="mt-2 max-w-[720px] text-sm leading-7 text-[#6f6255] md:text-base">
                    {updatesCarousel.subheading}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#9b8b79]">
                    {locale === "ar"
                      ? "اسحب يمينًا أو يسارًا لتصفح التحديثات."
                      : "Drag left or right to browse updates."}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5">
                    {updatesCarousel.slides.map((slide, index) => (
                      <span
                        key={`${slide.id}-progress`}
                        className={`h-2.5 rounded-full transition-all ${
                          index + 1 === activeUpdateSlide ? "w-7 bg-[#D24430]" : "w-2.5 bg-[#dacdbb]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div
                ref={updatesViewportRef}
                onMouseLeave={() => {
                  updatesDraggingRef.current = false;
                  setIsUpdatesDragging(false);
                }}
                onPointerDown={onUpdatesDesktopPointerDown}
                onPointerMove={onUpdatesDesktopPointerMove}
                onPointerUp={onUpdatesDesktopPointerUp}
                onPointerCancel={onUpdatesDesktopPointerUp}
                className={`relative z-10 h-[360px] overflow-x-hidden overflow-y-visible select-none ${
                  isUpdatesDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
              >
                <div
                  ref={updatesTrackRef}
                  dir="ltr"
                  className="flex h-full items-start gap-12 px-[max(40px,calc((100vw-1080px)/2+16px))] pb-8 pt-1 will-change-transform"
                >
                  {updatesCarousel.slides.map((slide) => (
                    <article
                      key={slide.id}
                      data-update-card="true"
                      className="group relative flex h-[286px] w-[min(320px,30vw)] min-w-[min(320px,30vw)] flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.24)_52%,rgba(255,255,255,0.10)_100%)] p-4 shadow-[0_22px_48px_rgba(22,18,14,0.20)] ring-1 ring-white/50 backdrop-blur-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="inline-flex items-center gap-2">
                          <span className="rounded-full border border-[#e0d0bd] bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.01em] text-[#8a7258]">
                            {updateTagLabels[slide.tag] || slide.tag}
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                              slide.status === "next"
                                ? "border border-[#e7d6b2] bg-[#fff6e5] text-[#996921]"
                                : "border border-[#d4e8d4] bg-[#eff9ef] text-[#2a7240]"
                            }`}
                          >
                            {updatesCarousel.statusLabels?.[slide.status] || slide.status}
                          </span>
                          {slide.ramadanBadge ? (
                            <span className="inline-flex items-center rounded-full border border-[#ecd9c4] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#7b6853]">
                              {slide.ramadanBadge.label}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {updatesCarousel.batchLabel ? (
                            <span className="text-[10px] font-semibold tracking-[0.04em] text-[#7f6f5f]">
                              {updatesCarousel.batchLabel}
                            </span>
                          ) : null}
                          <span className="text-lg" aria-hidden="true">
                            {slide.emoji || ""}
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-4 overflow-hidden text-[1.2rem] font-semibold tracking-[-0.01em] text-[#2f2a24] text-left [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {slide.title}
                      </h3>
                      <p className="mt-2 overflow-hidden text-sm leading-7 text-[#62574b] text-left [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                        {slide.description}
                      </p>
                      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                        <div className="text-xs font-medium text-[#8b7d6d] text-left">
                          {slide.dateLabel}
                        </div>
                        {slide.link?.url && slide.link?.label ? (
                          <a
                            href={slide.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-full border border-[#d7c5b1] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#5f574d] transition hover:border-[#c9b39c] hover:bg-[#fffaf3]"
                          >
                            {slide.link.label}
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div dir="ltr" className="relative z-10 mx-auto max-w-[1040px] px-4 py-4">
              <div className="mx-auto max-w-[760px] text-left">
                <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.02em] text-[#2f2a24]">
                  {updatesCarousel.heading}
                </h2>
                <p className="mx-auto mt-3 max-w-[680px] text-sm leading-7 text-[#6f6255] md:text-base">
                  {updatesCarousel.subheading}
                </p>
              </div>
              <div className="mt-7 flex items-center justify-start gap-2">
                <div className="flex items-center gap-2">
                  {updatesCarousel.slides.map((slide, index) => (
                    <button
                      key={`${slide.id}-dot`}
                      type="button"
                      onClick={() => goToUpdateSlide(index)}
                      aria-label={locale === "ar" ? `الانتقال للتحديث ${index + 1}` : `Go to update ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all ${
                        index + 1 === activeUpdateSlide ? "w-7 bg-[#D24430]" : "w-2.5 bg-[#dacdbb]"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div
                ref={updatesCarouselRef}
                dir="ltr"
                className="mt-4 flex items-stretch snap-x snap-proximity gap-8 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {updatesCarousel.slides.map((slide) => (
                  <article
                    key={slide.id}
                    data-update-card="true"
                    className="group relative flex h-[250px] w-[84%] shrink-0 snap-center flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.24)_52%,rgba(255,255,255,0.10)_100%)] p-4 shadow-[0_18px_38px_rgba(22,18,14,0.18)] ring-1 ring-white/50 backdrop-blur-xl sm:h-[262px] sm:w-[66%]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex items-center gap-2">
                        <span className="rounded-full border border-[#e0d0bd] bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.01em] text-[#8a7258]">
                          {updateTagLabels[slide.tag] || slide.tag}
                        </span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            slide.status === "next"
                              ? "border border-[#e7d6b2] bg-[#fff6e5] text-[#996921]"
                              : "border border-[#d4e8d4] bg-[#eff9ef] text-[#2a7240]"
                          }`}
                        >
                          {updatesCarousel.statusLabels?.[slide.status] || slide.status}
                        </span>
                        {slide.ramadanBadge ? (
                          <span className="inline-flex items-center rounded-full border border-[#ecd9c4] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#7b6853]">
                            {slide.ramadanBadge.label}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {updatesCarousel.batchLabel ? (
                          <span className="text-[10px] font-semibold tracking-[0.04em] text-[#7f6f5f]">
                            {updatesCarousel.batchLabel}
                          </span>
                        ) : null}
                        <span className="text-lg" aria-hidden="true">
                          {slide.emoji || ""}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 overflow-hidden text-[1.2rem] font-semibold tracking-[-0.01em] text-[#2f2a24] text-left [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {slide.title}
                    </h3>
                    <p className="mt-2 overflow-hidden text-sm leading-7 text-[#62574b] text-left [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                      {slide.description}
                    </p>
                    <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                      <div className="text-xs font-medium text-[#8b7d6d] text-left">
                        {slide.dateLabel}
                      </div>
                      {slide.link?.url && slide.link?.label ? (
                        <a
                          href={slide.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-[#d7c5b1] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#5f574d] transition hover:border-[#c9b39c] hover:bg-[#fffaf3]"
                        >
                          {slide.link.label}
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <section id="features" className="mx-auto mt-[clamp(3rem,7vh,5rem)] max-w-[1000px] md:mt-[clamp(4rem,8vh,6rem)]">
          <h2 className="whitespace-pre-line text-center text-3xl font-semibold tracking-[-0.02em] text-[#24252c] md:text-4xl">
            {t.features.heading}
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {t.features.cards.map((card) => (
              <article
                key={card.title}
                className="rounded-3xl border border-[#e8dccd] bg-[#F7F2EA] p-6 text-[#2f2a24] shadow-[0_14px_32px_rgba(15,12,11,0.06)]"
              >
                <h3 className="text-xl font-semibold tracking-[-0.01em]">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#62574b]">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="relative mt-36 w-screen max-w-none md:mt-44"
          style={{ left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw" }}
          id="horizontal-showcase"
          dir="ltr"
          ref={horizontalSectionRef}
        >
          {isDesktop ? (
            <div className="h-screen overflow-hidden bg-[#f7f2ea]">
              <div className="absolute inset-x-0 top-0 z-10 px-6 pb-4 pt-20 md:px-12">
                <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[#24252c] md:text-4xl">
                  {t.horizontal.heading}
                </h2>
                <p className="mt-2 text-sm text-[#6a6c74] md:text-base">{t.horizontal.subheading}</p>
                <div className="mt-4 max-w-[420px]">
                  <div className="flex items-center gap-1.5">
                    {t.horizontal.cards.map((card, index) => (
                      <div key={`${card.title}-progress`} className="flex items-center gap-1.5">
                        <span
                          className={`size-2.5 rounded-full transition ${
                            index + 1 <= activeSlide ? "bg-[#D24430]" : "bg-[#d8cbb8]"
                          }`}
                        />
                        {index < t.horizontal.cards.length - 1 ? (
                          <span
                            className={`h-px w-7 transition ${
                              index + 1 < activeSlide ? "bg-[#D24430]" : "bg-[#e4d9ca]"
                            }`}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div ref={horizontalViewportRef} className="relative z-10 h-full overflow-hidden">
                <div
                  ref={horizontalTrackRef}
                  className="flex h-full items-stretch gap-0 will-change-transform"
                >
                  {t.horizontal.cards.map((card, index) => (
                    <article
                      key={card.title}
                      className="flex h-full w-screen min-w-screen flex-col justify-center px-6 pb-16 pt-28 md:px-12 md:pb-20 md:pt-32"
                    >
                      <div className="mx-auto flex w-full max-w-[980px] flex-col items-center gap-8">
                        {index % 2 === 0 ? (
                          <SlideVisual
                            src={(HORIZONTAL_SLIDE_IMAGES[index] || HORIZONTAL_SLIDE_IMAGES[0]).src}
                            alt={`Zaki slide ${index + 1}`}
                          />
                        ) : null}

                        <div className="w-full max-w-[820px] p-4 text-center md:p-6">
                          <div className="inline-flex rounded-full border border-[#e1d3c1] bg-[#f6eee2] px-3 py-1 text-xs font-medium text-[#8d7359]">
                            {card.pill || `Slide ${index + 1}`}
                          </div>
                          <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.015em] text-[#2b2d35] md:text-4xl">
                            {card.title}
                          </h3>
                          <p className="mx-auto mt-4 max-w-[64ch] whitespace-pre-line text-base leading-8 text-[#555865] md:text-lg">
                            {card.description}
                          </p>
                        </div>

                        {index % 2 === 1 ? (
                          <SlideVisual
                            src={(HORIZONTAL_SLIDE_IMAGES[index] || HORIZONTAL_SLIDE_IMAGES[0]).src}
                            alt={`Zaki slide ${index + 1}`}
                          />
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#f7f2ea] px-4 py-12">
              <div className="mx-auto mb-8 max-w-[680px]">
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#24252c]">
                  {t.horizontal.heading}
                </h2>
                <p className="mt-2 text-sm text-[#6a6c74]">{t.horizontal.subheading}</p>
              </div>
              <div className="mx-auto grid max-w-[680px] gap-4">
                {t.horizontal.cards.map((card, index) => (
                  <article key={card.title} className="p-2">
                    <div className="inline-flex rounded-full border border-[#e1d3c1] bg-[#f6eee2] px-3 py-1 text-xs font-medium text-[#8d7359]">
                      {card.pill || `Slide ${index + 1}`}
                    </div>
                    <div className="mt-4">
                      <SlideVisual
                        src={(HORIZONTAL_SLIDE_IMAGES[index] || HORIZONTAL_SLIDE_IMAGES[0]).src}
                        alt={`Zaki slide ${index + 1}`}
                      />
                    </div>
                    <h3 className="mt-4 text-center text-2xl font-semibold tracking-[-0.015em] text-[#2b2d35]">
                      {card.title}
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-center text-sm leading-7 text-[#555865]">{card.description}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto mt-[clamp(4rem,10vh,8rem)] max-w-[1000px]">
          <h2 className="text-center text-[clamp(1.7rem,3.1vw,2.4rem)] font-semibold tracking-[-0.02em] text-[#2c2b32]">
            {t.useCases.heading}
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {t.useCases.items.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-[#e6d8c7] bg-[#F7F2EA] p-6 text-center shadow-[0_10px_24px_rgba(15,12,11,0.05)] transition hover:shadow-[0_14px_28px_rgba(15,12,11,0.08)]"
              >
                <h3 className="text-lg font-semibold text-[#2f2a24]">{item.title}</h3>
                <span className="mx-auto mt-1 block h-1.5 w-10 rounded-full bg-[#D24430]" />
                <p className="mt-3 text-sm leading-7 text-[#62574b]">{item.description}</p>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-7 max-w-[760px] text-center text-sm font-medium leading-7 text-[#6f6255]">{t.useCases.note}</p>
        </section>

        <section className="mx-auto mt-[clamp(3rem,8vh,6rem)] flex max-w-[980px] items-center justify-center">
          <div className="grid size-[220px] place-items-center rounded-[10px] bg-[#D24430] shadow-[0_18px_36px_rgba(15,12,11,0.16)] md:size-[280px]">
            <svg className="h-[96px] w-auto md:h-[120px]" fill="none" viewBox="0 0 44 30" xmlns="http://www.w3.org/2000/svg">
              <path d="M43.636 10.909c0 6.025-4.884 10.909-10.909 10.909v-5.454a5.455 5.455 0 0 0 5.455-5.455H43.636ZM21.818 10.909c0 6.025-4.884 10.909-10.909 10.909v-5.454a5.455 5.455 0 0 0 5.455-5.455h5.454ZM10.909 21.818C4.885 21.818 0 16.934 0 10.909h5.455a5.455 5.455 0 0 0 5.454 5.455v5.454ZM21.818 10.909C21.818 4.885 26.702 0 32.727 0v5.455a5.455 5.455 0 0 0-5.454 5.454h-5.455Z" fill="#F7F2EA" />
              <path d="M38.182 2.727A2.727 2.727 0 1 1 43.636 2.727 2.727 2.727 0 0 1 38.182 2.727Z" fill="#F7F2EA" />
              <path d="M10.909 27.273a2.727 2.727 0 1 1 5.455 0 2.727 2.727 0 0 1-5.455 0Z" fill="#F7F2EA" />
              <path d="M5.455 27.273a2.727 2.727 0 1 1 5.454 0 2.727 2.727 0 0 1-5.454 0Z" fill="#F7F2EA" />
            </svg>
          </div>
        </section>

        <section className="mx-auto mt-[clamp(3rem,8vh,6rem)] max-w-[980px]" id="pricing">
          <h2 className="text-center text-[clamp(1.8rem,3.2vw,2.6rem)] font-semibold tracking-[-0.02em] text-[#2c2b32]">
            {pricing.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-[720px] text-center text-sm leading-7 text-[#62574b] md:text-base">
            {pricing.subheading}
          </p>

          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e6d7c4] bg-white px-1 py-1 shadow-[0_10px_24px_rgba(15,12,11,0.06)]">
              <button
                type="button"
                onClick={() => setPricingInterval("monthly")}
                aria-pressed={pricingInterval === "monthly"}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  pricingInterval === "monthly"
                    ? "bg-[#D24430] text-white"
                    : "text-[#716657] hover:text-[#2f2a24]"
                }`}
              >
                {pricing.interval.monthly}
              </button>
              <button
                type="button"
                onClick={() => setPricingInterval("yearly")}
                aria-pressed={pricingInterval === "yearly"}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  pricingInterval === "yearly"
                    ? "bg-[#D24430] text-white"
                    : "text-[#716657] hover:text-[#2f2a24]"
                }`}
              >
                {pricing.interval.yearly}
              </button>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {pricing.plans.map((plan) => {
              const priceLabel =
                pricingInterval === "yearly" ? plan.priceYearly : plan.priceMonthly;
              const isFeatured = plan.tier === "personal";
              return (
                <article
                  key={plan.tier}
                  className={`rounded-2xl border bg-white px-5 py-6 shadow-[0_16px_30px_rgba(15,15,15,0.06)] ${
                    isFeatured ? "border-[#D24430]" : "border-[#e6d7c4]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[#2f2a24]">{plan.label}</div>
                    {pricingInterval === "yearly" ? (
                      <span className="rounded-full border border-[#f0d7b0] bg-[#fff7e8] px-2 py-0.5 text-[10px] font-semibold text-[#b97010]">
                        {pricing.yearlyBadge}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#2c2b32]">{priceLabel}</div>
                  <p className="mt-2 text-xs text-[#6b5f52]">{plan.blurb}</p>
                  <ul
                    className={`mt-3 flex list-disc flex-col gap-1 text-xs text-[#6f6255] ${
                      locale === "ar" ? "pr-4 text-right" : "pl-4 text-left"
                    }`}
                  >
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <a
                      href={`${APP_URL}/pricing?auth=signup&plan=${encodeURIComponent(
                        plan.tier
                      )}&interval=${encodeURIComponent(pricingInterval)}&autostart=1&source=website_pricing`}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[#a33227] bg-[#d24430] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#be3e2d] hover:!text-white"
                    >
                      {plan.cta}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mx-auto mt-4 max-w-[760px] text-center text-xs leading-6 text-[#7a6f62] md:text-sm">
            {pricing.note}
          </p>
        </section>

        <section className="mx-auto mt-[clamp(4rem,10vh,8rem)] max-w-[980px]">
          <div className="rounded-[28px] border border-[#e6d7c4] bg-[#f6ecdf] px-6 py-10 text-center shadow-[0_14px_32px_rgba(15,12,11,0.06)] md:px-12 md:py-14">
            <h2 className="text-[clamp(1.8rem,3.6vw,2.8rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-[#2c2b32]">
              {t.cta.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-[760px] whitespace-pre-line text-[clamp(1rem,1.5vw,1.2rem)] leading-8 text-[#575b66]">
              {t.cta.subheading}
            </p>

            <div className="mt-8 flex items-center justify-center">
              <a
                href={`${APP_URL}/?auth=signup`}
                className="inline-flex items-center justify-center rounded-full border border-[#a33227] bg-[#d24430] px-7 py-3 text-sm font-semibold !text-white transition hover:bg-[#be3e2d] hover:!text-white visited:!text-white"
                style={{ color: "#ffffff" }}
              >
                {t.cta.primary}
              </a>
            </div>

            <p className="mt-6 text-xs font-medium tracking-[0.02em] text-[#7a6f62] md:text-sm">
              {t.cta.trust}
            </p>
          </div>
        </section>

        <section className="mx-auto mt-[clamp(2rem,5vh,3.5rem)] max-w-[960px] md:mt-[clamp(2.5rem,6vh,4.5rem)]" id="contact">
          <h2 className="mb-6 text-center text-3xl font-semibold tracking-[-0.02em] text-[#D24430] md:text-4xl">
            {t.faq.heading}
          </h2>

          <div className="grid gap-3">
            {t.faq.items.map((item, index) => (
              <FaqItem
                key={item.question}
                item={item}
                index={index}
                isOpen={index === openFaq}
                onToggle={() => setOpenFaq((prev) => (prev === index ? -1 : index))}
              />
            ))}
          </div>
        </section>

        <footer className="mx-auto mt-[clamp(4rem,10vh,10rem)] flex max-w-[1000px] flex-col items-center justify-between gap-4 border-t border-[#eee3d4] pt-6 text-sm text-[#6e6f78] md:flex-row">
          <a
            href="https://www.novanuggets.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-[#23252c]"
          >
            <img
              src="/assets/nova-nuggets-logo.png"
              alt="Nova Nuggets"
              className="h-6 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
            <span>{t.footer.copyright}</span>
          </a>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href={`${legalBasePath}/terms/index.html`} className="hover:text-[#23252c]">
              {t.footer.legal}
            </a>
            <a href={`${legalBasePath}/privacy/index.html`} className="hover:text-[#23252c]">
              {t.footer.privacy}
            </a>
            <a href={`${legalBasePath}/compliance/index.html`} className="hover:text-[#23252c]">
              {t.footer.compliance}
            </a>
            <a href={`${legalBasePath}/faq/index.html`} className="hover:text-[#23252c]">
              {t.footer.faq}
            </a>
            <a href={switchLangHref} className="font-medium hover:text-[#23252c]">
              {t.nav.switchLang}
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
