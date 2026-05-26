/**
 * MobileHeader - Top bar for mobile devices with hamburger menu
 *
 * Only visible on mobile (< md breakpoint).
 * Includes hamburger button to open sidebar drawer.
 */

import { Menu, Network } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useNavigationStore, useUIStore } from "@/stores";
import { ZAKI_BOT_THREAD_ID } from "@/lib/zakiBot";

export function MobileHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleMobileSidebar } = useUIStore();
  const threadId = useNavigationStore((state) => state.threadId);
  const isAgentRoute = location.pathname === "/agent";
  const agentTitle =
    threadId && threadId !== ZAKI_BOT_THREAD_ID
      ? threadId.replace(/[-_]+/g, " ")
      : t("mobileHeader.agentTitle", { defaultValue: "Direct chat" });

  return (
    <header
      className="zaki-mobile-topbar md:hidden px-2"
      data-agent={isAgentRoute ? "true" : undefined}
    >
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="zaki-mobile-topbar__button"
        aria-label={t("app.openNavigationMenu")}
      >
        <Menu className="size-5" />
      </button>

      {isAgentRoute ? (
        <div className="zaki-mobile-topbar__agent">
          <strong>{agentTitle}</strong>
          <span>{t("mobileHeader.agentMeta", { defaultValue: "Agent · execute" })}</span>
        </div>
      ) : (
        <div className="zaki-mobile-topbar__brand">
          <span className="zaki-mobile-topbar__mark" aria-hidden="true" />
          <span>ZAKI</span>
        </div>
      )}

      {isAgentRoute ? (
        <button
          type="button"
          className="zaki-mobile-topbar__button"
          onClick={() => navigate("/brain")}
          aria-label={t("mobileHeader.openBrain", { defaultValue: "Open brain" })}
        >
          <Network className="size-5" />
        </button>
      ) : (
        <div className="w-11" />
      )}
    </header>
  );
}
