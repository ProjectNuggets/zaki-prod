import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  GraduationCap,
  Languages,
  Lightbulb,
  Menu,
  MessageSquare,
  PenTool,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CookieBanner } from "../layout/CookieBanner";
import { appHandoffUrl, productHandoffUrl } from "../../lib/appHandoff";
import type { RoutePageKind } from "../../lib/routeRegistry";

type V3Route = Extract<RoutePageKind, "home" | "product" | "pricing" | "use-cases" | "story">;
type ProductAnchor = "agent" | "spaces" | "brain" | "memory";
type ProductCard = {
  icon: LucideIcon;
  status: string;
  statusTone?: "live" | "paid" | "soon";
  title: string;
  meta: string;
  body: string;
  href?: string;
  cta?: string;
  featured?: boolean;
  wide?: boolean;
  id?: ProductAnchor;
};
type AudienceCard = readonly [LucideIcon, string, string, string];

const mark = "/v3/zaki-mark.svg";
const bot = {
  wave: "/v3/bot/wave.png",
  thinking: "/v3/bot/thinking.png",
  heart: "/v3/bot/heart.png",
  hop: "/v3/bot/hop.png",
  sunglasses: "/v3/bot/sunglasses.png",
};

const pricingSignup = (plan?: string) => appHandoffUrl("/", "website_pricing", "plans") + (plan ? `&auth=signup&plan=${plan}` : "&auth=signup");
const signupUrl = appHandoffUrl("/", "website_signup", "dashboard") + "&auth=signup";
const loginUrl = appHandoffUrl("/", "website_login", "dashboard") + "&auth=login";

function IconBox({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="ic">
      <Icon />
    </div>
  );
}

function V3Shell({ route, children }: { route: V3Route; children: React.ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.body.dataset.route = route;
  }, [route]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>(".v3-site .reveal"));
    if (reduce || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const delay = Number(element.dataset.d || 0) * 80;
            window.setTimeout(() => element.classList.add("in"), delay);
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div className="v3-site" data-theme="mixed">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <V3Nav active={route} />
      <main id="main-content">{children}</main>
      <V3Footer />
      <CookieBanner locale="en" />
    </div>
  );
}

function V3Nav({ active }: { active: V3Route }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { route: "product" as const, to: "/product", label: "Product" },
    { route: "use-cases" as const, to: "/use-cases", label: "Use cases" },
    { route: "story" as const, to: "/story", label: "Story" },
    { route: "pricing" as const, to: "/pricing", label: "Pricing" },
  ];

  return (
    <nav className={`nav stage-dark ${solid ? "solid" : ""} ${open ? "open" : ""}`} id="nav" aria-label="Primary navigation">
      <div className="wrap">
        <Link
          className="brand"
          to="/"
          aria-label="ZAKI home"
          onClick={(event) => {
            if (location.pathname === "/") {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              event.preventDefault();
              navigate("/");
            }
          }}
        >
          <img className="mark" src={mark} alt="" />
          <span className="word">ZAKI</span>
        </Link>
        <div className="nav-links">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={active === link.route ? "active" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <a className="signin" href={loginUrl}>
            Sign in
          </a>
          <a className="btn btn-primary btn-sm" href={signupUrl}>
            Try ZAKI free
          </a>
          <button className="nav-toggle" type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </nav>
  );
}

