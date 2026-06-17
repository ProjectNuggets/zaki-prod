import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

const LEGAL_POLICY_VERSION = "2026-06-17.v2";

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-zaki-subtle bg-white/90 px-4 py-4 shadow-[0px_1px_0px_rgba(15,15,15,0.04)] dark:border-[#2c221a] dark:bg-[#16110d]">
      <h2 className="font-mono-ui text-[12px] font-semibold uppercase tracking-[0.12em] text-zaki-primary dark:text-zaki-dark-primary text-start">
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle text-start leading-6">
        {children}
      </div>
    </section>
  );
}

type LegalSectionEntry = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type LegalLocaleCopy = {
  badge: string;
  title: string;
  documents: Record<LegalSlug, { badge: string; title: string; note: string }>;
  effectiveDateLabel: string;
  effectiveDateValue: string;
  intro: string[];
  meta: {
    policyVersion: string;
    language: string;
    languageValue: string;
    contact: string;
  };
  returnTo: {
    signup: string;
    login: string;
    zaki: string;
  };
  note: string;
  sections: LegalSectionEntry[];
};

export type LegalSlug = "terms" | "privacy" | "compliance";

const LEGAL_COPY: Record<"en" | "ar", LegalLocaleCopy> = {
  en: {
    badge: "Legal",
    title: "Terms, Privacy & Compliance",
    documents: {
      terms: {
        badge: "Terms",
        title: "Terms of Use",
        note:
          "These terms govern account access, acceptable use, billing, AI output review, disputes, and service limits.",
      },
      privacy: {
        badge: "Privacy",
        title: "Privacy Notice",
        note:
          "This notice explains what data ZAKI processes, why it is processed, retention, security controls, and your GDPR-aligned rights.",
      },
      compliance: {
        badge: "Legal",
        title: "Terms, Privacy & Compliance",
        note:
          "If you do not agree with these terms, do not use the service. Material updates are published here with a new effective date.",
      },
    },
    effectiveDateLabel: "Effective date",
    effectiveDateValue: "June 17, 2026",
    intro: [
      "These terms apply to the current ZAKI web app, including Agent, Chat/Spaces, Brain, account settings, billing, usage, and connected browser workflows. By creating an account or using ZAKI, you agree to these terms.",
      "ZAKI is operated by Nova Nuggets L.L.C (established 2025), headquartered in Dubai, UAE. Public product access currently covers Agent, Chat/Spaces, and Brain; Learn and Hire may be private beta; Design, CLI, local app, and additional extensions are waitlist or pre-release unless your account explicitly includes them.",
    ],
    meta: {
      policyVersion: "Policy version",
      language: "Language",
      languageValue: "English",
      contact: "Contact",
    },
    returnTo: {
      signup: "Back to signup",
      login: "Back to sign in",
      zaki: "Back to ZAKI",
    },
    note:
      "If you do not agree with these terms, do not use the service. Material updates are published here with a new effective date.",
    sections: [
      {
        title: "1) Eligibility and account responsibility",
        paragraphs: [
          "You must be legally able to enter a contract and use ZAKI in your jurisdiction.",
          "You are responsible for safeguarding your account credentials and for all activity under your account.",
          "You must provide accurate signup details, including date of birth where requested for eligibility and safety controls, and keep your email and billing details current.",
        ],
      },
      {
        title: "2) Acceptable use",
        paragraphs: [
          "You agree not to misuse the service. Prohibited behavior includes:",
          "We may suspend or terminate access for policy violations, security risks, or legal requirements.",
        ],
        bullets: [
          "Illegal activity, fraud, harassment, threats, or infringement of third-party rights.",
          "Uploading malicious code, reverse engineering, or attempting unauthorized access.",
          "Automated abuse, scraping, credential collection, spam, or activity that degrades reliability for other users.",
          "Using Agent, browser automation, uploads, memory, or integrations to access systems or data you do not have permission to use.",
        ],
      },
      {
        title: "3) AI output and disclaimer",
        paragraphs: [
          "ZAKI uses AI models and may produce incomplete, inaccurate, or outdated output. You must independently review important results.",
          "Agent can draft, reason, navigate, call tools, and prepare artifacts, but you remain responsible for approving instructions, reviewing outputs, and deciding whether to use any result.",
          "ZAKI does not provide legal, medical, tax, financial, or other licensed professional advice. Do not rely on AI output as the sole basis for high-stakes decisions.",
        ],
      },
      {
        title: "4) Billing, access codes, and plan status",
        paragraphs: [
          "Access codes, trials, beta invitations, and paid plans grant usage rights under the plan terms shown in the app.",
          "Usage meters, feature gates, model availability, and rate limits may vary by plan, beta status, region, and operational constraints.",
          "You can manage subscription status, usage, product access, and account lifecycle controls in Settings, including cancellation and account deletion where available.",
        ],
      },
      {
        title: "5) Privacy, GDPR, and data processing",
        paragraphs: [
          "We are committed to GDPR compliance and process personal data needed to operate and secure ZAKI in line with GDPR principles.",
          "We believe AI should be personal, and personal means private by default. We process only what is necessary for product operation, reliability, and improvement.",
          "Data categories include:",
          "We use this data for service delivery, reliability, security, support, compliance, product improvement, entitlement management, abuse prevention, and fraud prevention.",
          "Depending on the feature, ZAKI may use third-party subprocessors for infrastructure, authentication, payment processing, email delivery, analytics, or AI inference. We send only the data needed to fulfill the request or operate the service.",
          "Legal bases may include performance of contract, legitimate interests, legal obligations, and consent where applicable.",
        ],
        bullets: [
          "Account data (email, profile, auth/session metadata).",
          "User content (chat prompts, responses, memory context, uploaded references, generated artifacts, and files you attach).",
          "Agent and browser workflow data (tool calls, approvals, run logs, browser device status, and integration metadata).",
          "Operational data (diagnostics, usage meters, abuse-prevention signals, and service logs).",
          "Billing metadata required for entitlement and payment reconciliation.",
        ],
      },
      {
        title: "6) International transfers and your GDPR rights",
        paragraphs: [
          "Your data may be processed in countries outside your home jurisdiction, including through our infrastructure and subprocessors. Where GDPR applies, we use appropriate transfer safeguards as required by law.",
          "You can request, subject to applicable law:",
          "You may also lodge a complaint with your supervisory authority where applicable.",
        ],
        bullets: [
          "Access to personal data we hold about you.",
          "Correction of inaccurate or incomplete data.",
          "Deletion or restriction of processing.",
          "Data portability for data you provided.",
          "Objection to certain processing activities.",
          "Withdrawal of consent where processing relies on consent.",
        ],
      },
      {
        title: "7) Retention, deletion, and memory controls",
        paragraphs: [
          "We keep data for as long as needed to provide the service and meet legal, tax, fraud prevention, and security obligations.",
          "ZAKI may retain memory, Brain entries, agent traces, artifacts, and settings so the product can remain useful across sessions. You can manage memory and privacy controls in Settings where available.",
          "You can request access, correction, export, or deletion of your data. Deleting your account permanently removes account access and triggers data deletion workflows, subject to required legal retention.",
        ],
      },
      {
        title: "8) Security controls",
        paragraphs: [
          "We implement technical and organizational safeguards intended to keep data secure, including encryption in transit, controlled access, credential and secret protections, logging and monitoring, and role-based internal access controls.",
          "No online service can guarantee absolute security. You agree to notify us promptly if you suspect unauthorized account use.",
        ],
      },
      {
        title: "9) Third-party services, AI models, and open-source licensing",
        paragraphs: [
          "ZAKI may route requests through third-party model providers, browser infrastructure, payment providers, email providers, hosting vendors, and open-source components.",
          "Model availability, provider terms, and license metadata can change over time. We may update routing, features, and notices as needed for compliance, safety, cost, and reliability.",
          "You remain responsible for reviewing outputs before use in legal, financial, medical, safety-critical, or other high-stakes decisions.",
        ],
      },
      {
        title: "10) Geographic use and legal requests",
        paragraphs: [
          "You are responsible for complying with local laws where you access ZAKI. We may disclose limited data when required by valid legal process.",
        ],
      },
      {
        title: "11) Liability limits",
        paragraphs: [
          'To the maximum extent permitted by law, ZAKI is provided on an "as is" and "as available" basis without warranties of uninterrupted availability or fitness for a specific purpose.',
          "Our aggregate liability is limited to amounts paid by you for the service in the 12 months before the claim, where such limitation is legally enforceable.",
        ],
      },
      {
        title: "12) Children's privacy",
        paragraphs: [
          "ZAKI is not directed to children under 13, and we do not knowingly collect personal data from children under 13.",
          "If you believe a child has provided personal data, contact us and we will investigate and delete the data where required.",
        ],
      },
      {
        title: "13) Governing law and disputes",
        paragraphs: [
          "These terms are governed by applicable law in your region, without prejudice to non-waivable consumer protections.",
          "Before formal proceedings, you agree to contact us first so we can attempt to resolve the dispute in good faith.",
        ],
      },
      {
        title: "14) Contact and policy requests",
        paragraphs: ["For legal, privacy, or compliance requests, contact"],
      },
    ],
  },
  ar: {
    badge: "قانوني",
    title: "الشروط والخصوصية والامتثال",
    documents: {
      terms: {
        badge: "الشروط",
        title: "شروط الاستخدام",
        note:
          "تحكم هذه الشروط الوصول إلى الحساب والاستخدام المقبول والفوترة ومراجعة مخرجات الذكاء الاصطناعي والنزاعات وحدود الخدمة.",
      },
      privacy: {
        badge: "الخصوصية",
        title: "إشعار الخصوصية",
        note:
          "يوضح هذا الإشعار البيانات التي يعالجها ZAKI وسبب المعالجة والاحتفاظ والضوابط الأمنية وحقوقك المتوافقة مع GDPR.",
      },
      compliance: {
        badge: "قانوني",
        title: "الشروط والخصوصية والامتثال",
        note:
          "إذا كنت لا توافق على هذه الشروط، فلا تستخدم الخدمة. يتم نشر أي تحديثات جوهرية هنا مع تاريخ نفاذ جديد.",
      },
    },
    effectiveDateLabel: "تاريخ النفاذ",
    effectiveDateValue: "17 يونيو 2026",
    intro: [
      "تنطبق هذه الشروط على تطبيق ZAKI الحالي، بما في ذلك Agent والدردشة/المساحات وBrain والإعدادات والفوترة والاستخدام وسير عمل المتصفح المتصل. عند إنشاء حساب أو استخدام ZAKI فأنت توافق على هذه الشروط.",
      "تُدار ZAKI بواسطة Nova Nuggets L.L.C (تأسست عام 2025) ومقرها دبي، الإمارات العربية المتحدة. يشمل الوصول العام الحالي Agent والدردشة/المساحات وBrain؛ وقد تكون Learn وHire في بيتا خاصة؛ وتظل Design وCLI والتطبيق المحلي والإضافات الأخرى في قائمة الانتظار أو مرحلة ما قبل الإطلاق ما لم يفعّلها حسابك صراحة.",
    ],
    meta: {
      policyVersion: "إصدار السياسة",
      language: "اللغة",
      languageValue: "العربية",
      contact: "التواصل",
    },
    returnTo: {
      signup: "العودة إلى إنشاء الحساب",
      login: "العودة إلى تسجيل الدخول",
      zaki: "العودة إلى ZAKI",
    },
    note:
      "إذا كنت لا توافق على هذه الشروط، فلا تستخدم الخدمة. يتم نشر أي تحديثات جوهرية هنا مع تاريخ نفاذ جديد.",
    sections: [
      {
        title: "1) الأهلية ومسؤولية الحساب",
        paragraphs: [
          "يجب أن تكون مؤهلًا قانونيًا لإبرام عقد واستخدام ZAKI في نطاقك القضائي.",
          "أنت مسؤول عن حماية بيانات الدخول إلى حسابك وعن كل نشاط يتم عبره.",
          "يجب أن تقدم بيانات تسجيل دقيقة، بما في ذلك تاريخ الميلاد عند طلبه لأغراض الأهلية والسلامة، وأن تُبقي بريدك الإلكتروني وبيانات الفوترة محدثة.",
        ],
      },
      {
        title: "2) الاستخدام المقبول",
        paragraphs: [
          "أنت توافق على عدم إساءة استخدام الخدمة. ويشمل السلوك المحظور:",
          "يجوز لنا تعليق الوصول أو إنهاؤه عند مخالفة السياسات أو وجود مخاطر أمنية أو التزامات قانونية.",
        ],
        bullets: [
          "الأنشطة غير القانونية أو الاحتيال أو المضايقة أو التهديد أو انتهاك حقوق الغير.",
          "رفع برمجيات خبيثة أو الهندسة العكسية أو محاولة الوصول غير المصرح به.",
          "الإساءة الآلية أو الكشط أو جمع بيانات الاعتماد أو الرسائل المزعجة أو أي نشاط يضعف موثوقية الخدمة للمستخدمين الآخرين.",
          "استخدام Agent أو أتمتة المتصفح أو الملفات أو الذاكرة أو التكاملات للوصول إلى أنظمة أو بيانات لا تملك إذنًا باستخدامها.",
        ],
      },
      {
        title: "3) مخرجات الذكاء الاصطناعي وإخلاء المسؤولية",
        paragraphs: [
          "يستخدم ZAKI نماذج ذكاء اصطناعي وقد ينتج مخرجات غير مكتملة أو غير دقيقة أو قديمة. يجب عليك مراجعة النتائج المهمة بشكل مستقل.",
          "يمكن لـ Agent الصياغة والتفكير والتنقل واستدعاء الأدوات وتجهيز الملفات، لكنك تظل مسؤولًا عن اعتماد التعليمات ومراجعة المخرجات وتحديد ما إذا كنت ستستخدم أي نتيجة.",
          "لا يقدم ZAKI نصيحة قانونية أو طبية أو ضريبية أو مالية أو أي نصيحة مهنية مرخصة. لا تعتمد على مخرجات الذكاء الاصطناعي كأساس وحيد للقرارات عالية المخاطر.",
        ],
      },
      {
        title: "4) الفوترة ورموز الوصول وحالة الخطة",
        paragraphs: [
          "توفر رموز الوصول والتجارب ودعوات البيتا والخطط المدفوعة حقوق استخدام وفق الشروط الظاهرة داخل التطبيق.",
          "قد تختلف عدادات الاستخدام وبوابات الميزات وتوفر النماذج وحدود المعدل بحسب الخطة وحالة البيتا والمنطقة والقيود التشغيلية.",
          "يمكنك إدارة حالة الاشتراك والاستخدام والوصول إلى المنتجات وعناصر دورة حياة الحساب من الإعدادات، بما في ذلك الإلغاء وحذف الحساب حيثما توفر ذلك.",
        ],
      },
      {
        title: "5) الخصوصية وGDPR ومعالجة البيانات",
        paragraphs: [
          "نلتزم بالامتثال لـ GDPR ونعالج البيانات الشخصية اللازمة لتشغيل ZAKI وتأمينه بما يتماشى مع مبادئ اللائحة.",
          "نحن نؤمن بأن الذكاء الاصطناعي يجب أن يكون شخصيًا، والشخصي يعني الخصوصية افتراضيًا. نعالج فقط ما هو ضروري لتشغيل المنتج وموثوقيته وتطويره.",
          "تشمل فئات البيانات:",
          "نستخدم هذه البيانات لتقديم الخدمة والموثوقية والأمان والدعم والامتثال وتحسين المنتج وإدارة الاستحقاقات ومنع الإساءة والاحتيال.",
          "بحسب الميزة، قد يستخدم ZAKI جهات معالجة فرعية للبنية التحتية والمصادقة والمدفوعات والبريد والتحليلات أو استدلال الذكاء الاصطناعي. نرسل فقط البيانات اللازمة لتلبية الطلب أو تشغيل الخدمة.",
          "قد تشمل الأسس القانونية تنفيذ العقد أو المصالح المشروعة أو الالتزامات القانونية أو الموافقة حيث ينطبق ذلك.",
        ],
        bullets: [
          "بيانات الحساب (البريد الإلكتروني والملف الشخصي وبيانات الجلسة والمصادقة).",
          "محتوى المستخدم (الرسائل والردود وسياق الذاكرة والمراجع المرفوعة والملفات الناتجة والملفات التي ترفقها).",
          "بيانات سير عمل Agent والمتصفح (استدعاءات الأدوات والموافقات وسجلات التشغيل وحالة جهاز المتصفح وبيانات التكامل).",
          "البيانات التشغيلية (التشخيص وعدادات الاستخدام وإشارات منع الإساءة وسجلات الخدمة).",
          "بيانات الفوترة اللازمة لمواءمة الاستحقاق وتسوية المدفوعات.",
        ],
      },
      {
        title: "6) النقل الدولي وحقوقك بموجب GDPR",
        paragraphs: [
          "قد تتم معالجة بياناتك في دول خارج نطاقك القضائي المحلي، بما في ذلك عبر بنيتنا التحتية ومقدمي الخدمات. وعند انطباق GDPR نستخدم الضمانات المناسبة حسب ما يقتضيه القانون.",
          "يمكنك طلب ما يلي وفقًا للقانون المطبق:",
          "يمكنك أيضًا تقديم شكوى إلى الجهة الرقابية المختصة حيثما كان ذلك متاحًا.",
        ],
        bullets: [
          "الوصول إلى البيانات الشخصية التي نحتفظ بها عنك.",
          "تصحيح البيانات غير الدقيقة أو غير المكتملة.",
          "الحذف أو تقييد المعالجة.",
          "قابلية نقل البيانات التي قدمتها.",
          "الاعتراض على بعض أنشطة المعالجة.",
          "سحب الموافقة عندما تعتمد المعالجة عليها.",
        ],
      },
      {
        title: "7) الاحتفاظ والحذف وضوابط الذاكرة",
        paragraphs: [
          "نحتفظ بالبيانات طالما كان ذلك ضروريًا لتقديم الخدمة والامتثال للالتزامات القانونية والضريبية والأمنية ومنع الاحتيال.",
          "قد يحتفظ ZAKI بالذاكرة وإدخالات Brain وآثار Agent والملفات والإعدادات حتى يبقى المنتج مفيدًا عبر الجلسات. يمكنك إدارة ضوابط الذاكرة والخصوصية من الإعدادات حيثما توفر ذلك.",
          "يمكنك طلب الوصول أو التصحيح أو التصدير أو الحذف. ويؤدي حذف الحساب إلى إزالة الوصول بشكل دائم وتشغيل مسارات حذف البيانات مع مراعاة أي احتفاظ قانوني مطلوب.",
        ],
      },
      {
        title: "8) الضوابط الأمنية",
        paragraphs: [
          "نطبق تدابير تقنية وتنظيمية تهدف إلى حماية البيانات، بما في ذلك التشفير أثناء النقل، والتحكم في الوصول، وحماية الأسرار والاعتمادات، والمراقبة والسجلات، وضوابط الوصول الداخلية حسب الدور.",
          "لا يمكن لأي خدمة على الإنترنت أن تضمن الأمان المطلق. وتوافق على إخطارنا فورًا إذا اشتبهت في استخدام غير مصرح به لحسابك.",
        ],
      },
      {
        title: "9) الخدمات الخارجية ونماذج الذكاء الاصطناعي ورخص المصادر المفتوحة",
        paragraphs: [
          "قد يوجه ZAKI الطلبات عبر مزودي نماذج خارجيين وبنية متصفح ومدفوعات وبريد واستضافة ومكونات مفتوحة المصدر.",
          "قد يتغير توفر النماذج وشروط المزودين وبيانات الرخص بمرور الوقت. وقد نحدّث التوجيه والميزات والتنبيهات حسب الحاجة للامتثال والسلامة والتكلفة والموثوقية.",
          "تظل مسؤولًا عن مراجعة المخرجات قبل استخدامها في القرارات القانونية أو المالية أو الطبية أو الحساسة أو عالية المخاطر.",
        ],
      },
      {
        title: "10) الاستخدام الجغرافي والطلبات القانونية",
        paragraphs: [
          "أنت مسؤول عن الالتزام بالقوانين المحلية في المكان الذي تستخدم فيه ZAKI. وقد نفصح عن بيانات محدودة عند وجود طلب قانوني صالح.",
        ],
      },
      {
        title: "11) حدود المسؤولية",
        paragraphs: [
          'إلى أقصى حد يسمح به القانون، تُقدَّم ZAKI "كما هي" و"حسب التوفر" دون ضمانات بشأن الاستمرارية أو الملاءمة لغرض معين.',
          "تقتصر مسؤوليتنا الإجمالية على المبالغ التي دفعتها مقابل الخدمة خلال الاثني عشر شهرًا السابقة للمطالبة، حيث يكون هذا التقييد قابلًا للإنفاذ قانونيًا.",
        ],
      },
      {
        title: "12) خصوصية الأطفال",
        paragraphs: [
          "ZAKI غير موجهة للأطفال دون 13 عامًا، ولا نجمع عن علم بيانات شخصية من الأطفال دون هذا العمر.",
          "إذا كنت تعتقد أن طفلًا قد قدم بيانات شخصية، فتواصل معنا وسنحقق في الأمر ونحذف البيانات متى لزم ذلك قانونيًا.",
        ],
      },
      {
        title: "13) القانون الحاكم والنزاعات",
        paragraphs: [
          "تخضع هذه الشروط للقانون المطبق في منطقتك، دون الإخلال بأي حماية استهلاكية غير قابلة للتنازل.",
          "قبل أي إجراءات رسمية، توافق على التواصل معنا أولًا لمحاولة حل النزاع بحسن نية.",
        ],
      },
      {
        title: "14) التواصل وطلبات السياسات",
        paragraphs: ["لأي طلبات قانونية أو متعلقة بالخصوصية أو الامتثال، تواصل عبر"],
      },
    ],
  },
};

