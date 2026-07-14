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

// LEGAL DRAFT: owner review and, ideally, qualified legal counsel review are required before v4 is final.
// In particular, confirm the proposed minimum age of 16 and jurisdiction-specific consumer terms.
const legalContent: Record<LegalSlug, Record<Locale, LegalContent>> = {
  privacy: {
    en: {
      badge: "Privacy",
      title: "Privacy Notice",
      intro: "Effective: July 12, 2026. Last updated: July 12, 2026. Policy version: 2026-07-12.v4. Private by default.",
      sections: [
        {
          title: "Who controls this service",
          body:
            "Nova Nuggets L.L.C, headquartered in Dubai, UAE, operates ZAKI and is the controller for account and product data unless another arrangement applies. Core production hosting is on DigitalOcean infrastructure in the European Union.",
        },
        {
          title: "Data categories",
          body: "We process the following categories of data:",
          items: [
            "Account data: email, profile, auth and session metadata.",
            "User content: prompts, responses, conversation transcripts, files, references, tool results, and channel messages.",
            "Memory and profile data: embedded memories in the Brain, goals, preferences, values, TELOS profile signals, and learned behavior patterns.",
            "Connected-account data: OAuth identifiers, granted scopes, and content accessed through connected Gmail, Google Drive, Google Calendar, or channels when you ask ZAKI to use them.",
            "Operational and commercial data: diagnostics, security and abuse-prevention signals, service logs, usage-meter records, subscription status, and billing metadata.",
          ],
        },
        {
          title: "Processing chain and purpose",
          body:
            "The service chain is: the ZAKI hub (identity, billing, settings, and metering) routes a request to the ZAKI Agent and Brain service or to ZAKI Chat, which may then send the content required for that request to the subprocessors listed below. The Agent is the only writer of the personal Brain. Chat uses a separate workspace store. We process data to deliver requested features, operate memory and personalization, secure the service, prevent abuse, meter usage, support users, and improve service quality.",
        },
        {
          title: "Long-term memory and personalization",
          body:
            "ZAKI can retain conversation-derived memories over time. The Agent extracts information from interactions and stores memory records and vector embeddings in a PostgreSQL pgvector Brain so relevant context can be recalled later. ZAKI also builds a TELOS profile of goals, preferences, and values and uses a behavior-mining learning loop to infer patterns and personalize future responses. These processes are automated profiling. They may influence what context is recalled, what suggestions appear, and how the Agent responds. You may request access, correction, export, or deletion through support; in-product automated erasure is being completed and must not yet be treated as the only request path.",
        },
        {
          title: "Connected accounts and channels",
          body:
            "If you connect an account, Composio lets ZAKI access Gmail, Google Drive, and Google Calendar within the scopes you approve and only when the product invokes those tools. You can revoke a connection. Telegram is the live external messaging channel and channel conversations may be ingested into the Agent and its memory. Email, Discord, Slack, and WhatsApp are planned or gated and are not generally available until their product controls are activated.",
        },
        {
          title: "Legal bases and GDPR rights",
          body:
            "Where GDPR applies, legal bases may include performance of our contract, legitimate interests in operating and securing the service, legal obligations, and consent where required. Depending on applicable law, you may request access, correction, deletion, restriction, portability, or objection, and may withdraw consent where processing relies on it. Today these rights are handled by request through support@chatzaki.com; automated account and cross-service erasure is being shipped. You may also complain to the competent supervisory authority.",
        },
        {
          title: "International transfers",
          body:
            "Core hosting is in the EU, but subprocessors and their support or inference systems may process data internationally, including in the United States and other countries. Where required, we rely on appropriate contractual or other lawful transfer safeguards. Model requests may be routed internationally to Moonshot AI or Together AI.",
        },
        {
          title: "Subprocessors",
          anchor: "subprocessors",
          body:
            "The current material subprocessors are listed below. We will update this notice for material changes and use in-product or email notice when a change requires notice or renewed consent.",
          items: [
            "Stripe: payment processing, subscriptions, invoices, and billing events. Stripe receives billing contact and transaction data and handles payment-card data; ZAKI does not store full card numbers.",
            "Cloudflare: DNS, edge routing, content delivery, and traffic protection. Cloudflare may process IP addresses, request headers, paths, and security signals.",
            "DigitalOcean (EU hosting region): Kubernetes, storage, networking, and managed PostgreSQL for the ZAKI hub, services, transcripts, and the pgvector Brain.",
            "Moonshot AI (international) and Together AI: model inference. Current routing includes Kimi K2.6 and gpt-oss model families under ADR-011. They receive the prompt, relevant conversation or memory context, tool context, and files needed for an inference request.",
            "Resend: transactional email delivery, including verification, password-reset, billing, and service messages. Resend receives the destination address and message contents.",
            "Composio: connected-account authorization and tool execution for Gmail, Google Drive, and Google Calendar. Composio processes approved OAuth scopes and the data needed to complete a requested action.",
          ],
        },
        {
          title: "Cookies and similar technologies",
          anchor: "cookies",
          body:
            "We use a small number of strictly necessary cookies to keep you signed in and to operate the service. Analytics cookies, where used, are off by default and only set after explicit consent in the cookie banner. You can change your choice at any time by clearing the chatzaki-cookie-consent cookie in your browser.",
        },
        {
          title: "Retention, deletion, and account closure",
          body:
            "Conversation transcripts and associated Agent or Chat history are retained indefinitely until you delete your account or we delete them under a documented operational policy. Long-term Brain memories are also durable until deleted, corrected, superseded, or removed with the account. A deletion request is available through support today. Automated cross-service erasure is in flight; until it is fully verified, support remains the authoritative request path. We may retain limited billing, security, fraud-prevention, consent, and audit records where law or legitimate security needs require it, and will isolate them from ordinary product use.",
        },
        {
          title: "Children and minimum age",
          body:
            "ZAKI is not directed to children. You must be at least 16 to create an account. If the law where you live requires a higher age, or parental or guardian consent for a person under the applicable age, that rule applies. Do not create an account if you do not meet the applicable requirement. Contact support if you believe a child has provided data.",
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
            "Business customers may request a Data Processing Agreement (DPA) by emailing support@chatzaki.com with the subject line DPA Request. Availability and terms are confirmed during review of the request.",
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
      intro: "تاريخ النفاذ: 12 يوليو 2026. آخر تحديث: 12 يوليو 2026. إصدار السياسة: 2026-07-12.v4. الخصوصية افتراضية في التصميم.",
      sections: [
        {
          title: "من يتحكم بهذه الخدمة",
          body:
            "تدير Nova Nuggets L.L.C، ومقرها دبي في الإمارات، خدمة ZAKI وتعمل بوصفها متحكم البيانات لبيانات الحساب والمنتج ما لم ينطبق ترتيب آخر. تتم الاستضافة الأساسية للإنتاج على بنية DigitalOcean داخل الاتحاد الأوروبي.",
        },
        {
          title: "فئات البيانات",
          body: "نقوم بمعالجة الفئات التالية من البيانات:",
          items: [
            "بيانات الحساب: البريد الإلكتروني، الملف الشخصي، وبيانات الجلسة والمصادقة.",
            "محتوى المستخدم: المطالبات، الردود، نصوص المحادثات، الملفات، المراجع، نتائج الأدوات، ورسائل القنوات.",
            "بيانات الذاكرة والملف الشخصي: الذكريات المضمّنة في Brain، الأهداف، التفضيلات، القيم، إشارات ملف TELOS، وأنماط السلوك المتعلَّمة.",
            "بيانات الحسابات المتصلة: معرّفات OAuth والنطاقات الممنوحة والمحتوى الذي يتم الوصول إليه عبر Gmail أو Google Drive أو Google Calendar أو القنوات عندما تطلب من ZAKI استخدامها.",
            "بيانات التشغيل والتجارة: التشخيص، إشارات الأمان ومنع الإساءة، سجلات الخدمة، سجلات قياس الاستخدام، حالة الاشتراك، وبيانات الفوترة.",
          ],
        },
        {
          title: "سلسلة المعالجة والغرض",
          body:
            "سلسلة الخدمة هي: مركز ZAKI للهوية والفوترة والإعدادات والقياس يوجّه الطلب إلى خدمة Agent وBrain أو إلى ZAKI Chat، وقد ترسل الخدمة بعد ذلك المحتوى اللازم للطلب إلى المعالجين الفرعيين أدناه. Agent هو الكاتب الوحيد في Brain الشخصي، بينما يستخدم Chat مخزن مساحة عمل منفصلًا. نعالج البيانات لتنفيذ الميزات المطلوبة وتشغيل الذاكرة والتخصيص وتأمين الخدمة ومنع الإساءة وقياس الاستخدام ودعم المستخدم وتحسين الجودة.",
        },
        {
          title: "الذاكرة طويلة المدى والتخصيص",
          body:
            "يمكن لـ ZAKI الاحتفاظ بذكريات مستخلصة من المحادثات مع مرور الوقت. يستخرج Agent المعلومات من التفاعلات ويحفظ سجلات الذاكرة وتمثيلاتها المتجهية في Brain مبني على PostgreSQL وpgvector لاسترجاع السياق لاحقًا. كما ينشئ ZAKI ملف TELOS للأهداف والتفضيلات والقيم ويستخدم حلقة تعلم لاستخراج أنماط السلوك وتخصيص الردود المستقبلية. تشكل هذه العمليات تنميطًا آليًا وقد تؤثر في السياق المسترجع والاقتراحات وطريقة الرد. يمكنك طلب الوصول أو التصحيح أو التصدير أو الحذف عبر الدعم؛ ويجري استكمال الحذف الآلي داخل المنتج ولا ينبغي اعتباره المسار الوحيد حاليًا.",
        },
        {
          title: "الحسابات والقنوات المتصلة",
          body:
            "عند ربط حساب، تتيح Composio لـ ZAKI الوصول إلى Gmail وGoogle Drive وGoogle Calendar ضمن النطاقات التي توافق عليها وعندما يستدعي المنتج تلك الأدوات. يمكنك إلغاء الاتصال. Telegram هي قناة الرسائل الخارجية المتاحة حاليًا، وقد تُستوعب محادثاتها في Agent وذاكرته. أما البريد الإلكتروني وDiscord وSlack وWhatsApp فهي مخطط لها أو مقيّدة وليست متاحة عمومًا حتى تفعيل ضوابطها داخل المنتج.",
        },
        {
          title: "الأساس القانوني وحقوق GDPR",
          body:
            "عند انطباق GDPR، قد تشمل الأسس القانونية تنفيذ العقد، والمصلحة المشروعة في تشغيل الخدمة وتأمينها، والالتزامات القانونية، والموافقة حيث تلزم. بحسب القانون المعمول به يمكنك طلب الوصول أو التصحيح أو الحذف أو التقييد أو النقل أو الاعتراض وسحب الموافقة عندما تكون هي الأساس. تُعالج هذه الحقوق حاليًا بطلب إلى support@chatzaki.com، بينما يجري شحن الحذف الآلي للحساب والبيانات عبر الخدمات. ويمكنك تقديم شكوى إلى الجهة الرقابية المختصة.",
        },
        {
          title: "النقل الدولي",
          body:
            "توجد الاستضافة الأساسية داخل الاتحاد الأوروبي، لكن قد يعالج المعالجون الفرعيون وأنظمة الدعم أو الاستدلال البيانات دوليًا، بما في ذلك الولايات المتحدة ودول أخرى. وعند اللزوم نعتمد ضمانات تعاقدية أو قانونية مناسبة. وقد توجَّه طلبات النماذج دوليًا إلى Moonshot AI أو Together AI.",
        },
        {
          title: "المعالجون الفرعيون",
          anchor: "subprocessors",
          body:
            "فيما يلي المعالجون الفرعيون الأساسيون حاليًا. سنحدّث هذا الإشعار عند التغييرات الجوهرية ونستخدم إشعارًا داخل المنتج أو عبر البريد عندما يتطلب التغيير إشعارًا أو موافقة جديدة.",
          items: [
            "Stripe: معالجة المدفوعات والاشتراكات والفواتير وأحداث الفوترة. تستلم بيانات اتصال الفوترة والمعاملة وتتولى بيانات البطاقة؛ ولا يخزن ZAKI أرقام البطاقات كاملة.",
            "Cloudflare: DNS وتوجيه الحافة وتوصيل المحتوى وحماية الحركة. قد تعالج عناوين IP وترويسات الطلب والمسارات وإشارات الأمان.",
            "DigitalOcean (منطقة استضافة في الاتحاد الأوروبي): Kubernetes والتخزين والشبكات وPostgreSQL المُدار لمركز ZAKI والخدمات ونصوص المحادثات وBrain المبني على pgvector.",
            "Moonshot AI (دوليًا) وTogether AI: استدلال النماذج. يشمل التوجيه الحالي عائلتي Kimi K2.6 وgpt-oss وفق ADR-011. تستلمان المطالبة وسياق المحادثة أو الذاكرة وسياق الأدوات والملفات اللازمة للطلب.",
            "Resend: إرسال البريد المعاملي، بما في ذلك التحقق وإعادة تعيين كلمة المرور ورسائل الفوترة والخدمة. تستلم عنوان الوجهة ومحتوى الرسالة.",
            "Composio: تفويض الحسابات المتصلة وتنفيذ الأدوات لـ Gmail وGoogle Drive وGoogle Calendar. تعالج نطاقات OAuth الموافق عليها والبيانات اللازمة لتنفيذ الإجراء المطلوب.",
          ],
        },
        {
          title: "ملفات تعريف الارتباط والتقنيات المماثلة",
          anchor: "cookies",
          body:
            "نستخدم عددًا محدودًا من ملفات تعريف الارتباط الضرورية لتسجيل الدخول وتشغيل الخدمة. أما ملفات التحليلات فهي معطّلة افتراضيًا، ولا تُفعَّل إلا بعد موافقة صريحة عبر شريط الموافقة. ويمكنك تغيير اختيارك في أي وقت بحذف ملف chatzaki-cookie-consent من المتصفح.",
        },
        {
          title: "الاحتفاظ والحذف وإغلاق الحساب",
          body:
            "يتم الاحتفاظ بنصوص المحادثات وسجل Agent أو Chat المرتبط بها إلى أجل غير محدد حتى تحذف حسابك أو نحذفها وفق سياسة تشغيل موثقة. كما تبقى ذكريات Brain طويلة المدى حتى تُحذف أو تُصحح أو تُستبدل أو تزال مع الحساب. يتوفر طلب الحذف عبر الدعم اليوم، ويجري استكمال الحذف الآلي عبر الخدمات؛ وحتى التحقق منه يظل الدعم هو مسار الطلب المعتمد. قد نحتفظ بسجلات محدودة للفوترة والأمان ومنع الاحتيال والموافقة والتدقيق عندما يفرض القانون أو الأمن ذلك، مع عزلها عن الاستخدام العادي للمنتج.",
        },
        {
          title: "الأطفال والحد الأدنى للعمر",
          body:
            "الخدمة غير موجهة للأطفال. يجب ألا يقل عمرك عن 16 عامًا لإنشاء حساب. إذا كان قانون بلدك يفرض عمرًا أعلى أو موافقة ولي الأمر لمن هم دون السن المعمول به، فتسري تلك القاعدة. لا تنشئ حسابًا إن لم تستوفِ الشرط، وتواصل مع الدعم إذا اعتقدت أن طفلًا قدم بيانات.",
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
            "يمكن لعملاء الأعمال طلب اتفاقية معالجة بيانات (DPA) عبر support@chatzaki.com مع وضع DPA Request في عنوان الرسالة. يتم تأكيد التوفر والشروط عند مراجعة الطلب.",
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
        "Effective: July 12, 2026. Last updated: July 12, 2026. Policy version: 2026-07-12.v4. By creating an account or using ZAKI, you agree to these terms.",
      sections: [
        {
          title: "0. Who we are",
          body:
            "ZAKI is operated by Nova Nuggets L.L.C, headquartered in Dubai, UAE. Core production services run on DigitalOcean infrastructure in the European Union.",
        },
        {
          title: "1. Eligibility and account responsibility",
          body:
            "You must be legally able to enter these Terms, provide accurate signup details, and keep your credentials secure. You must be at least 16. A higher local minimum or a parental-consent rule applies where required by law.",
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
          title: "4. Platform, memory, and model chain",
          body:
            "The ZAKI hub routes requests to the Agent and Brain service or to ZAKI Chat, then to required subprocessors. The Agent may create durable pgvector Brain memories, a TELOS goals and values profile, and learned behavior patterns that personalize later responses. This is automated profiling. Model inference currently uses Moonshot AI and Together AI routing, including Kimi K2.6 and gpt-oss families.",
        },
        {
          title: "5. Connected accounts and channels",
          body:
            "When you connect Gmail, Google Drive, or Google Calendar through Composio, you authorize ZAKI to use the approved scopes to perform actions you request. You are responsible for the content and permissions in connected accounts and may revoke access. Telegram is live; email, Discord, Slack, and WhatsApp remain planned or gated until activated.",
        },
        {
          title: "6. Billing, cancellation, and refunds",
          body:
            "Paid plans may be billed monthly or yearly through Stripe at the price and interval shown at checkout. Payments are non-refundable except where applicable law requires otherwise. You may cancel at any time; cancellation stops renewal and your paid entitlement continues until the end of the current paid period, after which the account downgrades to Free. Access codes may grant separate or temporary entitlement and invalid, revoked, or expired codes may limit features.",
        },
        {
          title: "7. User content, privacy, and retention",
          body:
            "You retain your rights in content you submit and grant us the limited rights needed to host, process, transmit, and transform it to operate ZAKI. Conversation transcripts are retained indefinitely until account deletion, subject to limited lawful retention. Privacy rights are request-based through support today; automated erasure is being completed. The Privacy Notice explains subprocessors, profiling, international transfers, and deletion in detail.",
        },
        {
          title: "8. Availability, changes, and liability",
          body:
            "Service is provided as is and as available to the maximum extent permitted by law. We do not guarantee uninterrupted availability.",
        },
        {
          title: "9. Suspension, termination, updates, and re-consent",
          body:
            "We may suspend or terminate access for material violations, security risk, non-payment, or legal requirements. You may stop using ZAKI and request account deletion. Material policy updates may require explicit re-consent in the app; access may remain blocked until the current version is accepted.",
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
        "تاريخ النفاذ: 12 يوليو 2026. آخر تحديث: 12 يوليو 2026. إصدار السياسة: 2026-07-12.v4. بإنشاء حساب أو استخدام ZAKI، توافق على هذه الشروط.",
      sections: [
        {
          title: "0. من نحن",
          body:
            "يتم تشغيل ZAKI بواسطة Nova Nuggets L.L.C ومقرها دبي، الإمارات. تعمل خدمات الإنتاج الأساسية على بنية DigitalOcean داخل الاتحاد الأوروبي.",
        },
        {
          title: "1. الأهلية ومسؤولية الحساب",
          body:
            "يجب أن تكون مؤهلاً قانونيًا لإبرام هذه الشروط، وأن تقدم بيانات صحيحة وتحافظ على سرية بيانات الدخول. يجب ألا يقل عمرك عن 16 عامًا، ويطبق أي حد أعلى أو شرط موافقة ولي الأمر يفرضه القانون المحلي.",
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
          title: "4. سلسلة المنصة والذاكرة والنماذج",
          body:
            "يوجّه مركز ZAKI الطلبات إلى خدمة Agent وBrain أو إلى ZAKI Chat ثم إلى المعالجين الفرعيين اللازمين. قد ينشئ Agent ذكريات دائمة في Brain المبني على pgvector وملف TELOS للأهداف والقيم وأنماط سلوك متعلَّمة لتخصيص الردود اللاحقة، وهذا تنميط آلي. يستخدم الاستدلال حاليًا توجيه Moonshot AI وTogether AI، بما في ذلك عائلتا Kimi K2.6 وgpt-oss.",
        },
        {
          title: "5. الحسابات والقنوات المتصلة",
          body:
            "عند ربط Gmail أو Google Drive أو Google Calendar عبر Composio، فإنك تفوض ZAKI باستخدام النطاقات الموافق عليها لتنفيذ الإجراءات التي تطلبها. أنت مسؤول عن المحتوى والصلاحيات في الحسابات المتصلة ويمكنك إلغاء الوصول. Telegram متاحة حاليًا، بينما يظل البريد الإلكتروني وDiscord وSlack وWhatsApp مخططًا لها أو مقيّدة حتى تفعيلها.",
        },
        {
          title: "6. الفوترة والإلغاء والاسترداد",
          body:
            "قد تُفوّتَر الخطط المدفوعة شهريًا أو سنويًا عبر Stripe بالسعر والفترة الظاهرين عند الدفع. المدفوعات غير قابلة للاسترداد إلا إذا فرض القانون خلاف ذلك. يمكنك الإلغاء في أي وقت؛ يتوقف التجديد وتستمر المزايا المدفوعة حتى نهاية الفترة الحالية، ثم يُخفَّض الحساب إلى الخطة المجانية. وقد تمنح أكواد الوصول استحقاقًا منفصلًا أو مؤقتًا، وتؤدي الأكواد الملغاة أو المنتهية إلى تقييد الميزات.",
        },
        {
          title: "7. محتوى المستخدم والخصوصية والاحتفاظ",
          body:
            "تحتفظ بحقوقك في المحتوى الذي تقدمه وتمنحنا الحقوق المحدودة اللازمة لاستضافته ومعالجته ونقله وتحويله لتشغيل ZAKI. تُحفظ نصوص المحادثات إلى أجل غير محدد حتى حذف الحساب، مع مراعاة احتفاظ قانوني محدود. تُمارس حقوق الخصوصية بطلب إلى الدعم حاليًا ويجري استكمال الحذف الآلي. يشرح إشعار الخصوصية المعالجين والتنميط والنقل الدولي والحذف بالتفصيل.",
        },
        {
          title: "8. التوافر والتغييرات والمسؤولية",
          body:
            "تقدم الخدمة كما هي وحسب التوافر بالحد الأقصى المسموح به قانونيًا. لا نضمن توافرًا غير منقطع دائمًا.",
        },
        {
          title: "9. التعليق والإنهاء والتحديثات وإعادة الموافقة",
          body:
            "قد نعلّق أو ننهي الوصول بسبب مخالفة جوهرية أو خطر أمني أو عدم الدفع أو متطلب قانوني. يمكنك التوقف عن الاستخدام وطلب حذف الحساب. قد تتطلب تحديثات السياسة الجوهرية موافقة صريحة جديدة داخل التطبيق، وقد يبقى الوصول محجوبًا حتى قبول الإصدار الحالي.",
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
        "Current controls and governance posture. Effective and last updated July 12, 2026. Policy version: 2026-07-12.v4. This page describes current controls and is not a certification.",
      sections: [
        {
          title: "Entity and operating model",
          body:
            "Nova Nuggets L.L.C is headquartered in Dubai, UAE. The ZAKI hub controls identity, billing, settings, consent, and metering. It routes requests to the Agent and Brain service or to Chat, and then to required subprocessors. Core hosting and managed PostgreSQL are on DigitalOcean in the EU.",
        },
        {
          title: "GDPR alignment",
          body:
            "We design processing around GDPR principles where they apply: lawfulness, fairness, transparency, purpose limitation, minimization, accuracy, storage limitation, integrity, and confidentiality. User rights are fulfilled through support requests today. Automated cross-service erasure is being completed and remains a release gate.",
        },
        {
          title: "Consent and policy governance",
          body:
            "Password signup records the accepted policy version, timestamp, IP address, user agent, and a consent event. Google signup carries explicit acceptance through signed OAuth state and records the same event; if acceptance is not captured before account creation, first use is blocked by the re-consent gate. Accounts with an older accepted version must accept 2026-07-12.v4 before continuing.",
        },
        {
          title: "Security controls",
          body:
            "Controls include TLS in transit, authenticated hub-to-service requests, scoped internal service tokens, write-only or metadata-only secret handling, controlled internal access, logging, monitoring, rate limits, and abuse-prevention measures. No system is perfectly secure, and this page does not claim ISO 27001, SOC 2, or another third-party certification.",
        },
        {
          title: "Vendor, model, and transfer chain",
          body:
            "Material processors are Stripe, Cloudflare, DigitalOcean in the EU, Moonshot AI internationally, Together AI, Resend, and Composio. Current inference routing includes Kimi K2.6 and gpt-oss families. Inference and support processing can involve international transfers; see the Privacy Notice for purposes and data categories.",
        },
        {
          title: "Memory, profiling, and connected accounts",
          body:
            "The Agent is the sole writer of the personal pgvector Brain. Persistent memory, TELOS goals and values profiling, and behavior-mining personalization are automated profiling. Composio can access approved Gmail, Drive, and Calendar scopes. Telegram channel content can enter the Agent; other named channels remain gated until activated.",
        },
        {
          title: "Retention and deletion posture",
          body:
            "Conversation transcripts are retained indefinitely until account deletion, not merely for a short operational window. Brain memories are durable until deleted, corrected, superseded, or removed with the account. Requests for access, correction, export, and deletion are handled through support today; automated erasure is in flight. Limited legal, billing, fraud, security, consent, and audit records may be retained where justified.",
        },
        {
          title: "Age and children",
          body:
            "ZAKI is not directed to children. The minimum signup age is 16. ZAKI does not collect or store your date of birth: on every signup path — email and Google alike — you confirm you meet the minimum age by accepting the Terms. Higher local minimum-age or parental-consent rules still apply where required by law.",
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
        "الوضع الحالي للضوابط والحوكمة. تاريخ النفاذ وآخر تحديث: 12 يوليو 2026. إصدار السياسة: 2026-07-12.v4. تصف هذه الصفحة الضوابط الحالية ولا تمثل شهادة امتثال.",
      sections: [
        {
          title: "الكيان ونموذج التشغيل",
          body:
            "Nova Nuggets L.L.C ومقرها دبي في الإمارات. يدير مركز ZAKI الهوية والفوترة والإعدادات والموافقة والقياس ويوجّه الطلبات إلى خدمة Agent وBrain أو إلى Chat ثم إلى المعالجين اللازمين. توجد الاستضافة الأساسية وPostgreSQL المُدار على DigitalOcean داخل الاتحاد الأوروبي.",
        },
        {
          title: "التوافق مع GDPR",
          body:
            "نصمم المعالجة وفق مبادئ GDPR حيث تنطبق: المشروعية والعدالة والشفافية وتحديد الغرض وتقليل البيانات والدقة وتحديد مدة الاحتفاظ والسلامة والسرية. تُنفذ حقوق المستخدم بطلب إلى الدعم حاليًا. ويجري استكمال الحذف الآلي عبر الخدمات ويظل بوابة إطلاق.",
        },
        {
          title: "الموافقة وحوكمة السياسات",
          body:
            "يسجل التسجيل بكلمة المرور إصدار السياسة المقبول والوقت وعنوان IP ووكيل المستخدم وحدث موافقة. ويحمل تسجيل Google الموافقة الصريحة داخل حالة OAuth موقعة ويسجل الحدث نفسه؛ وإذا لم تُلتقط الموافقة قبل إنشاء الحساب يُحجب الاستخدام الأول ببوابة إعادة الموافقة. يجب على الحسابات التي قبلت إصدارًا أقدم الموافقة على 2026-07-12.v4 قبل المتابعة.",
        },
        {
          title: "ضوابط الأمان",
          body:
            "تشمل الضوابط TLS أثناء النقل، وطلبات موثقة بين المركز والخدمات، ورموز خدمة داخلية محددة، وتعاملًا مع الأسرار للكتابة فقط أو عرض البيانات الوصفية، ووصولًا داخليًا مضبوطًا، وتسجيلًا ومراقبة وحدود معدل وضوابط منع الإساءة. لا يوجد نظام آمن بالكامل، ولا تدعي هذه الصفحة شهادة ISO 27001 أو SOC 2 أو شهادة طرف ثالث أخرى.",
        },
        {
          title: "سلسلة المزودين والنماذج والنقل",
          body:
            "المعالجون الأساسيون هم Stripe وCloudflare وDigitalOcean داخل الاتحاد الأوروبي وMoonshot AI دوليًا وTogether AI وResend وComposio. يشمل توجيه الاستدلال الحالي عائلتي Kimi K2.6 وgpt-oss. وقد تنطوي معالجة الاستدلال والدعم على نقل دولي؛ راجع إشعار الخصوصية للأغراض وفئات البيانات.",
        },
        {
          title: "الذاكرة والتنميط والحسابات المتصلة",
          body:
            "Agent هو الكاتب الوحيد في Brain الشخصي المبني على pgvector. الذاكرة الدائمة وملف TELOS للأهداف والقيم والتخصيص المستند إلى استخراج أنماط السلوك هي تنميط آلي. يمكن لـ Composio الوصول إلى نطاقات Gmail وDrive وCalendar الموافق عليها. وقد يدخل محتوى Telegram إلى Agent، بينما تبقى القنوات الأخرى المذكورة مقيّدة حتى التفعيل.",
        },
        {
          title: "نهج الاحتفاظ والحذف",
          body:
            "تُحفظ نصوص المحادثات إلى أجل غير محدد حتى حذف الحساب، وليست مجرد نافذة تشغيل قصيرة. وتبقى ذكريات Brain حتى تُحذف أو تُصحح أو تُستبدل أو تزال مع الحساب. تُعالج طلبات الوصول والتصحيح والتصدير والحذف عبر الدعم اليوم، بينما يجري استكمال الحذف الآلي. وقد تُحتفظ سجلات قانونية أو للفوترة والاحتيال والأمان والموافقة والتدقيق عندما يوجد مبرر.",
        },
        {
          title: "العمر والأطفال",
          body:
            "الخدمة غير موجهة للأطفال. الحد الأدنى للتسجيل هو 16 عامًا. في التسجيل بالبريد الإلكتروني يطبق الخادم هذا الحد على تاريخ الميلاد الذي تقدمه؛ وفي تسجيل الدخول عبر Google فإنك تؤكد استيفاءك له بقبول الشروط. وتظل الحدود الأعلى أو قواعد موافقة ولي الأمر المحلية سارية عندما يفرضها القانون.",
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
