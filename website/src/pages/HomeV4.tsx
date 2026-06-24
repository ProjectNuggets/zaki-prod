import { useZakiHomePage } from "../hooks/useZakiPage";
// Marketing CSS bundled into <head> by Vite (home route only) so the page is
// styled BEFORE first paint — not injected by JS after render (which caused a
// flash of fully-unstyled content). Order = cascade: foundation -> home ->
// chapters -> mind (mind last so it can override).
import "../../public/zaki/styles/zaki-foundation.css";
import "../../public/zaki/styles/zaki-home.css";
import "../../public/zaki/styles/zaki-chapters.css";
import "../../public/zaki/styles/zaki-mind.css";
import "../../public/zaki/styles/zaki-scenes.css";
import { appHandoffUrl } from "../lib/appHandoff";

export function HomeV4() {
  useZakiHomePage();

  const signupUrl = appHandoffUrl("/", "website_home_hero", "dashboard");
  const signinUrl = appHandoffUrl("/", "website_signin", "dashboard");
  const agentUrl = appHandoffUrl("/agent", "website_home_agent", "agent");
  const spacesUrl = appHandoffUrl("/spaces", "website_home_spaces", "chat");

  return (
    <>
      {/* Ambient scramble field — "Enter ZAKI's mind". Fixed full-viewport, behind all content
          (z-index:-1); canvas attaches post-hydration via zaki-mind.js. */}
      <div id="mind-field" aria-hidden="true"></div>
      <div className="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
      <div className="grain" aria-hidden="true"></div>

      {/* Living Thread */}
      <svg className="thread-svg" id="thread-svg" aria-hidden="true" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="thread-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FA2E2E" /><stop offset="1" stopColor="#f10202" />
          </linearGradient>
          <linearGradient id="thread-tail-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f10202" stopOpacity={0} />
            <stop offset="0.55" stopColor="#FF4A3D" stopOpacity={0.55} />
            <stop offset="1" stopColor="#FFEAE7" stopOpacity={1} />
          </linearGradient>
        </defs>
        <path className="thread-bg" id="thread-bg" d="" />
        <path className="thread-halo" id="thread-halo" d="" />
        <path className="thread-fg" id="thread-fg" d="" />
        <g className="thread-forks" id="thread-forks"></g>
        <path className="thread-tail" id="thread-tail" d="" />
        <g id="thread-ticks"></g>
        <g id="thread-nodes"></g>
        <g id="thread-ripples"></g>
        <circle className="thread-comet" id="thread-comet" r="4.5" />
      </svg>

      {/* Chapter rail */}
      <nav className="chap-rail" id="chap-rail" aria-label="Chapters"></nav>

      {/* NAV */}
      <header className="nav" id="nav">
        <a className="brand" href="/" aria-label="ZAKI home">
          <img className="mark" src="/zaki/assets/zaki-mark.png" alt="" />
          <span className="word">ZAKI</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <div className="nav-item has-mega" id="nav-products">
            <button className="nav-trigger" aria-expanded="false" aria-haspopup="true">Products
              <svg className="chev" viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="mega" role="menu">
              <div className="mega-grid">
                <a className="mega-card" href="/agent" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2l1.8 4.4L16 8.2l-3.4 2.9.9 4.6L10 13.4 6.5 15.7l.9-4.6L4 8.2l4.2-1.8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Agent <span className="status live">Live</span></span>
                  <span className="mega-role">ZAKI in action</span>
                  <span className="mega-d">Delegate the whole task — it plans, acts, and follows through.</span>
                </a>
                <a className="mega-card" href="/spaces" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.3" /><path d="M3 8h14M8 8v9" stroke="currentColor" strokeWidth="1.3" /></svg></span>
                  <span className="mega-tt">Spaces <span className="status live">Live</span></span>
                  <span className="mega-role">ZAKI in context</span>
                  <span className="mega-d">Keep every conversation in its world — shared docs, many threads.</span>
                </a>
                <a className="mega-card" href="#design" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 16l8-8 1.5 1.5M14 4l2 2-9.5 9.5L4 16l.5-2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Design <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in creation</span>
                  <span className="mega-d">Turn a rough brief into directions you can see and shape.</span>
                </a>
                <a className="mega-card" href="#learn" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 4 3 7l7 3 7-3-7-3zM5 9v4c0 1 2.2 2 5 2s5-1 5-2V9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Learn <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in growth</span>
                  <span className="mega-d">Understand, practice, and progress in a way that adapts to you.</span>
                </a>
                <a className="mega-card" href="#career" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M7 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.3" /></svg></span>
                  <span className="mega-tt">Career <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in motion</span>
                  <span className="mega-d">Find stronger matches and keep the follow-up moving — you approve.</span>
                </a>
                <a className="mega-card mega-mem" href="#memory" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" /><circle cx="10" cy="10" r="2.4" fill="currentColor" /></svg></span>
                  <span className="mega-tt">Memory</span>
                  <span className="mega-role">The continuity layer</span>
                  <span className="mega-d">One memory under every product — inspect, correct, or forget it.</span>
                </a>
              </div>
              <div className="mega-foot">
                <span>One intelligence. Many ways forward. Your rules.</span>
                <a href={signupUrl}>Meet ZAKI <svg viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div>
            </div>
          </div>
          <a href="#trust">Security</a>
          <a href="/pricing">Pricing</a>
          <a href="/story">Story</a>
        </nav>
        <div className="nav-actions">
          <a className="signin" href={signinUrl}>Sign in</a>
          <a className="btn btn-primary btn-sm" href={signupUrl}>Meet ZAKI</a>
          <button className="nav-burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span></button>
        </div>
      </header>

      {/* Mobile menu */}
      <div className="mobile-menu" id="mobile-menu" aria-hidden="true">
        <span className="mm-k">Products</span>
        <a className="mm-link" href="/agent">Agent <span className="mm-role">In action · Live</span></a>
        <a className="mm-link" href="/spaces">Spaces <span className="mm-role">In context · Live</span></a>
        <a className="mm-link" href="#design">Design <span className="mm-role">In creation · Soon</span></a>
        <a className="mm-link" href="#learn">Learn <span className="mm-role">In growth · Soon</span></a>
        <a className="mm-link" href="#career">Career <span className="mm-role">In motion · Soon</span></a>
        <a className="mm-link" href="#memory">Memory <span className="mm-role">Continuity layer</span></a>
        <div className="mm-sub"><a href="#trust">Security</a><a href="/pricing">Pricing</a><a href="/story">Story</a><a href={signinUrl}>Sign in</a></div>
        <a className="btn btn-primary btn-lg btn-block mm-cta" href={signupUrl}>Meet ZAKI</a>
      </div>

      <main id="top">

        {/* SCENE 1 — HERO (full-screen editorial, pinned) */}
        <header className="scene stage-dark" data-stage="dark" data-screen-label="01 Hero" id="hero">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner">
            <span className="scene-eyebrow">ZAKI · The intelligence layer for your life</span>
            <h1 className="scene-h1">Enter <em className="hl">ZAKI&rsquo;s mind.</em></h1>
            <p className="scene-lede">Not a chatbot you open. A mind you step inside — one intelligence that plans the work, remembers you, and stays. Day to day.</p>
            <div className="scene-cta">
              <a className="btn btn-primary btn-lg" href={signupUrl}>Enter ZAKI&rsquo;s mind
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a className="btn btn-ghost btn-lg" href="#reframe">See how it works</a>
            </div>
          </div>
          <span className="scene-cue" aria-hidden="true">Scroll<i></i></span>
        </header>

        {/* CH.2 — REFRAME */}
        {/* SCENE 2 — ONE INTELLIGENCE (full-screen statement, free-scroll reveal) */}
        <section className="scene reframe stage-dark" data-stage="dark" data-reveal data-screen-label="02 One intelligence" id="reframe">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner">
            <span className="scene-eyebrow">One intelligence</span>
            <h2 className="scene-h1">Not five AI tools.<br />One <em className="hl">intelligence.</em></h2>
            <p className="scene-lede">Most AI lives in a dozen tabs that don&rsquo;t know each other. ZAKI is one mind that becomes whatever the moment needs — an agent, a space, a tutor — all sharing one memory of you.</p>
          </div>
        </section>

        {/* SCENE 3 — INTENTION (full-screen, free-scroll reveal) */}
        <section className="scene stage-dark" data-stage="dark" data-reveal data-screen-label="03 Begin" id="intention">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner">
            <span className="scene-eyebrow">Begin · 03</span>
            <h2 className="scene-h1">What are you trying to <em className="hl">move forward?</em></h2>
            <p className="scene-lede">Name one thing. From here, the page is about that — and so is ZAKI. It stays on this device, and you can forget it anytime.</p>

            <div className="intent-pick reveal" data-d="1" id="intent-pick">
              <button className="intent-chip" data-key="project" data-eg="launch my design portfolio">Move a project forward</button>
              <button className="intent-chip" data-key="idea" data-eg="bring an idea to life">Bring an idea to life</button>
              <button className="intent-chip" data-key="study" data-eg="understand organic chemistry">Understand something difficult</button>
              <button className="intent-chip" data-key="career" data-eg="find the right role">Find the right opportunity</button>
              <button className="intent-chip" data-key="organize" data-eg="organize everything around me">Organize everything around me</button>
            </div>
            <form className="intent-form reveal" data-d="2" id="intent-form" autoComplete="off">
              <input className="intent-input" id="intent-input" type="text" maxLength={80} placeholder={`…or type it: "Launch my design portfolio"`} aria-label="Your intention" />
              <button className="btn btn-primary" type="submit">Remember
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </form>

            <div className="intent-remembered" id="intent-remembered" hidden>
              <div className="ir-inner">
                <span className="ir-label"><span className="ir-pip"></span>Remembered for this visit</span>
                <span className="ir-value" id="intent-value">Launch my design portfolio</span>
                <div className="ir-actions">
                  <button className="ir-btn" id="intent-edit">Edit</button>
                  <button className="ir-btn danger" id="intent-forget">Forget</button>
                </div>
              </div>
              <p className="ir-note">ZAKI will use this in the examples below — and nowhere else.</p>
            </div>
          </div>
        </section>

        {/* SCENE 4 — AGENT (full-screen, free-scroll reveal) */}
        <section className="scene stage-light" data-stage="light" data-reveal data-screen-label="04 Agent" id="agent">
          <div className="scene-inner">
            <span className="scene-eyebrow">In action · 04</span>
            <h2 className="scene-h1">Give it the outcome.<br />It <em className="hl">does the work.</em></h2>
            <p className="scene-lede">Not an answer you copy out — a result you can use. ZAKI plans, researches, uses real tools, creates the files, and follows through. Every step visible. Nothing ships without your approval.</p>
            <div className="scene-cta">
              <a className="btn btn-primary btn-lg" href={agentUrl}>Watch ZAKI run
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
          </div>
        </section>

        {/* SCENE 5 — MEMORY (full-screen, free-scroll reveal) */}
        <section className="scene stage-light" data-stage="light" data-reveal data-screen-label="05 Memory" id="memory">
          <div className="scene-inner">
            <span className="scene-eyebrow">Continuity · 05</span>
            <h2 className="scene-h1">It remembers <em className="hl">the person,</em><br />not the prompt.</h2>
            <p className="scene-lede">One living memory under everything — your goals, preferences, the corrections you&rsquo;ve made — that you can inspect, correct, export, or forget. It&rsquo;s yours, and it carries from one product to the next.</p>
            <div className="scene-cta">
              <a className="btn btn-ghost btn-lg" href="#trust">See how memory stays yours</a>
            </div>
          </div>
        </section>

        {/* SCENE 6 — SPACES (full-screen, free-scroll reveal) */}
        <section className="scene stage-light" data-stage="light" data-reveal data-screen-label="06 Spaces" id="spaces">
          <div className="scene-inner">
            <span className="scene-eyebrow">Many worlds · 06</span>
            <h2 className="scene-h1">One mind.<br /><em className="hl">Many worlds.</em></h2>
            <p className="scene-lede">A space for every project, class, or client — its own docs, its own threads, nothing leaking between them. And the same intelligence shows up in the shape each moment needs.</p>
            <ul className="scene-facets">
              <li><b>Spaces</b><span>In context</span><i className="fct-live">Live</i></li>
              <li><b>Design</b><span>In creation</span><i className="fct-soon">Soon</i></li>
              <li><b>Learn</b><span>In growth</span><i className="fct-soon">Soon</i></li>
              <li><b>Career</b><span>In motion</span><i className="fct-soon">Soon</i></li>
            </ul>
            <div className="scene-cta">
              <a className="btn btn-primary btn-lg" href="/spaces">Open Spaces
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
          </div>
        </section>

        {/* SCENE 7 — TRUST (full-screen, free-scroll reveal) */}
        <section className="scene stage-dark" data-stage="dark" data-reveal data-screen-label="07 Trust" id="trust">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner">
            <span className="scene-eyebrow">Your life stays yours · 07</span>
            <h2 className="scene-h1">It knows you<br />because <em className="hl">you let it.</em></h2>
            <p className="scene-lede">Personal intelligence asks for personal trust. You own the memory — inspect it, scope it, delete it. ZAKI reaches the boundary of any real action and waits for your yes. Privacy isn&rsquo;t a setting here; it&rsquo;s the architecture.</p>
            <div className="scene-cta">
              <a className="btn btn-ghost btn-lg" href="/story">Read the security model</a>
            </div>
          </div>
        </section>

        {/* SCENE 8 — CTA (full-screen, free-scroll reveal) */}
        <section className="scene stage-dark" data-stage="dark" data-reveal data-screen-label="08 A new chapter" id="cta">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner">
            <span className="scene-eyebrow">A new chapter · 08</span>
            <h2 className="scene-h1">Never build alone.<br />Never start the next chapter <em className="hl">alone.</em></h2>
            <p className="scene-lede">Whatever comes next — the launch, the move, the idea you&rsquo;ve been putting off — you don&rsquo;t begin it from zero, and you don&rsquo;t begin it by yourself. Bring the first thing you want to move forward.</p>
            <div className="scene-cta">
              <a className="btn btn-primary btn-lg" id="cta-primary" href={signupUrl}><span className="cta-label">Enter ZAKI&rsquo;s mind</span>
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a className="btn btn-ghost btn-lg" href="/story">Read the story</a>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="footer stage-dark" data-stage="dark">
        <span className="footer-glow" aria-hidden="true"></span>
        <div className="wrap footer-top">
          <div className="footer-lead">
            <a className="brand" href="/"><img className="mark" src="/zaki/assets/zaki-mark.png" alt="" /><span className="word">ZAKI</span></a>
            <p className="footer-statement">Never build <em className="hl">alone.</em></p>
            <p className="footer-micro">The intelligence layer for your life. One memory, many ways forward — your rules.</p>
            <div className="footer-cta">
              <a className="btn btn-primary btn-sm" href={signupUrl}>Meet ZAKI
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a className="footer-signin" href={signinUrl}>Sign in</a>
            </div>
          </div>
          <nav className="footer-cols" aria-label="Footer">
            <div className="fcol">
              <span className="fcol-k">Products</span>
              <a href="/agent">Agent</a><a href="/spaces">Spaces</a><a href="#design">Design</a><a href="#learn">Learn</a><a href="#career">Career</a>
            </div>
            <div className="fcol">
              <span className="fcol-k">Company</span>
              <a href="/story">Story</a><a href="#trust">Security</a><a href="/pricing">Pricing</a><a href={signupUrl}>Contact</a>
            </div>
            <div className="fcol">
              <span className="fcol-k">Begin</span>
              <a href={signupUrl}>Meet ZAKI</a><a href={signinUrl}>Sign in</a><a href="#intention">Set your intention</a>
            </div>
          </nav>
        </div>
        <div className="footer-wordmark" aria-hidden="true">ZAKI</div>
        <div className="wrap footer-base">
          <span>© 2026 ZAKI · Kreyatif Studio</span>
          <span className="footer-tagline">One intelligence. Many ways forward.</span>
          <span className="footer-locale">EN · <span style={{ opacity: 0.55 }}>العربية · soon</span></span>
        </div>
      </footer>
    </>
  );
}