function getSectionsForSlug(sections: LegalSectionEntry[], slug: LegalSlug) {
  if (slug === "compliance") return sections;
  return sections.filter((section) => {
    const title = section.title.trim();
    if (title.startsWith("14")) return true;
    if (slug === "privacy") {
      return (
        title.startsWith("5)") ||
        title.startsWith("6)") ||
        title.startsWith("7)") ||
        title.startsWith("8)") ||
        title.startsWith("12)")
      );
    }
    return (
      title.startsWith("1)") ||
      title.startsWith("2)") ||
      title.startsWith("3)") ||
      title.startsWith("4)") ||
      title.startsWith("9)") ||
      title.startsWith("10)") ||
      title.startsWith("11)") ||
      title.startsWith("13)")
    );
  });
}

function getLegalReturnTarget({
  copy,
  locale,
  search,
}: {
  copy: LegalLocaleCopy;
  locale: "en" | "ar";
  search: string;
}) {
  const params = new URLSearchParams(search);
  const returnTo = String(params.get("returnTo") || "").trim();
  const from = String(params.get("from") || "").trim().toLowerCase();
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "";

  if (safeReturnTo) {
    return { href: safeReturnTo, label: copy.returnTo.zaki };
  }
  if (from === "signup" || from === "auth") {
    return { href: "/?auth=signup", label: copy.returnTo.signup };
  }
  if (from === "login") {
    return { href: "/?auth=login", label: copy.returnTo.login };
  }
  return { href: locale === "ar" ? "/ar" : "/", label: copy.returnTo.zaki };
}

