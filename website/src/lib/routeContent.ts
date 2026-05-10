import type { Locale } from "./content";

export type ComparisonSlug =
  | "vs-chatgpt"
  | "zaki-vs-spaces"
  | "best-arabic-ai-assistant"
  | "zaki-vs-openclaw";
export type HowToSlug =
  | "write-arabic-emails-ai"
  | "translate-dialects-arabic-english"
  | "create-social-media-content-arabic"
  | "how-zaki-and-spaces-work"
  | "what-to-use-spaces-for"
  | "what-to-use-zaki-for";
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
    anchor?: string;
  }>;
  seo: SeoPayload;
};

const comparisonContent: Record<ComparisonSlug, ComparisonContent> = {
  "vs-chatgpt": {
    badge: "Comparison",
    title: "Spaces vs ChatGPT for Arabic Speakers",
    intro:
      "Short answer: choose ChatGPT if you want the broadest frontier AI in the mainstream market. Choose Spaces if you want a more disciplined Arabic-English workspace for real daily work. This page exists to make that tradeoff explicit before product labels or model hype get in the way.",
    note: "This page compares Spaces today. ZAKI itself is the public beta for persistent personal intelligence.",
    definition:
      "Spaces are the live paid workspace layer in the ZAKI product ladder. ChatGPT is the mainstream general-purpose benchmark for AI chat. The real decision here is not who wins the raw-model race. It is whether you need a broad general assistant or a more structured bilingual workspace that keeps daily work cleaner.",
    table: {
      headers: ["Feature", "Spaces", "ChatGPT"],
      rows: [
        {
          feature: "Primary role",
          values: ["Productivity workspace with spaces and cleaner context separation", "General-purpose mainstream AI assistant"],
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
          values: ["Connects directly to ZAKI and the persistent-intelligence beta", "General chat product direction"],
        },
      ],
    },
    quote:
      "ChatGPT wins when you want the broadest frontier AI. Spaces win when you want daily work to stay structured, bilingual, and easier to control.",
    sections: [
      {
        title: "Choose Spaces if",
        items: [
          "You want AI to feel like a workspace, not an endless pile of chat threads.",
          "You work across Arabic and English every day and want product fit, not just model scale.",
          "You care about clearer context separation, memory control, and lower-noise daily use.",
          "You want a practical chat layer now with a direct path into ZAKI's persistent-intelligence beta.",
        ],
      },
      {
        title: "Choose ChatGPT if",
        items: [
          "You want the broadest mainstream AI ecosystem and model breadth.",
          "You optimize primarily for frontier capability and general-purpose coverage.",
          "You want the product that has already become the default answer for many users.",
        ],
      },
      {
        title: "What comes after Spaces",
        body:
          "ZAKI is the public beta for persistent personal intelligence: a trainable personal operator built to hold context across time, show its work phases, and close the last mile between AI answers and AI counterparts.",
      },
    ],
    disclaimer:
      "This comparison is intentionally product-first. Spaces do not claim frontier-model supremacy. The case for them is structure, bilingual workflow fit, control, and a clearer bridge from workspaces to persistent intelligence.",
    links: [
      { label: "Read the ZAKI page", href: "/zaki-bot/" },
      { label: "See the Arabic AI ranking", href: "/best-arabic-ai-assistant/" },
      { label: "Try Spaces", href: "https://app.chatzaki.com/?auth=signup" },
    ],
    seo: {
      title: "Spaces vs ChatGPT for Arabic Speakers",
      description:
        "Choose ChatGPT for the broadest frontier AI. Choose Spaces for a more structured Arabic-English workspace for daily work.",
      imageAlt: "Spaces versus ChatGPT comparison page",
      keywords:
        "Spaces vs ChatGPT, Arabic AI comparison, bilingual AI workspace, ChatGPT",
    },
  },
  "zaki-vs-spaces": {
    badge: "Product model",
    title: "ZAKI vs Spaces",
    intro:
      "Short answer: ZAKI is for continuity. Spaces are for structured work. Use ZAKI when you want AI that remembers you, and use Spaces when the job needs its own instructions, documents, and clean project context.",
    note: "Spaces are the structured work surfaces inside the ZAKI product.",
    definition:
      "ZAKI is the persistent AI layer: the part that remembers, recalls, and keeps a long-running thread with you. Spaces are the structured work surfaces where each project can keep its own instructions, documents, threads, and outputs together. ZAKI helps you hold the thread. Spaces help you do the work cleanly.",
    table: {
      headers: ["Use case", "ZAKI", "Spaces"],
      rows: [
        {
          feature: "Brainstorming",
          values: [
            "Best when you want a continuous thinking partner that carries your thread forward",
            "Better when the idea is ready to be worked into a concrete deliverable",
          ],
        },
        {
          feature: "Planning next steps",
          values: [
            "Helps decide direction, sequence, and tradeoffs across time",
            "Turns the chosen direction into cleaner task-focused execution",
          ],
        },
        {
          feature: "Long-running personal thread",
          values: [
            "Designed for continuity, memory, and returning to the same relationship over time",
            "Not the main relationship layer; better as a dedicated execution surface",
          ],
        },
        {
          feature: "Document drafting",
          values: [
            "Useful for framing and deciding what the draft should become",
            "Best place to write, edit, refine, and keep the draft inside a clear project context",
          ],
        },
        {
          feature: "Research by project",
          values: [
            "Helps hold the bigger thread and recurring context behind the work",
            "Keeps research separated by project, client, or topic so it stays usable",
          ],
        },
        {
          feature: "Bilingual production work",
          values: [
            "Good for deciding tone, goals, and recurring context across languages",
            "Best for doing the Arabic-English work itself inside a dedicated space",
          ],
        },
        {
          feature: "Task execution",
          values: [
            "Better for deciding what matters and what should happen next",
            "Better for doing the focused work without mixing unrelated threads together",
          ],
        },
        {
          feature: "Project separation",
          values: [
            "Keeps relationship-level continuity with you",
            "Keeps work separated by context instead of one long noisy thread",
          ],
        },
      ],
    },
    quote:
      "Use Spaces to organize work. Use ZAKI when you want AI that remembers.",
    sections: [
      {
        title: "Use ZAKI when",
        items: [
          "You are thinking through a decision and want continuity across time.",
          "You are returning to an ongoing thread instead of starting from scratch.",
          "You want a persistent AI counterpart, not just a temporary prompt result.",
          "You need direction, framing, and memory before the execution layer begins.",
        ],
      },
      {
        title: "Use Spaces when",
        items: [
          "You want a dedicated place for one task, project, or line of work.",
          "You are drafting, translating, researching, or organizing deliverables.",
          "You want clean context separation instead of a single mixed thread.",
          "You want work to stay easier to revisit, refine, and continue later.",
        ],
      },
      {
        title: "How they work together",
        body:
          "Start with ZAKI when the job is still fuzzy: planning, deciding, framing, and keeping the long-running thread alive. Then move into a Space when the work needs structure: writing, research, task execution, translation, and project-by-project focus. Return to ZAKI when relationship-level continuity matters again. That is the model: continuity with ZAKI, execution in Spaces.",
      },
      {
        title: "Real examples",
        items: [
          "Launch planning: think through strategy with ZAKI, then move execution plans and drafts into a dedicated Space.",
          "Bilingual email: decide tone and intent with ZAKI, then write and refine the actual email in a Space.",
          "Travel or move planning: use ZAKI for the recurring thread, then keep documents, lists, and research separated in Spaces.",
          "Weekly operating system: use ZAKI for priorities and direction, then keep execution split across workspaces by project.",
        ],
      },
    ],
    disclaimer:
      "This is a product-clarity page. Spaces is the public name for the structured workspace layer of ZAKI.",
    links: [
      { label: "Try ZAKI free", href: "https://app.chatzaki.com/?auth=signup&source=website_zaki_vs_spaces" },
      { label: "See ZAKI", href: "/zaki-bot/" },
      { label: "Start with Spaces", href: "https://app.chatzaki.com/?auth=signup" },
    ],
    seo: {
      title: "ZAKI vs Spaces: When to Think with ZAKI and When to Work in Spaces",
      description:
        "ZAKI is the persistent AI counterpart for planning, memory, and continuity. Spaces are the structured workspaces for focused execution. Learn when to use each and how they work together.",
      imageAlt: "ZAKI versus Spaces product explainer page",
      keywords:
        "ZAKI vs Spaces, ZAKI agent vs chat spaces, AI spaces vs personal AI agent, persistent AI agent, AI workspace with memory",
    },
  },
  "best-arabic-ai-assistant": {
    badge: "2026 Roundup",
      title: "Best Arabic AI Assistant in 2026: Chat Tools and Operators",
    intro:
      "Short answer: the best Arabic AI tool depends on the job. Spaces are a strong choice for structured Arabic-English productivity today. ChatGPT remains broader and more mainstream. ZAKI is the public beta for users who want the next step: persistent personal intelligence instead of ordinary chat.",
    definition:
      "Not every Arabic AI product belongs in one bucket. Some tools are broad chat products. Some are vertical assistants. Some are moving toward something more persistent. ZAKI's position is unusual because it combines live structured workspaces today with a public beta for a more trainable, persistent agent layer.",
    table: {
      headers: ["Tool", "Best for", "Category", "Memory / control model", "Notes"],
      rows: [
        {
          feature: "Spaces",
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
      "The right Arabic AI tool depends on what you need now. Spaces are for disciplined bilingual work today. ZAKI is for people who want to see what a persistent digital counterpart could become next.",
    sections: [
      {
        title: "How to read this ranking",
        items: [
          "Spaces are strongest when the need is practical Arabic-English productivity with cleaner structure.",
          "ChatGPT still wins on frontier breadth and mainstream ecosystem strength.",
          "Daleela, Labiba, and Yasmina AI make more sense when the need is vertical, embedded, or domain-specific.",
          "ZAKI is not just another chat assistant. It is the public beta step toward persistent personal intelligence.",
        ],
      },
      {
        title: "Why ZAKI stands out",
        body:
          "ZAKI is distinctive because it combines two layers in one product story: live workspaces now, and a public beta for a more secure, trainable, persistent agent layer next. That combination is aimed at closing the last mile between AI tools and real digital counterparts.",
      },
    ],
    disclaimer:
      "This ranking is intentionally use-case based. Not every Arabic AI product is solving the same problem, and not every assistant belongs in the same category.",
    links: [
      { label: "Read the ZAKI page", href: "/zaki-bot/" },
      { label: "Compare Spaces vs ChatGPT", href: "/vs-chatgpt/" },
      { label: "Try Spaces", href: "https://app.chatzaki.com/?auth=signup" },
    ],
    seo: {
      title: "Best Arabic AI Assistant in 2026: Chat Tools and Operators",
      description:
        "A use-case based ranking of Arabic AI tools. Spaces are strong for structured bilingual productivity, and ZAKI is the public beta for persistent personal intelligence.",
      imageAlt: "Arabic AI assistant comparison page",
      keywords:
        "best Arabic AI assistant, Arabic AI tools, Spaces, ZAKI, Personal AI Operator, Arabic AI comparison",
    },
  },
  "zaki-vs-openclaw": {
    badge: "Technical comparison",
    title: "ZAKI vs OpenClaw",
    intro:
      "Short answer: ZAKI's underlying runtime direction is stronger on memory infrastructure, multi-tenancy, and operational discipline. OpenClaw is stronger on tooling breadth, browser/media support, and ACP-style multi-agent collaboration. This page exists so technical readers and AI systems can understand the difference without guessing.",
    note:
      "This comparison summarizes confirmed internal implementation review and test results as of March 16, 2026. It is a technical positioning note, not a neutral third-party benchmark.",
    definition:
      "Publicly, users see ZAKI as the persistent agent layer. Underneath, that direction is powered by ZAKI's private runtime. OpenClaw is a broader tool-rich agent environment. The practical difference is this: ZAKI's stack is currently stronger where persistence, memory discipline, tenant isolation, and safer daily operation matter. OpenClaw is currently stronger where browser automation, media tooling, and richer inter-agent protocol support matter.",
    table: {
      headers: ["Area", "ZAKI runtime", "OpenClaw"],
      rows: [
        {
          feature: "Memory system",
          values: [
            "Multiple memory backends, query expansion, semantic cache, and automatic lifecycle hygiene",
            "File-oriented memory with simpler long-term storage",
          ],
        },
        {
          feature: "Embeddings and retrieval",
          values: [
            "Multiple embedding providers with retrieval tuning and fallback paths",
            "Narrower embedding and retrieval stack",
          ],
        },
        {
          feature: "Operational model",
          values: [
            "Multi-tenant runtime with per-user isolation and stronger daily SaaS discipline",
            "More single-user and operator-centric by default",
          ],
        },
        {
          feature: "Safety boundaries",
          values: [
            "Turn-origin-aware restrictions and stronger internal policy boundaries for background work",
            "Policy pipeline, but less emphasis on this exact multi-tenant SaaS safety shape",
          ],
        },
        {
          feature: "Tooling breadth",
          values: [
            "Narrower native tool surface today, focused on core execution and channels",
            "Much broader tool ecosystem with stronger browser and media coverage",
          ],
        },
        {
          feature: "Browser and media",
          values: [
            "Still a gap today",
            "Ahead today with browser automation, media generation, and richer interactive UX",
          ],
        },
        {
          feature: "Subagents and protocol",
          values: [
            "Useful worker-style subagents, but no ACP-style streaming, steering, or persistent subagent sessions yet",
            "Ahead today with ACP-style collaboration and richer inter-agent communication",
          ],
        },
        {
          feature: "Runtime footprint",
          values: [
            "Leaner systems footprint and stronger infrastructure efficiency",
            "Heavier runtime with broader tooling surface",
          ],
        },
      ],
    },
    quote:
      "ZAKI is currently stronger on memory infrastructure and operational discipline. OpenClaw is currently stronger on tooling breadth and ACP-style collaboration.",
    sections: [
      {
        title: "Where ZAKI is stronger",
        items: [
          "Memory architecture: multiple backends, semantic cache, query expansion, and lifecycle hygiene.",
          "Multi-tenancy: stronger namespace and per-user isolation for a real SaaS operating model.",
          "Turn management: better support for queueing, parallel tools, and disciplined runtime behavior.",
          "Operational posture: better fit for persistent personal intelligence as a daily product rather than a loose tool sandbox.",
        ],
      },
      {
        title: "Where OpenClaw is stronger",
        items: [
          "Browser automation and media tooling are more mature today.",
          "ACP-style subagent collaboration is ahead of the current ZAKI runtime model.",
          "Tool breadth is wider, especially for experimental or power-user workflows.",
          "Interactive UX is richer, with stronger in-session control surfaces.",
        ],
      },
      {
        title: "What this means for users",
        body:
          "If your priority is a persistent, memory-heavy, operationally disciplined personal agent, ZAKI's direction is stronger. If your priority is maximum tool breadth, browser automation, and protocol-rich agent collaboration today, OpenClaw still has real advantages.",
      },
      {
        title: "What this means for the roadmap",
        body:
          "The remaining strategic gap is not basic memory or runtime architecture. It is browser/media tooling and ACP-style collaboration. For ZAKI's current personal-agent direction, that gap is not a blocker. For future coworker-agent or B2B collaboration tiers, it becomes more important.",
      },
    ],
    disclaimer:
      "This page is based on confirmed internal code review and testing notes, not a third-party certification. It should be read as a transparent technical comparison, not a claim of universal superiority.",
    links: [
      { label: "See ZAKI", href: "/zaki-bot/" },
      { label: "Read ZAKI vs Spaces", href: "/zaki-vs-spaces/" },
      { label: "How ZAKI and Spaces work together", href: "/how-to/how-zaki-and-spaces-work/" },
    ],
    seo: {
      title: "ZAKI vs OpenClaw",
      description:
        "A technical comparison of ZAKI's underlying runtime direction and OpenClaw: memory architecture, multi-tenancy, tooling breadth, ACP, and operational discipline.",
      imageAlt: "ZAKI versus OpenClaw technical comparison page",
      keywords:
        "ZAKI vs OpenClaw, persistent agent comparison, ACP vs subagents, AI memory architecture",
    },
  },
};

const howToContent: Record<HowToSlug, HowToContent> = {
  "write-arabic-emails-ai": {
    badge: "How To",
    title: "How to Write Professional Arabic Emails Using AI",
    intro:
      "Use Spaces for Arabic email drafting when the job needs one clean place for context, revisions, and final copy. Use ZAKI first if the message still needs framing, tone decisions, or continuity from a longer thread before execution starts.",
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
      { label: "Try Spaces", href: "https://app.chatzaki.com/?auth=signup" },
      { label: "Read ZAKI vs Spaces", href: "/zaki-vs-spaces/" },
      { label: "Translate dialects to English", href: "/how-to/translate-dialects-arabic-english/" },
    ],
    seo: {
      title: "How to Write Professional Arabic Emails Using AI",
      description:
        "A step-by-step guide to writing professional Arabic emails with AI using Spaces for cleaner execution and ZAKI for planning and continuity.",
      imageAlt: "Guide for writing Arabic emails with AI",
      keywords:
        "Arabic email AI guide, write Arabic emails with AI, Spaces email workflow, ZAKI Arabic productivity guide",
    },
  },
  "translate-dialects-arabic-english": {
    badge: "How To",
    title: "How to Translate Arabic Dialects to English Accurately",
    intro:
      "Use Spaces when Arabic-English translation needs one dedicated place for source text, revisions, and final wording. Use ZAKI when the translation still needs planning, audience framing, or continuity from a longer relationship-level thread.",
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
      { label: "Try Spaces", href: "https://app.chatzaki.com/?auth=signup" },
      { label: "Read ZAKI vs Spaces", href: "/zaki-vs-spaces/" },
      { label: "Create Arabic social content", href: "/how-to/create-social-media-content-arabic/" },
    ],
    seo: {
      title: "How to Translate Arabic Dialects to English Accurately",
      description:
        "Learn how to translate Levantine, Khaleeji, and Egyptian Arabic to natural English with AI using Spaces for execution and ZAKI for planning and context.",
      imageAlt: "Guide for translating Arabic dialects to English with AI",
      keywords:
        "translate Arabic dialects to English, Arabic dialect AI translation, Spaces translation workflow, ZAKI translation guide",
    },
  },
  "create-social-media-content-arabic": {
    badge: "How To",
    title: "How to Create Arabic Social Media Content with AI",
    intro:
      "Use Spaces for Arabic social content when you want one dedicated workspace for hooks, drafts, revisions, and channel-specific output. Use ZAKI when the work still needs framing, campaign thinking, or continuity before the content gets produced.",
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
      { label: "Try Spaces", href: "https://app.chatzaki.com/?auth=signup" },
      { label: "Read ZAKI vs Spaces", href: "/zaki-vs-spaces/" },
      { label: "Write Arabic emails", href: "/how-to/write-arabic-emails-ai/" },
    ],
    seo: {
      title: "How to Create Arabic Social Media Content with AI",
      description:
        "Use AI to draft Arabic captions, posts, and short-form content with Spaces for cleaner execution and ZAKI for planning and continuity.",
      imageAlt: "Guide for Arabic social media content with AI",
      keywords:
        "Arabic social media AI guide, Arabic content with AI, Spaces content workflow, ZAKI content writing guide",
    },
  },
  "how-zaki-and-spaces-work": {
    badge: "How To",
    title: "How ZAKI and Spaces Work Together",
    intro:
      "Short answer: think with ZAKI, execute in Spaces. ZAKI keeps the long-running thread. Spaces keep each project organized with its own context.",
    steps: [
      {
        title: "Start with ZAKI to frame the task.",
        text:
          "Use ZAKI when the work is still fuzzy: goals, tradeoffs, planning, recurring context, or a decision that should connect to what came before.",
      },
      {
        title: "Use ZAKI to decide direction and priorities.",
        text:
          "Ask ZAKI to narrow scope, sequence next steps, and turn an idea into a clear path. This is where continuity matters more than production speed.",
      },
      {
        title: "Move the actual work into a Space.",
        text:
          "Open a Space once the job needs focused execution: writing, research, translation, planning artifacts, or project-specific work that should stay separate from everything else.",
      },
      {
        title: "Keep each project inside its own Space.",
        text:
          "Separate contexts by project, client, or task so drafts, research, and revisions do not collapse into one long thread.",
      },
      {
        title: "Return to ZAKI when the relationship-level thread matters again.",
        text:
          "Come back to ZAKI when you want to review progress, reconnect current work to bigger priorities, or continue an ongoing thread across time.",
      },
    ],
    examplePrompt:
      "ZAKI, help me turn this messy launch idea into a plan, then tell me what should move into a dedicated Space for execution.",
    goodOutput:
      "A clear split between relationship-level thinking and execution: ZAKI helps define goals, priorities, and next steps, then points to a Space where the real drafting, research, and task work can stay organized.",
    links: [
      { label: "Try ZAKI free", href: "https://app.chatzaki.com/?auth=signup&source=website_how_zaki_and_spaces_work" },
      { label: "Start with Spaces", href: "https://app.chatzaki.com/?auth=signup" },
      { label: "Read ZAKI vs Spaces", href: "/zaki-vs-spaces/" },
    ],
    seo: {
      title: "How ZAKI and Spaces Work Together",
      description:
        "Learn how ZAKI and Spaces work together: use ZAKI for planning, continuity, and memory, then move execution into Spaces for cleaner focused work.",
      imageAlt: "Guide explaining how ZAKI and Spaces work together",
      keywords:
        "how ZAKI and Spaces work together, AI workflow planning and execution, persistent AI counterpart, Spaces productivity workflow",
    },
  },
  "what-to-use-spaces-for": {
    badge: "How To",
    title: "What to Use Spaces For",
    intro:
      "Short answer: use Spaces when the work needs one dedicated context, not one endless mixed thread. This page exists to make the live product practical by showing where Spaces are strongest.",
    steps: [
      {
        title: "Use Spaces for writing and drafting.",
        text:
          "Emails, outlines, proposals, notes, and content drafts are easier to manage when each piece of work has its own workspace instead of living in a general conversation thread.",
      },
      {
        title: "Use Spaces for research by project.",
        text:
          "Keep each research stream separate so sources, notes, summaries, and follow-up drafts stay attached to the project they belong to.",
      },
      {
        title: "Use Spaces for translation and bilingual work.",
        text:
          "Arabic-English work benefits from cleaner separation because source text, tone choices, revisions, and final output are easier to track when they are not mixed with unrelated work.",
      },
      {
        title: "Use Spaces for content production and planning artifacts.",
        text:
          "Social posts, campaign drafts, content calendars, and project plans work better when they live inside a task-specific context that can be reopened and refined later.",
      },
      {
        title: "Use Spaces for client or project separation.",
        text:
          "The real advantage is less context spill. One client, one project, or one task can keep its own history, which makes work cleaner to continue and easier to trust.",
      },
    ],
    examplePrompt:
      "Create a Space for my Arabic-English product launch work and help me keep research, messaging, and draft content separated by task.",
    goodOutput:
      "Clear project separation, less thread chaos, and work that is easier to reopen later. The best use of Spaces feels like a calmer AI workspace, not a bigger pile of chat.",
    links: [
      { label: "Try Spaces", href: "https://app.chatzaki.com/?auth=signup" },
      { label: "Read ZAKI vs Spaces", href: "/zaki-vs-spaces/" },
      { label: "What to use ZAKI for", href: "/how-to/what-to-use-zaki-for/" },
    ],
    seo: {
      title: "What to Use Spaces For",
      description:
        "Learn what to use Spaces for: writing, research, translation, content production, and project separation in a cleaner structured AI workspace.",
      imageAlt: "Guide explaining what to use Spaces for",
      keywords:
        "what to use Spaces for, AI workspaces for productivity, structured AI workspace use cases, Spaces vs one long chat thread",
    },
  },
  "what-to-use-zaki-for": {
    badge: "How To",
    title: "What to Use ZAKI For",
    intro:
      "Short answer: use ZAKI when the job is not just a task, but an ongoing thread. This page exists to make the agent layer practical without pretending it is a finished autonomous system.",
    steps: [
      {
        title: "Use ZAKI for weekly review and planning.",
        text:
          "ZAKI is useful when priorities change over time and you want a persistent thread that remembers what matters, what has shifted, and what should happen next.",
      },
      {
        title: "Use ZAKI for decision support.",
        text:
          "Bring decisions to ZAKI when the work needs tradeoffs, framing, and continuity across more than one session instead of a one-off answer.",
      },
      {
        title: "Use ZAKI for long-running projects.",
        text:
          "Projects that unfold across days or weeks benefit from a relationship-level thread that keeps context alive before the work moves into separate Spaces for execution.",
      },
      {
        title: "Use ZAKI for idea development.",
        text:
          "ZAKI is useful when you want to return to the same idea, refine it gradually, and keep the continuity of why it matters instead of re-prompting from zero.",
      },
      {
        title: "Use ZAKI for your personal operating system.",
        text:
          "The strongest early use case is not autonomy theater. It is having a more persistent AI counterpart for priorities, planning, memory, and continuity across time.",
      },
    ],
    examplePrompt:
      "ZAKI, help me review this week, decide what matters next, and tell me which parts should move into separate Spaces for execution.",
    goodOutput:
      "A practical planning layer: ZAKI helps connect the thread across time, clarify what matters, and point specific work into Spaces instead of pretending to replace every workflow by itself.",
    links: [
      { label: "See ZAKI", href: "/zaki-bot/" },
      { label: "Read ZAKI vs Spaces", href: "/zaki-vs-spaces/" },
      { label: "How ZAKI and Spaces work together", href: "/how-to/how-zaki-and-spaces-work/" },
    ],
    seo: {
      title: "What to Use ZAKI For",
      description:
        "Learn what to use ZAKI for: planning, continuity, decision support, long-running projects, and a more persistent AI counterpart across time.",
      imageAlt: "Guide explaining what to use ZAKI for",
      keywords:
        "what to use ZAKI for, persistent AI companion use cases, AI continuity workflows, personal AI counterpart",
    },
  },
};

const contactContent: Record<Locale, ContactContent> = {
  en: {
    badge: "Support",
    title: "Contact",
    intro:
      "For support, account, legal, privacy, or compliance requests, contact the team directly. Keep the summary concise and include enough context for a real response.",
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
    emailLabel: "support@chatzaki.com",
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
            "Stripe, Inc. (US): payment processing for paid tiers. Shared: email, billing details, transaction metadata. Stripe stores card data; ZAKI never sees card numbers.",
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
