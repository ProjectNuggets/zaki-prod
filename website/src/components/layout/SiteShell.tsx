import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { Locale } from "../../lib/content";
import type { RoutePageKind } from "../../lib/routeRegistry";
import { CookieBanner } from "./CookieBanner";
import { Footer } from "./Footer";
import { NavBar } from "./NavBar";

export function SiteShell({
  locale,
  route = "home",
  children,
}: {
  locale: Locale;
  route?: RoutePageKind;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dataset.route = route;
  }, [locale, route]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"}>
      <a href="#main-content" className="skip-to-main">
        {locale === "ar" ? "تخطّ إلى المحتوى" : "Skip to main content"}
      </a>
      <div className="site-mesh" aria-hidden="true" />
      <div className="site-grain" aria-hidden="true" />
      <NavBar locale={locale} />
      <main id="main-content">{children}</main>
      <Footer locale={locale} />
      <CookieBanner locale={locale} />
    </div>
  );
}