function getDisplaySectionTitle(title: string, index: number, slug: LegalSlug) {
  if (slug === "compliance") return title;
  const label = title.replace(/^\d+\)\s*/, "");
  return `${index + 1}) ${label}`;
}

export function LegalPage({ slug = "compliance" }: { slug?: LegalSlug }) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const locale = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const isRtl = locale === "ar";
  const copy = LEGAL_COPY[locale];
  const documentCopy = copy.documents[slug];
  const sections = getSectionsForSlug(copy.sections, slug);
  const legalEmail = "support@chatzaki.com";
  const returnTarget = getLegalReturnTarget({
    copy,
    locale,
    search: location.search,
  });

  return (
    <div
      className="h-full overflow-y-auto zaki-scrollbar-fade bg-[var(--v2-bg)] px-4 py-6 sm:px-6 sm:py-8"
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-9 items-center border border-zaki-subtle bg-white px-3 py-2 font-mono-ui text-[11px] font-semibold uppercase tracking-[0.12em] text-zaki-secondary transition-colors hover:border-zaki-brand hover:text-zaki-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand/30 dark:border-[#2c221a] dark:bg-[#16110d] dark:text-zaki-dark-subtle"
            to={returnTarget.href}
          >
            {returnTarget.label}
          </Link>
          <span className="hidden font-mono-ui text-[11px] uppercase tracking-[0.12em] text-zaki-muted sm:inline">
            {copy.effectiveDateLabel}: {copy.effectiveDateValue}
          </span>
        </div>

        <div className="overflow-hidden border border-zaki-subtle bg-white shadow-[0px_16px_44px_rgba(15,15,15,0.07)] dark:border-[#2c221a] dark:bg-[#120f0c]">
          <div className="border-b border-zaki-subtle bg-white px-5 py-6 dark:border-[#2c221a] dark:bg-[#16110d] sm:px-6">
            <div className="inline-flex items-center border border-zaki-subtle bg-zaki-hover px-2.5 py-1 font-mono-ui text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-[#2c221a] dark:bg-[#201912] dark:text-zaki-dark-muted">
              {documentCopy.badge}
            </div>
            <h1 className="mt-3 font-mono-ui text-2xl font-semibold uppercase tracking-[0.08em] text-zaki-primary dark:text-zaki-dark-primary text-start sm:text-3xl">
              {documentCopy.title}
            </h1>
            <p className="mt-2 font-mono-ui text-[11px] uppercase tracking-[0.12em] text-zaki-muted text-start sm:hidden">
              {copy.effectiveDateLabel}: {copy.effectiveDateValue}
            </p>
            {copy.intro.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 max-w-3xl text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle text-start"
              >
                {paragraph}
              </p>
            ))}
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <div className="border border-zaki-subtle bg-zaki-hover px-3 py-2 font-mono-ui text-[11px] text-zaki-secondary dark:border-[#2c221a] dark:bg-[#1f1914] dark:text-zaki-dark-subtle">
                {copy.meta.policyVersion}: <span className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">{LEGAL_POLICY_VERSION}</span>
              </div>
              <div className="border border-zaki-subtle bg-zaki-hover px-3 py-2 font-mono-ui text-[11px] text-zaki-secondary dark:border-[#2c221a] dark:bg-[#1f1914] dark:text-zaki-dark-subtle">
                {copy.meta.language}: <span className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">{copy.meta.languageValue}</span>
              </div>
              <div className="border border-zaki-subtle bg-zaki-hover px-3 py-2 font-mono-ui text-[11px] text-zaki-secondary dark:border-[#2c221a] dark:bg-[#1f1914] dark:text-zaki-dark-subtle">
                {copy.meta.contact}: <span className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">{legalEmail}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
            <div className="border border-zaki-subtle bg-zaki-hover px-4 py-3 dark:border-[#2c221a] dark:bg-[#17120f]">
              <p className="font-mono-ui text-[11px] uppercase leading-5 tracking-[0.08em] text-zaki-muted text-start">
                {documentCopy.note}
              </p>
            </div>

            {sections.map((section, index) => (
              <LegalSection
                key={section.title}
                title={getDisplaySectionTitle(section.title, index, slug)}
              >
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {Array.isArray(section.bullets) && section.bullets.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 marker:text-zaki-brand rtl:pr-5 rtl:pl-0">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.title.startsWith("14)") || section.title.startsWith("14") ? (
                  <p>
                    <a
                      className="text-zaki-brand hover:underline font-semibold"
                      href={`mailto:${legalEmail}`}
                    >
                      {legalEmail}
                    </a>
                    .
                  </p>
                ) : null}
              </LegalSection>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
