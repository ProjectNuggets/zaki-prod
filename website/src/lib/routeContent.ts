import type { Locale } from "./content";

export type LegalSlug = "privacy" | "terms" | "compliance";

type SeoPayload = {
  title: string;
  description: string;
  imageAlt: string;
  keywords: string;
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
    anchor?: string;
  }>;
  seo: SeoPayload;
};

const contactContent: Record<Locale, ContactContent> = {
  en: {
    badge: "Get in touch",
    title: "Contact",
    intro:
      "Real people read every message. Whether it's a bug, your account, or a privacy request, send us a note and we'll come back to you — usually within a day.",
    cards: [
      {
        title: "Support requests",
        body: "Include account email, timestamp, affected route or feature, and a concise issue summary so the team can respond faster.",
      },
      {
        title: "Legal and privacy",
        body: "Add the request type clearly: access, correction, export, deletion, or compliance inquiry.",
      },
    ],
    emailLabel: "Email support",
    appLabel: "Open app",
    seo: {
      title: "Contact ZAKI | Support and Inquiries",
      description:
        "Contact ZAKI for support, privacy, legal, and account inquiries.",
      imageAlt: "Contact ZAKI AI support page",
      keywords: "ZAKI contact, ZAKI support, ZAKI privacy requests, ZAKI legal contact",
    },
  },
  ar: {
    badge: "الدعم",
    title: "تواصل معنا",
    intro: "للدعم أو الحساب أو طلبات الخصوصية والامتثال، تواصل معنا مباشرة، مع ملخص واضح وسياق كافٍ حتى نتمكن من الرد بشكل فعلي.",
    cards: [
      {
        title: "طلبات الدعم",
        body: "يرجى تضمين بريد الحساب ووقت المشكلة والمسار أو الميزة المتأثرة ووصفًا واضحًا للحالة حتى نتمكن من المتابعة بسرعة.",
      },
      {
        title: "الطلبات القانونية والخصوصية",
        body: "حدّد نوع الطلب بوضوح: وصول، تصحيح، تصدير، حذف، أو استفسار امتثال.",
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
      intro: "Effective: April 29, 2026. Last updated: April 29, 2026. Policy version: 2026-04-29.v3. Private by default.",
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
          title: "Subprocessors",
          anchor: "subprocessors",
          body:
            "We use the following third-party processors to deliver the service. Material changes to this list are reflected in this Policy and emailed to active accounts at least 14 days before they take effect.",
          items: [
            "Stripe, Inc. (US): payment processing for billing tiers. Shared: email, billing details, transaction metadata. Stripe stores card data; ZAKI never sees card numbers.",
            "Cloudflare, Inc. (US): DDoS protection, CDN, edge routing. Shared: request IPs, headers, request paths. No conversation contents.",
            "Anthropic, PBC (US): model inference for the Claude family when selected. Shared: conversation contents at the time of inference.",
            "OpenAI, OpenAI LLC (US): model inference when selected or used as a fallback. Shared: conversation contents at the time of inference.",
            "Together AI, Inc. (US): primary model inference (Kimi K2.5 and related open-source families). Shared: conversation contents at the time of inference.",
          ],
        },
        {
          title: "Cookies and similar technologies",
          anchor: "cookies",
          body:
            "We use a small number of strictly necessary cookies to keep you signed in and to operate the service. Analytics cookies, where used, are off by default and only set after explicit consent in the cookie banner. You can change your choice at any time by clearing the chatzaki-cookie-consent cookie in your browser.",
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
          title: "Data Processing Agreement (business customers)",
          anchor: "dpa",
          body:
            "A Data Processing Agreement (DPA) is available on request for business customers. Email support@chatzaki.com with the subject line DPA Request and we will provide our standard DPA template within 5 business days.",
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
      intro: "تاريخ النفاذ: 29 أبريل 2026. آخر تحديث: 29 أبريل 2026. إصدار السياسة: 2026-04-29.v3. الخصوصية افتراضية في التصميم.",
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
          title: "المعالجون الفرعيون",
          anchor: "subprocessors",
          body:
            "نستعين بمعالجين خارجيين لتقديم الخدمة. تُحدَّث هذه القائمة في هذه السياسة، ويتم إشعار الحسابات النشطة بأي تغيير جوهري عبر البريد الإلكتروني قبل سريانه بأربعة عشر يومًا على الأقل.",
          items: [
            "Stripe, Inc. (الولايات المتحدة): معالجة المدفوعات للخطط المدفوعة. ما يُشارَك: البريد الإلكتروني، تفاصيل الفوترة، وبيانات المعاملة. تحتفظ Stripe ببيانات البطاقات، ولا يطّلع ZAKI على أرقامها.",
            "Cloudflare, Inc. (الولايات المتحدة): الحماية من الهجمات وتوصيل المحتوى وتوجيه الحافة. ما يُشارَك: عناوين IP وترويسات الطلب ومسارات الطلب. لا يشمل محتوى المحادثات.",
            "Anthropic, PBC (الولايات المتحدة): استدلال نماذج Claude عند اختيارها. ما يُشارَك: محتوى المحادثة وقت الاستدلال.",
            "OpenAI, OpenAI LLC (الولايات المتحدة): استدلال النماذج عند اختيارها أو كاحتياطي. ما يُشارَك: محتوى المحادثة وقت الاستدلال.",
            "Together AI, Inc. (الولايات المتحدة): استدلال أساسي لعائلة Kimi K2.5 ونماذج مفتوحة المصدر ذات الصلة. ما يُشارَك: محتوى المحادثة وقت الاستدلال.",
          ],
        },
        {
          title: "ملفات تعريف الارتباط والتقنيات المماثلة",
          anchor: "cookies",
          body:
            "نستخدم عددًا محدودًا من ملفات تعريف الارتباط الضرورية لتسجيل الدخول وتشغيل الخدمة. أما ملفات التحليلات فهي معطّلة افتراضيًا، ولا تُفعَّل إلا بعد موافقة صريحة عبر شريط الموافقة. ويمكنك تغيير اختيارك في أي وقت بحذف ملف chatzaki-cookie-consent من المتصفح.",
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
          title: "اتفاقية معالجة البيانات (لعملاء الأعمال)",
          anchor: "dpa",
          body:
            "تتوفر اتفاقية معالجة بيانات (DPA) عند الطلب لعملاء الأعمال. راسلنا على support@chatzaki.com مع وضع كلمة DPA Request في عنوان الرسالة، وسنزوّدك بالنموذج الموحّد خلال خمسة أيام عمل.",
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
        "Effective: April 29, 2026. Last updated: April 29, 2026. Policy version: 2026-04-29.v3. By creating an account or using ZAKI, you agree to these terms.",
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
        "تاريخ النفاذ: 29 أبريل 2026. آخر تحديث: 29 أبريل 2026. إصدار السياسة: 2026-04-29.v3. بإنشاء حساب أو استخدام زكي، أنت توافق على هذه الشروط.",
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
        "Baseline controls and governance commitments for launch. Effective: April 29, 2026. Last updated: April 29, 2026. Private by default.",
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
        "ضوابط أساسية للحوكمة والأمان عند الإطلاق. تاريخ النفاذ: 29 أبريل 2026. آخر تحديث: 29 أبريل 2026. الخصوصية افتراضية في التصميم.",
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

export function getContactContent(locale: Locale) {
  return contactContent[locale];
}

export function getLegalContent(slug: LegalSlug, locale: Locale) {
  return legalContent[slug][locale];
}
