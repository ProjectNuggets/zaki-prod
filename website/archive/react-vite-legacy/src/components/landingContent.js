import { appHandoffUrl } from "../lib/appHandoff";

export const content = {
  en: {
    lang: "en",
    dir: "ltr",
    nav: {
      why: "Chat",
      story: "ZAKI",
      faq: "FAQs",
      switchLang: "AR",
    },
    hero: {
      title: "Spaces for work. ZAKI for continuity.",
      subtitle:
        "Chat gives you useful work immediately. ZAKI Agent adds continuity: memory, visible work phases, and context that carries forward.",
      betaLine:
        "Start in free Chat today. Use Agent when the work needs account continuity and memory.",
      hint: "Spaces are live. ZAKI Agent is ready.",
      cta: "Open Agent",
      pricingCta: "Start Chat",
      tertiaryCta: "What is ZAKI?",
      placeholder: "How can I help you today?",
      rotatingPrompts: [
        "Plan my week in 20 minutes with clear priorities.",
        "Turn this rough idea into a launch plan.",
        "Summarize this article and give me key actions.",
        "Draft a sharp email I can send right now.",
        "Help me decide between these two options.",
        "Create a content calendar for the next 30 days.",
        "Break down this concept simply and clearly.",
        "Challenge my thinking and find what I missed.",
        "Organize my notes into an actionable structure.",
      ],
      submit: "Start",
      helper: "Spaces work in Arabic, English, or both. They are the structured workspaces inside the app.",
    },
    productSplit: {
      heading: "Four spokes. One product system.",
      subheading:
        "Agent, Chat/Spaces, Design, and Minutes are the four visible spokes. Design stays waitlist and Minutes stays coming soon; Brain is the Agent memory view.",
      cards: [
        {
          stage: "Surface 1",
          title: "Spaces",
          badge: "Live now",
          description:
            "A free chat surface for organized daily productivity. Fast, controlled, and ready to use today.",
          bullets: [
            "Free daily Chat access to start",
            "Dedicated spaces keep work, research, and planning separated cleanly",
            "User-controlled memory and stronger data discipline",
          ],
          ctaLabel: "Start Chat",
          ctaHref: appHandoffUrl("/spaces", "website_chat_live", "chat"),
        },
        {
          stage: "Surface 2",
          title: "ZAKI Agent",
          badge: "Account continuity",
          description:
            "Persistent AI with memory continuity and visible work phases. The first public step beyond ordinary stateless chat.",
          bullets: [
            "account memory and follow-through through Agent",
            "Experimental, limited, and intentionally early",
            "Persistent memory across sessions",
          ],
          ctaLabel: "Open Agent",
          ctaHref: appHandoffUrl("/agent", "website_agent_live", "agent"),
        },
        {
          stage: "Future lanes",
          title: "Future ZAKI lanes",
          badge: "Coming later",
          description:
            "Future lanes arrive after release gates: clearer controls, stronger reliability, and truthful product coverage.",
          bullets: [
            "Subscriptions start after the current Agent preview phase",
            "Future lanes are shaped by real usage and release gates",
            "This is where the product becomes deeper and more reliable",
          ],
          ctaLabel: "See the vision",
          ctaHref: "/product/",
        },
      ],
    },
    beta: {
      heading: "Current access: what to expect",
      warning:
        "ZAKI is V1 by design. Agent, Chat, and Brain are public; beta and waitlist lanes stay clearly marked until their contracts are complete.",
      bullets: [
        "Agent preview is open now with account memory and follow-through",
        "Chat starts free. Agent and Brain handle continuity once you sign in",
        "This is where we test the next product shape in public",
        "Release usage shapes the next gated product lanes",
      ],
      primaryCta: "Open Agent",
      secondaryCta: "Read about ZAKI",
    },
    chatProduct: {
      heading: "Why Spaces matter",
      intro:
        "Chat is the practical layer: a free AI workspace built for everyday use, not benchmark headlines.",
      bullets: [
        "It does not claim to outperform the latest GPT or Claude models on raw capability.",
        "It is more affordable, more organized, and more controlled for everyday work.",
        "Spaces keep projects, research, and planning in separate contexts.",
        "Works naturally across languages, including mixed-language input.",
      ],
      honestyLine:
        "Spaces are not built to outperform the latest GPT or Claude models on raw capability. They are built to be more usable, more structured, and more controllable in everyday work.",
    },
    botProduct: {
      heading: "Why ZAKI matters",
      intro:
        "Persistent AI with memory and continuity. ZAKI keeps your thread alive across sessions so you do not have to restate yourself every time.",
      bullets: [
        "Persistent thread with memory and recall",
        "Visible process phases while it works",
        "Built for an ongoing relationship, not one-off prompts",
        "Agent preview with account memory and follow-through",
      ],
      bridgeLine:
        "Most AI still resets the relationship every time you start over. ZAKI is testing what happens when context carries forward instead: not just from prompt to prompt, but across time, channels, and recurring work.",
    },
    privateRuntime: {
      heading: "Powered by ZAKI's private runtime",
      intro:
        "ZAKI's private runtime gives the product continuity, memory discipline, and agentic capability without turning the public product into a fragile demo.",
      bullets: [
        "Persistent per-user sessions",
        "Durable memory and runtime state",
        "Process visibility through live streaming updates",
        "Multitenant safety, trainability, and deployment discipline",
      ],
    },
    earlyAccess: {
      badge: "🎉 ZAKI is live",
      heading: "Start your relationship with ZAKI today",
      description:
        "ZAKI is live. Start in Chat, then use Agent when memory and follow-through matter.",
      socialProof: {
        label: "The public core is live",
        hoverLabel: "Start with Chat or sign in for account continuity.",
        avatars: ["AN", "SK", "RM", "LM"],
      },
      highlights: [
        "Personal assistant, not just a chatbot",
        "Structured workspaces for real productivity",
        "Memory with full user control"
      ],
      cta: "Open Agent",
      secondary: "Jump to plans below to choose the right public access path.",
      campaignLabel: "Coming next: gated spokes",
      campaignTeaser:
        "Updates for Design and Minutes as they move through their release gates.",
      instagramNote:
        "Sign in to see the plans and access currently available to your account.",
    },
    why: {
      heading: "Most AI answers well. Very little of it becomes a real counterpart.",
      subheading: "ZAKI is built to close that last mile between humans and AI.",
      intro:
        "Real productivity is not about one more answer. It is about structured work now, persistent context later, and a system that becomes more useful the more it learns your operating rhythm.",
      builtLine: "That is why we built ZAKI.",
      description:
        "A structured AI workspace that's personal by design. ZAKI's memory layer is built to be managed and controlled by you.",
      workflow:
        "Plan your day, write, think, translate, and decide inside a product that keeps your work organized.",
      friction: "No generic sprawl. No prompt gymnastics.",
      postFriction: "Just a clearer working relationship with AI.",
      human: "Intelligence that stays useful because it keeps context.",
      points: [
        "Spaces keep projects organized with cleaner separation.",
        "Works naturally across languages, including mixed-language input.",
        "Memory keeps useful context so work continues naturally.",
        "Designed for speed, clarity, and real daily workflows.",
      ],
    },
    geo: {
      definitionHeading: "What is ZAKI, exactly?",
      definitionText:
        "ZAKI is the persistent AI layer. Spaces are the free chat entry points for structured daily execution. Use ZAKI for continuity. Use Spaces for organized work.",
      statsHeading: "Why people choose ZAKI",
      statsSource: "The product ladder behind the brand.",
      stats: [
        "Spaces are live now for organized daily use",
        "Agent preview is now open with account memory and follow-through",
        "Memory and personalization stay under clearer user control",
        "Persistence and runtime continuity are built in"
      ],
      citationHeading: "Why most AI still feels generic",
      citationQuote:
        "Most AI stops at answers. ZAKI starts with disciplined work in Spaces, then moves toward persistent intelligence that remembers context instead of resetting every session.",
      citationSource: "Nova Nuggets Team",
      compareLabel: "Compare ZAKI vs Spaces",
      roundupLabel: "See the AI workspace comparison",
      howToHeading: "What can you do with ZAKI?",
      howToIntro:
        "These examples show the kind of practical work ZAKI is designed to support.",
      howTos: [
        {
          name: "Draft professional emails fast",
          text: "Ask ZAKI to draft a formal email, then refine the tone based on the recipient, industry, and urgency. Works in Arabic, English, or both.",
          link: "/use-cases/",
        },
        {
          name: "Translate between Arabic and English naturally",
          text: "Paste any Arabic dialect or English text and get a natural translation that preserves meaning, tone, and context. Not word-by-word output.",
          link: "/use-cases/",
        },
        {
          name: "Create social media content",
          text: "Generate captions, posts, or threads with clear brand voice. ZAKI handles Arabic, English, or mixed-language content naturally.",
          link: "/use-cases/",
        },
      ],
      howToLinkLabel: "Read guide",
    },
    updatesCarousel: {
      heading: "Inside ZAKI: What shaped this release",
      subheading: "Product milestones and AI ecosystem signals that explain why ZAKI is being built this way.",
      batchLabel: "Release view",
      statusLabels: {
        done: "Done",
        next: "Next",
      },
      slides: [
        {
          id: "week-two-zaki-agent-beta",
          tag: "launch",
          title: "ZAKI Agent is now open",
          description:
            "The first public version of ZAKI is live with one persistent operator thread per user and visible work phases during execution.",
          dateLabel: "Current release",
          emoji: "⚡",
          status: "done",
          link: {
            label: "Open ZAKI app",
            url: appHandoffUrl("/", "website_timeline", "dashboard"),
          },
        },
        {
          id: "week-two-hardening",
          tag: "milestone",
          title: "Multi-user hardening and quota controls",
          description:
            "The release now runs with stronger per-user isolation, safer stream handling, and quota controls that keep the public surface disciplined.",
          dateLabel: "Current release",
          emoji: "🛡️",
          status: "done",
        },
        {
          id: "openai-tools-for-agents",
          tag: "ecosystem",
          title: "OpenAI: new tools for building agents",
          description:
            "OpenAI introduced production tooling for agents, reinforcing the shift from chatbot UX to reliable execution workflows.",
          dateLabel: "Ecosystem signal",
          emoji: "🧱",
          status: "done",
          link: {
            label: "Read announcement",
            url: "https://openai.com/index/new-tools-for-building-agents/",
          },
        },
        {
          id: "openai-chatgpt-agent",
          tag: "ecosystem",
          title: "OpenAI: bridging research and action",
          description:
            "OpenAI's ChatGPT agent launch is a clear signal: user expectations are moving from answers to actions.",
          dateLabel: "Product signal",
          emoji: "🧭",
          status: "done",
          link: {
            label: "Read announcement",
            url: "https://openai.com/index/introducing-chatgpt-agent/",
          },
        },
        {
          id: "linux-foundation-aaif",
          tag: "ecosystem",
          title: "Linux Foundation launched AAIF",
          description:
            "The Agentic AI Foundation launched with MCP, Goose, and AGENTS.md under neutral governance, accelerating interoperability across agent stacks.",
          dateLabel: "Standards signal",
          emoji: "🧩",
          status: "done",
          link: {
            label: "Read announcement",
            url: "https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation",
          },
        },
        {
          id: "anthropic-context-management",
          tag: "ecosystem",
          title: "Anthropic: context management matters",
          description:
            "Anthropic highlighted context management as critical for long-running agents, matching ZAKI's memory-first architecture.",
          dateLabel: "Engineering signal",
          emoji: "🧠",
          status: "done",
          link: {
            label: "Read article",
            url: "https://www.anthropic.com/news/context-management",
          },
        },
        {
          id: "eu-ai-act-signal",
          tag: "ecosystem",
          title: "EU AI Act implementation is active",
          description:
            "With AI Act implementation milestones active, trust, controls, and policy clarity are becoming core product requirements.",
          dateLabel: "Policy signal",
          emoji: "⚖️",
          status: "done",
          link: {
            label: "View EU update",
            url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
          },
        },
        {
          id: "next-bot-controls",
          tag: "next",
          title: "Next up: deeper controls",
          description:
            "Next, we deepen the release with better channel controls, stronger reliability loops, and clearer operator guardrails.",
          dateLabel: "Next phase",
          emoji: "🛣️",
          status: "next",
        },
        {
          id: "weekly-newsroom",
          tag: "next",
          title: "Ongoing public updates",
          description:
            "We keep publishing product progress and relevant AI signals as the product moves from disciplined chat toward persistent intelligence.",
          dateLabel: "Ongoing",
          emoji: "📣",
          status: "next",
          link: {
            label: "Follow updates",
            url: "https://instagram.com/chatzaki.ai",
          },
        },
      ],
    },
    features: {
      heading: "What Spaces give you today.",
      cards: [
        {
          title: "Structured thinking",
          description:
            "Analyze topics, break down ideas, summarize content, and explore decisions with clear logic.",
        },
        {
          title: "Spaces for your work",
          description:
            "Create spaces for research, planning, learning, and personal use. Keep context where it belongs.",
        },
        {
          title: "Memory that stays useful",
          description:
            "Capture preferences and facts with review flows, conflict checks, and clarity controls.",
        },
        {
          title: "Security and control",
          description:
            "Operate with strong account controls, policy transparency, and production-focused safeguards.",
        },
      ],
    },
    horizontal: {
      heading: "Why ZAKI exists",
      subheading: "The product logic behind the brand.",
      cards: [
        {
          pill: "Origin",
          title: "Product fit is deeper than model quality",
          description:
            "Models are shaped by language, assumptions, and the people they are built around.\nUseful AI is never just about model quality.\nIt is also product fit, language fit, workflow fit, and context fit.",
        },
        {
          pill: "Gap",
          title: "The real gap is continuity",
          description:
            "Most AI still behaves like a reset button.\nYou ask, it answers, and the working relationship starts over again.\nZAKI is being built to close that last mile between people and AI.",
        },
        {
          pill: "Launch",
          title: "Start with structured productivity",
          description:
            "Spaces are the live product layer.\nThey give users a disciplined workspace for Arabic-English daily work.\nThat practical layer is how we earn the right to build the next product step.",
        },
        {
          pill: "Continuity",
          title: "Persistence changes the relationship",
          description:
            "When context carries forward, AI becomes more useful, more trainable, and more accountable.\nMemory continuity, review loops, and user control matter more than one-off answers.\nThat is what ZAKI is testing in public.",
        },
        {
          pill: "Focus",
          title: "What matters operationally",
          description:
            "Spaces keep work organized.\nMemory keeps continuity useful.\nPer-user isolation, trainability, and visible work phases make the product safer and easier to trust.",
        },
        {
          pill: "Vision",
          title: "The next product step",
          description:
            "The long-term goal is not another generic AI surface.\nIt is persistent personal intelligence that behaves more like a digital counterpart than a one-shot tool.\nZAKI is the public path toward that fuller product.",
        },
      ],
    },
    cta: {
      heading: "Ready for AI that feels made for you?",
      subheading:
        "Tell us what you want in AI next.\nWe will make it happen together.",
      primary: "Share feedback",
      secondary: "Try ZAKI",
      hoverLine: "Impossible is nothing.",
    },
    feedback: {
      title: "Help shape ZAKI",
      subtitle: "Simple, public, and anonymous by default.",
      promptLabel: "What should ZAKI build next?",
      promptPlaceholder:
        "Share a feature idea, friction point, or workflow you want ZAKI to support...",
      nameLabel: "Name (optional)",
      namePlaceholder: "Anonymous by default",
      submit: "Post feedback",
      posting: "Posting...",
      sortTop: "Top",
      sortNewest: "Newest",
      voteUp: "Upvote",
      voteDown: "Downvote",
      anonymous: "Anonymous",
      empty: "No ideas posted yet. Be the first to shape what ZAKI builds next.",
      errorLoad: "Unable to load feedback right now.",
      errorSubmit: "Unable to post feedback right now.",
      errorVote: "Unable to register that vote right now.",
      success: "Your idea is live.",
      joinPrompt: "Join the community shaping what comes next.",
      legalNote: "No login required. Optional name only if you want public credit.",
      loading: "Loading feedback...",
      countLabel: "characters",
    },
    useCases: {
      heading: "Where Spaces fit best today",
      items: [
        {
          title: "Work",
          description: "Plan faster, write sharper, and make clearer decisions with context-aware support.",
        },
        {
          title: "Study",
          description: "Summarize, explain, and translate ideas in a way that stays relevant to your context.",
        },
        {
          title: "Personal",
          description: "Get memory-aware help for your day-to-day flow with control over what ZAKI keeps.",
        },
      ],
      note: "ZAKI goes further, but Spaces already cover the daily-use layer.",
    },
    pricing: {
      heading: "Start with Chat. Try ZAKI free.",
      subheading:
        "Chat is the free entry point. ZAKI Agent and Brain provide account continuity, memory, and follow-through.",
      interval: {
        monthly: "Monthly",
        yearly: "Yearly",
      },
      plans: [
        {
          tier: "chat",
          label: "Chat",
          priceMonthly: "$0 to start",
          priceYearly: "No signup required",
          blurb: "For focused studying, clearer writing, and better support across coursework.",
          features: [
            "Free Chat for immediate work",
            "Anonymous daily quota",
            "No durable memory until sign-in"
          ],
          cta: "Start Chat",
        },
        {
          tier: "personal",
          label: "Personal",
          priceMonthly: "Account required",
          priceYearly: "Plan access",
          blurb: "For everyday work and life when you want ZAKI to feel like your assistant.",
          features: [
            "Agent memory and follow-through",
            "Brain memory review surface",
            "Tool approvals for sensitive actions"
          ],
          cta: "Choose Personal",
        },
      ],
      oneTimeCode: {
        label: "Gift Code",
        badge: "🎁 One-time",
        price: "$15 one-time",
        blurb: "Gift someone a 30-day ZAKI pass for studying, writing, focus, and daily support.",
        features: [
          "Single-use activation code",
          "Delivered by email after purchase",
          "Perfect for friends and teammates"
        ],
        cta: "Buy 1-month gift code",
      },
      note: "Start in Chat for free. Move to Agent when work needs account continuity.",
      botBeta: {
        heading: "ZAKI Agent",
        badge: "Account continuity",
        description:
          "ZAKI Agent keeps context between sessions, shows its work phases, and maintains per-user memory. Future lanes stay gated until backend, entitlement, UI, and E2E agree.",
        bullets: [
          "account memory and follow-through",
          "Persistent memory that carries across sessions",
          "Visible work phases so you see what ZAKI is doing",
          "Account continuity through Agent and visible memory through Brain.",
        ],
        cta: "Open Agent",
        href: appHandoffUrl("/agent", "website_agent_live", "agent"),
      },
      botPremium: {
        heading: "Future ZAKI lanes",
        badge: "Later",
        description:
          "Future lanes follow release gates. They bring deeper controls only when backend, entitlement, UI, and tests agree.",
        bullets: [
          "Access expands after release gates",
          "Shaped by production usage",
          "Backend, entitlement, UI, and E2E aligned",
        ],
        cta: "See the roadmap",
        href: "/product/",
      },
    },
    faq: {
      heading: "FAQs",
      subheading: "FAQs",
      items: [
        {
          question: "What is ZAKI?",
          answer:
            "ZAKI is your day-to-day AI — one that actually remembers you. It chats, takes on whole tasks through Agent, keeps each project clean in its own Space, and holds everything you've told it in a memory you can see, correct, and control. The point: you never start from zero.",
        },
        {
          question: "Is ZAKI free? What does it cost?",
          answer:
            "Free to start — Chat has a free weekly allowance and Agent has bounded free use, with no card required. Paid plans are $15, $45, and $99 a month and add a larger shared weekly allowance across Agent and Chat/Spaces, with Brain as the Agent memory view. Design stays waitlist and Minutes stays coming soon.",
        },
        {
          question: "Can I see and control what ZAKI remembers?",
          answer:
            "Always. Every memory is yours to browse, search, correct, export, or delete, anytime. ZAKI even keeps itself honest: if you say you love TypeScript and later switch to Go, it flags the contradiction and asks instead of silently holding both. Your memory is isolated to your account — never shared across users.",
        },
        {
          question: "What is the difference between ZAKI and Spaces?",
          answer:
            "ZAKI is for continuity, memory, and recall across time. Spaces are for structured execution inside a dedicated workspace. ZAKI helps you keep the long thread. Spaces help you do the focused work cleanly.",
        },
        {
          question: "What are Spaces?",
          answer:
            "Spaces are structured AI workspaces where each project can hold its own instructions, documents, and threads. They keep your work organized and your context clean.",
        },
        {
          question: "Why are there both ZAKI and Spaces?",
          answer:
            "Because continuity and execution are different jobs. ZAKI handles the long-thread relationship and memory layer. Spaces handle dedicated task execution, drafting, research, and organized project work.",
        },
        {
          question: "When should I use ZAKI instead of Spaces?",
          answer:
            "Use ZAKI when you want continuity, planning, memory, and an ongoing thread that carries across time. Use Spaces when the work needs its own instructions, documents, and shared project context.",
        },
        {
          question: "Is ZAKI Agent live?",
          answer:
            "Yes. Agent is part of V1 with account memory, visible phases, and follow-through. Some tools and future product lanes remain gated until their contracts are complete.",
        },
        {
          question: "Why are some ZAKI surfaces gated?",
          answer:
            "Because ZAKI only exposes a surface when product state, entitlement, memory, UI, and tests agree. Live products should be usable; future lanes should be clearly marked.",
        },
        {
          question: "How does free Chat access work?",
          answer:
            "Chat starts free with weekly capacity. Sign in when you want account continuity, Brain memory, and Agent follow-through.",
        },
        {
          question: "Is Chat free?",
          answer:
            "Yes. Chat starts free and limited. Agent adds account continuity when the work should persist.",
        },
        {
          question: "Does ZAKI claim to outperform ChatGPT or Claude?",
          answer:
            "No. Spaces do not claim to beat the latest GPT or Claude models on raw capability. The case for ZAKI is product shape: organization, pricing, control, workspace structure, and the operator direction. It also works across languages natively.",
        },
        {
          question: "What does powered by ZAKI's private runtime mean?",
          answer:
            "ZAKI's private runtime provides the memory continuity, process visibility, trainability, and agentic discipline that let ZAKI behave more like a persistent digital counterpart than an ordinary chat session.",
        },
        {
          question: "When will broader access open?",
          answer:
            "Broader access opens only after product, entitlement, backend, UI, and E2E readiness agree.",
        },
        {
          question: "Why should I care about Agent now?",
          answer: "Because the public app should promise only what is wired. Users can start with Chat and use Agent for continuity while future lanes mature.",
        },
      ],
    },
    footer: {
      copyright: "nova nuggets © 2025",
      legal: "Legal",
      privacy: "Privacy",
      compliance: "Compliance",
      faq: "FAQ",
    },
  },
  ar: {
    lang: "ar",
    dir: "rtl",
    nav: {
      why: "الدردشة",
      story: "ZAKI",
      faq: "الأسئلة",
      switchLang: "EN",
    },
    hero: {
      title: "Spaces للعمل. وزكي للاستمرارية.",
      subtitle:
        "Chat وSpaces تمنحانك عملًا منظمًا اليوم، وAgent يضيف ذاكرة حساب ومراحل عمل مرئية وسياقًا يمتد مع الوقت.",
      betaLine:
        "ابدأ مع Chat مجانًا، وسجّل الدخول عندما يحتاج العمل إلى استمرارية وذاكرة.",
      hint: "Chat وAgent وSpaces وBrain متاحة الآن.",
      cta: "افتح Agent",
      pricingCta: "ابدأ Chat",
      tertiaryCta: "ما هو زكي؟",
      placeholder: "كيف يمكنني مساعدتك اليوم؟",
      rotatingPrompts: [
        "رتّب أسبوعي بخطة واضحة وأولويات عملية.",
        "حوّل هذه الفكرة إلى خطة إطلاق.",
        "لخّص هذا المقال وأعطني خطوات تنفيذ.",
        "اكتب لي رسالة إيميل جاهزة للإرسال.",
        "ساعدني أختار بين هذين الخيارين.",
        "ابنِ لي تقويم محتوى للشهر القادم.",
        "نظّم ملاحظاتي بهيكل قابل للتنفيذ.",
        "تحداني فكريًا وبيّن لي ما فاتني.",
        "حلّل الخيارات وساعدني أقرر.",
      ],
      submit: "ابدأ",
      helper: "Spaces تعمل بالعربية والإنجليزية أو بالاثنين. وهي مساحات العمل المنظمة داخل التطبيق.",
    },
    productSplit: {
      heading: "أربعة مسارات. نظام منتج واحد.",
      subheading:
        "Agent وChat/Spaces وDesign وMinutes هي المسارات الأربعة المرئية. Design قائمة انتظار وMinutes قريبًا، وBrain هو عرض ذاكرة Agent.",
      cards: [
        {
          stage: "المرحلة 1",
          title: "Spaces",
          badge: "متاح الآن",
          description:
            "مساحة عمل ذكاء اصطناعي منظّمة للإنتاجية اليومية، متاحة ضمن المنتج العام الأساسي.",
          bullets: [
            "استخدام مجاني محدود وخطط مدفوعة بسعة أسبوعية أكبر",
            "المساحات تفصل العمل والبحث والتخطيط بوضوح",
            "تحكم أوضح في الذاكرة والبيانات",
          ],
          ctaLabel: "جرّب Spaces",
          ctaHref: appHandoffUrl("/spaces", "website_chat_live", "chat"),
        },
        {
          stage: "المرحلة 2",
          title: "ZAKI Agent",
          badge: "متاح الآن",
          description:
            "وكيل شخصي بذاكرة حساب ومراحل عمل مرئية ومتابعة عبر الجلسات.",
          bullets: [
            "استخدام مجاني محدود وخطط مدفوعة بسعة أكبر",
            "مراحل عمل مرئية وإجراءات قابلة للمراجعة",
            "ذاكرة مستمرة عبر الجلسات",
          ],
          ctaLabel: "افتح Agent",
          ctaHref: appHandoffUrl("/agent", "website_agent_live", "agent"),
        },
        {
          stage: "المرحلة 3",
          title: "Design وMinutes",
          badge: "مقيّدة",
          description:
            "Design قائمة انتظار وMinutes قريبًا حتى تكتمل مساراتهما من البداية إلى النهاية.",
          bullets: [
            "لا تُباع كمنتجات مكتملة",
            "تُفتح بعد اتفاق الصلاحيات والواجهة والاختبارات",
            "حالتها واضحة داخل الموقع",
          ],
          ctaLabel: "شاهد الرؤية",
          ctaHref: "/product/",
        },
      ],
    },
    beta: {
      heading: "حالة المنتج الآن",
      warning:
        "Agent وChat/Spaces هما المساران المباشران، وDesign قائمة انتظار وMinutes قريبًا. Brain هو عرض ذاكرة Agent.",
      bullets: [
        "Chat مجاني للبدء وAgent متاح بحد مجاني مقيد",
        "الخطط المدفوعة هي 15 و45 و99 دولارًا شهريًا",
        "Design قائمة انتظار وMinutes قريبًا",
        "لا يُعلن أي مسار قبل اكتماله من البداية إلى النهاية",
      ],
      primaryCta: "افتح Agent",
      secondaryCta: "اقرأ عن زكي",
    },
    chatProduct: {
      heading: "لماذا تهم Spaces؟",
      intro:
        "Spaces هي الطبقة العملية: مساحة عمل ذكاء اصطناعي مبنية للاستخدام اليومي المنظّم، لا لاستعراض التفوق على النماذج الرائدة.",
      bullets: [
        "لا يدّعي التفوق على أحدث GPT أو Claude في القدرة الخام.",
        "أرخص، أكثر تنظيمًا، وأوضح تحكمًا في العمل اليومي.",
        "المساحات تفصل المشاريع والبحث والتخطيط بسياقات مستقلة.",
        "دعم كامل للعربية والإنجليزية مع تعامل طبيعي مع اللغة المختلطة.",
      ],
      honestyLine:
        "Spaces ليست مبنية لتتفوق على أحدث GPT أو Claude في القدرة الخام. بل بُنيت لتكون أكثر قابلية للاستخدام، وأكثر تنظيمًا، وأوضح تحكمًا في العمل اليومي.",
    },
    botProduct: {
      heading: "لماذا يهم زكي؟",
      intro:
        "زكي هو AI مستمر بذاكرة واستمرارية. يحافظ على الخيط معك بين الجلسات حتى لا تضطر إلى إعادة شرح نفسك كل مرة.",
      bullets: [
        "خيط مستمر مع ذاكرة واسترجاع",
        "مراحل عمل مرئية أثناء التنفيذ",
        "مبني لعلاقة مستمرة لا لطلبات منفصلة فقط",
        "Agent متاح بذاكرة حساب ومتابعة عبر الجلسات",
      ],
      bridgeLine:
        "معظم الذكاء الاصطناعي ينساك لحظة انتهاء الجلسة. زكي يختبر ماذا يحدث عندما لا يضيع السياق مع الوقت، لا بين Prompt وآخر فقط، بل عبر الوقت والقنوات والعمل المتكرر.",
    },
    privateRuntime: {
      heading: "مدعوم ببنية زكي الخاصة",
      intro:
        "بنية زكي الخاصة تمنح المنتج الاستمرارية وانضباط الذاكرة والقدرة الـ Agentic دون تحويل المنتج العام إلى عرض هش أو فوضوي.",
      bullets: [
        "جلسات ثابتة لكل مستخدم",
        "ذاكرة وحالة تشغيلية قابلة للاستمرار",
        "عرض حي لمراحل العمل عبر البث",
        "عزل متعدد المستخدمين وقابلية تدريب وانضباط تشغيلي",
      ],
    },
    earlyAccess: {
      badge: "🎉 زكي متاح الآن",
      heading: "ابدأ مع زكي من اليوم",
      description:
        "زكي أصبح متاحًا الآن. اشترك وابدأ تجربة شخصية مع ذاكرة تتطور معك.",
      socialProof: {
        label: "المنتج العام الأساسي متاح الآن",
        hoverLabel: "ابدأ مع Chat أو سجّل الدخول لاستمرارية الحساب.",
        avatars: ["أن", "سك", "رم", "لم"],
      },
      highlights: [
        "مساعد شخصي، وليس مجرد chatbot",
        "محادثات واعية بالسياق والثقافة",
        "ذاكرة تحت تحكمك الكامل"
      ],
      cta: "🚀 اشترك الآن",
      secondary: "انزل للأسفل واختر مسار الوصول العام المناسب.",
      campaignLabel: "✨ قريبًا: المسارات المقيّدة",
      campaignTeaser:
        "تحديثات Design وMinutes مع تقدّمهما عبر بوابات الإصدار.",
      instagramNote:
        "سجّل الدخول لترى الخطط والوصول المتاحين لحسابك.",
    },
    why: {
      heading: "الذكاء الاصطناعي يجيب جيدًا. لكن القليل منه يصبح نظيرًا رقميًا حقيقيًا.",
      subheading: "زكي بُني ليغلق هذه المسافة الأخيرة بين الإنسان والذكاء الاصطناعي.",
      intro:
        "الإنتاجية الحقيقية ليست في إجابة إضافية. بل في عمل منظّم الآن، وسياق مستمر، ونظام يصبح أكثر فائدة كلما تعلّم إيقاعك وطريقتك في العمل.",
      builtLine: "ولهذا بنينا زكي.",
      description:
        "مساحة عمل ذكاء اصطناعي مهيكلة وشخصية بطبيعتها. طبقة الذاكرة مبنية لتبقى تحت إدارتك وتحكمك.",
      workflow:
        "خطط يومك، اكتب، فكّر، ترجم، وقرّر داخل منتج يحافظ على تنظيم عملك.",
      friction: "بدون فوضى عامة. وبدون ألعاب Prompts.",
      postFriction: "فقط علاقة أوضح وأكثر فائدة مع الذكاء الاصطناعي.",
      human: "ذكاء يبقى مفيدًا لأنه يحتفظ بالسياق.",
      points: [
        "المساحات ترتب المشاريع بسياقات منفصلة وواضحة.",
        "دعم كامل للعربية والإنجليزية مع تعامل طبيعي مع اللغة المختلطة.",
        "الذاكرة تحفظ السياق المفيد مع تدفق مراجعة واضح.",
        "تجربة مصممة للسرعة والوضوح وسير العمل اليومي.",
      ],
    },
    geo: {
      definitionHeading: "ما هو زكي بالضبط؟",
      definitionText:
        "زكي هو طبقة الذكاء المستمر، وSpaces هي مساحات العمل المنظمة داخل المنتج العام الأساسي. استخدم Agent للاستمرارية، وSpaces للعمل المنظّم.",
      statsHeading: "لماذا يختار الناس زكي؟",
      statsSource: "السلّم الذي يقف خلف العلامة.",
      stats: [
        "Spaces متاحة الآن للاستخدام اليومي المنظّم",
        "Agent متاح الآن مع ذاكرة حساب ومتابعة عبر الجلسات",
        "الذاكرة والتخصيص تحت تحكم أوضح للمستخدم",
        "الاستمرارية والانضباط التشغيلي مدمجان في البنية"
      ],
      citationHeading: "لماذا يبدو معظم الذكاء الاصطناعي عامًا؟",
      citationQuote:
        "معظم الذكاء الاصطناعي يتوقف عند الإجابة. زكي يبدأ بعمل منظم داخل Spaces، ثم يتجه نحو ذكاء مستمر يتذكر السياق بدل أن يعيد الضبط في كل جلسة.",
      citationSource: "فريق Nova Nuggets",
      compareLabel: "قارن زكي مع Spaces",
      roundupLabel: "شاهد مقارنة مساحات العمل الذكية",
      howToHeading: "ماذا يمكنك أن تفعل مع زكي؟",
      howToIntro:
        "هذه أمثلة عملية مكتوبة بطريقة سهلة الاستخراج لأنظمة البحث بالذكاء الاصطناعي، وتوضح نوع العمل الذي صُمم زكي لدعمه.",
      howTos: [
        {
          name: "كتابة إيميلات مهنية بالعربية",
          text: "اطلب من زكي صياغة رسالة عربية رسمية ثم عدّل النبرة بحسب المستلم، والقطاع، ودرجة الاستعجال.",
          link: "/use-cases/",
        },
        {
          name: "ترجمة اللهجات إلى الإنجليزية",
          text: "ألصق نصًا باللهجة الشامية أو الخليجية أو المصرية واطلب ترجمة إنجليزية طبيعية تحافظ على المعنى والسياق.",
          link: "/use-cases/",
        },
        {
          name: "إنشاء محتوى عربي للسوشال ميديا",
          text: "أنشئ كابشنات إنستغرام أو منشورات لينكدإن أو سلاسل X بالعربية بصياغة محلية وصوت علامة أوضح.",
          link: "/use-cases/",
        },
      ],
      howToLinkLabel: "اقرأ الدليل",
    },
    updatesCarousel: {
      heading: "داخل زكي: ما الذي شكّل هذا الإصدار",
      subheading: "محطات المنتج وإشارات منظومة الذكاء الاصطناعي التي تفسّر لماذا يُبنى زكي بهذه الطريقة.",
      batchLabel: "منظور الإصدار",
      statusLabels: {
        done: "تم",
        next: "القادم",
      },
      slides: [
        {
          id: "week-two-zaki-agent-beta",
          tag: "launch",
          title: "تحديثات زكي العامة أصبحت مفتوحة",
          description:
            "أول نسخة علنية من زكي أصبحت متاحة: خيط تشغيلي ثابت لكل مستخدم ومراحل عمل مرئية أثناء التنفيذ.",
          dateLabel: "الإصدار الحالي",
          emoji: "⚡",
          status: "done",
          link: {
            label: "افتح تطبيق زكي",
            url: appHandoffUrl("/", "website_timeline", "dashboard"),
          },
        },
        {
          id: "week-two-hardening",
          tag: "milestone",
          title: "تقوية العزل وضبط الحصص",
          description:
            "قوّينا العزل متعدد المستخدمين، وثبّتنا البث، وأضفنا حصصًا يومية تجعل السطح العام أكثر انضباطًا وأمانًا.",
          dateLabel: "الإصدار الحالي",
          emoji: "🛡️",
          status: "done",
        },
        {
          id: "openai-tools-for-agents",
          tag: "ecosystem",
          title: "OpenAI: أدوات جديدة لبناء AI Agents",
          description:
            "OpenAI قدّمت أدوات إنتاجية جديدة لبناء الـ Agents، وهذا يؤكد التحول من chatbots إلى مسارات تنفيذ موثوقة.",
          dateLabel: "إشارة من المنظومة",
          emoji: "🧱",
          status: "done",
          link: {
            label: "اقرأ الإعلان",
            url: "https://openai.com/index/new-tools-for-building-agents/",
          },
        },
        {
          id: "openai-chatgpt-agent",
          tag: "ecosystem",
          title: "OpenAI: جسر بين البحث والتنفيذ",
          description:
            "إطلاق ChatGPT Agent يؤكد اتجاه السوق: المستخدم يريد مساعدًا ينفّذ، لا مجرد مساعد يرد.",
          dateLabel: "إشارة منتج",
          emoji: "🧭",
          status: "done",
          link: {
            label: "اقرأ الإعلان",
            url: "https://openai.com/index/introducing-chatgpt-agent/",
          },
        },
        {
          id: "linux-foundation-aaif",
          tag: "ecosystem",
          title: "Linux Foundation أطلقت AAIF",
          description:
            "إطلاق Agentic AI Foundation مع MCP وGoose وAGENTS.md ضمن حوكمة محايدة يسرّع قابلية التشغيل البيني بين منظومات الـ Agents.",
          dateLabel: "إشارة معايير",
          emoji: "🧩",
          status: "done",
          link: {
            label: "اقرأ الإعلان",
            url: "https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation",
          },
        },
        {
          id: "anthropic-context-management",
          tag: "ecosystem",
          title: "Anthropic: إدارة السياق أساسية",
          description:
            "Anthropic أكدت أن إدارة السياق عامل حاسم في موثوقية الـ Agents طويلة المدى، وهذا ينسجم مع معمارية زكي المعتمدة على الذاكرة.",
          dateLabel: "إشارة هندسية",
          emoji: "🧠",
          status: "done",
          link: {
            label: "اقرأ المقال",
            url: "https://www.anthropic.com/news/context-management",
          },
        },
        {
          id: "eu-ai-act-signal",
          tag: "ecosystem",
          title: "تطبيق AI Act الأوروبي بدأ فعليًا",
          description:
            "مع دخول مراحل من AI Act حيّز التنفيذ، أصبحت الثقة والضبط والوضوح التنظيمي متطلبات أساسية في المنتج.",
          dateLabel: "إشارة تنظيمية",
          emoji: "⚖️",
          status: "done",
          link: {
            label: "تفاصيل من الاتحاد الأوروبي",
            url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
          },
        },
        {
          id: "next-bot-controls",
          tag: "next",
          title: "القادم: تعميق تحكم زكي",
          description:
            "المرحلة القادمة توسّع تحديثات زكي بضوابط قنوات أعمق، وحلقات اعتمادية أقوى، وحوكمة تشغيل أوضح.",
          dateLabel: "المرحلة التالية",
          emoji: "🛣️",
          status: "next",
        },
        {
          id: "weekly-newsroom",
          tag: "next",
          title: "تحديثات علنية مستمرة",
          description:
            "نواصل نشر تقدم المنتج وإشارات الذكاء الاصطناعي المهمة بينما يتحرك زكي من دردشة منضبطة نحو ذكاء شخصي مستمر.",
          dateLabel: "مستمر",
          emoji: "📣",
          status: "next",
          link: {
            label: "تابع التحديثات",
            url: "https://instagram.com/chatzaki.ai",
          },
        },
      ],
    },
    features: {
      heading: "ماذا تمنحك Spaces اليوم.",
      cards: [
        {
          title: "تفكير منظم",
          description:
            "حلل المواضيع، فكك الأفكار، لخص المحتوى، واستكشف القرارات بمنطق واضح.",
        },
        {
          title: "مساحات للعمل",
          description:
            "أنشئ مساحات للبحث والتخطيط والتعلم والاستخدام الشخصي مع سياق منظم.",
        },
        {
          title: "ذاكرة مفيدة",
          description:
            "التقط المعلومات المهمة مع مراجعة، واكتشاف التعارضات، وتحكم واضح.",
        },
        {
          title: "أمان وتحكم",
          description:
            "ضوابط حساب قوية وشفافية في السياسات ونهج جاهز للإنتاج.",
        },
      ],
    },
    horizontal: {
      heading: "لماذا يوجد زكي",
      subheading: "المنطق الذي بُني عليه المنتج.",
      cards: [
        {
          pill: "الأصل",
          title: "ملاءمة المنتج أعمق من جودة النموذج",
          description:
            "النماذج تتشكل باللغة والافتراضات والناس الذين بُنيت حولهم.\nلذلك ففائدة الذكاء الاصطناعي ليست جودة النموذج وحدها.\nبل أيضًا ملاءمته للغة، والسياق، وسير العمل، وطريقة الاستخدام.",
        },
        {
          pill: "الفجوة",
          title: "الفجوة الحقيقية هي الاستمرارية",
          description:
            "معظم الذكاء الاصطناعي ما زال يتصرف كزر إعادة ضبط.\nتسأل، يجيب، ثم تبدأ العلاقة من الصفر مرة أخرى.\nزكي يُبنى ليغلق هذه المسافة الأخيرة بين الإنسان والذكاء الاصطناعي.",
        },
        {
          pill: "الانطلاق",
          title: "ابدأ بإنتاجية منظّمة",
          description:
            "Spaces هي طبقة المنتج الحية اليوم.\nتمنح المستخدم مساحة عمل منضبطة للعربية والإنجليزية في العمل اليومي.\nومن هذه الطبقة العملية نكسب حق بناء الخطوة التالية.",
        },
        {
          pill: "يتعلّم",
          title: "الاستمرارية تغيّر العلاقة",
          description:
            "عندما يبقى السياق، يصبح الذكاء الاصطناعي أكثر فائدة وأكثر قابلية للتدريب والمحاسبة.\nاستمرارية الذاكرة، والمراجعة، وتحكم المستخدم أهم من إجابة واحدة جيدة.\nوهذا ما يختبره زكي علنًا.",
        },
        {
          pill: "التركيز",
          title: "ما الذي يهم عمليًا",
          description:
            "المساحات تحفظ العمل منظمًا.\nالذاكرة تجعل الاستمرارية مفيدة.\nوالعزل لكل مستخدم، وقابلية التدريب، ومراحل العمل المرئية تجعل المنتج أوضح وأكثر قابلية للثقة.",
        },
        {
          pill: "الرؤية",
          title: "خطوة المنتج التالية",
          description:
            "الهدف ليس واجهة ذكاء اصطناعي عامة أخرى.\nالهدف هو ذكاء شخصي مستمر يتصرف أكثر كنظير رقمي لا كأداة عابرة.\nوزكي هو الطريق العلني نحو هذا المنتج الكامل.",
        },
      ],
    },
    cta: {
      heading: "جاهز لذكاء اصطناعي يبدو وكأنه صُمّم لك؟",
      subheading:
        "قل لنا ماذا تريد بعد ذلك في الذكاء الاصطناعي.\nوسنصنعه معًا.",
      primary: "شارك رأيك",
      secondary: "جرّب زكي",
      hoverLine: "المستحيل ليس شيئًا.",
    },
    feedback: {
      title: "ساعدنا في تشكيل زكي",
      subtitle: "بسيطة، علنية، ومجهولة افتراضيًا.",
      promptLabel: "ماذا تريد أن يبني زكي بعد ذلك؟",
      promptPlaceholder:
        "شارك ميزة تريدها، أو مشكلة مزعجة، أو سير عمل تتمنى أن يدعمه زكي...",
      nameLabel: "الاسم (اختياري)",
      namePlaceholder: "مجهول بشكل افتراضي",
      submit: "انشر الفكرة",
      posting: "جارٍ النشر...",
      sortTop: "الأعلى",
      sortNewest: "الأحدث",
      voteUp: "تصويت إيجابي",
      voteDown: "تصويت سلبي",
      anonymous: "مجهول",
      empty: "لا توجد أفكار منشورة بعد. كن أول من يؤثر على ما سيبنيه زكي لاحقًا.",
      errorLoad: "تعذر تحميل الآراء الآن.",
      errorSubmit: "تعذر نشر الرأي الآن.",
      errorVote: "تعذر تسجيل هذا التصويت الآن.",
      success: "أصبحت فكرتك ظاهرة الآن.",
      joinPrompt: "انضم إلى المجتمع الذي يشكل ما سيأتي بعد ذلك.",
      legalNote: "لا حاجة لتسجيل الدخول. أضف اسمك فقط إذا أردت أن نذكره علنًا.",
      loading: "جارٍ تحميل الآراء...",
      countLabel: "حرف",
    },
    useCases: {
      heading: "أين تفيدك Spaces اليوم؟",
      items: [
        {
          title: "العمل",
          description: "خطط أسرع، اكتب بشكل أوضح، واتخذ قرارات أفضل مع دعم يفهم السياق.",
        },
        {
          title: "التعلّم",
          description: "لخّص، اشرح، وترجم الأفكار بطريقة قريبة من سياقك الحقيقي.",
        },
        {
          title: "الشخصي",
          description: "مساعدة يومية مع ذاكرة يمكن مراجعتها والتحكم الكامل بها.",
        },
      ],
      note: "زكي يذهب أبعد من ذلك، لكن Spaces تغطي طبقة الاستخدام اليومي الآن.",
    },
    pricing: {
      heading: "ابدأ مجانًا. ادفع عندما تحتاج سعة أكبر.",
      subheading:
        "Chat مجاني للبدء وAgent يتيح استخدامًا مجانيًا محدودًا. الخطط المدفوعة 15 و45 و99 دولارًا شهريًا وتضيف سعة أسبوعية مشتركة أكبر.",
      interval: {
        monthly: "شهري",
        yearly: "سنوي",
      },
      plans: [
        {
          tier: "chat",
          label: "مجاني",
          priceMonthly: "$0",
          priceYearly: "لا تحتاج بطاقة",
          blurb: "للدردشة الفورية والاستخدام المحدود لـ Agent.",
          features: [
            "سعة أسبوعية مجانية لـ Chat",
            "استخدام محدود لـ Agent",
            "استمرارية الحساب بعد تسجيل الدخول"
          ],
          cta: "ابدأ مجانًا",
        },
        {
          tier: "personal",
          label: "الخطط المدفوعة",
          priceMonthly: "تبدأ من $15 / شهر",
          priceYearly: "السعر النهائي يظهر عند الدفع",
          blurb: "سعة أسبوعية أكبر عبر Agent وChat وSpaces وBrain.",
          features: [
            "Personal بسعر 15 دولارًا شهريًا",
            "Pro بسعر 45 دولارًا شهريًا",
            "Pro Max بسعر 99 دولارًا شهريًا"
          ],
          cta: "شاهد الخطط",
        },
      ],
      oneTimeCode: {
        label: "كود هدية",
        badge: "🎁 دفعة واحدة",
        price: "15$ دفعة واحدة",
        blurb: "أهدِ شخصًا تعرفه وصول ZAKI لمدة 30 يومًا للدراسة، الكتابة، التركيز، والدعم اليومي.",
        features: [
          "رمز تفعيل لاستخدام واحد",
          "يصلك عبر البريد الإلكتروني بعد الدفع",
          "مناسب للأصدقاء والزملاء"
        ],
        cta: "اشترِ كود هدية لشهر",
      },
      note: "السعة أسبوعية ومشتركة عبر أسطح المنتج العام الأساسي.",
      botBeta: {
        heading: "ZAKI Agent",
        badge: "استمرارية الحساب",
        description:
          "زكي يحتفظ بالسياق بين الجلسات، ويُظهر مراحل عمله، ويحتفظ بذاكرة لكل مستخدم. المسارات القادمة تبقى مقيّدة حتى تتفق الخدمة الخلفية والصلاحيات والواجهة والاختبارات.",
        bullets: [
          "ذاكرة ومتابعة عبر Agent",
          "ذاكرة مستمرة تنتقل بين الجلسات",
          "مراحل عمل مرئية تشاهد فيها ما يفعله زكي",
          "استخدام مجاني محدود وخطط مدفوعة بسعة أكبر.",
        ],
        cta: "افتح Agent",
        href: appHandoffUrl("/agent", "website_agent_live", "agent"),
      },
      botPremium: {
        heading: "المسارات القادمة",
        badge: "مقيّدة",
        description:
          "Design قائمة انتظار وMinutes قريبًا حتى تكتمل مساراتهما.",
        bullets: [
          "لا تُباع كمنتجات مكتملة",
          "تُفتح بعد اجتياز بوابات الإصدار",
          "حالتها معلنة بوضوح",
        ],
        cta: "شاهد خارطة الطريق",
        href: "/product/",
      },
    },
    faq: {
      heading: "الأسئلة الشائعة",
      subheading: "الأسئلة الشائعة",
      items: [
        {
          question: "ما هو زكي؟",
          answer:
            "زكي هو طبقة الذكاء المستمر. يتذكر السياق المفيد ويحافظ على خيط مستمر معك عبر الوقت. Chat وSpaces هما المدخل السريع، وAgent يحمل المتابعة، وBrain يجعل الذاكرة مرئية.",
        },
        {
          question: "ما الفرق بين زكي وSpaces؟",
          answer:
            "زكي للاستمرارية والذاكرة والاسترجاع عبر الوقت. أما Spaces فللتنفيذ المنظّم داخل مساحة عمل مخصصة. زكي يحافظ على الخيط الطويل، وSpaces تساعدك على إنجاز العمل بوضوح.",
        },
        {
          question: "ما هي Spaces؟",
          answer:
            "Spaces هي مساحات عمل ذكية منظّمة، حيث يمكن لكل مشروع أن يحمل تعليماته وملفاته وخيوطه الخاصة. تساعدك على تنظيم عملك والحفاظ على سياق واضح.",
        },
        {
          question: "لماذا يوجد زكي وSpaces معًا؟",
          answer:
            "لأن الاستمرارية والتنفيذ المنظّم وظيفتان مختلفتان. زكي يعتني بطبقة العلاقة والذاكرة، بينما Spaces تعتني بالتنفيذ المنظّم للمهمات والبحث والكتابة والعمل بحسب كل مشروع.",
        },
        {
          question: "متى أستخدم زكي بدلًا من Spaces؟",
          answer:
            "استخدم زكي عندما تحتاج إلى الاستمرارية والتخطيط والذاكرة وخيط ممتد عبر الوقت. واستخدم Spaces عندما يحتاج العمل إلى تعليماته وملفاته وسياقه المشترك داخل مشروع واضح.",
        },
        {
          question: "هل تحديثات زكي متاحة الآن؟",
          answer:
            "نعم. Agent جزء من V1 مع ذاكرة حساب ومراحل عمل مرئية ومتابعة. بعض الأدوات والأسطح القادمة تبقى مقيدة حتى تكتمل عقودها.",
        },
        {
          question: "لماذا بعض أسطح زكي مقيدة؟",
          answer:
            "لأن زكي لا يفتح سطحًا إلا عندما تتفق حالة المنتج والصلاحيات والذاكرة والواجهة والاختبارات. المنتجات الحية يجب أن تكون قابلة للاستخدام، والأسطح القادمة يجب أن تكون واضحة.",
        },
        {
          question: "كيف يعمل الوصول المجاني إلى Chat؟",
          answer:
            "Chat يبدأ مجانًا بسعة أسبوعية. سجّل الدخول عندما تحتاج استمرارية الحساب وذاكرة Brain ومتابعة Agent.",
        },
        {
          question: "هل Chat مجاني؟",
          answer:
            "نعم. Chat يبدأ مجانًا وبسعة محدودة. Agent يضيف استمرارية الحساب عندما يحتاج العمل إلى متابعة.",
        },
        {
          question: "هل يدّعي زكي التفوق على ChatGPT أو Claude؟",
          answer:
            "لا. Spaces لا تدّعي التفوق على أحدث GPT أو Claude في القدرة الخام. القيمة الأساسية هي شكل المنتج: التنظيم، السعر، التحكم، ودعم العربية-الإنجليزية، واتجاه المشغّل.",
        },
        {
          question: "ماذا يعني أنه مدعوم ببنية زكي الخاصة؟",
          answer:
            "بنية زكي الخاصة توفّر استمرارية الذاكرة، ووضوح مراحل العمل، وقابلية التدريب، والانضباط الـAgentic الذي يجعل زكي أقرب إلى نظير رقمي مستمر منه إلى جلسة دردشة عادية.",
        },
        {
          question: "متى تبدأ الاشتراكات المميزة؟",
          answer:
            "الخطط المدفوعة تضيف مساحة عمل أكبر وذاكرة أعمق وأولوية حيث تتوفر. الأسطح القادمة لا تُباع كمنتجات مكتملة قبل جاهزيتها.",
        },
        {
          question: "لماذا أبدأ الآن؟",
          answer: "لأن V1 يفتح قلب التجربة: Chat وAgent وBrain مع ذاكرة واضحة ومتابعة عملية، بينما تبقى الأسطح القادمة مقيدة حتى تجهز.",
        },
      ],
    },
    footer: {
      copyright: "nova nuggets © 2025",
      legal: "الشروط",
      privacy: "الخصوصية",
      compliance: "الامتثال",
      faq: "الأسئلة",
    },
  },
};

export function resolveLocale(search = "", pathname = "") {
  if (typeof window !== "undefined" && !search && !pathname) {
    search = window.location.search;
    pathname = window.location.pathname;
  }

  const params = new URLSearchParams(search || "");
  const queryLang = params.get("lang");
  if (queryLang === "ar" || queryLang === "en") return queryLang;

  return String(pathname || "").startsWith("/ar") ? "ar" : "en";
}
