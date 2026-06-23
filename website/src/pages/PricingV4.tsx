import { Link } from "react-router-dom";
import { appHandoffUrl } from "../lib/appHandoff";
import { useZakiProductPage } from "../hooks/useZakiPage";

export function PricingV4() {
  useZakiProductPage("/zaki/styles/zaki-pricing.css", "/zaki/scripts/zaki-pricing.js");
  const signupUrl = appHandoffUrl("/", "website_pricing_cta", "plans");
  const signinUrl = appHandoffUrl("/", "website_pricing_signin", "dashboard");

  const checkIcon = (
    <svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
  const plusIcon = (
    <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
  );

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
          <Link to="/#trust">Security</Link>
          <Link to="/pricing" aria-current="page">Pricing</Link>
          <Link to="/story">Story</Link>
        </nav>
        <div className="nav-actions">
          <a className="signin" href={signinUrl}>Sign in</a>
          <a className="btn btn-primary btn-sm" href="#plans">Get ZAKI</a>
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
          <Link to="/#trust">Security</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/story">Story</Link>
          <a href={signinUrl}>Sign in</a>
        </div>
        <a className="btn btn-primary btn-lg btn-block mm-cta" href="#plans">Get ZAKI</a>
      </div>

      <main id="top">

        <header className="phero stage-dark" data-stage="dark" id="hero">
          <div className="phero-atlas" aria-hidden="true"><div className="dots"></div><div className="glow"></div></div>
          <div className="wrap phero-inner">
            <span className="kicker center reveal">Pricing</span>
            <h1 className="display-xl reveal" data-d="1">One platform.<br /><em className="hl">Pick your limits.</em></h1>
            <p className="lede reveal" data-d="2">Every plan unlocks all of ZAKI — Agent, Spaces, Memory, and everything coming next. You're not buying features. You're choosing how much room you need.</p>
            <div className="bill reveal" data-d="3" id="bill" data-cycle="monthly" role="group" aria-label="Billing cycle">
              <span className="knob" aria-hidden="true"></span>
              <button id="bill-monthly" className="on" aria-pressed="true"><span>Monthly</span></button>
              <button id="bill-annual" aria-pressed="false"><span>Annual <span className="save">2 months free</span></span></button>
            </div>
          </div>
        </header>

        <section className="chapter stage-light plans" data-stage="light" id="plans" style={{ paddingTop: "clamp(40px,5vw,64px)" }}>
          <div className="wrap">
            <div className="plan-grid">

              <article className="plan reveal" data-d="1">
                <div className="plan-name">Free</div>
                <div className="plan-for">For trying ZAKI properly — not a trial.</div>
                <div className="plan-price">
                  <span className="plan-cur">$</span>
                  <span className="plan-amt" data-monthly="0" data-annual="0">0</span>
                  <span className="plan-per" data-static="1">forever</span>
                </div>
                <div className="plan-bill" data-monthly="Funded by the community" data-annual="Funded by the community">Funded by the community</div>
                <span className="plan-mult"><b>1×</b> light limits</span>
                <a className="btn btn-ghost btn-block plan-cta" href={signupUrl}>Start free</a>
                <div className="plan-feats">
                  <div className="plan-feat">{checkIcon}<span>The <b>full platform</b> — every product</span></div>
                  <div className="plan-feat">{checkIcon}<span>50 Agent runs / month</span></div>
                  <div className="plan-feat">{checkIcon}<span>30-day memory</span></div>
                  <div className="plan-feat">{checkIcon}<span>Community support</span></div>
                </div>
              </article>

              <article className="plan reveal" data-d="2">
                <div className="plan-name">Personal</div>
                <div className="plan-for">For everyday momentum.</div>
                <div className="plan-price">
                  <span className="plan-cur">$</span>
                  <span className="plan-amt" data-monthly="15" data-annual="12.50">15</span>
                  <span className="plan-per">/mo</span>
                </div>
                <div className="plan-bill" data-monthly="Billed monthly" data-annual="$150/yr · <em>save $30</em>">Billed monthly</div>
                <span className="plan-mult"><b>1×</b> baseline</span>
                <a className="btn btn-ghost btn-block plan-cta" href={signupUrl}>Get Personal</a>
                <div className="plan-feats">
                  <div className="plan-feat">{checkIcon}<span>Everything in Free, with room</span></div>
                  <div className="plan-feat">{checkIcon}<span><b>500</b> Agent runs / month</span></div>
                  <div className="plan-feat">{checkIcon}<span>1-year memory retention</span></div>
                  <div className="plan-feat">{checkIcon}<span>Standard support</span></div>
                </div>
              </article>

              <article className="plan featured reveal" data-d="3">
                <span className="plan-flag">Most popular</span>
                <div className="plan-name">Pro</div>
                <div className="plan-for">For serious daily drivers.</div>
                <div className="plan-price">
                  <span className="plan-cur">$</span>
                  <span className="plan-amt" data-monthly="45" data-annual="37.50">45</span>
                  <span className="plan-per">/mo</span>
                </div>
                <div className="plan-bill" data-monthly="Billed monthly" data-annual="$450/yr · <em>save $90</em>">Billed monthly</div>
                <span className="plan-mult"><b>5×</b> Personal</span>
                <a className="btn btn-primary btn-block plan-cta" href={signupUrl}>Get Pro</a>
                <div className="plan-feats">
                  <div className="plan-feat">{checkIcon}<span><b>5× the limits</b> of Personal</span></div>
                  <div className="plan-feat">{checkIcon}<span><b>2,500</b> Agent runs / month</span></div>
                  <div className="plan-feat">{checkIcon}<span>5-year memory + priority speed</span></div>
                  <div className="plan-feat">{plusIcon}<span>Funds <b>1 free seat</b> for someone else</span></div>
                </div>
              </article>

              <article className="plan reveal" data-d="4">
                <div className="plan-name">Pro Max</div>
                <div className="plan-for">For power users and small teams.</div>
                <div className="plan-price">
                  <span className="plan-cur">$</span>
                  <span className="plan-amt" data-monthly="99" data-annual="82.50">99</span>
                  <span className="plan-per">/mo</span>
                </div>
                <div className="plan-bill" data-monthly="Billed monthly" data-annual="$990/yr · <em>save $198</em>">Billed monthly</div>
                <span className="plan-mult"><b>15×</b> Personal</span>
                <a className="btn btn-ghost btn-block plan-cta" href={signupUrl}>Get Pro Max</a>
                <div className="plan-feats">
                  <div className="plan-feat">{checkIcon}<span><b>15× the limits</b> of Personal</span></div>
                  <div className="plan-feat">{checkIcon}<span><b>7,500</b> Agent runs / month</span></div>
                  <div className="plan-feat">{checkIcon}<span>Lifetime memory + dedicated support</span></div>
                  <div className="plan-feat">{plusIcon}<span>Funds <b>3 free seats</b> for others</span></div>
                </div>
              </article>

            </div>
            <div className="allplans reveal" data-d="2">
              <span className="ap-k">On every plan</span>
              <span className="ap-t">The whole platform, the permission boundary, and private-by-design memory. <b>Tiers only change the ceiling — never the features.</b></span>
            </div>
          </div>
        </section>

        <section className="chapter stage-light incl-sec" data-stage="light" id="included" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="incl-head">
              <span className="kicker center reveal">Included everywhere</span>
              <h2 className="display reveal" data-d="1">Free or Pro Max, you get<br />the <em className="hl">whole</em> ZAKI.</h2>
              <p className="lede reveal" data-d="2">No locked products, no "upgrade to unlock." Paying simply raises your limits — every capability is on from day one.</p>
            </div>
            <div className="incl-grid">
              <div className="incl reveal" data-d="1">
                <div className="incl-ic"><svg viewBox="0 0 22 22" fill="none"><path d="M11 2l2 5 5 1.8-3.7 3.2 1 5.2L11 14.7 5.7 17.2l1-5.2L3 8.8 8 7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></div>
                <div className="incl-t">Agent</div>
                <div className="incl-d">Delegate the whole task — it plans, acts, and stops at the edge for your yes.</div>
              </div>
              <div className="incl t reveal" data-d="2">
                <div className="incl-ic"><svg viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.3" /><path d="M3 9h16M9 9v10" stroke="currentColor" strokeWidth="1.3" /></svg></div>
                <div className="incl-t">Spaces</div>
                <div className="incl-d">Keep every part of life in its own world — shared docs, many threads, separate memory.</div>
              </div>
              <div className="incl t reveal" data-d="3">
                <div className="incl-ic"><svg viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.3" /><circle cx="11" cy="11" r="2.6" fill="currentColor" /></svg></div>
                <div className="incl-t">9-layer Memory</div>
                <div className="incl-d">The continuity layer under everything — inspect it, correct it, or forget it. Always yours.</div>
              </div>
              <div className="incl reveal" data-d="1">
                <div className="incl-ic"><svg viewBox="0 0 22 22" fill="none"><rect x="5" y="10" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M8 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.3" /></svg></div>
                <div className="incl-t">The permission boundary</div>
                <div className="incl-d">Nothing leaves the building — no send, payment, or booking — without your explicit yes.</div>
              </div>
              <div className="incl reveal" data-d="2">
                <div className="incl-ic"><svg viewBox="0 0 22 22" fill="none"><path d="M11 2.5 4 5.5v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9v-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></div>
                <div className="incl-t">Private by design</div>
                <div className="incl-d">Your memory is encrypted and never trains a shared model. Export or delete it anytime.</div>
              </div>
              <div className="incl t reveal" data-d="3">
                <div className="incl-ic"><svg viewBox="0 0 22 22" fill="none"><path d="M4 16l8-8 1.5 1.5M15 5l2 2-9.5 9.5L5 17l.5-2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></div>
                <div className="incl-t">Everything coming next</div>
                <div className="incl-d">Design, Learn, and Career land for every tier the moment they ship — no new plan needed.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark give" data-stage="dark" id="give">
          <div className="wrap give-inner">
            <div className="give-copy">
              <span className="kicker reveal">How Free stays free</span>
              <h2 className="display reveal" data-d="1">Every paid seat<br /><em className="hlt">opens another.</em></h2>
              <p className="lede reveal" data-d="2">Free isn't a loss-leader or a trial that expires — it's funded by the people who pay. When you go Pro, you're not just upgrading yourself. You're keeping someone else on the platform.</p>
              <div className="give-points reveal" data-d="3">
                <div className="give-point">
                  <span className="gp-ic"><svg viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" /><path d="M3.5 15a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg></span>
                  <span className="gp-t"><b>Pro funds one free seat.</b> One person, somewhere, uses ZAKI for free because you went Pro.</span>
                </div>
                <div className="give-point">
                  <span className="gp-ic"><svg viewBox="0 0 18 18" fill="none"><circle cx="6" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.4" /><circle cx="12.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4" /><path d="M2.5 15a4 4 0 0 1 7 0M10 14.2a4 4 0 0 1 5.5-1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg></span>
                  <span className="gp-t"><b>Pro Max funds three.</b> A student, a job-seeker, a maker — three free seats, on you.</span>
                </div>
                <div className="give-point">
                  <span className="gp-ic"><svg viewBox="0 0 18 18" fill="none"><path d="M9 15.5C5 13.5 2.5 11 2.5 7.5A3.5 3.5 0 0 1 9 5a3.5 3.5 0 0 1 6.5 2.5c0 3.5-2.5 6-6.5 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></span>
                  <span className="gp-t"><b>No ads, no data resale.</b> The model is simple: those who can, cover those who can't.</span>
                </div>
              </div>
            </div>
            <div className="reveal" data-d="2">
              <div className="fund">
                <div className="fund-row">
                  <div className="fund-payer"><span className="fund-chip pro">Pro</span></div>
                  <span className="fund-arrow"><svg viewBox="0 0 36 14" fill="none"><path d="M1 7h30M27 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  <div className="fund-seats">
                    <span className="fund-seat"><svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M2.5 10a3.5 3.5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>1 free seat</span>
                  </div>
                </div>
                <div className="fund-row">
                  <div className="fund-payer"><span className="fund-chip max">Pro Max</span></div>
                  <span className="fund-arrow"><svg viewBox="0 0 36 14" fill="none"><path d="M1 7h30M27 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  <div className="fund-seats">
                    <span className="fund-seat"><svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M2.5 10a3.5 3.5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>seat</span>
                    <span className="fund-seat"><svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M2.5 10a3.5 3.5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>seat</span>
                    <span className="fund-seat"><svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M2.5 10a3.5 3.5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>seat</span>
                  </div>
                </div>
                <div className="fund-note">
                  <img src="/zaki/bot/heart.png" alt="" />
                  <span><b>Free users get the full platform too</b> — same products, lighter limits. Nobody's locked out of ZAKI.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-light cmp-sec" data-stage="light" id="compare">
          <div className="wrap">
            <div className="cmp-head">
              <span className="kicker center reveal">Compare the limits</span>
              <h2 className="display reveal" data-d="1">Same platform. More headroom.</h2>
            </div>
            <div className="cmp-wrap reveal" data-d="1">
              <table className="cmp">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Free<span className="cmp-sub">$0</span></th>
                    <th>Personal<span className="cmp-sub">$15/mo</span></th>
                    <th className="feat-col">Pro<span className="cmp-sub">$45/mo</span></th>
                    <th>Pro Max<span className="cmp-sub">$99/mo</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="row-group"><td colSpan={5}>Platform</td></tr>
                  <tr><th>Agent, Spaces &amp; Memory</th><td className="yes">All</td><td className="yes">All</td><td className="feat">All</td><td className="yes">All</td></tr>
                  <tr><th>Future products at launch</th><td className="yes">Yes</td><td className="yes">Yes</td><td className="feat">Yes</td><td className="yes">Yes</td></tr>
                  <tr><th>Permission boundary</th><td className="yes">Yes</td><td className="yes">Yes</td><td className="feat">Yes</td><td className="yes">Yes</td></tr>
                  <tr className="row-group"><td colSpan={5}>Limits</td></tr>
                  <tr><th>Agent runs / month</th><td>50</td><td>500</td><td className="feat">2,500</td><td>7,500</td></tr>
                  <tr><th>Active Spaces</th><td>3</td><td>10</td><td className="feat">50</td><td>150</td></tr>
                  <tr><th>Memory retention</th><td>30 days</td><td>1 year</td><td className="feat">5 years</td><td>Lifetime</td></tr>
                  <tr><th>Concurrent tasks</th><td>1</td><td>3</td><td className="feat">8</td><td>20</td></tr>
                  <tr className="row-group"><td colSpan={5}>Community &amp; support</td></tr>
                  <tr><th>Free seats you fund</th><td className="dash">—</td><td className="dash">—</td><td className="feat">1</td><td>3</td></tr>
                  <tr><th>Support</th><td>Community</td><td>Standard</td><td className="feat">Priority</td><td>Dedicated</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="chapter stage-light faq-sec" data-stage="light" id="faq" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="faq-head">
              <span className="kicker center reveal">Good questions</span>
              <h2 className="display reveal" data-d="1">Before you pick.</h2>
            </div>
            <div className="faq-list reveal" data-d="1">
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">Do cheaper plans lose features?<span className="fq-ic"><svg viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></button>
                <div className="faq-a"><div className="faq-a-inner">No. Every plan — including Free — runs the complete platform: Agent, Spaces, Memory, the permission boundary, and every product we ship next. The only thing that changes between tiers is your ceiling: runs per month, memory retention, concurrent tasks, and Spaces.</div></div>
              </div>
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">What does "5×" and "15×" actually mean?<span className="fq-ic"><svg viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></button>
                <div className="faq-a"><div className="faq-a-inner">Personal is the baseline (1×). Pro gives you five times those limits — five times the Agent runs, far deeper memory, more Spaces. Pro Max gives you fifteen times the baseline, plus lifetime memory and dedicated support. Same features, much more room.</div></div>
              </div>
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">How is Free funded?<span className="fq-ic"><svg viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></button>
                <div className="faq-a"><div className="faq-a-inner">By paying members. A Pro subscription covers one free seat for someone else; Pro Max covers three. There are no ads and we never sell your data — the people who can pay simply cover the people who can't, so nobody is locked out of ZAKI.</div></div>
              </div>
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">What does annual billing save?<span className="fq-ic"><svg viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></button>
                <div className="faq-a"><div className="faq-a-inner">Two months. Annual billing charges ten months for twelve — Personal is $150/yr, Pro $450/yr, and Pro Max $990/yr. You can switch between monthly and annual anytime; the change applies at your next renewal.</div></div>
              </div>
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">Can I change or cancel later?<span className="fq-ic"><svg viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></button>
                <div className="faq-a"><div className="faq-a-inner">Anytime, in a click. Upgrades take effect immediately; downgrades apply at renewal. If you cancel, you drop to Free — you keep the platform and your memory within Free's retention window, and nothing is deleted without your say-so.</div></div>
              </div>
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">Is my memory private on every tier?<span className="fq-ic"><svg viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></button>
                <div className="faq-a"><div className="faq-a-inner">Yes — privacy isn't a paid add-on. On Free and on Pro Max alike, your memory is encrypted, never used to train a shared model, and fully yours to inspect, export, or delete at any moment.</div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="chapter stage-dark scta" data-stage="dark" id="cta">
          <div className="scta-atlas" aria-hidden="true"><div className="dots"></div><div className="glow"></div></div>
          <div className="wrap scta-inner">
            <img className="scta-bot reveal" src="/zaki/bot/wave.png" alt="ZAKI Presence" />
            <span className="kicker center reveal" data-d="1">Start where you are</span>
            <h2 className="display-xl reveal" data-d="1">Begin free.<br />Grow when you <em className="hl">need to.</em></h2>
            <p className="scta-sub reveal" data-d="2">The whole platform is one click away — no card for Free. Move up the moment you want more room, and lift someone else up while you're at it.</p>
            <div className="scta-btns reveal" data-d="2">
              <a className="btn btn-primary btn-lg" href={signupUrl}>Start free
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <Link className="btn btn-ghost btn-lg" to="/story">Read the story</Link>
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
              <Link to="/#trust">Security</Link>
              <Link to="/pricing">Pricing</Link>
              <a href={signupUrl}>Contact</a>
            </div>
            <div className="fcol">
              <span className="fcol-k">Begin</span>
              <a href={signupUrl}>Meet ZAKI</a>
              <a href={signinUrl}>Sign in</a>
              <a href="#plans">See plans</a>
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
