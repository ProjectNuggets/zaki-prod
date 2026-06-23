import { Link } from "react-router-dom";
import { appHandoffUrl } from "../lib/appHandoff";
import { useZakiProductPage } from "../hooks/useZakiPage";

export function AgentPage() {
  useZakiProductPage("/zaki/styles/zaki-agent.css", "/zaki/scripts/zaki-agent.js");
  const signupUrl = appHandoffUrl("/", "website_agent_cta", "agent");
  const signinUrl = appHandoffUrl("/", "website_agent_signin", "dashboard");

  return (
    <>
      {/* ponytail: critical pre-CSS rule — hides mobile-menu until zaki-home.css loads via useEffect */}
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
                <Link className="mega-card is-active" to="/agent" role="menuitem" aria-current="page">
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
                <Link className="mega-card" to="/#design" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4 16l8-8 1.5 1.5M14 4l2 2-9.5 9.5L4 16l.5-2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Design <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in creation</span>
                  <span className="mega-d">Turn a rough brief into directions you can see and shape.</span>
                </Link>
                <Link className="mega-card" to="/#learn" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 4 3 7l7 3 7-3-7-3zM5 9v4c0 1 2.2 2 5 2s5-1 5-2V9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                  <span className="mega-tt">Learn <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in growth</span>
                  <span className="mega-d">Understand, practice, and progress in a way that adapts to you.</span>
                </Link>
                <Link className="mega-card" to="/#career" role="menuitem">
                  <span className="mega-ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M7 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.3" /></svg></span>
                  <span className="mega-tt">Career <span className="status soon">Soon</span></span>
                  <span className="mega-role">ZAKI in motion</span>
                  <span className="mega-d">Find stronger matches and keep the follow-up moving — you approve.</span>
                </Link>
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
          <a href="#boundary">Security</a>
          <Link to="/pricing">Pricing</Link>
          <Link to="/story">Story</Link>
        </nav>
        <div className="nav-actions">
          <a className="signin" href={signinUrl}>Sign in</a>
          <a className="btn btn-primary btn-sm" href="#run">Put it to work</a>
          <button className="nav-burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span></button>
        </div>
      </header>

      <div className="mobile-menu" id="mobile-menu" aria-hidden="true">
        <span className="mm-k">Products</span>
        <Link className="mm-link" to="/agent">Agent <span className="mm-role">In action · Live</span></Link>
        <Link className="mm-link" to="/spaces">Spaces <span className="mm-role">In context · Live</span></Link>
        <Link className="mm-link" to="/#design">Design <span className="mm-role">In creation · Soon</span></Link>
        <Link className="mm-link" to="/#learn">Learn <span className="mm-role">In growth · Soon</span></Link>
        <Link className="mm-link" to="/#career">Career <span className="mm-role">In motion · Soon</span></Link>
        <Link className="mm-link" to="/#memory">Memory <span className="mm-role">Continuity layer</span></Link>
        <div className="mm-sub">
          <a href="#boundary">Security</a>
          <Link to="/pricing">Pricing</Link>
          <Link to="/story">Story</Link>
          <a href={signinUrl}>Sign in</a>
        </div>
        <a className="btn btn-primary btn-lg btn-block mm-cta" href="#run">Put it to work</a>
      </div>

      <main id="top">

        <header className="ahero stage-dark" data-stage="dark" id="hero">
          <div className="ahero-atlas" aria-hidden="true">
            <div className="dots" id="ahero-dots"></div>
            <div className="glow"></div>
            <div className="vignette"></div>
          </div>
          <div className="wrap ahero-inner">
            <div className="ahero-copy">
              <span className="kicker reveal"><span className="ix">01</span> ZAKI Agent · in action</span>
              <h1 className="display-xl reveal" data-d="1">You bring the goal.<br /><em className="hl">It brings the receipts.</em></h1>
              <p className="lede reveal" data-d="2">Most assistants give you a to-do list. Your agent goes and does the list — it plans, opens the tabs, makes the calls, drafts the replies, and comes back when it's done. Or when it needs you. Never before.</p>
              <div className="ahero-namer reveal" data-d="3">
                <span className="namer-q">First things first — what do you call yours?</span>
                <form className="namer-form" id="namer-form">
                  <input className="namer-input" id="namer-input" type="text" maxLength={18} placeholder="Zee" autoComplete="off" spellCheck={false} aria-label="Name your agent" />
                  <button className="btn btn-primary" type="submit">Say hi <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                </form>
                <span className="namer-greet" id="namer-greet" hidden></span>
              </div>
            </div>
            <div className="ahero-stage" aria-hidden="true">
              <div className="ahero-bot-ring"></div>
              <img className="abot" id="hero-bot" src="/zaki/bot/wave.png" alt="Your ZAKI agent, waving" />
              <div className="abot-tag" id="hero-tag"><span className="abot-dot"></span><span id="hero-tag-name">Zee</span> · online &amp; nosy</div>
            </div>
          </div>
          <button className="ahero-scroll" id="scroll-cue" aria-label="See it work">
            <span>watch it work</span>
            <svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </header>

        <section className="chapter stage-light arun" data-stage="light" id="run">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">02</span> Hand it something</span>
              <h2 className="display">Give it a real task.<br />Watch the whole thing happen.</h2>
              <p className="lede">Pick one of these (they're real) or type your own. Then sit back — it thinks out loud so you always know what it's doing, and it stops at the one moment that needs you.</p>
            </div>
            <div className="run-shell reveal" data-d="1">
              <div className="console" id="console">
                <div className="console-bar">
                  <span className="cb-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                  <span className="cb-title">
                    <img className="cb-bot" id="cb-bot" src="/zaki/bot/happy.png" alt="" />
                    <b id="cb-name">Zee</b>
                    <span className="cb-state" id="cb-state">ready when you are</span>
                  </span>
                  <span className="cb-clock" id="cb-clock">idle</span>
                </div>
                <div className="console-body" id="console-body">
                  <div className="console-empty" id="console-empty">
                    <img src="/zaki/bot/thinking.png" alt="" className="ce-bot" />
                    <p>Nothing on my plate. <span>Give me something to chew on.</span></p>
                  </div>
                  <div className="run-log" id="run-log" aria-live="polite"></div>
                </div>
                <div className="console-input">
                  <input className="goal-input" id="goal-input" type="text" placeholder="Tell it what you need done…" autoComplete="off" aria-label="Task for your agent" />
                  <button className="btn btn-primary goal-send" id="goal-send" type="button">Send it
                    <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
              <aside className="run-presets">
                <span className="presets-k">Try one — go on</span>
                <button className="preset" data-mission="0"><b>🎉 Plan Maya's surprise party</b><span>venue, cake, 12 texts</span></button>
                <button className="preset" data-mission="1"><b>🦷 Find a dentist open Saturday</b><span>in-network, near me</span></button>
                <button className="preset" data-mission="2"><b>📥 Untangle my inbox</b><span>147 unread → 4 that matter</span></button>
                <button className="preset" data-mission="3"><b>✈️ Replan the trip — flight got cancelled</b><span>rebook, hotel, the group chat</span></button>
                <div className="presets-note">It narrates everything. You approve the one step that leaves the building.</div>
              </aside>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark abond" data-stage="dark" id="bond">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">03</span> Yes, it has a personality</span>
              <h2 className="display">Competent. Loyal.<br />A <em className="hl">little bit of a character.</em></h2>
              <p className="lede">It's not a vending machine for answers. It has opinions, it'll tell you when something's a bad idea, and it's genuinely on your side — the kind of teammate that remembers your coffee order and your deadlines.</p>
            </div>
            <div className="mood-board reveal" data-d="1">
              <figure className="mood"><img src="/zaki/bot/grin.png" alt="" /><figcaption><b>Honest</b>"Three options. I'd pick the second. The first is a trap."</figcaption></figure>
              <figure className="mood"><img src="/zaki/bot/heart.png" alt="" /><figcaption><b>Loyal</b>"Got your back. Already handled the boring part."</figcaption></figure>
              <figure className="mood"><img src="/zaki/bot/surprised.png" alt="" /><figcaption><b>Real</b>"Hmm, that link's dead. Want me to dig for the new one?"</figcaption></figure>
              <figure className="mood"><img src="/zaki/bot/hop.png" alt="" /><figcaption><b>Hyped</b>"Done. Took 9 minutes. We make a good team."</figcaption></figure>
            </div>
            <div className="bond-strip reveal" data-d="2">
              <div className="bs-item"><img src="/zaki/bot/wink.png" alt="" /><p><b>It learns your taste.</b> Once you tell it "keep emails short," it never forgets. Correct it once; it sticks.</p></div>
              <div className="bs-item"><img src="/zaki/bot/thinking.png" alt="" /><p><b>It admits when it's unsure.</b> No confident nonsense. If it doesn't know, it asks — like a good teammate would.</p></div>
              <div className="bs-item"><img src="/zaki/bot/happy.png" alt="" /><p><b>It celebrates the win with you.</b> Small dignified victory dance included, free of charge.</p></div>
            </div>
          </div>
        </section>

        <section className="chapter stage-light acap" data-stage="light" id="can">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">04</span> What it can actually do</span>
              <h2 className="display">Not a chatbot. A doer.</h2>
              <p className="lede">Real actions in the real world — with your accounts, your tools, your rules. Here's the short list. The long list keeps growing.</p>
            </div>
            <div className="cap-grid reveal" data-d="1">
              <div className="cap"><span className="cap-n">Browse &amp; research</span><p>Opens the tabs, reads the fine print, compares the options, and brings back the 3 that don't suck.</p></div>
              <div className="cap"><span className="cap-n">Book &amp; arrange</span><p>Tables, appointments, tickets, calls. It fills the forms; you tap approve.</p></div>
              <div className="cap"><span className="cap-n">Draft &amp; reply</span><p>Emails, messages, docs — in your voice, the length you like, ready to send.</p></div>
              <div className="cap"><span className="cap-n">Organize the mess</span><p>Inbox, files, notes, that 40-tab browser. It sorts; you breathe.</p></div>
              <div className="cap"><span className="cap-n">Watch &amp; nudge</span><p>"Tell me when the price drops / they reply / the slot opens." It waits so you don't have to.</p></div>
              <div className="cap"><span className="cap-n">Follow through</span><p>The part everyone forgets. It checks the loop is actually closed — then tells you.</p></div>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark abound" data-stage="dark" id="boundary">
          <div className="wrap abound-inner">
            <div className="sec-head center reveal">
              <span className="kicker center"><span className="ix">05</span> The one rule</span>
              <h2 className="display">It reaches the edge.<br />Then it <em className="hl">waits for you.</em></h2>
              <p className="lede" style={{ marginInline: "auto" }}>It can do almost everything on its own. But the moment something leaves the building — a send, a payment, a booking — it stops cold and asks. Every single time. No surprises, ever.</p>
            </div>
            <div className="boundary-demo reveal" data-d="1">
              <div className="bd-track">
                <span className="bd-label bd-a">handled it all</span>
                <span className="bd-line"></span>
                <span className="bd-lock" id="bd-lock">
                  <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" /></svg>
                </span>
                <img className="bd-bot" src="/zaki/bot/thinking.png" alt="" />
                <span className="bd-label bd-b">waits for you</span>
              </div>
              <div className="permit">
                <div className="permit-head"><span className="status live">Needs your OK</span><span className="permit-t">Send 12 invites to Maya's party</span></div>
                <p className="permit-body">Ready to text 12 people from your list. Nothing's gone out yet — your call.</p>
                <div className="permit-actions">
                  <button className="btn btn-ghost btn-sm" id="permit-no">Not yet</button>
                  <button className="btn btn-primary btn-sm" id="permit-yes">Approve &amp; send</button>
                </div>
                <div className="permit-done" id="permit-done" hidden><img src="/zaki/bot/heart.png" alt="" />Sent. RSVPs already rolling in. 🎂</div>
              </div>
              <ul className="boundary-list">
                <li>You see every step before it happens</li>
                <li>Stop or steer it mid-task, anytime</li>
                <li>It never spends, sends, or shares without a yes</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark acta" data-stage="dark" id="cta">
          <div className="acta-atlas" aria-hidden="true"><div className="dots"></div><div className="glow"></div></div>
          <div className="wrap acta-inner">
            <img className="acta-bot reveal" id="cta-bot" src="/zaki/bot/sunglasses.png" alt="" />
            <span className="kicker center reveal" data-d="1">Stop doing it alone</span>
            <h2 className="display-xl reveal" data-d="1">Give <em className="hl" id="cta-name">your agent</em> the first thing.</h2>
            <p className="acta-sub reveal" data-d="2">Something you've been putting off. Something annoying. Something with 14 tabs. Hand it over and watch what "done" feels like.</p>
            <div className="acta-btns reveal" data-d="2">
              <a className="btn btn-primary btn-lg" href={signupUrl}>
                <span>Put it to work</span>
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <Link className="btn btn-ghost btn-lg" to="/">See the whole system</Link>
            </div>
            <p className="acta-sign reveal" data-d="3">Never build alone.</p>
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
              <Link to="/#design">Design</Link>
              <Link to="/#learn">Learn</Link>
              <Link to="/#career">Career</Link>
            </div>
            <div className="fcol">
              <span className="fcol-k">Company</span>
              <Link to="/story">Story</Link>
              <a href="#boundary">Security</a>
              <Link to="/pricing">Pricing</Link>
              <a href={signupUrl}>Contact</a>
            </div>
            <div className="fcol">
              <span className="fcol-k">Begin</span>
              <a href="#run">Put it to work</a>
              <a href={signinUrl}>Sign in</a>
              <Link to="/">The whole system</Link>
            </div>
          </nav>
        </div>
        <div className="footer-wordmark" aria-hidden="true">ZAKI</div>
        <div className="wrap footer-base">
          <span>© 2026 ZAKI · Kreyatif Studio</span>
          <span className="footer-tagline">One intelligence. Many ways forward.</span>
          <span className="footer-locale">EN · <Link to="/ar">العربية</Link></span>
        </div>
      </footer>
    </>
  );
}