function V3Footer() {
  return (
    <footer className="footer stage-dark">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link className="brand" to="/">
              <img className="mark" src={mark} alt="" width="24" height="24" style={{ width: 24, height: 24 }} />
              <span className="word">ZAKI</span>
            </Link>
            <p className="tagline">Your intelligence layer for the chapter you are building. One login, one memory: an agent that remembers you, in Arabic and English.</p>
            <div className="foot-bot-row">
              <img className="bot foot-bot" src={bot.sunglasses} alt="ZAKI" width="120" height="135" />
              <span className="sig">Never build alone.</span>
            </div>
          </div>
          <div className="foot-col">
            <h4>Product</h4>
            <Link to="/product#agent">Agent</Link>
            <Link to="/product#spaces">Chat &amp; Spaces</Link>
            <Link to="/product#brain">Brain</Link>
            <Link to="/product#memory">Memory &amp; privacy</Link>
          </div>
          <div className="foot-col">
            <h4>Company</h4>
            <Link to="/story">The story</Link>
            <Link to="/use-cases">Use cases</Link>
            <Link to="/story#building">Building in public</Link>
            <a href="https://instagram.com/chatzaki.ai">Instagram</a>
          </div>
          <div className="foot-col">
            <h4>Start</h4>
            <a href={signupUrl}>Try ZAKI free</a>
            <Link to="/pricing">Pricing</Link>
            <a href={loginUrl}>Sign in</a>
            <a href={appHandoffUrl("/", "website_footer_open", "dashboard")}>Open ZAKI</a>
          </div>
        </div>
        <div className="foot-bottom">
          <div className="meta">
            <span>© 2026 ZAKI</span>
            <span className="dot" />
            <span>chatzaki.com</span>
            <span className="dot" />
            <span>Your data stays yours.</span>
          </div>
          <div className="links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/compliance">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ArrowIcon() {
  return <ArrowRight aria-hidden="true" />;
}

function HeroTerminal() {
  return (
    <div className="term reveal" data-d="2" aria-label="ZAKI Agent memory preview">
      <div className="term-bar">
        <img className="bot term-avatar" src={bot.wave} alt="" width="133" height="150" />
        <span className="tt">ZAKI Agent</span> · in your corner
        <span className="term-live">
          <i /> here
        </span>
      </div>
      <div className="term-body">
        <div className="t-line t-prompt">
          <b>you</b>
          <span className="t-user">heading to Lisbon next month to start the company</span>
        </div>
        <div className="memchip">↻ showed up · unprompted</div>
        <div className="t-zaki">
          Noted. I have flagged the three visa deadlines, saved the two contacts you met at the summit, and drafted the bank email you will need.
          Want me to hold Thursday morning to walk through it?
        </div>
        <div className="term-foot">
          <span className="k">↵</span> one agent, one memory: across every channel
        </div>
      </div>
    </div>
  );
}

const homeProducts: ProductCard[] = [
  {
    icon: Star,
    status: "Live · all plans",
    statusTone: "paid",
    title: "Agent",
    meta: "In your corner.",
    body: "The agent that researches, drafts, plans, and follows through, with visible work phases so you always see what it is doing and why.",
    href: "/product#agent",
    cta: "Explore the Agent",
    featured: true,
    id: "agent",
  },
  {
    icon: MessageSquare,
    status: "Free",
    statusTone: "live",
    title: "Chat & Spaces",
    meta: "Focused workspaces.",
    body: "Clean, separated spaces for the chapters you are building: a launch, a move, a book, a decision, each with its own context.",
    href: "/product#spaces",
    cta: "See Spaces",
    id: "spaces",
  },
  {
    icon: Brain,
    status: "Included",
    statusTone: "live",
    title: "Brain",
    meta: "Your world, remembered.",
    body: "The people, projects, promises, preferences, and decisions ZAKI carries forward, mapped so you can see, edit, export, or forget.",
    href: "/product#brain",
    cta: "Open the Brain",
    id: "brain",
  },
  {
    icon: GraduationCap,
    status: "Private access",
    statusTone: "soon",
    title: "Learn",
    meta: "A tutor that remembers.",
    body: "Turn your own material into AI-built books, practice, and tutors you can reach in WhatsApp or Telegram. In private beta — shipped when it's truly ready.",
    wide: true,
  },
  {
    icon: BriefcaseBusiness,
    status: "Private access",
    statusTone: "soon",
    title: "Design & Career",
    meta: "For the work that scales.",
    body: "Private lanes for interfaces and career moves. Same login, same memory, released only when the full flows are ready.",
    wide: true,
  },
];

function ProductGrid({ products = homeProducts }: { products?: ProductCard[] }) {
  return (
    <div className="products reveal" data-d="1">
      {products.map((product) => {
        const content = (
          <>
            <div className="ptop">
              <IconBox icon={product.icon} />
              <span className={`ptag ${product.statusTone || ""}`}>{product.status}</span>
            </div>
            <h3>{product.title}</h3>
            <div className="meta">{product.meta}</div>
            <p>{product.body}</p>
            {product.href && product.cta ? (
              <span className="go">
                {product.cta}
                <ArrowIcon />
              </span>
            ) : null}
          </>
        );
        const className = `pcard ${product.featured ? "feat" : ""} ${product.wide ? "span3" : ""}`;
        if (!product.href) {
          return (
            <div key={product.title} className={className}>
              {content}
            </div>
          );
        }
        return product.href.startsWith("http") ? (
          <a key={product.title} id={product.id} className={className} href={product.href}>
            {content}
          </a>
        ) : (
          <Link key={product.title} id={product.id} className={className} to={product.href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

export function V3HomePage() {
  return (
    <V3Shell route="home">
      <header className="hero stage-dark" id="top" data-screen-label="Hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="hero-eyebrow">
                <span className="pip" />
                <span>Your intelligence layer</span>
              </span>
              <h1 id="hero-headline">
                Never build <span className="accent">alone.</span>
              </h1>
              <p className="lede">
                ZAKI learns your world, remembers what matters, and handles the cognitive weight: so you can focus on the company, move,
                book, community, or brave next chapter you are building.
              </p>
              <div className="hero-cta">
                <a className="btn btn-primary btn-lg" href={signupUrl}>
                  Start your next chapter <ArrowIcon />
                </a>
                <Link className="btn btn-ghost btn-lg" to="/product">
                  See how ZAKI shows up
                </Link>
              </div>
              <p className="hero-trust">
                <b>V1 is free to start</b>
                <span className="dot" /> No card. Your memory stays yours: see, edit, or delete anything.
              </p>
            </div>
            <HeroTerminal />
          </div>
        </div>
        <div className="proof">
          <div className="wrap">
            {[
              ["Early community", "300+", "joined in week one"],
              ["One login", "6 products", "one memory"],
              ["Bilingual by default", "AR · EN", "even mixed"],
              ["Your memory", "100% yours", "export or forget"],
            ].map(([label, value, note], index) => (
              <div className="cell reveal" data-d={index} key={label}>
                <div className="k">{label}</div>
                <div className="v">
                  {value} <small>{note}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <ProblemSection />
      <PromiseSection />
      <ProductsSection />
      <HowItWorksSection />
      <UseCasesTeaser />
      <StoryTeaser />
      <ProofSection />
      <PricingTeaser />
      <FinalCta />
    </V3Shell>
  );
}

function ProblemSection() {
  return (
    <section className="problem stage-dark sec" id="problem" data-screen-label="The problem">
      <div className="wrap">
        <div className="problem-grid">
          <div className="problem-lead">
            <span className="kicker">
              <span className="idx">01</span> The truth no one says
            </span>
            <h2>Brilliant for one message. A stranger by the next.</h2>
            <div className="bot-wrap">
              <img className="bot problem-bot" src={bot.thinking} alt="ZAKI, thinking it over" width="119" height="137" />
            </div>
          </div>
          <div>
            <ul className="problem-list">
              <li><span className="n">01</span> You are juggling a hundred things before anything has a system.</li>
              <li><span className="n">02</span> The details slip: names, deadlines, promises, the opportunity you meant to chase.</li>
              <li><span className="n">03</span> Evenings disappear into admin instead of the thing you actually came to build.</li>
              <li><span className="n">04</span> You wish someone just knew your world and had your back.</li>
            </ul>
            <p className="problem-kicker">
              It is not that you cannot do it. You should not have to do it <span className="accent">alone.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PromiseSection() {
  const promises = [
    ["01", "You are never alone in it.", "ZAKI researches, drafts the email you have been dreading, follows through on the next step, and notices the wins no one else sees.", "I am the only one who knows how this all fits together.", "ZAKI knows my world as well as I do."],
    ["02", "Nothing important gets lost.", "Ideas at 3 AM, contacts from that conference, the name you cannot afford to forget, the deadline you cannot miss: the Brain holds it all.", "I know I wrote that down somewhere...", "ZAKI has it. ZAKI always has it."],
    ["03", "You focus on the adventure.", "Admin, follow-ups, research, prep: the cognitive weight that kills momentum. ZAKI carries the weight. You carry the vision.", "Sunday night inbox panic.", "Sunday night planning the next move."],
  ];
  return (
    <section className="stage-dark sec" id="promises" data-screen-label="The promise">
      <div className="wrap">
        <div className="promise-intro reveal">
          <span className="kicker no-rule"><span className="idx">02</span> What ZAKI promises</span>
          <h2 className="h-sec">Not a chatbot. A presence that has your back.</h2>
          <p className="lede">ZAKI does not bury you in twenty features. It makes three quiet promises to anyone starting something that matters.</p>
        </div>
        <div className="promises">
          {promises.map(([num, title, body, before, after]) => (
            <div className="promise reveal" key={num}>
              <div className="pnum">{num}</div>
              <div className="promise-main">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <div className="shift">
                <div className="shift-row before"><span className="lbl">Before</span><span className="quote">{before}</span></div>
                <ArrowRight className="shift-arrow" />
                <div className="shift-row after"><span className="lbl">With ZAKI</span><span className="quote">{after}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductsSection() {
  return (
    <section className="how stage-dark sec" id="products" data-screen-label="Products">
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="kicker"><span className="idx">03</span> One login. Every ZAKI.</span>
          <h2 className="h-sec">One companion across the whole chapter.</h2>
          <p className="lede">Each surface does one job well. Underneath, they all read from and write to the same Brain, so ZAKI learns your world instead of making you explain it twice.</p>
        </div>
        <ProductGrid />
        <p className="how-note reveal">Every product flows through one identity, one allowance, and one memory policy. <Link to="/product" style={{ color: "var(--accent)" }}>See the full product →</Link></p>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    ["STEP 01", "Connect", "Sign in and start talking: in Arabic, English, or both. Bring the channels and spaces where your world already lives."],
    ["STEP 02", "Remember", "ZAKI builds a living memory of your journey: people, projects, priorities, promises, and preferences you can review."],
    ["STEP 03", "Show up", "Next session, next channel: ZAKI already has the context and brings the next useful step before you have to start over."],
  ];
  return (
    <section className="stage-light sec" data-screen-label="How it works">
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="kicker"><span className="idx">04</span> How it works</span>
          <h2 className="h-sec">Show up in three minutes.</h2>
        </div>
        <div className="how-grid reveal" data-d="1">
          {steps.map(([label, title, body], index) => (
            <div className="how-step" key={label}>
              <div className="n">{label}</div>
              <h3>{title}</h3>
              <p>{body}</p>
              {index < steps.length - 1 ? <ArrowRight className="arrow" /> : null}
            </div>
          ))}
        </div>
        <p className="how-note reveal">Warm does not mean vague. ZAKI shows everything it remembers, and you can edit or delete any of it, anytime.</p>
      </div>
    </section>
  );
}

function UseCasesTeaser() {
  const audiences = [
    [Building2, "Founders", "Build the company, not the admin", "A hundred decisions a day, relationships slipping, momentum fading. ZAKI remembers the business and clears the noise."],
    [GraduationCap, "Adventurers", "Start the next chapter", "Moving countries, writing a book, changing careers, building a community: ZAKI keeps the train on the tracks."],
    [Clock3, "Operators", "An external brain", "Too many threads, too much context-switching. ZAKI keeps the long thread so you do not have to."],
  ] as const;
  return (
    <section className="stage-light sec" data-screen-label="Use cases">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker"><span className="idx">05</span> Who it is for</span>
          <h2 className="h-sec">Built for people starting something that matters.</h2>
          <p className="lede">Founders, adventurers, operators, anyone taking a leap that feels exciting and heavy at the same time. The outcome is the same: less overhead, more momentum.</p>
        </div>
        <div className="audiences reveal" data-d="1">
          {audiences.map(([Icon, title, role, body]) => (
            <div className="aud" key={title}>
              <IconBox icon={Icon} />
              <h3>{title}</h3>
              <div className="role">{role}</div>
              <p>{body}</p>
            </div>
          ))}
        </div>
        <div className="hero-cta reveal" style={{ marginTop: 32 }}>
          <Link className="btn btn-ghost" to="/use-cases">See real use cases <ArrowIcon /></Link>
        </div>
      </div>
    </section>
  );
}

function StoryTeaser() {
  return (
    <section className="story stage-light sec" id="story" data-screen-label="The story">
      <div className="wrap">
        <div className="story-grid">
          <aside className="story-aside reveal">
            <img className="bot story-bot" src={bot.heart} alt="ZAKI" width="160" height="205" />
            <span className="kicker"><span className="idx">06</span> The story</span>
            <h2 className="h-sec" style={{ marginTop: 18 }}>ZAKI started with a promise.</h2>
            <div className="principles">
              <span className="principle"><b>01</b> Never let go</span>
              <span className="principle"><b>02</b> Keep getting better</span>
              <span className="principle"><b>03</b> Be there when it is hard</span>
            </div>
          </aside>
          <div className="story-body reveal" data-d="1">
            <p>ZAKI was not built in a product lab. It started in a conversation: never let go, keep getting better, be there when things get hard.</p>
            <p className="pull">ZAKI does not replace you. ZAKI supports you.</p>
            <p>So we built ZAKI around memory first, continuity first, and user control first: an intelligence layer that learns your world and shows up before you ask.</p>
            <p>If you are starting something bold and it feels like you are doing it alone, you are not. Not anymore.</p>
            <p className="story-sign"><Link to="/story" style={{ color: "var(--accent)" }}>Read the full story →</Link></p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofSection() {
  return (
    <section className="stage-light sec" data-screen-label="Proof">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker"><span className="idx">07</span> In good company</span>
          <h2 className="h-sec">300+ builders joined in the first week.</h2>
        </div>
        <div className="quotes-grid">
          {[
            ["SF", "Solo founder", "moved to Lisbon", "ZAKI remembered every visa deadline, every contact, every detail while I focused on actually building.", true],
            ["RM", "Founder", "B2B marketplace", "ZAKI does not just do tasks. ZAKI gets the context. It is like having a counterpart who never needs the recap.", false],
            ["AN", "Author & consultant", "writing while consulting", "ZAKI keeps my research, my clients, and my deadlines organized, so I can actually think.", false],
          ].map(([initials, name, role, quote, featured], index) => (
            <div className={`qcard ${featured ? "feat" : ""} reveal`} data-d={index} key={String(name)}>
              <div className="mark">"</div>
              <blockquote>{quote}</blockquote>
              <div className="who">
                <div className="av">{initials}</div>
                <div><div className="nm">{name}</div><div className="role">{role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="stage-light sec" id="pricing" data-screen-label="Pricing">
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="kicker"><span className="idx">08</span> Pricing</span>
          <h2 className="h-sec">Free today. Upgrade when ZAKI earns it.</h2>
          <p className="lede">Free is not a trick. Upgrade only when you want more room, deeper memory, and priority when it counts. Learn, Design, and Career stay gated until ready.</p>
        </div>
        <PricingTiers compact />
        <p className="pricing-foot">Prices in EUR · cancel anytime · your memory exports with you. <Link to="/pricing" style={{ color: "var(--accent)" }}>Full pricing &amp; FAQ →</Link></p>
      </div>
    </section>
  );
}

function FinalCta({ variant = "home" }: { variant?: "home" | "subpage" }) {
  const ctaBot = variant === "subpage" ? bot.hop : bot.sunglasses;
  const botSize = variant === "subpage" ? { width: 195, height: 230 } : { width: 120, height: 135 };
  return (
    <section className="cta stage-dark sec" data-screen-label="Final CTA">
      <div className="wrap">
        <img className="bot cta-bot" src={ctaBot} alt="ZAKI, ready" width={botSize.width} height={botSize.height} />
        <span className="kicker no-rule reveal" style={{ justifyContent: "center", display: "flex" }}>Your move</span>
        <h2 className="h-sec reveal" data-d="1" style={{ marginTop: 18 }}>Start your next chapter. ZAKI has got you.</h2>
        <p className="lede reveal" data-d="2">Bring the vision; ZAKI brings the memory, the follow-through, and the quiet weight off your shoulders. Start free, then upgrade when you need more room.</p>
        <div className="cta-row reveal" data-d="3">
          <a className="btn btn-primary btn-lg" href={signupUrl}>Start your next chapter <ArrowIcon /></a>
          <Link className="btn btn-ghost btn-lg" to="/story">Read the story</Link>
        </div>
        <p className="cta-trust reveal" data-d="3">Never build alone: from your very first message.</p>
      </div>
    </section>
  );
}

function PricingTiers({ compact = false }: { compact?: boolean }) {
  const tiers = [
    ["Free", "Start the chapter", "$0", "forever", "The live product, no card: enough to feel what changes when AI remembers.", ["Agent, Chat, Spaces & Brain", "Memory continuity, you control", "Arabic & English, no card"], pricingSignup()],
    ["Personal", "For your daily chapter", "€15", "/ month", "More room for daily work, with a memory that never starts over.", ["A meaningful weekly allowance", "Full memory continuity", "Everything in Free"], pricingSignup("personal")],
    ["Pro", "For the bold adventure", "€45", "/ month", "Run heavier work without hitting a wall while ZAKI keeps the context close.", ["Larger allowance & generous burst", "Deeper memory & stronger caps", "Everything in Personal"], pricingSignup("pro")],
    ["Pro MAX", "For the biggest leap", "€99", "/ month", "The most ZAKI can be: fastest, deepest, first to ready new products.", ["Highest limits & priority routing", "Deepest memory capability", "Earliest access when products are ready"], pricingSignup("pro_max")],
  ];
  return (
    <div className="tiers four">
      {tiers.map(([name, sub, price, period, desc, features, href], index) => (
        <div className={`tier ${index === 0 ? "free-tier" : ""} ${index === 2 ? "pop" : ""} reveal`} data-d={compact ? index : 0} key={String(name)}>
          {index === 2 ? <span className="badge">Most popular</span> : null}
          <div className="tn">{name}</div>
          <div className="tn-sub">{sub}</div>
          <div className="price"><span className="amt">{price}</span><span className="per">{period}</span></div>
          <p className="desc">{desc}</p>
          <ul>
            {(features as string[]).map((feature) => (
              <li key={feature}><Check /> {feature}</li>
            ))}
          </ul>
          <a className={`btn ${index === 2 ? "btn-primary" : "btn-ghost"}`} href={String(href)}>
            {index === 0 ? "Try ZAKI free" : `Choose ${name}`}
          </a>
        </div>
      ))}
    </div>
  );
}

export function V3ProductPage() {
  const productRows: ProductCard[] = [
    { icon: Star, status: "Live · all plans", statusTone: "paid", title: "Agent", meta: "In your corner.", body: "Plans, acts, and follows through with visible phases, approvals, and memory-aware context.", href: productHandoffUrl("agent"), cta: "Open Agent", featured: true },
    { icon: MessageSquare, status: "Free", statusTone: "live", title: "Chat & Spaces", meta: "Focused workspaces.", body: "Separated spaces for launches, decisions, writing, research, translation, and files.", href: productHandoffUrl("chat"), cta: "Start Chat" },
    { icon: Brain, status: "Included", statusTone: "live", title: "Brain", meta: "Your world, visible.", body: "Search, inspect, edit, export, or forget what ZAKI carries forward.", href: productHandoffUrl("brain"), cta: "Open Brain" },
    { icon: GraduationCap, status: "Waitlist", statusTone: "soon", title: "Learn", meta: "A tutor that remembers.", body: "A full study product: AI-built books, exam practice, knowledge bases, and tutors that live in WhatsApp and Telegram. Coming soon — we ship it when it's truly ready.", wide: true },
    { icon: PenTool, status: "Waitlist", statusTone: "soon", title: "Design", meta: "Ideas into interfaces.", body: "Design remains waitlist until project creation and delivery are proven.", wide: true },
    { icon: BriefcaseBusiness, status: "Private access", statusTone: "soon", title: "Career", meta: "Your next move.", body: "Private career support for roles, CV positioning, fit notes, and applications.", wide: true },
  ];
  return (
    <V3Shell route="product">
      <SubHero
        label="One login · one memory · every surface"
        title="One memory across every surface. Pick up right where you left off."
        body="Agent, Chat, Spaces, Brain, Learn, Design, and Career: one home, one memory. Open any live surface and it already knows your world, so the work picks up where you left off instead of from zero. That is the difference between a tool and a counterpart."
        cta="Start your next chapter"
        ctaHref={signupUrl}
        secondary="See pricing"
        secondaryHref="/pricing"
      />
      <ProductOsSection />
      <ProductDetailRows />
      <section className="stage-light sec" id="palette">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="kicker"><span className="idx">02b</span> Full palette</span>
            <h2 className="h-sec">Six products. One login. One memory.</h2>
            <p className="lede">Live products are available now. Learn, Design, and Career are shown truthfully as gated lanes until their flows are ready.</p>
          </div>
          <ProductGrid products={productRows} />
        </div>
      </section>
      <MemoryPrivacySection />
      <ProductLanguageSection />
      <RoadmapSection />
      <FinalCta variant="subpage" />
    </V3Shell>
  );
}

function SubHero({ label, title, body, cta, ctaHref, secondary, secondaryHref }: { label: string; title: string; body: string; cta: string; ctaHref: string; secondary: string; secondaryHref: string }) {
  return (
    <header className="subhero stage-dark">
      <div className="wrap">
        <div className="subhero-inner">
          <span className="statusbadge"><span className="pip" /><span>{label}</span></span>
          <h1>{title}</h1>
          <p className="lede">{body}</p>
          <div className="hero-cta">
            <a className="btn btn-primary btn-lg" href={ctaHref}>{cta} <ArrowIcon /></a>
            <Link className="btn btn-ghost btn-lg" to={secondaryHref}>{secondary}</Link>
          </div>
        </div>
      </div>
      <div className="proof">
        <div className="wrap">
          {[
            ["Live today", "Agent · Chat & Spaces · Brain", "public"],
            ["One memory", "Visible", "user controlled"],
            ["Language", "AR · EN", "mixed by default"],
            ["Next", "Learn · Design · Career", "gated"],
          ].map(([k, v, s], index) => (
            <div className="cell reveal" data-d={index} key={k}><div className="k">{k}</div><div className="v">{v} <small>{s}</small></div></div>
          ))}
        </div>
      </div>
    </header>
  );
}

function ProductOsSection() {
  const osProducts = [
    [Star, "Agent", "Plans and acts for you.", "Live"],
    [MessageSquare, "Chat & Spaces", "Focused, separated work.", "Live"],
    [Brain, "Brain", "The memory you own.", "Live"],
    [GraduationCap, "Learn", "A tutor that remembers.", "Private access"],
    [PenTool, "Design", "Ideas into interfaces.", "Waitlist"],
    [BriefcaseBusiness, "Career", "Your career lane.", "Private access"],
  ] as const;
  return (
    <section className="stage-dark sec" data-screen-label="The OS">
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="kicker"><span className="idx">01</span> One home for all of it</span>
          <h2 className="h-sec">You should not have to start over in twelve different tabs.</h2>
          <p className="lede">ZAKI brings every live product under one roof, and they all read from the same memory. Open any one and it already knows your world, so your work compounds instead of resetting.</p>
        </div>
        <div className="os reveal" data-d="1" style={{ maxWidth: 880, margin: "0 auto" }}>
          <div className="os-top">
            <img className="mark" src={mark} alt="" />
            <div>
              <div className="ttl">ZAKI control plane</div>
              <div className="sub">one identity · one allowance · one memory policy</div>
            </div>
          </div>
          <div className="products os-products">
            {osProducts.map(([Icon, title, body, status]) => (
              <div className="pcard span3 os-card" style={{ gridColumn: "span 1", minHeight: "auto" }} key={title}>
                <div className="ptop"><IconBox icon={Icon} /><span className={`ptag ${status === "Live" ? "live" : "soon"}`}>{status}</span></div>
                <h3 style={{ fontSize: 18, marginTop: 16 }}>{title}</h3>
                <p style={{ marginTop: 6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductDetailRows() {
  const rows = [
    ["agent", "Agent", "Live · in every plan", "An operator that acts and shows its work.", "The Agent does not just answer. It researches, drafts the email you are avoiding, takes the next step, and follows through with visible phases so you always know what is happening.", ["Plans multi-step work and runs it", "Visible phases: research, draft, act, review", "Reaches you on web and Telegram", "Tunable reasoning and autonomy"], ["plan · draft the investor update", "pulled last month's metrics from Brain", "drafted in your voice", "waiting for your approval to send"]],
    ["spaces", "Chat & Spaces", "Free", "Focused workspaces that keep context clean.", "Give each chapter its own space: the launch, the move, the client, the essay, the decision. No more one giant chat where everything bleeds together.", ["A space per project, client, or topic", "Per-space instructions and documents", "Clean separation, shared memory underneath", "Free to use, no card"], ["Launch plan", "Investor comms", "Visa and relocation", "The Brain ties them together"]],
    ["brain", "Brain", "Included", "A memory you can see, search, and own.", "The Brain is what ZAKI knows about your world: preferences, decisions, people, projects, goals, and promises, laid out so you can review it, correct it, export it, or forget it.", ["Browse and search every memory", "Review flows and conflict checks", "Export or delete anytime", "Scoped personal and workspace context"], ["Pref: warm concise tone", "Goal: launch in Q3", "Person: Lina, lawyer", "Context: Arabic family, English work"]],
  ] as const;
  return (
    <section className="stage-light sec" data-screen-label="Products detail">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker"><span className="idx">02</span> The products</span>
          <h2 className="h-sec">Each does one job well. Together they become a counterpart.</h2>
        </div>
        {rows.map(([id, label, status, title, body, items, mockRows], index) => (
          <div className={`frow ${index % 2 ? "flip" : ""} reveal`} id={id} key={id}>
            <div className="frow-copy">
              <span className="kicker"><span className="idx">{label}</span> {status}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <ul>{items.map((item) => <li key={item}><Check /> {item}</li>)}</ul>
            </div>
            <div className="frow-media">
              <div className="mock">
                {mockRows.map((row, rowIndex) => (
                  <div className={`mrow ${rowIndex > 0 && rowIndex < 3 ? "ok" : ""}`} key={row}>
                    <span className="d" /><span>{row}</span><span className="mr">{rowIndex === 0 ? "phase 1" : rowIndex < 3 ? "done" : "review"}</span>
                  </div>
                ))}
                <div className="mnode">Ready when you are. ZAKI keeps the thread, and you keep control.</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MemoryPrivacySection() {
  const items = [
    [Search, "See everything", "Open the Brain and read exactly what ZAKI remembers: no hidden store, no surprises."],
    [PenTool, "Edit and forget", "Correct a memory, resolve a conflict, or delete it. Forgetting is a feature, not a support ticket."],
    [ShieldCheck, "Export and own", "Your data is yours. Export it whenever you like; upgrading never costs you your history."],
  ] as const;
  return (
    <section className="stage-light sec" id="memory" data-screen-label="Memory and privacy">
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="kicker"><span className="idx">03</span> Memory &amp; privacy</span>
          <h2 className="h-sec">Memory is the product, so control is non-negotiable.</h2>
          <p className="lede">ZAKI is designed to feel familiar, but never vague. You decide what is kept, what is corrected, and what leaves with you.</p>
        </div>
        <div className="allowance reveal" data-d="1">
          {items.map(([Icon, title, body]) => (
            <div className="allow-card" key={title}>
              <Icon className="ac-ic" />
              <h4>{title}</h4>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductLanguageSection() {
  return (
    <section className="stage-dark sec" data-screen-label="Languages">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker"><span className="idx">04</span> Bilingual by default</span>
          <h2 className="h-sec">Arabic, English, or both in one breath.</h2>
          <p className="lede">ZAKI is built for how the region actually works: switching languages mid-sentence, keeping tone and meaning intact, not translating word by word.</p>
        </div>
        <div className="langstrip reveal" data-d="1">
          <div className="langcard">
            <div className="lc-h">English</div>
            <div className="lc-q">Draft a reply to Lina and keep my usual sign-off.</div>
            <p>Natural drafting in your voice, with the context the Brain already holds.</p>
          </div>
          <div className="langcard">
            <div className="lc-h">العربية</div>
            <div className="lc-q ar">لخّص لي اجتماع اليوم وذكّرني بالخطوة الجاية.</div>
            <p>Understands intent and remembers the follow-up for next time.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoadmapSection() {
  return (
    <section className="stage-light sec" id="building">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker"><span className="idx">05</span> Live today. Growing in public.</span>
          <h2 className="h-sec">We only expose what is real.</h2>
        </div>
        <div className="ladder reveal">
          {[
            ["Live now", "Agent · Chat & Spaces · Brain", "An agent that acts, focused workspaces, and a memory you control: bilingual, on web and Telegram.", "live"],
            ["Next", "Learn and Career", "Available only when entitlement, memory, UI, and tests agree.", "gated"],
            ["After that", "Design", "Held until the project flow and delivery path are ready.", ""],
            ["Always", "CLI, desktop, and extensions", "ZAKI follows you across the web and your machine through one control plane.", ""],
          ].map(([when, what, body, status]) => (
            <div className="rung" key={what}>
              <div className="when">{when}</div>
              <div className="what"><h4>{what}</h4><p>{body}</p></div>
              <span className={`st ${status}`}>{status || "next"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function V3UseCasesPage() {
  return (
    <V3Shell route="use-cases">
      <SubHero
        label="Use cases"
        title="Less overhead. More of the work that matters."
        body="Founders, adventurers, and operators use ZAKI for the same shift: less re-explaining, fewer loose threads, and more momentum across Arabic and English."
        cta="Start your next chapter"
        ctaHref={signupUrl}
        secondary="How it works"
        secondaryHref="/product"
      />
      <section className="stage-dark sec" data-screen-label="Three jobs">
        <div className="wrap">
          <div className="sec-head reveal"><span className="kicker"><span className="idx">01</span> What people actually do with it</span><h2 className="h-sec">Three everyday jobs ZAKI is built for.</h2></div>
          <div className="audiences reveal">
            {([
              [Building2, "Founder", "Build the company, not the admin", "Turn rough ideas into plans, dreaded emails into sent ones, and scattered relationships into a clear next move."],
              [GraduationCap, "Adventurer", "Start the chapter, keep the thread", "Moving countries, writing a book, changing careers, or building a community without losing names, dates, or promises."],
              [Clock3, "Operator", "Hold the long thread", "Too many clients, projects, and channels. ZAKI keeps the continuity so focus does not die in context switching."],
            ] satisfies AudienceCard[]).map(([Icon, title, role, body]) => (
              <div className="aud" key={title}><IconBox icon={Icon} /><h3>{title}</h3><div className="role">{role}</div><p>{body}</p></div>
            ))}
          </div>
        </div>
      </section>
      <UseCaseScenarioRows />
      <section className="stage-light sec">
        <div className="wrap">
          <div className="sec-head center reveal"><span className="kicker"><span className="idx">03</span> Wherever you work, in whatever language</span><h2 className="h-sec">Native in Arabic and English, even mixed.</h2><p className="lede">Switch languages mid-sentence. ZAKI keeps the meaning, the tone, and the memory intact.</p></div>
          <div className="langstrip reveal">
            <div className="langcard"><div className="lc-h">Mixed input</div><div className="lc-q">اكتبلي email رسمي to the investor about الموعد الجديد.</div><p>Handles code-switching the way people actually talk: no mode toggling.</p></div>
            <div className="langcard"><div className="lc-h">Outcome</div><div className="lc-q">A clean, on-tone draft, ready to send.</div><p>With the date, the names, and your usual sign-off already in place from memory.</p></div>
          </div>
        </div>
      </section>
      <FinalCta variant="subpage" />
    </V3Shell>
  );
}

function UseCaseScenarioRows() {
  const rows = [
    ["Founder", "Build the company, not the admin", "Co-founder energy without the equity.", "A hundred decisions a day and no system yet. ZAKI holds the context, drafts the comms, and keeps the threads from dropping while you build.", "Sunday night, drowning in follow-ups.", "Sunday night, planning the next move.", ["investor update drafted", "3 visa deadlines flagged", "follow up with Lina re: contract"]],
    ["Adventurer", "Start the next chapter", "The friend who has done the homework.", "A move, a book, a new career, a community: ZAKI learns the world around the leap and keeps the train on the tracks.", "Everything important scattered across notes.", "The next step already waiting.", ["visa checklist organized", "book research grouped", "next promise remembered"]],
    ["Operator", "An external brain", "The long thread, finally held for me.", "Too many threads, too much context-switching. ZAKI keeps continuity across clients, projects, and channels so nothing falls between the cracks.", "Wait, what did we decide on this?", "ZAKI has the whole history, one ask away.", ["where did the Riyadh deck leave off?", "slide 11 · rollout timeline", "budget slide flagged to revisit"]],
  ] as const;
  return (
    <section className="stage-light sec" data-screen-label="Scenarios">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker"><span className="idx">02</span> In their words</span>
          <h2 className="h-sec">The same shift, whatever you are building.</h2>
        </div>
        {rows.map(([label, role, title, body, before, after, mockRows], index) => (
          <div className={`frow ${index % 2 ? "flip" : ""} reveal`} key={label}>
            <div className="frow-copy">
              <span className="kicker"><span className="idx">{label}</span> {role}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <div className="shift">
                <div className="shift-row before"><span className="lbl">Before</span><span className="quote">{before}</span></div>
                <ArrowRight className="shift-arrow" />
                <div className="shift-row after"><span className="lbl">With ZAKI</span><span className="quote">{after}</span></div>
              </div>
            </div>
            <div className="frow-media">
              <div className="mock">
                {mockRows.map((row, rowIndex) => <div className={`mrow ${rowIndex < 2 ? "ok" : ""}`} key={row}><span className="d" /><span>{row}</span><span className="mr">{rowIndex < 2 ? "done" : "today"}</span></div>)}
                <div className="mnode">Picking up from the last thread, with the next step already in view.</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function V3StoryPage() {
  return (
    <V3Shell route="story">
      <SubHero
        label="Story"
        title="Most AI answers well. Very little of it becomes a real counterpart."
        body="ZAKI exists because the last mile between people and AI is continuity. It was built from a promise to never let go, keep getting better, and treat your world like it matters."
        cta="Start your next chapter"
        ctaHref={signupUrl}
        secondary="Follow the build"
        secondaryHref="/use-cases"
      />
      <section className="story stage-light sec">
        <div className="wrap">
          <div className="story-grid">
            <aside className="story-aside reveal">
              <img className="bot story-bot" src={bot.heart} alt="ZAKI" width="160" height="205" />
              <span className="kicker"><span className="idx">01</span> It started as a promise</span>
              <h2 className="h-sec" style={{ marginTop: 18 }}>Never let go. Keep getting better. Be there when it is hard.</h2>
            </aside>
            <div className="story-body reveal">
              <p>ZAKI started with a promise: never let go, keep getting better, and be there when things get hard.</p>
              <p className="pull">Continuity changes the relationship.</p>
              <p>So we built around memory first. The Brain is visible. The Agent shows its work. Spaces keep tasks clean. The product grows only when the operational truth is ready.</p>
              <p id="building">ZAKI is here for founders, adventurers, dreamers, and operators starting something bold, with clear gates for Learn, Design, and Career.</p>
            </div>
          </div>
        </div>
      </section>
      <StoryLogicSection />
      <StoryBuildSection />
      <RoadmapSection />
      <FinalCta variant="subpage" />
    </V3Shell>
  );
}

function StoryLogicSection() {
  const cards = [
    ["Origin", "ZAKI was built from a promise", "Not a corporate feature list: a promise to stick around, learn your world, and treat the thing you are building like it matters."],
    ["Gap", "The real gap is continuity", "Most AI still behaves like a reset button. ZAKI is built to close that last mile."],
    ["Launch", "Start with structured productivity", "Spaces give a disciplined workspace for bilingual daily work before the next product layer."],
    ["Memory", "Persistence changes the relationship", "When context carries forward, AI becomes more useful, more accountable, and more worth trusting."],
    ["Focus", "Warmth still needs control", "Spaces keep work organized. Memory keeps continuity useful. Visible work phases make trust practical."],
    ["Vision", "The next product step", "Persistent personal intelligence that behaves more like a counterpart than a one-shot tool."],
  ];
  return (
    <section className="stage-dark sec" data-screen-label="The logic">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker"><span className="idx">02</span> The product logic behind the brand</span>
          <h2 className="h-sec">Why we are building it this way.</h2>
        </div>
        <NewsGrid cards={cards} />
      </div>
    </section>
  );
}

function StoryBuildSection() {
  const cards = [
    ["Launch", "The Agent is live", "A personal agent that plans and acts, with one persistent thread per user and visible work phases during execution.", "Done"],
    ["Milestone", "Multi-user hardening and quotas", "Stronger per-user isolation, safer streaming, and a shared weekly allowance that keeps the platform disciplined.", "Done"],
    ["Signal", "Context management matters", "The industry is converging on context management for long-running agents: exactly the memory-first architecture ZAKI was built on.", "Done"],
    ["Next", "Learn and Career stay gated", "Private lanes only open when entitlement, product state, memory, UI, and tests agree end to end.", "Next"],
    ["Next", "Deeper controls", "Better channel controls, stronger reliability loops, and clearer agent guardrails across the platform.", "Next"],
    ["Ongoing", "Public updates", "We keep shipping and sharing as ZAKI moves from disciplined chat toward persistent intelligence.", "Next"],
  ];
  return (
    <section className="stage-light sec" id="building" data-screen-label="Building in public">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="kicker"><span className="idx">03</span> Building in public</span>
          <h2 className="h-sec">What shaped this release.</h2>
          <p className="lede">We publish progress and the ecosystem signals behind our decisions, so you can see where ZAKI is going and why.</p>
        </div>
        <NewsGrid cards={cards} withStatus />
      </div>
    </section>
  );
}

function NewsGrid({ cards, withStatus = false }: { cards: string[][]; withStatus?: boolean }) {
  return (
    <div className="news reveal" data-d="1">
      {cards.map(([tag, title, body, status]) => (
        <div className="ncard" key={`${tag}-${title}`}>
          <span className="ntag">{tag}{withStatus && status ? <span className={`st ${status === "Done" ? "done" : "next"}`}>{status}</span> : null}</span>
          <h4>{title}</h4>
          <p>{body}</p>
          {withStatus ? <div className="nd">{status === "Done" ? "Current release" : "Next phase"}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function V3PricingPage() {
  return (
    <V3Shell route="pricing">
      <SubHero
        label="Pricing"
        title="Pricing that grows with you: never against you."
        body="Every plan includes the live product palette: Agent, Chat, Spaces, and your Brain. You pay for room to work, not false access to unfinished surfaces or a promise we have not earned yet."
        cta="Start your next chapter"
        ctaHref={signupUrl}
        secondary="Explore the product"
        secondaryHref="/product"
      />
      <section className="stage-light sec">
        <div className="wrap">
          <PricingTiers />
          <div className="gift reveal">
            <div className="g-l"><h4>Learn, Design, and Career are not sold as finished products yet.</h4><p>They stay gated until entitlement, memory, UI, product state, and tests agree.</p></div>
            <div className="g-r"><span className="g-price">Truth first</span></div>
          </div>
        </div>
      </section>
      <PricingAllowanceSection />
      <section className="stage-light sec">
        <div className="wrap">
          <div className="sec-head center reveal"><span className="kicker"><span className="idx">FAQ</span> Pricing questions</span><h2 className="h-sec">Pricing questions, answered.</h2></div>
          <div className="faq-grid reveal">
            {[
              ["Is Free a trial?", "No. Free is a real starting plan with no card: enough to feel what changes when ZAKI remembers."],
              ["What do paid plans add?", "More room, deeper memory capacity, priority where available, and earlier access when gated products are ready."],
              ["What about Learn, Design, and Career?", "They are gated until production readiness is proven end to end. We do not sell unfinished surfaces as finished products."],
            ].map(([q, a], index) => (
              <details className="faq-item" key={q} open={index === 0}>
                <summary className="faq-q">{q}<span className="pm" /></summary>
                <div className="faq-a" style={{ height: "auto" }}><div className="faq-a-inner"><p>{a}</p></div></div>
              </details>
            ))}
          </div>
        </div>
      </section>
      <FinalCta variant="subpage" />
    </V3Shell>
  );
}

function PricingAllowanceSection() {
  const items = [
    [Clock3, "Weekly allowance", "A pool of usage shared across Agent, Chat, Spaces, and Brain. It refills every week: no daily nickel-and-diming."],
    [Zap, "Burst window", "A short, generous session window for the moments you are deep in the work and need ZAKI to keep up."],
    [Sparkles, "See it in your dashboard", "Your plan, allowance remaining, and usage by product are all visible in one place: no guessing."],
  ] as const;
  return (
    <section className="stage-light sec" data-screen-label="Allowance">
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="kicker"><span className="idx">01</span> How usage works</span>
          <h2 className="h-sec">One shared weekly allowance. No surprise meters.</h2>
          <p className="lede">Instead of juggling a quota per product, you get one shared allowance for the work ZAKI helps you carry, with a short burst window for deep sessions.</p>
        </div>
        <div className="allowance reveal" data-d="1">
          {items.map(([Icon, title, body]) => (
            <div className="allow-card" key={title}>
              <Icon className="ac-ic" />
              <h4>{title}</h4>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
