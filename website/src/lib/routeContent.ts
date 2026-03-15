import type { Locale } from "./content";

export type ComparisonSlug = "vs-chatgpt" | "best-arabic-ai-assistant";
export type HowToSlug =
  | "write-arabic-emails-ai"
  | "translate-dialects-arabic-english"
  | "create-social-media-content-arabic";
export type LegalSlug = "privacy" | "terms" | "compliance";

type SeoPayload = {
  title: string;
  description: string;
  imageAlt: string;
  keywords: string;
};

type ComparisonContent = {
  badge: string;
  title: string;
  intro: string;
  note?: string;
  definition: string;
  table: {
    headers: string[];
    rows: Array<{
      feature: string;
      values: string[];
    }>;
  };
  quote: string;
  sections: Array<{
    title: string;
    body?: string;
    items?: string[];
  }>;
  disclaimer?: string;
  links: Array<{ label: string; href: string }>;
  seo: SeoPayload;
};

type HowToContent = {
  badge: string;
  title: string;
  intro: string;
  steps: Array<{
    title: string;
    text: string;
  }>;
  examplePrompt: string;
  goodOutput: string;
  links: Array<{ label: string; href: string }>;
  seo: SeoPayload;
};

type ContactContent = {
  badge: string;
  title: string;
  intro: string;
  cards: Array<{ title: string; body: string }>;
  emailLabel: string;
  appLabel: string;
  seo: SeoPayload;
};

type LegalContent = {
  badge: string;
  title: string;
  intro: string;
  sections: Array<{
    title: string;
    body: string;
    items?: string[];
  }>;
  seo: SeoPayload;
};

