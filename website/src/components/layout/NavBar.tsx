import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Locale } from "../../lib/content";
import { appHandoffUrl } from "../../lib/appHandoff";
import { getLocaleSwitchPath } from "../../lib/routeRegistry";
import { Menu, Terminal, X } from "lucide-react";

export function NavBar({ locale }: { locale: Locale }) {
  const location = useLocation();
  const isArabic = locale === "ar";
  const botHref = isArabic ? "/ar/zaki-bot/" : "/zaki-bot/";
  const storyHref = isArabic ? "/ar/story/" : "/story/";
  const contactHref = isArabic ? "/ar/contact/" : "/contact/";

  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    const homePath = isArabic ? "/ar/" : "/";
    if (location.pathname === homePath || location.pathname === (isArabic ? "/ar" : "/")) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      e.preventDefault();
      navigate(homePath);
    }
  }, [location.pathname, isArabic, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", mobileOpen);
    return () => document.body.classList.remove("nav-open");
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { to: botHref, label: isArabic ? "الوكيل" : "Agent" },
    { to: storyHref, label: isArabic ? "القصة" : "Story" },
    { to: contactHref, label: isArabic ? "تواصل" : "Contact" },
  ];

  const isActive = (to: string) => location.pathname === to;

  return (
    <header
      className={`sticky top-0 z-40 font-mono-ui transition-colors duration-200 ${
        scrolled
          ? "border-b border-zk-border-strong bg-zk-bg"
          : "border-b border-zk-border bg-zk-bg"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-8">
        {/* Logo */}
        <Link
          to={isArabic ? "/ar/" : "/"}
          onClick={handleLogoClick}
          className="inline-flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span className="relative inline-flex size-6 items-center justify-center bg-zk-accent" aria-hidden="true">
            <span className="absolute inset-[5px] bg-zk-bg" />
            <span className="absolute inset-[9px] bg-zk-accent" />
          </span>
          <span className="text-[11px] uppercase tracking-[0.22em] text-zk-text">ZAKI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label={isArabic ? "التنقل الرئيسي" : "Primary navigation"}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative min-h-8 px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors duration-200 ${
                isActive(link.to)
                  ? "text-zk-text"
                  : "text-zk-text-secondary hover:text-zk-text"
              }`}
            >
              {link.label}
              {isActive(link.to) && (
                <span className="absolute inset-x-3 bottom-0 h-px bg-zk-accent" />
              )}
            </Link>
          ))}

          <span className="mx-2 h-4 w-px bg-zk-border-strong" />

          <Link
            to={getLocaleSwitchPath(location.pathname, isArabic ? "en" : "ar")}
            className="px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-zk-text-tertiary transition-colors hover:text-zk-text"
          >
            {isArabic ? "EN" : "عربي"}
          </Link>

          <a
            href={appHandoffUrl("/", "website_nav_command", "dashboard")}
            className="ms-1 inline-flex min-h-8 items-center gap-2 border border-zk-accent bg-zk-accent px-3 text-[10px] uppercase tracking-[0.14em] text-white transition-colors duration-200 hover:bg-zk-accent-hover"
          >
            <Terminal className="size-3.5" strokeWidth={1.5} />
            {isArabic ? "جرّب الأمر" : "Try command"}
          </a>
        </nav>

        {/* Mobile right */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to={getLocaleSwitchPath(location.pathname, isArabic ? "en" : "ar")}
            className="text-[10px] uppercase tracking-[0.16em] text-zk-text-tertiary transition-colors hover:text-zk-text"
          >
            {isArabic ? "EN" : "عربي"}
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex size-9 items-center justify-center border border-zk-border-strong text-zk-text transition-colors hover:bg-zk-surface"
            aria-label={mobileOpen ? (isArabic ? "أغلق القائمة" : "Close menu") : isArabic ? "افتح القائمة" : "Open menu"}
          >
            {mobileOpen ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-zk-border bg-zk-bg transition-all duration-200 md:hidden ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-0.5 px-5 py-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`border-b border-zk-border px-3 py-3 text-[11px] uppercase tracking-[0.16em] transition-colors ${
                isActive(link.to)
                  ? "text-zk-text"
                  : "text-zk-text-secondary hover:text-zk-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={appHandoffUrl("/", "website_nav_mobile_command", "dashboard")}
            className="mt-3 flex min-h-11 items-center justify-center gap-2 border border-zk-accent bg-zk-accent px-4 text-[11px] uppercase tracking-[0.14em] text-white transition-colors duration-200 hover:bg-zk-accent-hover"
          >
            <Terminal className="size-3.5" strokeWidth={1.5} />
            {isArabic ? "جرّب الأمر" : "Try command"}
          </a>
        </nav>
      </div>
    </header>
  );
}
