import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { Locale } from "../../lib/content";
import type { RoutePageKind } from "../../lib/routeRegistry";
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

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className={route === "bot" ? "theme-bot" : "theme-home"} dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="site-mesh" aria-hidden="true" />
      <div className="site-grain" aria-hidden="true" />
      <NavBar locale={locale} />
      <main>{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