const comparisonContent: Record<ComparisonSlug, ComparisonContent> = {
  "vs-chatgpt": {
    badge: "Comparison",
    title: "ZAKI Chat vs ChatGPT for Arabic Speakers",
    intro:
      "This page compares the live ZAKI Chat experience, not the future-facing operator product. ChatGPT remains broader and more frontier-led. ZAKI Chat is stronger when the job is organized, cheaper, and more controlled Arabic-English daily work.",
    note: "ZAKI is the flagship future product; this page compares only the current ZAKI Chat experience.",
    definition:
      "ZAKI Chat is the live paid spaces-based AI workspace in the ZAKI product ladder. ChatGPT is the mainstream general-purpose benchmark for AI chat. This comparison is about product fit, not a claim that ZAKI beats frontier models on raw capability.",
    table: {
      headers: ["Feature", "ZAKI Chat", "ChatGPT"],
      rows: [
        {
          feature: "Primary role",
          values: ["Spaces-based daily AI workspace", "General-purpose mainstream AI assistant"],
        },
        {
          feature: "Arabic-English workflow fit",
          values: [
            "Built around bilingual everyday use",
            "Broad multilingual support, but not built as an Arabic-first workflow product",
          ],
        },
        {
          feature: "Organization model",
          values: ["Spaces keep work and context separated", "Thread-based general chat model"],
        },
        {
          feature: "Memory / control",
          values: ["User-managed memory orientation", "Cloud-managed memory features depending on plan and surface"],
        },
        {
          feature: "Frontier model race",
          values: ["Does not claim to win it", "Stronger frontier-model positioning"],
        },
        {
          feature: "Next-step vision",
          values: ["Connects directly to ZAKI", "General chat product direction"],
        },
      ],
    },
    quote:
      "ZAKI Chat is not trying to beat ChatGPT at the frontier-model game. It is trying to be more organized, more controllable, and more useful for everyday Arabic-English work.",
    sections: [
      {
        title: "Why people choose ZAKI Chat",
        items: [
          "You want a cheaper daily-use AI layer with clearer structure.",
          "You work across Arabic and English every day and care about product fit, not just model scale.",
          "You want memory and personalization with more user control.",
          "You want a clearer path from daily chat to something more persistent through ZAKI.",
        ],
      },
      {
        title: "Why people still choose ChatGPT",
        items: [
          "You want the broadest mainstream AI ecosystem.",
          "You care most about raw frontier-model performance and breadth.",
          "You want the product that has already become the global default.",
        ],
      },
      {
        title: "If you want more than chat",
        body:
          "ZAKI is the flagship future product: a Personal AI Operator powered by Nullalis. The public beta opens with 5 free messages every 24 hours for experimentation.",
      },
    ],
    disclaimer:
      "This page is intentionally honest: ChatGPT remains stronger in the frontier-model conversation. The case for ZAKI Chat is not raw supremacy. It is product discipline, workflow structure, pricing, and control.",
    links: [
      { label: "Read the ZAKI page", href: "/zaki-bot/" },
      { label: "See the Arabic AI ranking", href: "/best-arabic-ai-assistant/" },
      { label: "Use ZAKI Chat", href: "https://app.chatzaki.com/?auth=signup" },
    ],
    seo: {
      title: "ZAKI Chat vs ChatGPT for Arabic Speakers",
      description:
        "An honest comparison of ZAKI Chat and ChatGPT for Arabic-English daily work. ZAKI is the flagship future product; this page compares only the current ZAKI Chat experience.",
      imageAlt: "ZAKI Chat versus ChatGPT comparison page",
      keywords:
        "ZAKI Chat vs ChatGPT, Arabic AI comparison, bilingual AI workspace, ZAKI Chat, ChatGPT",
    },
  },
  "best-arabic-ai-assistant": {
    badge: "2026 Roundup",
    title: "Best Arabic AI Assistant in 2026: Chat Tools and Operators",
    intro:
      "There is no single best Arabic AI product in the abstract. Some tools are broad chat products, some are vertical assistants, and some are starting to move toward something more persistent. This page separates those categories instead of flattening them.",
    definition:
      "Short answer: ZAKI Chat is a strong choice for bilingual daily productivity and structured work. ChatGPT remains broader and more mainstream. ZAKI is the public beta step toward something more ambitious: a Personal AI Operator.",
    table: {
      headers: ["Tool", "Best for", "Category", "Memory / control model", "Notes"],
      rows: [
        {
          feature: "ZAKI Chat",
          values: [
            "Bilingual daily productivity and spaces-based work",
            "Live paid chat product",
            "User-managed memory orientation",
            "Best fit if you want a cheaper, more organized daily AI layer",
          ],
        },
        {
          feature: "ChatGPT",
          values: [
            "General-purpose breadth and frontier-model reach",
            "Mainstream broad chat product",
            "Cloud-managed memory depending on plan",
            "Still stronger for users optimizing for frontier breadth",
          ],
        },
        {
          feature: "Daleela",
          values: [
            "Healthcare-specific Arabic guidance",
            "Vertical assistant",
            "Provider-specific",
            "Not a general daily productivity replacement",
          ],
        },
        {
          feature: "Labiba",
          values: [
            "Arabic enterprise automation and support",
            "Enterprise assistant platform",
            "Implementation-dependent",
            "Better read as enterprise tooling than consumer personal AI",
          ],
        },
        {
          feature: "Yasmina AI",
          values: [
            "Workflow-specific guided experiences",
            "Embedded assistant",
            "Workflow-specific",
            "More specialized than a general personal AI product",
          ],
        },
      ],
    },
    quote:
      "The right Arabic AI tool depends on what you need today. ZAKI Chat is strong for bilingual daily work now, while ZAKI points toward a more persistent personal AI category.",
    sections: [
      {
        title: "Read this comparison the right way",
        items: [
          "ZAKI Chat is strongest when the user wants a practical Arabic-English productivity assistant now.",
          "ChatGPT still wins on frontier breadth and mainstream ecosystem strength.",
          "Daleela, Labiba, and Yasmina AI make more sense when the need is vertical or embedded rather than a personal general assistant.",
          "ZAKI is not the same category as chat tools. It is the public beta step toward a Personal AI Operator.",
        ],
      },
      {
        title: "For users looking beyond chat",
        body:
          "ZAKI is our public beta step toward a Personal AI Operator. It opens with 5 free messages every 24 hours for experimentation. That is the flagship direction, not just another comparison-row feature.",
      },
    ],
    disclaimer:
      "This page is intentionally use-case based. Not every Arabic AI product is trying to solve the same problem, and not every assistant belongs in the same ranking logic.",
    links: [
      { label: "Read the ZAKI page", href: "/zaki-bot/" },
      { label: "Compare ZAKI Chat vs ChatGPT", href: "/vs-chatgpt/" },
      { label: "Use ZAKI Chat", href: "https://app.chatzaki.com/?auth=signup" },
    ],
    seo: {
      title: "Best Arabic AI Assistant in 2026: Chat Tools and Operators",
      description:
        "An honest comparison of Arabic AI tools by product fit. ZAKI Chat is strong for bilingual daily productivity, and ZAKI is the public beta step toward a Personal AI Operator.",
      imageAlt: "Arabic AI assistant comparison page",
      keywords:
        "best Arabic AI assistant, Arabic AI tools, ZAKI Chat, Personal AI Operator, Arabic AI comparison",
    },
  },
};

