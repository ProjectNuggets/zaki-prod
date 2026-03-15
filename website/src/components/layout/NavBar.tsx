import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Locale } from "../../lib/content";
import { getLocaleSwitchPath } from "../../lib/routeRegistry";
import { Menu, X } from "lucide-react";

export function NavBar({ locale }: { locale: Locale }) {
  const location = useLocation();
  const isArabic = locale === "ar";
  const botHref = isArabic ? "/ar/zaki-bot/" : "/zaki-bot/";
  const faqHref = isArabic ? "/ar/faq/" : "/faq/";
  const storyHref = isArabic ? "/ar/story/" : "/story/";
  const contactHref = isArabic ? "/ar/contact/" : "/contact/";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { to: botHref, label: isArabic ? "زكي" : "ZAKI" },
    { to: faqHref, label: isArabic ? "الأسئلة" : "FAQ" },
    { to: storyHref, label: isArabic ? "حكايتنا" : "Story" },
    { to: contactHref, label: isArabic ? "تواصل" : "Contact" },
  ];

  const isActive = (to: string) => location.pathname === to;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "border-b border-line-strong/40 bg-white/70 backdrop-blur-xl dark:border-line-dark-strong/30 dark:bg-[#0d0b09]/70"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        {/* Logo — left */}
        <Link
          to={isArabic ? "/ar/" : "/"}
          className="inline-flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <img src="/assets/zaki-logo.png" alt="ZAKI" className="size-7 rounded-[6px]" />
          <span className="font-display text-[15px] font-extrabold tracking-[0.06em] text-chat-text dark:text-bot-text">
            ZAKI
          </span>
        </Link>

        {/* Desktop nav links — right-aligned */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative px-3 py-1.5 text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                isActive(link.to)
                  ? "text-chat-text dark:text-bot-text"
                  : "text-chat-muted/70 hover:text-chat-text dark:text-bot-muted/70 dark:hover:text-bot-text"
              }`}
            >
              {link.label}
              {isActive(link.to) && (
                <span className="absolute inset-x-3 -bottom-0.5 h-px bg-chat-accent dark:bg-bot-accent" />
              )}
            </Link>
          ))}

          <span className="mx-2 h-4 w-px bg-line-strong/30 dark:bg-line-dark-strong/30" />

          <Link
            to={getLocaleSwitchPath(location.pathname, isArabic ? "en" : "ar")}
            className="px-2 py-1 text-[12px] font-medium text-chat-muted/60 transition-colors hover:text-chat-text dark:text-bot-muted/60 dark:hover:text-bot-text"
          >
            {isArabic ? "EN" : "عربي"}
          </Link>

          <a
            href="https://app.chatzaki.com/pricing?auth=signup&source=website_nav"
            className="ms-1 inline-flex items-center rounded-full bg-chat-accent px-4 py-1.5 text-[12px] font-semibold tracking-wide text-white transition-colors hover:bg-chat-accent-hover dark:bg-bot-accent dark:hover:bg-bot-accent-hover"
          >
            {isArabic ? "استخدم ZAKI Chat" : "Use ZAKI Chat"}
          </a>
        </nav>

        {/* Mobile right */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to={getLocaleSwitchPath(location.pathname, isArabic ? "en" : "ar")}
            className="text-[12px] font-medium text-chat-muted/60 transition-colors hover:text-chat-text dark:text-bot-muted/60 dark:hover:text-bot-text"
          >
            {isArabic ? "EN" : "عربي"}
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-chat-text transition-colors hover:bg-chat-text/[0.05] dark:text-bot-text dark:hover:bg-bot-text/[0.05]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-line-strong/20 bg-white/90 backdrop-blur-xl transition-all duration-300 md:hidden dark:border-line-dark-strong/20 dark:bg-[#0d0b09]/90 ${
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
                  ? "text-chat-text dark:text-bot-text"
                  : "text-chat-muted/70 hover:text-chat-text dark:text-bot-muted/70 dark:hover:text-bot-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://app.chatzaki.com/pricing?auth=signup&source=website_nav_mobile"
            className="mt-2 flex items-center justify-center rounded-lg bg-chat-accent px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-chat-accent-hover dark:bg-bot-accent dark:hover:bg-bot-accent-hover"
          >
            {isArabic ? "استخدم ZAKI Chat" : "Use ZAKI Chat"}
          </a>
        </nav>
      </div>
    </header>
  );
}
