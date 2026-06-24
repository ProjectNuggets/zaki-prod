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
      {/* Carried-goal token: the goal named in Scene 2 rises with --altitude up the page */}
      <div id="goal-token" aria-hidden="true"><span className="gt-dot"></span><span className="gt-text"></span></div>
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
            <span className="scene-eyebrow">Your AI · 01</span>
            <h1 className="scene-h1">Enter <em className="hl">ZAKI&rsquo;s mind.</em></h1>
            <p className="scene-lede">Not a tool you manage. A mind that&rsquo;s with you — and lifts what you&rsquo;re carrying.</p>
            <div className="scene-cta">
              <a className="btn btn-primary btn-lg" href={signupUrl}>Enter ZAKI&rsquo;s mind
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
          </div>
          <img className="scene-zee zee-hero" src="/zaki/bot/wave.png" alt="" aria-hidden="true" />
          <span className="scene-cue" aria-hidden="true">Scroll<i></i></span>
        </header>

        {/* CH.2 — REFRAME */}
        {/* SCENE 2 — YOUR CHAPTER (name your goal; it becomes the carried token) */}
        <section className="scene" data-stage="dark" data-reveal data-screen-label="02 Begin" id="intention">
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

            <div className="intent-remembered" id="intent-remembered" hidden>
              <div className="ir-inner">
                <span className="ir-label"><span className="ir-pip"></span>Remembered for this visit</span>
                <span className="ir-value" id="intent-value">Launch my design portfolio</span>
                <div className="ir-actions">
                  <button className="ir-btn" id="intent-edit">Edit</button>
                  <button className="ir-btn danger" id="intent-forget">Forget</button>
                </div>
              </div>
              <p className="ir-note">It travels with you — used in the moments below, and nowhere else.</p>
            </div>
          </div>
          <img className="scene-zee zee-left" src="/zaki/bot/wave.png" alt="" aria-hidden="true" />
        </section>

        {/* SCENE 3 — IT ACTS (Agent; the run executes as you scroll, on YOUR goal) */}
        <section className="scene agent" data-stage="dark" data-screen-label="03 Agent" id="agent">
          <div className="scene-glow" aria-hidden="true"></div>
          <div className="scene-inner agent-inner">
            <div className="agent-copy">
              <span className="scene-eyebrow">In action · 03</span>
              <h2 className="scene-h1">Give it the outcome.<br />It <em className="hl">does the work.</em></h2>
              <p className="scene-lede">Not an answer you copy out — a result you can use. ZAKI plans, uses real tools, creates the files, and follows through. Every step visible. Nothing ships without your approval.</p>
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
          <img className="scene-zee zee-right" src="/zaki/bot/thinking.png" alt="" aria-hidden="true" />
        </section>

        {/* CH.5 — MEMORY */}
        <section className="chapter stage-light memory" data-stage="light" data-screen-label="05 Memory" id="memory">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">05</span> Continuity</span>
              <h2 className="display">It remembers the person,<br />not just the prompt.</h2>
              <p className="lede">Your goals, preferences, decisions, corrections, and relationships form a living graph. ZAKI brings the right context forward when it helps — and keeps it out of the way when it doesn't.</p>
            </div>

            <div className="mem-grid">
              <div className="mem-panel reveal" data-d="1" id="mem-panel">
                <div className="mem-bar">
                  <span className="mem-title"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="8" r="2" fill="currentColor" /></svg>Memory</span>
                  <span className="mem-sub">What ZAKI is carrying for you</span>
                </div>
                <ul className="mem-list" id="mem-list">
                  <li className="mem-item" data-type="Preference"><span className="mem-type pref">Preference</span><span className="mem-text">You do deep work best before noon</span><span className="mem-act"></span></li>
                  <li className="mem-item sel" data-type="Project"><span className="mem-type proj">Project</span><span className="mem-text" data-intent-echo="Launch my design portfolio" data-eg-fallback="Launch my design portfolio">Launch my design portfolio</span><span className="mem-act"></span></li>
                  <li className="mem-item" data-type="Correction"><span className="mem-type corr">Correction</span><span className="mem-text">Put evidence beside every recommendation</span><span className="mem-act"></span></li>
                  <li className="mem-item" data-type="Deadline"><span className="mem-type dl">Deadline</span><span className="mem-text">Investor update — every other Monday</span><span className="mem-act"></span></li>
                </ul>
                <div className="mem-controls">
                  <span className="mem-controls-k">Selected memory</span>
                  <div className="mem-controls-btns">
                    <button className="mem-ctl">Inspect</button>
                    <button className="mem-ctl">Correct</button>
                    <button className="mem-ctl danger">Forget</button>
                  </div>
                </div>
              </div>

              <div className="mem-layers reveal" data-d="2">
                <article className="mlayer">
                  <span className="mlayer-ix">Global continuity</span>
                  <p>Your name, preferences, and long-running goals can move with you — across every product.</p>
                </article>
                <article className="mlayer">
                  <span className="mlayer-ix">Context that stays scoped</span>
                  <p>Documents inside a Space are available to its threads without leaking into unrelated work.</p>
                </article>
                <article className="mlayer">
                  <span className="mlayer-ix">Memory under your control</span>
                  <p>Inspect it. Correct it. Remove it. You decide what stays — and what ZAKI forgets.</p>
                </article>
                <a className="mem-more" href="#trust">See how memory works
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CH.6 — SPACES */}
        <section className="chapter stage-light spaces" data-stage="light" data-screen-label="06 Spaces" id="spaces">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">06</span> ZAKI in context</span>
              <h2 className="display">Keep every conversation<br />in its world.</h2>
              <p className="lede">Create a Space for a project, topic, class, or client. Add documents once. Open as many threads as you need — every thread works from the same shared context, and nothing leaks out.</p>
              <div className="caps"><span className="cap">Many threads</span><span className="cap">Shared documents</span><span className="cap">Web search</span><span className="cap teal">Scoped memory</span></div>
            </div>

            <div className="spaces-grid">
              <div className="space-win reveal" data-d="1">
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

              <ul className="space-proof reveal" data-d="2">
                <li><span className="sp-n">1</span> One Space</li>
                <li><span className="sp-n">∞</span> Many threads</li>
                <li><span className="sp-n">◇</span> Shared documents</li>
                <li><span className="sp-n">⚡</span> Fast conversation</li>
                <li><span className="sp-n">⌕</span> Web search when needed</li>
                <li><span className="sp-n">↻</span> Global continuity where useful</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CH.7–9 — CREATION MOVEMENT */}
        <div className="movement stage-light">
          <section className="chapter beat beat-design stage-light" data-stage="light" data-screen-label="07 Design" id="design">
            <div className="wrap beat-grid">
              <div className="beat-copy reveal">
                <span className="kicker"><span className="ix">07</span> ZAKI in creation</span>
                <h2 className="display">From idea to<br />something you can see.</h2>
                <p className="lede">Start with the rough thought. Explore visual directions. Choose what feels right. Turn it into a design you can refine and use.</p>
                <div className="beat-flow">
                  <span>Brief</span><i></i><span>Directions</span><i></i><span>Decision</span><i></i><span className="on">Design</span>
                </div>
                <div className="caps"><span className="cap">Directions</span><span className="cap">Compare</span><span className="cap">Refine</span><span className="cap">Hand off</span></div>
                <span className="status soon beat-status">Soon</span>
              </div>
              <div className="beat-proof reveal" data-d="1">
                <div className="dir-win">
                  <div className="dir-bar"><span>Directions</span><span className="dir-sub">Pick one to refine</span></div>
                  <div className="dir-tiles">
                    <div className="dir-tile t1"><span className="dir-swatch s1"></span><span className="dir-l">Editorial</span></div>
                    <div className="dir-tile t2 sel"><span className="dir-swatch s2"></span><span className="dir-l">Warm minimal</span><span className="dir-pick">Selected</span></div>
                    <div className="dir-tile t3"><span className="dir-swatch s3"></span><span className="dir-l">Bold mono</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="wrap"><a className="continuation reveal" href="#learn">Build the capability behind the work<svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></a></div>
          </section>

          <section className="chapter beat beat-learn stage-light" data-stage="light" data-screen-label="08 Learn" id="learn">
            <div className="wrap beat-grid reverse">
              <div className="beat-copy reveal">
                <span className="kicker"><span className="ix">08</span> ZAKI in growth</span>
                <h2 className="display">Learn the way<br />your mind works.</h2>
                <p className="lede">Understand difficult material, uncover the gaps, practice with feedback, and keep a study path that changes as you progress.</p>
                <p className="beat-outcome">Less guessing what to study. More moments where it clicks.</p>
                <div className="caps"><span className="cap">Diagnose gaps</span><span className="cap">Explain</span><span className="cap">Practice</span><span className="cap teal">Track progress</span></div>
                <span className="status soon beat-status">Soon</span>
              </div>
              <div className="beat-proof reveal" data-d="1">
                <div className="learn-win">
                  <div className="learn-bar"><span>Study path</span><span className="learn-sub">Organic chemistry</span></div>
                  <div className="learn-steps">
                    <div className="lstep done"><span className="lstep-i"></span><span>Explained — resonance structures</span></div>
                    <div className="lstep gap"><span className="lstep-i"></span><span>Gap found — electron pushing</span></div>
                    <div className="lstep active"><span className="lstep-i"></span><span>Practice — 3 guided problems</span></div>
                  </div>
                  <div className="learn-prog"><span className="learn-prog-k">Mastery</span><div className="learn-bar-track"><i style={{ width: "64%" }}></i></div><span className="learn-prog-v">64%</span></div>
                </div>
              </div>
            </div>
            <div className="wrap"><a className="continuation reveal" href="#career">Turn progress into opportunity<svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></a></div>
          </section>

          <section className="chapter beat beat-career stage-light" data-stage="light" data-screen-label="09 Career" id="career">
            <div className="wrap beat-grid">
              <div className="beat-copy reveal">
                <span className="kicker"><span className="ix">09</span> ZAKI in motion</span>
                <h2 className="display">Let the right<br />role find you.</h2>
                <p className="lede">Build a living career profile. Discover roles that fit. Tailor your story. Keep applications and follow-ups moving — with you in control.</p>
                <p className="beat-outcome">A job search that works every day, not only when you have the energy.</p>
                <div className="caps"><span className="cap">Living profile</span><span className="cap">Role matching</span><span className="cap">Tailor story</span><span className="cap">Approved actions</span></div>
                <span className="status soon beat-status">Soon</span>
              </div>
              <div className="beat-proof reveal" data-d="1">
                <div className="career-win">
                  <div className="career-bar"><span>Role matches</span><span className="career-sub">Updated daily</span></div>
                  <ul className="career-roles">
                    <li><span className="cr-role">Senior Product Designer</span><span className="cr-co">Fintech · Remote</span><span className="cr-fit high">94%</span></li>
                    <li><span className="cr-role">Brand &amp; Systems Lead</span><span className="cr-co">Studio · Hybrid</span><span className="cr-fit">88%</span></li>
                    <li><span className="cr-role">Design Engineer</span><span className="cr-co">SaaS · Remote</span><span className="cr-fit">81%</span></li>
                  </ul>
                  <div className="career-next">
                    <span className="career-next-k">Next action · tailored intro ready</span>
                    <span className="career-gate"><svg viewBox="0 0 14 14" fill="none"><rect x="2" y="6" width="10" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.2" /><path d="M4.3 6V4.4a2.7 2.7 0 0 1 5.4 0V6" stroke="currentColor" strokeWidth="1.2" /></svg>Approve before it sends</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="wrap"><a className="continuation reveal" href="#day">Keep the next actions moving<svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></a></div>
          </section>
        </div>

        {/* CH.10 — A DAY WITH ZAKI */}
        <section className="chapter stage-dark day" data-stage="dark" data-screen-label="10 A day with ZAKI" id="day">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">10</span> Everyday intelligence</span>
              <h2 className="display">One day.<br />One intelligence beside you.</h2>
              <p className="lede">You change contexts all day long. ZAKI keeps the thread — carrying what matters from one moment to the next.</p>
            </div>
            <ol className="timeline">
              <li className="tl-moment reveal">
                <span className="tl-time">07:45</span>
                <div className="tl-card">
                  <span className="tl-label">Begin with clarity</span>
                  <p className="tl-say">"Brief me on what matters today."</p>
                  <p className="tl-zaki">ZAKI filters the noise and puts the real decisions first.</p>
                </div>
              </li>
              <li className="tl-moment reveal" data-d="1">
                <span className="tl-time">10:20</span>
                <div className="tl-card">
                  <span className="tl-label">Move the work</span>
                  <p className="tl-say">"Turn these notes into the plan."</p>
                  <p className="tl-zaki">It creates the structure and carries the context forward.</p>
                </div>
              </li>
              <li className="tl-moment reveal" data-d="2">
                <span className="tl-time">14:10</span>
                <div className="tl-card">
                  <span className="tl-label">Give the idea form</span>
                  <p className="tl-say">"Show me three directions."</p>
                  <p className="tl-zaki">ZAKI Design turns the brief into something you can react to.</p>
                </div>
              </li>
              <li className="tl-moment reveal" data-d="1">
                <span className="tl-time">17:30</span>
                <div className="tl-card">
                  <span className="tl-label">Make it click</span>
                  <p className="tl-say">"Explain the part I keep missing."</p>
                  <p className="tl-zaki">ZAKI Learn changes the explanation and builds the right practice.</p>
                </div>
              </li>
              <li className="tl-moment reveal" data-d="2">
                <span className="tl-time">20:15</span>
                <div className="tl-card">
                  <span className="tl-label">Keep the future moving</span>
                  <p className="tl-say">"Find roles that actually fit me."</p>
                  <p className="tl-zaki">ZAKI Career updates the search and prepares the next actions.</p>
                </div>
              </li>
              <li className="tl-moment sleep reveal" data-d="1">
                <span className="tl-time">While you sleep</span>
                <div className="tl-card">
                  <span className="tl-label">Approved, scheduled work continues</span>
                  <p className="tl-zaki">The follow-ups you approved keep moving — nothing sensitive without your say.</p>
                </div>
              </li>
            </ol>
            <p className="day-close reveal"><img className="zbot idle day-mascot" src="/zaki/bot/heart.png" alt="" /><span>You change contexts. <em className="hl">ZAKI keeps the thread.</em></span></p>
          </div>
        </section>

        {/* CH.11 — TRUST */}
        <section className="chapter stage-dark trust" data-stage="dark" data-screen-label="11 Trust" id="trust">
          <div className="wrap">
            <div className="trust-grid">
              <div className="sec-head reveal">
                <span className="kicker"><span className="ix">11</span> Your life stays yours</span>
                <h2 className="display">Close enough to know you.<br />Built to protect you.</h2>
                <p className="lede">Personal intelligence requires personal trust. Your memory, permissions, private information, and rules stay under your control. Privacy is architecture — not a setting buried in a menu.</p>
                <ul className="trust-controls">
                  <li>Inspect, correct, and delete memory</li>
                  <li>Scope information to one Space</li>
                  <li>Approve a tool before it runs</li>
                  <li>Revoke access at any time</li>
                  <li>Approve every external action</li>
                </ul>
                <a className="btn btn-ghost trust-cta" href="/story">Read the security model
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>

              {/* Trust boundary scene */}
              <div className="boundary reveal" data-d="1" id="boundary">
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
          </div>
        </section>

        {/* CH.11.5 — ORIGIN STORY TEASER */}
        <section className="chapter stage-light originteaser" data-stage="light" data-screen-label="The origin" id="story">
          <div className="wrap origin-inner">
            <div className="origin-copy">
              <span className="kicker reveal">The origin</span>
              <h2 className="display reveal" data-d="1">Designed by agents.<br /><em className="hlt">Built to remember.</em></h2>
              <p className="lede reveal" data-d="2">ZAKI is a meta-agent. We didn't guess what an agent should be — we asked four of the strongest agents in the world, then built their answer in-house on a nine-layer, human-inspired memory.</p>
              <div className="origin-architects reveal" data-d="3">
                <span className="oa-k">Specified by</span>
                <div className="oa-names"><span>Claude Code</span><span>Codex</span><span>OpenCode</span><span>Hermes</span></div>
              </div>
              <a className="btn btn-primary origin-cta reveal" data-d="3" href="/story">Read the full story
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
            <div className="origin-art reveal" data-d="2">
              <div className="origin-panel">
                <img className="origin-bot" src="/zaki/bot/thinking.png" alt="ZAKI Presence" />
                <div className="origin-stats">
                  <div className="origin-stat"><div className="os-n">9</div><div className="os-l">Memory layers</div></div>
                  <div className="origin-stat"><div className="os-n">3</div><div className="os-l">Recall tiers</div></div>
                  <div className="origin-stat"><div className="os-n">1</div><div className="os-l">Living graph</div></div>
                </div>
                <p className="origin-panel-cap">The first agent that can <b>debate itself</b> before it answers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CH.12 — RESOLUTION */}
        <section className="chapter stage-dark resolve" data-stage="dark" data-screen-label="12 A new chapter" id="cta">
          <div className="resolve-atlas" aria-hidden="true"><div className="resolve-con" data-constellation data-quiet data-no-labels></div><div className="dots"></div><div className="glow"></div></div>
          <div className="wrap resolve-inner">
            <img className="zbot idle resolve-mascot reveal" src="/zaki/bot/sunglasses.png" alt="ZAKI Presence" />
            <span className="resolve-mark reveal"><img src="/zaki/assets/zaki-mark.png" alt="ZAKI" /></span>
            <span className="kicker center reveal" data-d="1">A new chapter</span>
            <h2 className="display-xl reveal" data-d="1">Never build alone.<br />Never start the next chapter <em className="hl">alone.</em></h2>
            <p className="resolve-sub reveal" data-d="2">Whatever comes next — the launch, the move, the idea you&rsquo;ve been putting off — you don&rsquo;t begin it from zero, and you don&rsquo;t begin it by yourself. Bring the first thing you want to move forward. ZAKI remembers it from here.</p>
            <div className="resolve-cta reveal" data-d="2">
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