const howToContent: Record<HowToSlug, HowToContent> = {
  "write-arabic-emails-ai": {
    badge: "How To",
    title: "How to Write Professional Arabic Emails Using AI",
    intro:
      "Use AI to save time on Arabic email drafting, then tighten tone and context so the final message still sounds like you.",
    steps: [
      {
        title: "Set the context.",
        text:
          "Start with the recipient, topic, urgency, and desired tone. Example: Draft a formal Arabic email to a logistics partner confirming tomorrow's meeting and asking for the final attendee list.",
      },
      {
        title: "Request the first draft.",
        text:
          "Ask for Modern Standard Arabic if the email is formal, or a lighter Arabic register if the relationship is more familiar.",
      },
      {
        title: "Refine the tone.",
        text:
          "Tell the AI whether you want the email to sound warmer, more direct, more executive, or more concise.",
      },
      {
        title: "Check names, dates, and commitments.",
        text:
          "AI should help with wording, but you still confirm the facts before sending.",
      },
    ],
    examplePrompt:
      "Write a professional Arabic email to a university department asking for confirmation of my scholarship documents. Keep it respectful, concise, and easy to read.",
    goodOutput:
      "A clear Arabic subject line, respectful greeting, one-paragraph context, specific ask, and polite closing. The best draft sounds natural and avoids over-translation from English.",
    links: [
      { label: "Translate dialects to English", href: "/how-to/translate-dialects-arabic-english/" },
      { label: "Try ZAKI", href: "https://app.chatzaki.com/?auth=signup" },
    ],
    seo: {
      title: "How to Write Professional Arabic Emails Using AI",
      description:
        "A step-by-step guide to writing professional Arabic emails with AI, including prompts, tone control, and practical examples.",
      imageAlt: "Guide for writing Arabic emails with AI",
      keywords:
        "Arabic email AI guide, write Arabic emails with AI, ZAKI Arabic productivity guide",
    },
  },
  "translate-dialects-arabic-english": {
    badge: "How To",
    title: "How to Translate Arabic Dialects to English Accurately",
    intro:
      "Good translation is not word-for-word conversion. It keeps intent, tone, and implied context when dialect meets English.",
    steps: [
      {
        title: "Name the dialect.",
        text: "Tell the AI whether the input is Levantine, Khaleeji, Egyptian, or mixed.",
      },
      {
        title: "Ask for natural English.",
        text: "Avoid literal translation unless you specifically need linguistic analysis.",
      },
      {
        title: "Request idiom notes.",
        text:
          "Ask the AI to explain any line that might lose meaning when translated directly.",
      },
      {
        title: "Check audience fit.",
        text: "A translation for a legal memo is different from one for a social post.",
      },
    ],
    examplePrompt:
      "Translate this Levantine Arabic message into natural English. Explain any expression that carries emotional nuance or humor.",
    goodOutput:
      "The English result reads naturally, while a short note explains any phrase that does not translate literally. You keep meaning, not just vocabulary.",
    links: [
      { label: "Create Arabic social content", href: "/how-to/create-social-media-content-arabic/" },
      { label: "Try ZAKI", href: "https://app.chatzaki.com/?auth=signup" },
    ],
    seo: {
      title: "How to Translate Arabic Dialects to English Accurately",
      description:
        "Learn how to translate Levantine, Khaleeji, and Egyptian Arabic to natural English with AI while preserving meaning and context.",
      imageAlt: "Guide for translating Arabic dialects to English with AI",
      keywords:
        "translate Arabic dialects to English, Arabic dialect AI translation, ZAKI translation guide",
    },
  },
  "create-social-media-content-arabic": {
    badge: "How To",
    title: "How to Create Arabic Social Media Content with AI",
    intro:
      "AI helps most when you give it a platform, audience, and tone. The goal is not generic output. The goal is Arabic content that sounds native to the channel.",
    steps: [
      {
        title: "Specify the channel.",
        text: "Instagram captions, LinkedIn posts, and X threads need different pacing.",
      },
      {
        title: "Give a voice reference.",
        text: "Tell the AI if the brand should sound formal, playful, premium, or direct.",
      },
      {
        title: "Ask for multiple hooks.",
        text: "The best Arabic content often depends on the first line.",
      },
      {
        title: "Trim and localize.",
        text:
          "Remove generic filler and keep phrasing that feels natural for your audience.",
      },
    ],
    examplePrompt:
      "Write three Arabic Instagram caption options for a product launch in the Gulf. Keep them energetic, short, and locally natural.",
    goodOutput:
      "Short hooks, a clear value proposition, and phrasing that matches the platform. The best AI-assisted caption feels written for the region, not translated into it.",
    links: [
      { label: "Write Arabic emails", href: "/how-to/write-arabic-emails-ai/" },
      { label: "Try ZAKI", href: "https://app.chatzaki.com/?auth=signup" },
    ],
    seo: {
      title: "How to Create Arabic Social Media Content with AI",
      description:
        "Use AI to draft Arabic captions, posts, and short-form content with stronger local phrasing, clearer hooks, and more natural tone.",
      imageAlt: "Guide for Arabic social media content with AI",
      keywords:
        "Arabic social media AI guide, Arabic content with AI, ZAKI content writing guide",
    },
  },
};

