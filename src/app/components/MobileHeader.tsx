/**
 * MobileHeader - Top bar for mobile devices with hamburger menu
 *
 * Only visible on mobile (< md breakpoint).
 * Includes hamburger button to open sidebar drawer.
 */

import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LogoArabicRed } from "./icons";
import { useUIStore } from "@/stores";

export function MobileHeader() {
  const { t } = useTranslation();
  const { toggleMobileSidebar } = useUIStore();

  return (
    <header
      className="md:hidden sticky top-0 z-40 flex h-14 w-full items-center justify-between px-3 border-b border-zaki bg-zaki-raised/80 backdrop-blur-lg dark:bg-[#141210]/80 dark:border-[rgba(240,236,230,0.08)] font-body"
    >
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="inline-flex size-11 items-center justify-center rounded-full p-2 text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary transition-colors dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
        aria-label={t("app.openNavigationMenu")}
      >
        <Menu className="size-5" />
      </button>

      <div className="flex items-center gap-2">
        <LogoArabicRed />
        <span className="font-display text-base font-bold text-zaki-primary dark:text-[#efe6d9]">
          ZAKI
        </span>
      </div>

      {/* Spacer to center logo */}
      <div className="w-11" />
    </header>
  );
}
