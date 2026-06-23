import { Link } from "react-router-dom";
import { appHandoffUrl } from "../lib/appHandoff";
import { useZakiProductPage } from "../hooks/useZakiPage";

export function SpacesPage() {
  useZakiProductPage("/zaki/styles/zaki-spaces.css", "/zaki/scripts/zaki-spaces.js");
  const signupUrl = appHandoffUrl("/", "website_spaces_cta", "chat");
  const signinUrl = appHandoffUrl("/", "website_spaces_signin", "dashboard");

  return (
    <>
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
                <Link className="mega-card is-active" to="/spaces" role="menuitem" aria-current="page">
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
          <a href="#shared">Security</a>
          <Link to="/pricing">Pricing</Link>
          <Link to="/story">Story</Link>
        </nav>
        <div className="nav-actions">
          <a className="signin" href={signinUrl}>Sign in</a>
          <a className="btn btn-primary btn-sm" href="#workspace">Open a Space</a>
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
          <a href="#shared">Security</a>
          <Link to="/pricing">Pricing</Link>
          <Link to="/story">Story</Link>
          <a href={signinUrl}>Sign in</a>
        </div>
        <a className="btn btn-primary btn-lg btn-block mm-cta" href="#workspace">Open a Space</a>
      </div>

      <main id="top">

        <header className="shero stage-dark" data-stage="dark" id="hero">
          <div className="shero-atlas" aria-hidden="true">
            <div className="dots" id="shero-dots"></div>
            <div className="glow"></div>
            <div className="vignette"></div>
          </div>
          <div className="wrap shero-inner">
            <div className="shero-copy">
              <span className="kicker reveal"><span className="ix">01</span> ZAKI Spaces · in context</span>
              <h1 className="display-xl reveal" data-d="1">Many worlds.<br />One mind.<br /><em className="hlt">Zero mix-ups.</em></h1>
              <p className="lede reveal" data-d="2">Your launch, your apartment hunt, your quarter at work, the wedding — each one is its own Space, with its own threads, docs, and memory. ZAKI carries one continuous mind across all of them, and it never brings the wrong world into the room.</p>
              <div className="shero-btns reveal" data-d="3">
                <a className="btn btn-primary btn-lg" href="#workspace">
                  <span>Open a Space</span>
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
                <Link className="btn btn-ghost btn-lg" to="/agent">See the Agent</Link>
              </div>
            </div>
            <div className="shero-stack reveal" data-d="2" aria-hidden="true">
              <span className="sh-card sh-3"><span className="sh-emoji">💼</span><span className="sh-n">Q3 at Work</span></span>
              <span className="sh-card sh-2"><span className="sh-emoji">🏠</span><span className="sh-n">Apartment Hunt</span></span>
              <span className="sh-card sh-1"><span className="sh-emoji">🎨</span><span className="sh-n">Portfolio Launch</span><img className="sh-bot" src="/zaki/bot/happy.png" alt="" /></span>
            </div>
          </div>
        </header>

        <section className="chapter stage-light sworkspace" data-stage="light" id="workspace">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">02</span> Step inside</span>
              <h2 className="display">Switch worlds. Watch everything change with you.</h2>
              <p className="lede">Pick a Space on the left. Its threads, its docs, and — the important part — what ZAKI remembers all swap instantly. Nothing leaks between them.</p>
            </div>
            <div className="ws reveal" data-d="1">
              <aside className="ws-rail" role="tablist" aria-label="Your spaces">
                <span className="ws-rail-k">Your Spaces</span>
                <button className="ws-space active" data-space="0" role="tab" aria-selected="true"><span className="ws-emoji">🎨</span><span className="ws-meta"><b>Portfolio Launch</b><i>3 threads · 3 people</i></span></button>
                <button className="ws-space" data-space="1" role="tab" aria-selected="false"><span className="ws-emoji">🏠</span><span className="ws-meta"><b>Apartment Hunt</b><i>3 threads · just you</i></span></button>
                <button className="ws-space" data-space="2" role="tab" aria-selected="false"><span className="ws-emoji">💼</span><span className="ws-meta"><b>Q3 at Work</b><i>3 threads · 6 people</i></span></button>
                <button className="ws-space" data-space="3" role="tab" aria-selected="false"><span className="ws-emoji">💍</span><span className="ws-meta"><b>The Wedding</b><i>3 threads · 2 people</i></span></button>
                <button className="ws-new">+ New Space</button>
              </aside>
              <div className="ws-panel" id="ws-panel">
                <div className="ws-view active" data-view="0">
                  <div className="ws-head"><span className="ws-emoji big">🎨</span><div><h3>Portfolio Launch</h3><span className="ws-sub">Get the new site live before the 14th</span></div><span className="ws-people"><i></i><i></i><i></i></span></div>
                  <div className="ws-cols">
                    <div className="ws-col"><span className="ws-col-k">Threads</span>
                      <a className="ws-thread"><b>Homepage copy — v3</b><span className="ws-badge">2 new</span></a>
                      <a className="ws-thread"><b>Case study order</b></a>
                      <a className="ws-thread"><b>Domain + hosting</b></a>
                    </div>
                    <div className="ws-col"><span className="ws-col-k">Docs</span>
                      <a className="ws-doc">📄 Brand one-pager</a>
                      <a className="ws-doc">🗂 Shot list</a>
                    </div>
                  </div>
                  <div className="ws-mem"><span className="ws-mem-k">This Space remembers</span>
                    <span className="ws-chip">Live before the 14th</span><span className="ws-chip">Tone: confident, not salesy</span><span className="ws-chip">Use the teal, never the orange</span>
                  </div>
                </div>
                <div className="ws-view" data-view="1">
                  <div className="ws-head"><span className="ws-emoji big">🏠</span><div><h3>Apartment Hunt</h3><span className="ws-sub">Find a place by end of month</span></div><span className="ws-people solo">just you</span></div>
                  <div className="ws-cols">
                    <div className="ws-col"><span className="ws-col-k">Threads</span>
                      <a className="ws-thread"><b>Shortlist: 3 places</b><span className="ws-badge">1 new</span></a>
                      <a className="ws-thread"><b>Mover quotes</b></a>
                      <a className="ws-thread"><b>Lease questions</b></a>
                    </div>
                    <div className="ws-col"><span className="ws-col-k">Docs</span>
                      <a className="ws-doc">📄 Budget sheet</a>
                      <a className="ws-doc">✅ Viewing checklist</a>
                    </div>
                  </div>
                  <div className="ws-mem"><span className="ws-mem-k">This Space remembers</span>
                    <span className="ws-chip">Max $2,400 / month</span><span className="ws-chip">Must allow cats</span><span className="ws-chip">No ground floor</span>
                  </div>
                </div>
                <div className="ws-view" data-view="2">
                  <div className="ws-head"><span className="ws-emoji big">💼</span><div><h3>Q3 at Work</h3><span className="ws-sub">Ship the roadmap, close two roles</span></div><span className="ws-people"><i></i><i></i><i></i><i></i><span className="ws-more">+2</span></span></div>
                  <div className="ws-cols">
                    <div className="ws-col"><span className="ws-col-k">Threads</span>
                      <a className="ws-thread"><b>Roadmap draft</b><span className="ws-badge">4 new</span></a>
                      <a className="ws-thread"><b>1:1 notes</b></a>
                      <a className="ws-thread"><b>Hiring loop — 2 open</b></a>
                    </div>
                    <div className="ws-col"><span className="ws-col-k">Docs</span>
                      <a className="ws-doc">📄 Q3 OKRs</a>
                      <a className="ws-doc">📊 Headcount plan</a>
                    </div>
                  </div>
                  <div className="ws-mem"><span className="ws-mem-k">This Space remembers</span>
                    <span className="ws-chip">Investor update — every other Monday</span><span className="ws-chip">Keep updates to 5 bullets</span><span className="ws-chip">Don't @ the CEO before 9am</span>
                  </div>
                </div>
                <div className="ws-view" data-view="3">
                  <div className="ws-head"><span className="ws-emoji big">💍</span><div><h3>The Wedding</h3><span className="ws-sub">October. Outdoors. Keep it small.</span></div><span className="ws-people"><i></i><i></i></span></div>
                  <div className="ws-cols">
                    <div className="ws-col"><span className="ws-col-k">Threads</span>
                      <a className="ws-thread"><b>Guest list — 84</b><span className="ws-badge">3 new</span></a>
                      <a className="ws-thread"><b>Venue tour — Sat</b></a>
                      <a className="ws-thread"><b>Vendor calls</b></a>
                    </div>
                    <div className="ws-col"><span className="ws-col-k">Docs</span>
                      <a className="ws-doc">📄 Budget</a>
                      <a className="ws-doc">🕒 Run-of-show</a>
                    </div>
                  </div>
                  <div className="ws-mem"><span className="ws-mem-k">This Space remembers</span>
                    <span className="ws-chip">Plus-ones: family only</span><span className="ws-chip">Sara's allergic to lilies</span><span className="ws-chip">Keep it under 90 guests</span>
                  </div>
                </div>
                <div className="ws-zaki">
                  <img className="ws-bot" id="ws-bot" src="/zaki/bot/happy.png" alt="" />
                  <span className="ws-says" id="ws-says">Portfolio Launch. Designer brain on — I'll keep the work tone in here.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark sanat" data-stage="dark" id="anatomy">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">03</span> What's in a Space</span>
              <h2 className="display">Everything for one effort,<br />finally in <em className="hlt">one place.</em></h2>
              <p className="lede">No more "which chat was that in?" A Space holds the whole world of a project — and ZAKI treats all of it as connected.</p>
            </div>
            <div className="anat-grid reveal" data-d="1">
              <div className="anat"><span className="anat-n">Threads</span><p>As many conversations as the work needs — all sharing the same context, none of them starting from scratch.</p></div>
              <div className="anat"><span className="anat-n">Docs &amp; files</span><p>Briefs, sheets, checklists, references. ZAKI reads them, updates them, and keeps them with the work.</p></div>
              <div className="anat"><span className="anat-n">Its own memory</span><p>Goals, preferences, decisions — scoped to this Space. What it learns here stays here.</p></div>
              <div className="anat"><span className="anat-n">People</span><p>Invite who belongs. Everyone shares the threads and docs; ZAKI keeps it all in sync.</p></div>
            </div>
          </div>
        </section>

        <section className="chapter stage-light sleak" data-stage="light" id="context">
          <div className="wrap sleak-inner">
            <div className="sec-head center reveal">
              <span className="kicker center"><span className="ix">04</span> The quiet superpower</span>
              <h2 className="display">It knows which world you're in.</h2>
              <p className="lede" style={{ marginInline: "auto" }}>The wedding budget never wanders into the work roadmap. Your apartment's cat rule never shows up in a client email. Each Space is sealed — same mind, separate memories.</p>
            </div>
            <div className="leak-demo reveal" data-d="1">
              <div className="leak-card"><span className="leak-emoji">💼</span><b>Q3 at Work</b><span className="leak-mem">"Keep updates to 5 bullets"</span></div>
              <div className="leak-wall">
                <span className="leak-x"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span>
                <span className="leak-label">won't cross</span>
              </div>
              <div className="leak-card"><span className="leak-emoji">💍</span><b>The Wedding</b><span className="leak-mem">"Sara's allergic to lilies"</span></div>
            </div>
            <p className="leak-foot reveal" data-d="2">One mind that respects walls. That's the whole trick — and it's harder than it sounds.</p>
          </div>
        </section>

        <section className="chapter stage-dark sshared" data-stage="dark" id="shared">
          <div className="wrap sshared-grid">
            <div className="sec-head reveal">
              <span className="kicker"><span className="ix">05</span> Shared, on your terms</span>
              <h2 className="display">Some worlds are <em className="hlt">solo.</em><br />Some you build together.</h2>
              <p className="lede">Invite people into a Space and everyone works from the same threads, docs, and context. ZAKI shows up for the whole team — and still answers to your rules.</p>
              <ul className="shared-list">
                <li>Invite by email; set who can view or edit</li>
                <li>Shared Spaces share threads &amp; docs — not your private memory</li>
                <li>Leave or archive a Space anytime; nothing's locked in</li>
                <li>Every action still asks before it leaves the building</li>
              </ul>
            </div>
            <div className="shared-vis reveal" data-d="1" aria-hidden="true">
              <div className="sv-space">
                <span className="sv-emoji">🎨</span><b>Portfolio Launch</b><span className="sv-tag">Shared · 3 people</span>
                <div className="sv-people"><i></i><i></i><i></i></div>
                <div className="sv-row"><span className="sv-dot"></span>You · owner</div>
                <div className="sv-row"><span className="sv-dot"></span>Designer · can edit</div>
                <div className="sv-row"><span className="sv-dot"></span>Client · can view</div>
                <div className="sv-zaki"><img src="/zaki/bot/grin.png" alt="" />Shared with the team. Your private memory stays yours.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark scta" data-stage="dark" id="cta">
          <div className="scta-atlas" aria-hidden="true"><div className="dots"></div><div className="glow"></div></div>
          <div className="wrap scta-inner">
            <img className="scta-bot reveal" src="/zaki/bot/hop.png" alt="" />
            <span className="kicker center reveal" data-d="1">Give your chaos a home</span>
            <h2 className="display-xl reveal" data-d="1">One Space for the<br />thing you're avoiding.</h2>
            <p className="scta-sub reveal" data-d="2">Start with the messiest project you've got. Drop in the threads, the docs, the half-decisions — and let ZAKI hold the whole world while you think.</p>
            <div className="scta-btns reveal" data-d="2">
              <a className="btn btn-primary btn-lg" href={signupUrl}>
                <span>Open a Space</span>
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <Link className="btn btn-ghost btn-lg" to="/">See the whole system</Link>
            </div>
            <p className="scta-sign reveal" data-d="3">Never build alone.</p>
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
              <a href="#shared">Security</a>
              <Link to="/pricing">Pricing</Link>
              <a href={signupUrl}>Contact</a>
            </div>
            <div className="fcol">
              <span className="fcol-k">Begin</span>
              <a href="#workspace">Open a Space</a>
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