const contactContent: Record<Locale, ContactContent> = {
  en: {
    badge: "Support",
    title: "Contact",
    intro:
      "For support, account, legal, privacy, or compliance requests, contact the team directly.",
    cards: [
      {
        title: "Support requests",
        body: "Include account email, timestamp, and a concise issue summary so the team can respond faster.",
      },
      {
        title: "Legal and privacy",
        body: "Add request type: access, correction, export, deletion, or compliance inquiry.",
      },
    ],
    emailLabel: "support@chatzaki.com",
    appLabel: "Open app",
    seo: {
      title: "Contact ZAKI AI | Support and Inquiries",
      description:
        "Contact ZAKI AI for support, privacy, legal, and account inquiries across Arabic and English workflows.",
      imageAlt: "Contact ZAKI AI support page",
      keywords: "ZAKI contact, ZAKI support, ZAKI privacy requests, ZAKI legal contact",
    },
  },
  ar: {
    badge: "الدعم",
    title: "تواصل معنا",
    intro: "للدعم أو الحساب أو طلبات الخصوصية والامتثال، تواصل معنا مباشرة.",
    cards: [
      {
        title: "طلبات الدعم",
        body: "يرجى تضمين بريد الحساب ووقت المشكلة ووصفًا واضحًا للحالة حتى نتمكن من المتابعة بسرعة.",
      },
      {
        title: "الطلبات القانونية والخصوصية",
        body: "حدّد نوع الطلب: وصول، تصحيح، تصدير، حذف، أو استفسار امتثال.",
      },
    ],
    emailLabel: "support@chatzaki.com",
    appLabel: "فتح التطبيق",
    seo: {
      title: "تواصل مع ZAKI | الدعم والاستفسارات",
      description: "تواصل مع ZAKI للدعم وطلبات الخصوصية والقانون والحساب عبر العربية والإنجليزية.",
      imageAlt: "صفحة التواصل مع ZAKI",
      keywords: "تواصل ZAKI, دعم ZAKI, طلبات الخصوصية, امتثال ZAKI",
    },
  },
};

