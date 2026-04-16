import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Locale } from "../../lib/content";
import { getLocaleSwitchPath } from "../../lib/routeRegistry";
import { Menu, X } from "lucide-react";

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
    { to: botHref, label: isArabic ? "زكي" : "ZAKI" },
    { to: storyHref, label: isArabic ? "لماذا زكي" : "Why ZAKI" },
    { to: contactHref, label: isArabic ? "تواصل" : "Contact" },
  ];

  const isActive = (to: string) => location.pathname === to;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "border-b border-zk-border-strong bg-zk-bg/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        {/* Logo */}
        <Link
          to={isArabic ? "/ar/" : "/"}
          onClick={handleLogoClick}
          className="inline-flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <img src="/assets/zaki-logo.png" alt="ZAKI" className="size-7 rounded-[6px]" />
          <span className="font-logo text-base tracking-wider text-zk-text">ZAKI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative px-3 py-1.5 text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                isActive(link.to)
                  ? "text-zk-text"
                  : "text-zk-text-secondary hover:text-zk-text"
              }`}
            >
              {link.label}
              {isActive(link.to) && (
                <span className="absolute inset-x-3 -bottom-0.5 h-px bg-zk-accent" />
              )}
            </Link>
          ))}

          <span className="mx-2 h-4 w-px bg-zk-border-strong" />

          <Link
            to={getLocaleSwitchPath(location.pathname, isArabic ? "en" : "ar")}
            className="px-2 py-1 text-[12px] font-medium text-zk-text-tertiary transition-colors hover:text-zk-text"
          >
            {isArabic ? "EN" : "عربي"}
          </Link>

          <a
            href="https://app.chatzaki.com/?auth=signup&source=website_nav"
            className="ms-1 inline-flex items-center rounded-full bg-zk-accent px-4 py-1.5 text-[12px] font-semibold tracking-wide text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-zk-accent-hover hover:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_14px_40px_rgba(241,2,2,0.35)]"
          >
            {isArabic ? "ابدأ الآن" : "Get started"}
          </a>
        </nav>

        {/* Mobile right */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to={getLocaleSwitchPath(location.pathname, isArabic ? "en" : "ar")}
            className="text-[12px] font-medium text-zk-text-tertiary transition-colors hover:text-zk-text"
          >
            {isArabic ? "EN" : "عربي"}
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-zk-text transition-colors hover:bg-white/[0.05]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-zk-border bg-zk-bg/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-0.5 px-5 py-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors ${
                isActive(link.to)
                  ? "text-zk-text"
                  : "text-zk-text-secondary hover:text-zk-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://app.chatzaki.com/?auth=signup&source=website_nav_mobile"
            className="mt-2 flex items-center justify-center rounded-full bg-zk-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-zk-accent-hover"
          >
            {isArabic ? "ابدأ الآن" : "Get started"}
          </a>
        </nav>
      </div>
    </header>
  );
}
