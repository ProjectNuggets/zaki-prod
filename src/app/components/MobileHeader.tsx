/**
 * MobileHeader - Top bar for mobile devices with hamburger menu
 *
 * Only visible on mobile (< md breakpoint).
 * Includes hamburger button to open sidebar drawer.
 */

import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "@/stores";

export function MobileHeader() {
  const { t } = useTranslation();
  const { toggleMobileSidebar } = useUIStore();

  return (
    <header
      className="zaki-mobile-topbar md:hidden px-2"
    >
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="zaki-mobile-topbar__button"
        aria-label={t("app.openNavigationMenu")}
      >
        <Menu className="size-5" />
      </button>

      <div className="zaki-mobile-topbar__brand">
        <span className="zaki-mobile-topbar__mark" aria-hidden="true" />
        <span>ZAKI</span>
      </div>

      {/* Spacer to center logo */}
      <div className="w-11" />
    </header>
  );
}