const legalContent: Record<LegalSlug, Record<Locale, LegalContent>> = {
  privacy: {
    en: {
      badge: "Privacy",
      title: "Privacy Notice",
      intro: "Effective date: February 17, 2026. Policy version: 2026-02-17.v2. Private by default.",
      sections: [
        {
          title: "Who controls this service",
          body:
            "Nova Nuggets L.L.C, established in 2025 and headquartered in Dubai, UAE, operates ZAKI. Our production operations are hosted on European infrastructure with GDPR-aligned controls.",
        },
        {
          title: "Data categories",
          body: "We process the following categories of data:",
          items: [
            "Account data: email, profile, auth and session metadata.",
            "User content: prompts, responses, memories, and references.",
            "Operational data: diagnostics, abuse-prevention signals, and service logs.",
            "Billing metadata for entitlement and reconciliation.",
          ],
        },
        {
          title: "Processing chain and purpose",
          body:
            "Service chain: ZAKI to TYP to third-party inference processors. We process data to provide account access, deliver features, secure the service, prevent abuse, and improve quality and cultural relevance.",
        },
        {
          title: "Our mission and data use",
          body:
            "We believe AI should be personal, and personal means private by default. We use necessary interaction data to improve ZAKI so the Arab world has its own voice in the AI era, while keeping user controls and privacy safeguards central.",
        },
        {
          title: "Legal bases and GDPR rights",
          body:
            "Where GDPR applies, legal bases may include contract performance, legitimate interests, legal obligations, and consent where required. You may request access, correction, deletion, restriction, portability, and objection rights as applicable law allows.",
        },
        {
          title: "International transfers",
          body:
            "Data may be processed outside your home jurisdiction through infrastructure or subprocessors. Where required, we apply transfer safeguards under applicable law.",
        },
        {
          title: "Retention and deletion",
          body:
            "We retain data only as needed for service operation, security, anti-abuse, and legal obligations. You can request export, correction, or deletion. Account deletion starts deletion workflows subject to lawful retention requirements.",
        },
        {
          title: "Security",
          body:
            "Controls include encryption in transit, controlled access, monitoring, and role-based internal access controls. No internet service can guarantee absolute security.",
        },
        {
          title: "Contact",
          body: "support@chatzaki.com",
        },
      ],
      seo: {
        title: "Privacy Policy | ZAKI AI",
        description:
          "Read the ZAKI AI privacy policy covering account data, prompts, memories, retention, and GDPR-aligned controls.",
        imageAlt: "ZAKI AI privacy policy",
        keywords: "ZAKI privacy policy, GDPR privacy AI, ZAKI data policy",
      },
    },
    ar: {
      badge: "خصوصية",
      title: "إشعار الخصوصية",
      intro: "تاريخ النفاذ: 17 فبراير 2026. إصدار السياسة: 2026-02-17.v2. الخصوصية افتراضية في التصميم.",
      sections: [
        {
          title: "من يتحكم بهذه الخدمة",
          body:
            "Nova Nuggets L.L.C، ومقرها دبي، الإمارات، هي الجهة المشغلة لـ ZAKI. تعمل خدمات الإنتاج لدينا على بنية مستضافة في أوروبا مع ضوابط متوافقة مع GDPR.",
        },
        {
          title: "فئات البيانات",
          body: "نقوم بمعالجة الفئات التالية من البيانات:",
          items: [
            "بيانات الحساب: البريد الإلكتروني، الملف الشخصي، وبيانات الجلسة والمصادقة.",
            "بيانات الاستخدام: المطالبات، الردود، عناصر الذاكرة، والمراجع المرفوعة.",
            "بيانات التشغيل: التشخيص، إشارات منع الإساءة، وسجلات الخدمة.",
            "بيانات الفوترة اللازمة للاستحقاق والمطابقة.",
          ],
        },
        {
          title: "سلسلة المعالجة والغرض",
          body:
            "سلسلة الخدمة: ZAKI ثم TYP ثم معالجات استدلال طرف ثالث. نعالج البيانات لتقديم الوصول للحساب، تشغيل الميزات، تأمين الخدمة، منع الإساءة، وتحسين الجودة والملاءمة الثقافية.",
        },
        {
          title: "مهمتنا واستخدام البيانات",
          body:
            "نؤمن أن الذكاء الاصطناعي يجب أن يكون شخصيًا، والشخصي يعني خاصًا افتراضيًا. نستخدم القدر اللازم من بيانات التفاعل لتحسين ZAKI حتى يكون للعالم العربي صوته الخاص في عصر الذكاء الاصطناعي، مع إبقاء تحكم المستخدم وضمانات الخصوصية في المقدمة.",
        },
        {
          title: "الأساس القانوني وحقوق GDPR",
          body:
            "عند انطباق GDPR، قد تشمل الأسس القانونية تنفيذ العقد، المصلحة المشروعة، الالتزامات القانونية، والموافقة حيث يلزم. ويمكنك طلب الوصول أو التصحيح أو الحذف أو التقييد أو النقل أو الاعتراض وفق ما يسمح به القانون.",
        },
        {
          title: "النقل الدولي",
          body:
            "قد تتم معالجة البيانات خارج نطاقك الجغرافي عبر البنية أو مزودي الخدمات. وعند الحاجة نطبق ضمانات نقل مناسبة وفق القانون المعمول به.",
        },
        {
          title: "الاحتفاظ والحذف",
          body:
            "نحتفظ بالبيانات فقط للمدة اللازمة لتشغيل الخدمة، الأمان، منع الإساءة، والالتزامات القانونية. ويمكنك طلب التصدير أو التصحيح أو الحذف. حذف الحساب يبدأ تدفقات الحذف مع مراعاة فترات الاحتفاظ القانونية.",
        },
        {
          title: "الأمان",
          body:
            "تشمل الضوابط: التشفير أثناء النقل، التحكم بالوصول، المراقبة، ووصول داخلي قائم على الأدوار. لا توجد خدمة عبر الإنترنت تضمن أمانًا مطلقًا.",
        },
        {
          title: "التواصل",
          body: "support@chatzaki.com",
        },
      ],
      seo: {
        title: "سياسة الخصوصية | ZAKI AI",
        description:
          "اطّلع على سياسة خصوصية ZAKI التي تغطي بيانات الحساب والمحادثات والذاكرة والاحتفاظ والضوابط المتوافقة مع GDPR.",
        imageAlt: "سياسة خصوصية ZAKI",
        keywords: "سياسة خصوصية ZAKI, خصوصية الذكاء الاصطناعي, GDPR",
      },
    },
  },
  terms: {
    en: {
      badge: "Legal",
      title: "Terms of Use",
      intro:
        "Effective date: February 17, 2026. Policy version: 2026-02-17.v2. By creating an account or using ZAKI, you agree to these terms.",
      sections: [
        {
          title: "0. Who we are",
          body:
            "ZAKI is operated by Nova Nuggets L.L.C, established in 2025, with headquarters in Dubai, UAE. Production services run on European-hosted infrastructure and align with GDPR principles and strict privacy governance.",
        },
        {
          title: "1. Eligibility and account responsibility",
          body:
            "You must be legally able to use this service in your jurisdiction, provide accurate signup details, and keep your credentials secure.",
        },
        {
          title: "2. Acceptable use",
          body:
            "You must not use ZAKI for illegal activity, abuse, harassment, malware, unauthorized access attempts, or reliability attacks. We may suspend accounts for violations, legal requirements, or security risk.",
        },
        {
          title: "3. AI output disclaimer",
          body:
            "AI output can be incomplete, outdated, or incorrect. You must verify important decisions independently, especially for legal, medical, tax, financial, or safety-critical contexts.",
        },
        {
          title: "4. Platform and model chain",
          body:
            "Service chain: ZAKI to TYP to third-party inference processors. ZAKI and TYP are operated by Nova Nuggets. Third-party processors are used only for required inference tasks.",
        },
        {
          title: "5. Open-source model licensing notice",
          body:
            "At deployment time we configure inference to use models with open-source license metadata in provider catalogs. Provider catalogs, model availability, and routing can change over time for reliability and compliance.",
        },
        {
          title: "6. Access codes and plan entitlement",
          body:
            "Access rights are entitlement-based, through subscription and or access code. Invalid or expired codes may limit features until entitlement is restored.",
        },
        {
          title: "7. Privacy by default and mission-aligned processing",
          body:
            "We design ZAKI as private by default. We process only the data required to run, secure, and improve the service. We use user interactions to improve quality and relevance so the Arab world has its own voice in the AI era.",
        },
        {
          title: "8. Liability and availability",
          body:
            "Service is provided as is and as available to the maximum extent permitted by law. We do not guarantee uninterrupted availability.",
        },
        {
          title: "9. Updates and re-consent",
          body:
            "Material policy updates may require re-consent in the app. Continued use after accepted updates means you agree to the latest policy version.",
        },
        {
          title: "10. Contact",
          body: "support@chatzaki.com",
        },
      ],
      seo: {
        title: "Terms of Service | ZAKI AI",
        description:
          "Read the ZAKI AI terms of service, account rules, AI-use disclaimers, and platform access conditions.",
        imageAlt: "ZAKI AI terms of service",
        keywords: "ZAKI terms of service, ZAKI legal terms, AI terms of use",
      },
    },
    ar: {
      badge: "قانوني",
      title: "شروط الاستخدام",
      intro:
        "تاريخ النفاذ: 17 فبراير 2026. إصدار السياسة: 2026-02-17.v2. بإنشاء حساب أو استخدام زكي، أنت توافق على هذه الشروط.",
      sections: [
        {
          title: "0. من نحن",
          body:
            "يتم تشغيل ZAKI بواسطة Nova Nuggets L.L.C ومقرها دبي، الإمارات. تعمل خدمات الإنتاج على بنية مستضافة في أوروبا ومتوافقة مع مبادئ GDPR وحوكمة خصوصية صارمة.",
        },
        {
          title: "1. الأهلية ومسؤولية الحساب",
          body:
            "يجب أن تكون مؤهلاً قانونيًا لاستخدام الخدمة في نطاقك القضائي، وأن تقدم بيانات صحيحة، وتحافظ على سرية بيانات الدخول الخاصة بك.",
        },
        {
          title: "2. الاستخدام المقبول",
          body:
            "يُمنع استخدام ZAKI في أي نشاط غير قانوني أو مسيء أو محاولات اختراق أو برمجيات خبيثة أو أي سلوك يضر باستقرار الخدمة. قد نقوم بتعليق الحساب عند المخالفة أو المخاطر الأمنية أو المتطلبات القانونية.",
        },
        {
          title: "3. إخلاء مسؤولية مخرجات الذكاء الاصطناعي",
          body:
            "قد تكون المخرجات غير كاملة أو غير دقيقة أو قديمة. يجب التحقق بشكل مستقل قبل اتخاذ قرارات مهمة، خاصة القانونية أو الطبية أو المالية أو أي قرارات عالية الحساسية.",
        },
        {
          title: "4. سلسلة المنصة والمعالجة",
          body:
            "سلسلة الخدمة: ZAKI ثم TYP ثم معالجات استدلال طرف ثالث. نظاما ZAKI وTYP يتم تشغيلهما داخليًا، بينما يُستخدم طرف ثالث فقط لمهام الاستدلال المطلوبة.",
        },
        {
          title: "5. إشعار تراخيص النماذج المفتوحة",
          body:
            "عند النشر نقوم بتكوين نماذج الاستدلال بناءً على بيانات تراخيص مفتوحة المصدر الظاهرة في كتالوجات المزودين. قد تتغير الكتالوجات أو توفر النماذج أو مسارات التوجيه مع الوقت لأسباب الامتثال والموثوقية.",
        },
        {
          title: "6. أكواد الوصول والاستحقاق",
          body:
            "صلاحيات الاستخدام تعتمد على الاستحقاق من خلال اشتراك و/أو كود وصول. الأكواد غير الصالحة أو المنتهية قد تؤدي إلى تقييد الميزات حتى يتم تفعيل استحقاق صالح.",
        },
        {
          title: "7. الخصوصية الافتراضية ومعالجة مرتبطة بالمهمة",
          body:
            "نصمم ZAKI بخصوصية افتراضية. نعالج فقط البيانات اللازمة لتشغيل الخدمة وتأمينها وتحسينها. ونستخدم التفاعل الضروري لتحسين جودة وملاءمة الذكاء حتى يكون للعالم العربي صوته الخاص في عصر الذكاء الاصطناعي.",
        },
        {
          title: "8. المسؤولية والتوافر",
          body:
            "تقدم الخدمة كما هي وحسب التوافر بالحد الأقصى المسموح به قانونيًا. لا نضمن توافرًا غير منقطع دائمًا.",
        },
        {
          title: "9. التحديثات وإعادة الموافقة",
          body:
            "قد تتطلب التحديثات الجوهرية إعادة موافقة داخل التطبيق. استمرار الاستخدام بعد الموافقة يعني القبول بإصدار السياسة الأحدث.",
        },
        {
          title: "10. التواصل",
          body: "support@chatzaki.com",
        },
      ],
      seo: {
        title: "شروط الخدمة | ZAKI AI",
        description:
          "اقرأ شروط خدمة ZAKI AI وقواعد الحساب وتنبيهات استخدام الذكاء الاصطناعي وشروط الوصول إلى المنصة.",
        imageAlt: "شروط خدمة ZAKI",
        keywords: "شروط استخدام ZAKI, شروط خدمة الذكاء الاصطناعي, ZAKI قانوني",
      },
    },
  },
  compliance: {
    en: {
      badge: "Compliance",
      title: "Security and Compliance",
      intro:
        "Baseline controls and governance commitments for launch. Effective date: February 17, 2026. Private by default.",
      sections: [
        {
          title: "Entity and operating model",
          body:
            "Nova Nuggets L.L.C, established in 2025, is headquartered in Dubai, UAE. ZAKI production services run on European-hosted infrastructure with GDPR-aligned processing controls.",
        },
        {
          title: "GDPR alignment",
          body:
            "Processing follows GDPR principles: lawfulness, fairness, transparency, purpose limitation, minimization, accuracy, storage limitation, and integrity and confidentiality.",
        },
        {
          title: "Consent and policy governance",
          body:
            "Signup requires explicit legal consent capture. Policy versioning and re-consent flows are enforced when terms are updated.",
        },
        {
          title: "Security controls",
          body:
            "Encryption in transit, controlled access, role-based internal access, secret management, logging, monitoring, and abuse-prevention controls.",
        },
        {
          title: "Model and vendor chain",
          body:
            "Inference may be routed through third-party inference processors. Platform systems ZAKI and TYP are operated by Nova Nuggets.",
        },
        {
          title: "Model licensing position",
          body:
            "Inference models are configured from provider entries with open-source license metadata at deployment time. We maintain routing controls for compliance and reliability updates.",
        },
        {
          title: "Private-by-default product posture",
          body:
            "We build ZAKI to be private by default: least-necessary processing, explicit user controls, clear consent records, and controlled data access. We improve model quality to support a culturally relevant Arab AI voice without weakening privacy commitments.",
        },
        {
          title: "Requests and incidents",
          body:
            "For compliance, privacy, or security incidents, contact support@chatzaki.com with account email, timestamp, and issue summary.",
        },
      ],
      seo: {
        title: "Security and Compliance | ZAKI AI",
        description:
          "Review ZAKI AI security, compliance, GDPR-aligned controls, governance, and private-by-default commitments.",
        imageAlt: "ZAKI AI security and compliance page",
        keywords: "ZAKI compliance, ZAKI security, GDPR aligned AI, private by default AI",
      },
    },
    ar: {
      badge: "امتثال",
      title: "الأمان والامتثال",
      intro:
        "ضوابط أساسية للحوكمة والأمان عند الإطلاق. تاريخ النفاذ: 17 فبراير 2026. الخصوصية افتراضية في التصميم.",
      sections: [
        {
          title: "الكيان ونموذج التشغيل",
          body:
            "Nova Nuggets L.L.C ومقرها دبي، الإمارات. تعمل خدمات ZAKI الإنتاجية على بنية مستضافة في أوروبا مع ضوابط معالجة متوافقة مع GDPR.",
        },
        {
          title: "التوافق مع GDPR",
          body:
            "تتم المعالجة وفق مبادئ GDPR: المشروعية، العدالة، الشفافية، تحديد الغرض، تقليل البيانات، الدقة، تحديد مدة الاحتفاظ، والسلامة والسرية.",
        },
        {
          title: "الموافقة وحوكمة السياسات",
          body:
            "يتطلب التسجيل موافقة قانونية صريحة. ويتم تطبيق إصدار السياسة وإعادة الموافقة عند تحديث الشروط.",
        },
        {
          title: "ضوابط الأمان",
          body:
            "تشفير أثناء النقل، تحكم بالوصول، وصول داخلي قائم على الأدوار، إدارة الأسرار، التسجيل والمراقبة، وضوابط منع الإساءة.",
        },
        {
          title: "سلسلة النماذج والمزودين",
          body:
            "قد يمر الاستدلال عبر معالجات استدلال طرف ثالث. منصتا ZAKI وTYP هما منتجات Nova Nuggets.",
        },
        {
          title: "وضع تراخيص النماذج",
          body:
            "يتم تكوين نماذج الاستدلال اعتمادًا على بيانات تراخيص مفتوحة المصدر في كتالوجات المزودين وقت النشر. ونحافظ على ضوابط توجيه تتماشى مع الامتثال والموثوقية.",
        },
        {
          title: "نهج الخصوصية الافتراضية",
          body:
            "نبني ZAKI بخصوصية افتراضية: معالجة أقل قدر لازم، تحكم واضح للمستخدم، سجلات موافقة دقيقة، ووصول مضبوط للبيانات. ونحسن الجودة لدعم ذكاء عربي أكثر ملاءمة دون التنازل عن الخصوصية.",
        },
        {
          title: "الطلبات والحوادث",
          body:
            "لطلبات الامتثال أو الخصوصية أو الحوادث الأمنية تواصل معنا عبر support@chatzaki.com مع بريد الحساب ووقت المشكلة ووصفها.",
        },
      ],
      seo: {
        title: "الأمان والامتثال | ZAKI AI",
        description:
          "راجع ضوابط الأمان والامتثال في ZAKI AI وحوكمة الخدمة ونهج الخصوصية الافتراضية والالتزام المتوافق مع GDPR.",
        imageAlt: "صفحة الأمان والامتثال في ZAKI",
        keywords: "امتثال ZAKI, أمان ZAKI, خصوصية افتراضية, توافق GDPR",
      },
    },
  },
};

export function getComparisonContent(slug: ComparisonSlug) {
  return comparisonContent[slug];
}

export function getHowToContent(slug: HowToSlug) {
  return howToContent[slug];
}

export function getContactContent(locale: Locale) {
  return contactContent[locale];
}

export function getLegalContent(slug: LegalSlug, locale: Locale) {
  return legalContent[slug][locale];
}

