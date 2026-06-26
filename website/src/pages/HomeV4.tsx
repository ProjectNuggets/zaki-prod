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
      <a className="skip-link" href="#top">Skip to content</a>
      {/* Rising embers — faint warm sparks drifting up behind the whole climb, unifying
          every section in one ambient layer (sparser/cooler at the valley, warmer near the
          dawn, gone at the summit). Sits behind all content; painted by zaki-mind.js. */}
      <div id="ember-field" aria-hidden="true"></div>

      {/* Crafted intro veil — the dark valley floor before the climb. Prerendered &
          visible by default (so the hero never flashes underneath); JS lifts it like a
          curtain after a beat (or on click), a CSS auto-lift is the no-JS fallback, and
          reduced-motion skips it entirely. "ZAKI" decodes via the scramble engine. */}
      <div id="intro-veil" aria-hidden="true">
        <div className="iv-inner">
          <img className="iv-mark" src="/zaki/assets/zaki-mark.png" alt="" />
          <span className="iv-word">ZAKI</span>
          <span className="iv-tag">Enter the mind</span>
        </div>
        <span className="iv-skip">click to enter</span>
      </div>

      {/* Carried-goal token: the goal named in Scene 2 rises with --altitude up the page */}
      <div id="goal-token" aria-hidden="true"><span className="gt-dot"></span><span className="gt-text"></span></div>
      {/* Zee — the companion. ONE pixel mascot that climbs the right gutter WITH you,
          swapping pose per scene (data-zee on each .scene) and turning to face you at the
          summit. Carries the goal token up the mountain. Swap poses by editing data-zee. */}
      <img id="zee-climber" src="/zaki/bot/sunglasses.png" alt="" aria-hidden="true" />
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
            <button className="nav-trigger" aria-expanded="false">Products
              <svg className="chev" viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="mega">
              <div className="mega-grid">
                <a className="mega-card" href="/agent">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2l1.8 4.4L16 8.2l-3.4 2.9.9 4.6L10 13.4 6.5 15.7l.9-4.6L4 8.2l4.2-1.8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Agent <span className="status live">Live</span></span>
                  <span className="mega-role">ZAKI in action</span>
                  <span className="mega-d">Delegate the whole task — it plans, acts, and follows through.</span>
                </a>
                <a className="mega-card" href="/spaces">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.3" /><path d="M3 8h14M8 8v9" stroke="currentColor" strokeWidth="1.3" /></svg></span>
                  <span className="mega-tt">Spaces <span className="status live">Live</span></span>
                  <span className="mega-role">ZAKI in context</span>
                  <span className="mega-d">Keep every conversation in its world — shared docs, many threads.</span>
                </a>
                <a className="mega-card" href={signupUrl}>
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 16l8-8 1.5 1.5M14 4l2 2-9.5 9.5L4 16l.5-2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Design <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in creation</span>
                  <span className="mega-d">Turn a rough brief into directions you can see and shape.</span>
                </a>
                <a className="mega-card" href={signupUrl}>
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 4 3 7l7 3 7-3-7-3zM5 9v4c0 1 2.2 2 5 2s5-1 5-2V9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Learn <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in growth</span>
                  <span className="mega-d">Understand, practice, and progress in a way that adapts to you.</span>
                </a>
                <a className="mega-card" href={signupUrl}>
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M7 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.3" /></svg></span>
                  <span className="mega-tt">Career <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in motion</span>
                  <span className="mega-d">Find stronger matches and keep the follow-up moving — you approve.</span>
                </a>
                <a className="mega-card mega-mem" href="#memory">
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
        <a className="mm-link" href={signupUrl}>Design <span className="mm-role">In creation · Soon</span></a>
        <a className="mm-link" href={signupUrl}>Learn <span className="mm-role">In growth · Soon</span></a>
        <a className="mm-link" href={signupUrl}>Career <span className="mm-role">In motion · Soon</span></a>
        <a className="mm-link" href="#memory">Memory <span className="mm-role">Continuity layer</span></a>
        <div className="mm-sub"><a href="#trust">Security</a><a href="/pricing">Pricing</a><a href="/story">Story</a><a href={signinUrl}>Sign in</a></div>
        <a className="btn btn-primary btn-lg btn-block mm-cta" href={signupUrl}>Meet ZAKI</a>
      </div>

      <main id="top" tabIndex={-1}>

        {/* SCENE 1 — HERO (full-screen editorial, pinned) */}
        <header className="scene" data-stage="dark" data-screen-label="01 Hero" data-zee="/zaki/bot/sunglasses.png" id="hero">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner">
            <span className="scene-eyebrow">Your AI · 01</span>
            <h1 className="scene-h1">Enter <em className="hl">ZAKI&rsquo;s mind.</em></h1>
            <p className="scene-lede">A day-to-day AI that talks it through, takes on the whole task, and remembers what matters. Not a tool you manage — a mind that&rsquo;s with you, lifting what you carry.</p>
            <div className="scene-cta">
              <a className="btn btn-primary btn-lg" href={signupUrl}>Enter ZAKI&rsquo;s mind
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
          </div>
          <span className="scene-cue" aria-hidden="true">Scroll<i></i></span>
        </header>

        {/* CH.2 — REFRAME */}
        {/* SCENE 2 — YOUR CHAPTER (name your goal; it becomes the carried token) */}
        <section className="scene" data-stage="dark" data-reveal data-screen-label="02 Begin" data-zee="/zaki/bot/intent.png" id="intention">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner">
            <span className="scene-eyebrow">Begin · 02</span>
            <h2 className="scene-h1">What are you trying to <em className="hl">move forward?</em></h2>
            <p className="scene-lede">Name one thing. From here, the page is about that — and so is ZAKI.</p>

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

            <div className="intent-remembered" id="intent-remembered" role="status" aria-live="polite" hidden>
              <div className="ir-inner">
                <span className="ir-label"><span className="ir-pip"></span>Remembered on this device</span>
                <span className="ir-value" id="intent-value">Launch my design portfolio</span>
                <div className="ir-actions">
                  <button className="ir-btn" id="intent-edit">Edit</button>
                  <button className="ir-btn danger" id="intent-forget">Forget</button>
                </div>
              </div>
              <p className="ir-note">It travels with you — used in the moments below, and nowhere else.</p>
            </div>
          </div>
        </section>

        {/* SCENE 3 — IT ACTS (Agent; the run executes as you scroll, on YOUR goal) */}
        <section className="scene agent" data-stage="dark" data-reveal data-screen-label="03 Agent" data-zee="/zaki/bot/work.png" id="agent">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner agent-inner">
            <div className="agent-copy">
              <span className="scene-eyebrow">In action · 03</span>
              <h2 className="scene-h1">Give it the outcome.<br />It <em className="hl">does the work.</em></h2>
              <p className="scene-lede">Not an answer you copy out — a result you can use. It plans, uses real tools, creates the files, and follows through, every step visible. Reads run on their own; writes always wait for your yes. And every run ends with a receipt — what it touched, how long it took, what it cost.</p>
              <div className="scene-cta">
                <a className="btn btn-primary btn-lg" href={agentUrl}>Watch ZAKI run
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>
            </div>
            {/* run console — scrubbed by the scene pin (id renamed off #run so the
                zaki-chapters.js auto-play stays dormant; the scroll scrub drives it) */}
            <div className="run" id="agent-run" aria-label="Example agent run">
              <div className="run-bar">
                <span className="run-mark"><img src="/zaki/assets/zaki-mark.png" alt="" /></span>
                <span className="run-title">ZAKI Agent</span>
                <span className="run-sub">Personal agent</span>
                <span className="run-mem"><i></i>Memory on</span>
              </div>
              <div className="run-task">
                <span className="run-task-k">Task</span>
                <p className="run-task-v">&ldquo;Research five launch partners, rank them, draft the outreach, and put the final list in a sheet — for <em className="run-echo" data-intent-echo="my product launch" data-eg-fallback="my product launch">my product launch</em>.&rdquo;</p>
              </div>
              <ol className="run-phases" id="run-phases">
                <li data-phase><span className="ph-ix">1</span><span className="ph-t">Understanding the outcome</span><span className="ph-s"></span></li>
                <li data-phase><span className="ph-ix">2</span><span className="ph-t">Building the criteria</span><span className="ph-s"></span></li>
                <li data-phase><span className="ph-ix">3</span><span className="ph-t">Researching candidates</span><span className="ph-s"></span></li>
                <li data-phase><span className="ph-ix">4</span><span className="ph-t">Validating the shortlist</span><span className="ph-s"></span></li>
                <li data-phase><span className="ph-ix">5</span><span className="ph-t">Creating the deliverables</span><span className="ph-s"></span></li>
                <li data-phase><span className="ph-ix">6</span><span className="ph-t">Ready for review</span><span className="ph-s"></span></li>
              </ol>
            </div>
          </div>
        </section>

        {/* SCENE 4 — IT REMEMBERS YOU (living memory graph; your goal is the red node) */}
        <section className="scene memory" data-stage="dark" data-reveal data-screen-label="04 Memory" data-zee="/zaki/bot/remember.png" id="memory">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner mem-inner">
            <div className="mem-copy">
              <span className="scene-eyebrow">Continuity · 04</span>
              <h2 className="scene-h1">It remembers <em className="hl">the person,</em><br />not the prompt.</h2>
              <p className="scene-lede">Most AI treats memory as a lookup table. ZAKI treats it as a relationship — it notices, and it keeps itself honest: say you loved TypeScript, then switch to Go, and it asks instead of quietly contradicting itself. One living memory you can inspect, correct, export, or forget — yours, carried from one product to the next.</p>
              <div className="scene-cta">
                <a className="btn btn-ghost btn-lg" href="#trust">See how memory stays yours
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>
            </div>
            <div className="mem-graph" data-constellation data-dense aria-hidden="true"></div>
          </div>
          {/* the real memories — kept for screen readers + the goal echo (the graph is the visual) */}
          <ul className="mem-list sr-only" id="mem-list">
            <li className="mem-item" data-type="Preference"><span className="mem-type pref">Preference</span><span className="mem-text">You do deep work best before noon</span></li>
            <li className="mem-item sel" data-type="Project"><span className="mem-type proj">Project</span><span className="mem-text" data-intent-echo="Launch my design portfolio" data-eg-fallback="Launch my design portfolio">Launch my design portfolio</span></li>
            <li className="mem-item" data-type="Correction"><span className="mem-type corr">Correction</span><span className="mem-text">Put evidence beside every recommendation</span></li>
            <li className="mem-item" data-type="Deadline"><span className="mem-type dl">Deadline</span><span className="mem-text">Investor update — every other Monday</span></li>
          </ul>
        </section>

        {/* SCENE 5 — EVERY WORLD (Spaces + the suite as honest Soon facets) */}
        <section className="scene spaces" data-stage="dark" data-reveal data-screen-label="05 Spaces" data-zee="/zaki/bot/world.png" id="spaces">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner spaces-inner">
            <div className="spaces-copy">
              <span className="scene-eyebrow">Many worlds · 05</span>
              <h2 className="scene-h1">One mind.<br />Every part of <em className="hl">your life.</em></h2>
              <p className="scene-lede">A world for every project, class, or client — its own docs, its own threads, nothing leaking between them. And the same intelligence shows up in the shape each moment needs.</p>
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

            <div className="spaces-vis">
              <div className="space-win">
                <aside className="space-rail">
                  <div className="space-head">
                    <span className="space-dot"></span>
                    <span className="space-name">Portfolio Launch</span>
                  </div>
                  <span className="space-rail-k">Threads</span>
                  <ul className="space-threads">
                    <li className="active">Case study order</li>
                    <li>Homepage copy</li>
                    <li>Outreach list</li>
                    <li>Pricing questions</li>
                  </ul>
                  <span className="space-rail-k">Shared documents</span>
                  <ul className="space-docs">
                    <li><svg viewBox="0 0 14 14" fill="none"><path d="M3 1.6h5l3 3v7.8H3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 1.6v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>brand-guidelines.pdf</li>
                    <li><svg viewBox="0 0 14 14" fill="none"><path d="M3 1.6h5l3 3v7.8H3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 1.6v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>case-studies.docx</li>
                  </ul>
                </aside>
                <div className="space-main">
                  <div className="space-boundary"><span><svg viewBox="0 0 14 14" fill="none"><rect x="2" y="6" width="10" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.2" /><path d="M4.3 6V4.4a2.7 2.7 0 0 1 5.4 0V6" stroke="currentColor" strokeWidth="1.2" /></svg>Scoped to this Space — context doesn't leak out</span></div>
                  <div className="space-thread">
                    <div className="st-msg you">Which case study should open the portfolio?</div>
                    <div className="st-msg zaki">Based on <em>case-studies.docx</em> and your goal to land design roles, lead with the fintech rebrand — it shows range and measurable impact.</div>
                    <div className="st-global"><span className="sg-pip"></span>Global continuity used · your goal to land design roles</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 6 — BECAUSE YOU LET IT (Trust; the permission boundary set-piece) */}
        <section className="scene trust" data-stage="dark" data-reveal data-screen-label="06 Trust" data-zee="/zaki/bot/wink.png" id="trust">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner trust-inner">
            <div className="trust-copy">
              <span className="scene-eyebrow">Your life stays yours · 06</span>
              <h2 className="scene-h1">It knows you<br />because <em className="hl">you let it.</em></h2>
              <p className="scene-lede">Personal intelligence asks for personal trust. You own the memory — inspect it, scope it, delete it. ZAKI reaches the boundary of any real action and waits for your yes. Privacy isn&rsquo;t a setting here; it&rsquo;s the architecture.</p>
              <div className="scene-cta">
                <a className="btn btn-ghost btn-lg" href="/story">Read the security model
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>
            </div>

            {/* Trust boundary scene — interactive (approve/deny handled by zaki-chapters.js) */}
            <div className="boundary" id="boundary">
                <div className="boundary-scene" id="boundary-scene">
                  <div className="boundary-track"></div>
                  <div className="boundary-trail" id="boundary-trail"></div>
                  <div className="boundary-edge"><span className="bl-lock"><svg viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.3" /><path d="M5.3 7V5.2a2.7 2.7 0 0 1 5.4 0V7" stroke="currentColor" strokeWidth="1.3" /></svg></span></div>
                  <span className="boundary-presence" id="boundary-presence"><img src="/zaki/bot/thinking.png" alt="ZAKI Presence" /></span>
                  <span className="boundary-wait" id="boundary-wait">Reaches the boundary · waits for you</span>
                </div>
                <div className="permission-card">
                  <span className="pc-k">Permission needed</span>
                  <p className="pc-ask">ZAKI is ready to send <strong>5 outreach emails</strong> on your behalf.</p>
                  <div className="pc-actions">
                    <button className="pc-btn deny">Not yet</button>
                    <button className="pc-btn approve">Approve &amp; send</button>
                  </div>
                  <span className="pc-sent"><svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Sent · logged in your activity</span>
                </div>
              </div>
            </div>
        </section>

        {/* SCENE 7 — THE SUMMIT (brightest dawn; your goal resolves; "alone" settles last) */}
        <section className="scene summit" data-stage="light" data-reveal data-screen-label="07 A new chapter" data-zee="/zaki/bot/summit.png" id="cta">
          <div className="scene-glow" aria-hidden="true"></div>
          {/* Dawn dissolve: the dark valley pixelates into the dawn (warm dithered pixels,
              no muddy gradient band). Painted + bloomed by zaki-mind.js. */}
          <canvas id="dawn-pixels" aria-hidden="true"></canvas>
          <div className="scene-inner summit-inner">
            <span className="scene-eyebrow">A new chapter · 07</span>
            <h2 className="scene-h1">Never build alone.<br />Never start the next chapter <em className="hl">alone.</em></h2>
            <p className="scene-lede">Whatever comes next — the launch, the move, the idea you&rsquo;ve been carrying — you don&rsquo;t begin it from zero, and you don&rsquo;t begin it by yourself.</p>
            <div className="scene-cta resolve-cta">
              <a className="btn btn-primary btn-lg" id="cta-primary" href={signupUrl}><span className="cta-label">Enter ZAKI&rsquo;s mind</span>
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a className="btn btn-ghost btn-lg" href="/story">Read the story</a>
            </div>
            <p className="summit-origin">Designed by agents. Built to remember. <a href="/story">Read the full story &rarr;</a></p>
          </div>
        </section>

        {/* MISSION — a quiet dawn band: the reason ZAKI exists. Not the headline; a beat
            as you arrive in the light. Stays in the dawn between summit and footer. */}
        <section className="mission" data-stage="light" aria-labelledby="mission-h">
          <div className="mission-inner">
            <span className="scene-eyebrow">The mission</span>
            <h2 className="mission-h" id="mission-h">Intelligence shouldn&rsquo;t follow the same map as everything else.</h2>
            <p className="mission-lede">ZAKI is built Arabic-first — native typography, right-to-left from the ground up, and a memory that treats your language as part of who you are. The first seats go to the places AI reached last.</p>
            <ul className="mission-seats">
              <li><b>The Arabic-speaking world</b><span>its own voice in the AI era</span></li>
              <li><b>Syria &amp; rebuilding regions</b><span>tools to build again</span></li>
              <li><b>Students, teachers &amp; builders</b><span>who carry the next chapter</span></li>
            </ul>
            <a className="mission-cta" href={signupUrl}>Request a seat for your community
              <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <p className="mission-proof">Trusted by our first members · EU-hosted, GDPR-aligned · your data stays yours.</p>
          </div>
        </section>

      </main>

      {/* FOOTER — resolves in the DAWN (continues the summit, doesn't reset to night).
          The climb ends in the light it reached. Palette + seam handled in zaki-scenes.css. */}
      <footer className="footer stage-light" data-stage="light">
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
              <a href="/agent">Agent</a><a href="/spaces">Spaces</a><a href={signupUrl}>Design</a><a href={signupUrl}>Learn</a><a href={signupUrl}>Career</a>
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
