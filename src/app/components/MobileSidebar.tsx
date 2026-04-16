/**
 * MobileSidebar - Sheet-based sidebar for mobile devices
 *
 * Wraps the Sidebar component in a slide-out drawer on mobile.
 * Hidden on desktop where the regular Sidebar is visible.
 */

import { useEffect } from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { useUIStore } from "@/stores";
import { useTranslation } from "react-i18next";

export function MobileSidebar() {
  const { t } = useTranslation();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const location = useLocation();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  // Close mobile sidebar when navigation occurs
  useEffect(() => {
    const handleNavigation = () => setMobileSidebarOpen(false);

    // Listen for various navigation events from Sidebar
    window.addEventListener("zaki:clear-thread", handleNavigation);
    window.addEventListener("zaki:view-zaki-home", handleNavigation);
    window.addEventListener("zaki:view-spaces", handleNavigation);

    return () => {
      window.removeEventListener("zaki:clear-thread", handleNavigation);
      window.removeEventListener("zaki:view-zaki-home", handleNavigation);
      window.removeEventListener("zaki:view-spaces", handleNavigation);
    };
  }, [setMobileSidebarOpen]);

  return (
    <SheetPrimitive.Root open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetPrimitive.Portal>
        {/* Overlay */}
        <SheetPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        {/* Content - no default close button */}
        <SheetPrimitive.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 h-full w-[280px] max-w-[85vw]",
            "bg-zaki-raised border-r border-zaki shadow-zaki-xl font-body",
            "dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            "data-[state=closed]:duration-300 data-[state=open]:duration-300"
          )}
          aria-label={t("mobileSidebar.ariaLabel")}
        >
          {/* Force sidebar to non-collapsed in mobile drawer */}
          <div className="h-full [&_.zaki-sidebar]:w-full [&_.zaki-sidebar]:!w-full">
            <Sidebar />
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
