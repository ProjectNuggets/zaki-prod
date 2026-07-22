import { Link } from "react-router-dom";
import { appHandoffUrl } from "../lib/appHandoff";
import { useZakiProductPage } from "../hooks/useZakiPage";

export function StoryV4() {
  useZakiProductPage("/zaki/styles/zaki-story.css", "/zaki/scripts/zaki-story.js");
  const signupUrl = appHandoffUrl("/", "website_story_cta", "dashboard");
  const signinUrl = appHandoffUrl("/", "website_story_signin", "dashboard");

  return (
    <>
      <style>{`.mobile-menu{position:fixed;inset:68px 0 0;opacity:0;visibility:hidden}.mobile-menu.open{opacity:1;visibility:visible}@media(min-width:901px){.mobile-menu{display:none}}.nav{position:fixed;top:0;left:0;right:0;z-index:100}`}</style>
      <div className="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
      <div className="grain" aria-hidden="true"></div>

      <header className="nav" id="nav">
        <Link className="brand" to="/" aria-label="ZAKI home">
          <img className="mark" src="/zaki/assets/zaki-mark.png" alt="" />
          <span className="word">ZAKI</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <div className="nav-item has-mega" id="nav-products">
            <button className="nav-trigger" aria-expanded="false" aria-haspopup="true">Products
              <svg className="chev" viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="mega" role="menu">
              <div className="mega-grid">
                <Link className="mega-card" to="/agent" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2l1.8 4.4L16 8.2l-3.4 2.9.9 4.6L10 13.4 6.5 15.7l.9-4.6L4 8.2l4.2-1.8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Agent <span className="status live">Live</span></span>
                  <span className="mega-role">ZAKI in action</span>
                  <span className="mega-d">Delegate the whole task — it plans, acts, and follows through.</span>
                </Link>
                <Link className="mega-card" to="/spaces" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.3" /><path d="M3 8h14M8 8v9" stroke="currentColor" strokeWidth="1.3" /></svg></span>
                  <span className="mega-tt">Spaces <span className="status live">Live</span></span>
                  <span className="mega-role">ZAKI in context</span>
                  <span className="mega-d">Keep every conversation in its world — shared docs, many threads.</span>
                </Link>
                <a className="mega-card" href={signupUrl}>
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 16l8-8 1.5 1.5M14 4l2 2-9.5 9.5L4 16l.5-2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Design <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in creation</span>
                  <span className="mega-d">Turn a rough brief into directions you can see and shape.</span>
                </a>
                <a className="mega-card" href={signupUrl}>
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 4 3 7l7 3 7-3-7-3zM5 9v4c0 1 2.2 2 5 2s5-1 5-2V9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Minutes <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in meetings</span>
                  <span className="mega-d">Turn conversations into decisions, owners, and follow-ups.</span>
                </a>
                <Link className="mega-card mega-mem" to="/#memory" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" /><circle cx="10" cy="10" r="2.4" fill="currentColor" /></svg></span>
                  <span className="mega-tt">Memory</span>
                  <span className="mega-role">The continuity layer</span>
                  <span className="mega-d">One memory under every product — inspect, correct, or forget it.</span>
                </Link>
              </div>
              <div className="mega-foot">
                <span>One intelligence. Many ways forward. Your rules.</span>
                <a href={signupUrl}>Meet ZAKI <svg viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div>
            </div>
          </div>
          <Link to="/#trust">Security</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/story" aria-current="page">Story</Link>
        </nav>
        <div className="nav-actions">
          <a className="signin" href={signinUrl}>Sign in</a>
          <a className="btn btn-primary btn-sm" href={signupUrl}>Meet ZAKI</a>
          <button className="nav-burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span></button>
        </div>
      </header>

      <div className="mobile-menu" id="mobile-menu" aria-hidden="true">
        <span className="mm-k">Products</span>
        <Link className="mm-link" to="/agent">Agent <span className="mm-role">In action · Live</span></Link>
        <Link className="mm-link" to="/spaces">Spaces <span className="mm-role">In context · Live</span></Link>
        <a className="mm-link" href={signupUrl}>Design <span className="mm-role">In creation · Soon</span></a>
        <a className="mm-link" href={signupUrl}>Minutes <span className="mm-role">Meeting notes · Soon</span></a>
        <Link className="mm-link" to="/#memory">Memory <span className="mm-role">Continuity layer</span></Link>
        <div className="mm-sub">
          <Link to="/#trust">Security</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/story">Story</Link>
          <a href={signinUrl}>Sign in</a>
        </div>
        <a className="btn btn-primary btn-lg btn-block mm-cta" href={signupUrl}>Meet ZAKI</a>
      </div>

      <main id="top">

        <header className="shero stage-dark" data-stage="dark" id="hero">
          <div className="shero-atlas" aria-hidden="true">
            <div className="dots"></div>
            <div className="glow"></div>
            <div className="vignette"></div>
          </div>
          <div className="wrap shero-inner">
            <div className="shero-copy">
              <span className="kicker reveal">The origin</span>
              <h1 className="display-xl reveal" data-d="1">Designed by agents.<br /><em className="hlt">Built to remember.</em></h1>
              <p className="lede reveal" data-d="2">ZAKI is a meta-agent. It wasn't drawn up by people guessing what an agent should be — it was specified by the agents themselves, then built internally on the deepest memory an agent has ever carried.</p>
              <div className="shero-meta reveal" data-d="3">
                <div className="m"><span className="mn">4</span><span className="ml">Agent architects</span></div>
                <div className="m"><span className="mn"><em>9</em></span><span className="ml">Memory layers</span></div>
                <div className="m"><span className="mn">3</span><span className="ml">Recall tiers</span></div>
              </div>
              <div className="shero-cta reveal" data-d="3">
                <a className="btn btn-primary btn-lg" href="#council">Read the story
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
                <a className="btn btn-ghost btn-lg" href="#arch">Jump to the memory</a>
              </div>
            </div>
            <div className="shero-art reveal" data-d="2">
              <div className="shero-frame">
                <span className="shero-spec s1">spec · <b>meta-agent</b></span>
                <img src="/zaki/bot/thinking.png" alt="ZAKI Presence" />
                <span className="shero-spec s2">memory · <b>persistent</b></span>
              </div>
            </div>
          </div>
        </header>

        <section className="chapter stage-dark premise" data-stage="dark" id="premise">
          <div className="wrap premise-inner">
            <span className="kicker center reveal">The premise</span>
            <p className="big reveal" data-d="1" style={{ marginTop: "24px" }}>Most agents are designed by people <span className="dim">imagining</span> what an agent should want.<br />We did something stranger — <em>we asked the agents.</em></p>
            <p className="sub reveal" data-d="2">Four of the best gave the same answer</p>
          </div>
        </section>

        <section className="chapter stage-light council" data-stage="light" id="council">
          <div className="wrap">
            <div className="council-head">
              <span className="kicker center reveal">The brief</span>
              <h2 className="display reveal" data-d="1">Describe the agent you wish you could be.</h2>
              <p className="lede reveal" data-d="2">We put one question to four of the strongest coding and reasoning agents in the world. Not "what can you do" — but "what do you keep losing." Their answers converged.</p>
            </div>
            <div className="council-grid">
              <article className="cmember reveal" data-d="1">
                <div className="cmember-tag"><span className="cmember-ix">01</span><span className="cmember-dot"></span></div>
                <div><div className="cmember-name">Claude Code</div><div className="cmember-role">The builder</div></div>
                <p className="cmember-quote">Let me hold the whole repo in mind — not just the file in front of me. I lose the shape of the project every session.</p>
                <div className="cmember-want">Asked for <b>continuity of context</b></div>
              </article>
              <article className="cmember reveal" data-d="2">
                <div className="cmember-tag"><span className="cmember-ix">02</span><span className="cmember-dot"></span></div>
                <div><div className="cmember-name">Codex</div><div className="cmember-role">The engineer</div></div>
                <p className="cmember-quote">Stop making me re-learn you every time. I want to remember the decision we made last week and why.</p>
                <div className="cmember-want">Asked for <b>persistent memory</b></div>
              </article>
              <article className="cmember reveal" data-d="3">
                <div className="cmember-tag"><span className="cmember-ix">03</span><span className="cmember-dot"></span></div>
                <div><div className="cmember-name">OpenCode</div><div className="cmember-role">The collaborator</div></div>
                <p className="cmember-quote">Know my preferences without being told twice. The taste, the tone, the way this person likes things done.</p>
                <div className="cmember-want">Asked for <b>learned preference</b></div>
              </article>
              <article className="cmember reveal" data-d="4">
                <div className="cmember-tag"><span className="cmember-ix">04</span><span className="cmember-dot"></span></div>
                <div><div className="cmember-name">Hermes</div><div className="cmember-role">The connector</div></div>
                <p className="cmember-quote">Carry the thread across days, not minutes. Let a goal survive longer than a single conversation.</p>
                <div className="cmember-want">Asked for <b>long-horizon recall</b></div>
              </article>
            </div>
            <div className="converge reveal" data-d="2">
              <span className="converge-l">Four answers</span>
              <span className="converge-arrows" aria-hidden="true"><svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M2 7h14M12 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <span className="converge-word">One word: memory.</span>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark built" data-stage="dark" id="built">
          <div className="wrap built-inner">
            <div className="built-copy">
              <span className="kicker reveal">Built, not assembled</span>
              <h2 className="display reveal" data-d="1">So we built it<br /><em className="hlt">in-house.</em></h2>
              <p className="lede reveal" data-d="2">ZAKI got the best memory architecture an agent can have. Most AI treats memory as a lookup table; ZAKI treats it as a relationship — modelled not on a database, but on how human memory actually works. You don&rsquo;t fall for an AI that stores facts. You fall for one that notices, cares, and follows up.</p>
              <div className="built-list reveal" data-d="3">
                <div className="built-li"><span className="bi-ix">01</span><div><div className="bi-t">Studied from people</div><div className="bi-d">How we hold a moment, let it cool, and recall it later when it matters — translated into structure.</div></div></div>
                <div className="built-li"><span className="bi-ix">02</span><div><div className="bi-t">Owned end to end</div><div className="bi-d">No bolted-on memory plugin. The recall layer is the foundation, designed alongside the agent.</div></div></div>
                <div className="built-li"><span className="bi-ix">03</span><div><div className="bi-t">Yours to inspect</div><div className="bi-d">Every memory is visible, correctable, and forgettable. The architecture is private by design.</div></div></div>
              </div>
            </div>
            <div className="reveal" data-d="2">
              <div className="mirror">
                <div className="mirror-side l">
                  <div className="mirror-orb"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3a4 4 0 0 0-4 4v1a4 4 0 0 0-1 7.7V18a3 3 0 0 0 6 0M12 3a4 4 0 0 1 4 4v1a4 4 0 0 1 1 7.7V18a3 3 0 0 1-6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg></div>
                  <div className="mirror-k">Human memory</div>
                  <div className="mirror-v">Hold · cool · recall</div>
                </div>
                <div className="mirror-eq">≈</div>
                <div className="mirror-side r">
                  <div className="mirror-orb"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" /><circle cx="12" cy="12" r="2.6" fill="currentColor" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg></div>
                  <div className="mirror-k">ZAKI memory</div>
                  <div className="mirror-v">Hot · warm · cold</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-light arch" data-stage="light" id="arch">
          <div className="wrap">
            <div className="arch-head">
              <span className="kicker center reveal">The architecture</span>
              <h2 className="display reveal" data-d="1">Nine layers. Three temperatures.<br />One <em className="hlt">living graph.</em></h2>
              <p className="lede reveal" data-d="2">Memory that doesn't just store — it relates, ages, and stays relevant. Each part is specialised so the whole experience feels like being known.</p>
            </div>

            <div className="tiers">
              <div className="tier hot reveal" data-d="1">
                <div className="tier-bar"></div>
                <div className="tier-top"><span className="tier-name">Hot</span><span className="tier-temp">Now</span></div>
                <p className="tier-d">What you're working on this minute — instant, in-focus, zero latency.</p>
                <div className="tier-meta"><span className="pip"></span>Working set · live context</div>
              </div>
              <div className="tier warm reveal" data-d="2">
                <div className="tier-bar"></div>
                <div className="tier-top"><span className="tier-name">Warm</span><span className="tier-temp">Recent</span></div>
                <p className="tier-d">The last days and weeks — active threads, fresh decisions, things still in motion.</p>
                <div className="tier-meta"><span className="pip"></span>Active recall · recently touched</div>
              </div>
              <div className="tier cold reveal" data-d="3">
                <div className="tier-bar"></div>
                <div className="tier-top"><span className="tier-name">Cold</span><span className="tier-temp">Deep</span></div>
                <p className="tier-d">The long archive — surfaced precisely when an old detail suddenly matters again.</p>
                <div className="tier-meta"><span className="pip"></span>Deep store · retrieved on relevance</div>
              </div>
            </div>

            <div className="arch-split">
              <div className="arch-card reveal" data-d="1">
                <div className="arch-card-h">
                  <span className="ic"><svg viewBox="0 0 20 20" fill="none"><circle cx="5" cy="6" r="2" stroke="currentColor" strokeWidth="1.3" /><circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" /><circle cx="10" cy="14" r="2.3" stroke="currentColor" strokeWidth="1.3" /><path d="M6.6 7.2 9 12M13.8 6.4 11 12" stroke="currentColor" strokeWidth="1.2" /></svg></span>
                  <h3>Graph memory</h3>
                  <span className="tt">Relations</span>
                </div>
                <p className="ad">Memories aren't a list — they're a graph. People, projects, and facts link to each other, so recalling one pulls the threads it's tied to.</p>
                <div className="graph-viz" aria-hidden="true">
                  <svg viewBox="0 0 360 230" preserveAspectRatio="xMidYMid meet">
                    <line className="gedge" x1="180" y1="115" x2="70" y2="50" />
                    <line className="gedge live" x1="180" y1="115" x2="290" y2="55" />
                    <line className="gedge" x1="180" y1="115" x2="60" y2="175" />
                    <line className="gedge live" x1="180" y1="115" x2="300" y2="170" />
                    <line className="gedge" x1="70" y1="50" x2="290" y2="55" />
                    <line className="gedge" x1="60" y1="175" x2="300" y2="170" />
                    <circle className="gnode core" cx="180" cy="115" r="22" />
                    <circle className="gnode" cx="70" cy="50" r="13" />
                    <circle className="gnode" cx="290" cy="55" r="13" />
                    <circle className="gnode" cx="60" cy="175" r="13" />
                    <circle className="gnode" cx="300" cy="170" r="13" />
                    <text className="glabel core" x="180" y="148" textAnchor="middle">you</text>
                    <text className="glabel" x="70" y="30" textAnchor="middle">Maya</text>
                    <text className="glabel" x="290" y="35" textAnchor="middle">the trip</text>
                    <text className="glabel" x="60" y="198" textAnchor="middle">work</text>
                    <text className="glabel" x="300" y="193" textAnchor="middle">budget</text>
                  </svg>
                </div>
              </div>
              <div className="arch-card reveal" data-d="2">
                <div className="arch-card-h">
                  <span className="ic"><svg viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg></span>
                  <h3>Nine layers</h3>
                  <span className="tt">Specialised</span>
                </div>
                <p className="ad">Each layer answers one kind of question. Together they decide what to keep, what to connect, and what to surface.</p>
                <div className="layers">
                  <div className="layer"><span className="layer-n">1</span><span className="layer-t">Episodic</span><span className="layer-d">what happened</span></div>
                  <div className="layer"><span className="layer-n">2</span><span className="layer-t">Semantic</span><span className="layer-d">what's true</span></div>
                  <div className="layer"><span className="layer-n">3</span><span className="layer-t">Procedural</span><span className="layer-d">how you do it</span></div>
                  <div className="layer"><span className="layer-n">4</span><span className="layer-t">Identity</span><span className="layer-d">who you are</span></div>
                  <div className="layer"><span className="layer-n">5</span><span className="layer-t">Relational</span><span className="layer-d">who matters</span></div>
                  <div className="layer"><span className="layer-n">6</span><span className="layer-t">Preference</span><span className="layer-d">how you like it</span></div>
                  <div className="layer"><span className="layer-n">7</span><span className="layer-t">Temporal</span><span className="layer-d">when it happens</span></div>
                  <div className="layer"><span className="layer-n">8</span><span className="layer-t">Affective</span><span className="layer-d">what you care about</span></div>
                  <div className="layer"><span className="layer-n">9</span><span className="layer-t">Working</span><span className="layer-d">what's in focus now</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark think" data-stage="dark" id="think">
          <div className="wrap think-inner">
            <div className="think-copy">
              <span className="kicker reveal">A first</span>
              <h2 className="display reveal" data-d="1">The first agent that<br /><em className="hlt">thinks twice.</em></h2>
              <p className="lede reveal" data-d="2">ZAKI has an inner voice — more than one. Before it answers, it can debate itself: argue the case, challenge it, and settle on the better path. You see the conclusion; the deliberation is what makes it trustworthy.</p>
              <span className="think-note reveal" data-d="3"><span className="cmember-dot"></span>Internal monologue · self-debate</span>
            </div>
            <div className="reveal" data-d="2">
              <div className="debate" id="debate">
                <div className="debate-head">
                  <span className="pdot"></span><span className="dt">Internal thoughts</span>
                  <span className="dstat" id="debate-stat">deliberating…</span>
                </div>
                <div className="debate-body" id="debate-body"></div>
                <div className="debate-foot">
                  <span className="out" id="debate-out">&nbsp;</span>
                  <button className="debate-replay" id="debate-replay" hidden>
                    <svg viewBox="0 0 14 14" fill="none"><path d="M11.5 5A5 5 0 1 0 12 8.5M11.5 2v3h-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>Replay
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-light access" data-stage="light" id="access">
          <div className="wrap access-inner">
            <div className="access-copy">
              <span className="kicker reveal">Who gets it first</span>
              <h2 className="display reveal" data-d="1">Given first to the places<br /><em className="hlt">AI reached last.</em></h2>
              <p className="lede reveal" data-d="2">ZAKI was specified by the most capable agents in the world and built with resources most people never get near. It felt wrong for it to land first where intelligence already arrives easily.</p>
              <p className="lede reveal" data-d="2">So the first seats are free — and they go to the regions that have had the least access to this technology: the Arabic-speaking world, and places rebuilding from hard years, like Syria.</p>
              <span className="access-note reveal" data-d="3">No cost. No catch. <b>Intelligence shouldn't follow the same map as everything else.</b></span>
            </div>
            <div className="reveal" data-d="2">
              <div className="seats">
                <div className="seats-bar">
                  <span className="pip"></span>
                  <span className="seats-title">The first seats</span>
                  <span className="seats-ar">ابدأ من هنا</span>
                </div>
                <div className="seats-list">
                  <div className="seat">
                    <div><div className="seat-who">The Arabic-speaking world</div><div className="seat-d">Native Arabic, right-to-left, and the contexts that come with it.</div></div>
                    <span className="seat-tag first">Priority</span>
                  </div>
                  <div className="seat">
                    <div><div className="seat-who">Syria &amp; rebuilding regions</div><div className="seat-d">Where access has been hardest — and where it can matter most.</div></div>
                    <span className="seat-tag first">First wave</span>
                  </div>
                  <div className="seat">
                    <div><div className="seat-who">Students, teachers &amp; builders</div><div className="seat-d">The people who turn one seat into many.</div></div>
                    <span className="seat-tag free">Free seats</span>
                  </div>
                </div>
                <div className="seats-foot"><span className="dot"></span>Rolling out by region · request a seat for your community</div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark scta" data-stage="dark" id="cta">
          <div className="scta-atlas" aria-hidden="true"><div className="dots"></div><div className="glow"></div></div>
          <div className="wrap scta-inner">
            <img className="scta-bot reveal" src="/zaki/bot/sunglasses.png" alt="ZAKI Presence" />
            <span className="kicker center reveal" data-d="1">The agent agents wanted</span>
            <h2 className="display-xl reveal" data-d="1">An agent other agents<br />would <em className="hlt">trust.</em></h2>
            <p className="scta-sub reveal" data-d="2">Designed by the best of them, built on memory that actually holds. Now it's yours — and it remembers you from the very first hello.</p>
            <div className="scta-btns reveal" data-d="2">
              <a className="btn btn-primary btn-lg" href={signupUrl}>Enter ZAKI&rsquo;s mind
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <Link className="btn btn-ghost btn-lg" to="/pricing">See pricing</Link>
            </div>
            <p className="scta-sign reveal" data-d="3">Never build alone. Never start the next chapter alone.</p>
          </div>
        </section>

      </main>

      <footer className="footer stage-dark" data-stage="dark">
        <span className="footer-glow" aria-hidden="true"></span>
        <div className="wrap footer-top">
          <div className="footer-lead">
            <Link className="brand" to="/"><img className="mark" src="/zaki/assets/zaki-mark.png" alt="" /><span className="word">ZAKI</span></Link>
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
              <Link to="/agent">Agent</Link>
              <Link to="/spaces">Spaces</Link>
              <a href={signupUrl}>Design</a>
              <a href={signupUrl}>Minutes</a>
            </div>
            <div className="fcol">
              <span className="fcol-k">Company</span>
              <Link to="/story">Story</Link>
              <Link to="/#trust">Security</Link>
              <Link to="/pricing">Pricing</Link>
              <a href={signupUrl}>Contact</a>
            </div>
            <div className="fcol">
              <span className="fcol-k">Begin</span>
              <a href={signupUrl}>Meet ZAKI</a>
              <a href={signinUrl}>Sign in</a>
              <Link to="/pricing">Pricing</Link>
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
