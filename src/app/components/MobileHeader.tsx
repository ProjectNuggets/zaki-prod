/**
 * MobileHeader - Top bar for mobile devices with hamburger menu
 * 
 * Only visible on mobile (< md breakpoint).
 * Includes hamburger button to open sidebar drawer.
 */

import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LogoArabicOrange } from "./icons";
import { useUIStore } from "@/stores";

export function MobileHeader() {
  const { i18n } = useTranslation();
  const { toggleMobileSidebar } = useUIStore();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zaki bg-white dark:bg-[#0f0b08] dark:border-[#2b2119]">
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="p-2 -ml-2 rounded-zaki-md hover:bg-zaki-hover dark:hover:bg-[#21180f] transition-colors"
        aria-label={isRtl ? "فتح قائمة التنقل" : "Open navigation menu"}
      >
        <Menu className="size-5 text-zaki-secondary dark:text-[#c9b8a4]" />
      </button>
      
      <div className="flex items-center gap-2">
        <LogoArabicOrange />
        <span className="font-semibold text-zaki-primary dark:text-[#efe6d9]">ZAKI</span>
      </div>
      
      {/* Spacer to center logo */}
      <div className="w-9" />
    </header>
  );
}
