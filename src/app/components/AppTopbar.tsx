import { Brain, Download, Focus, MoreVertical, PanelRight, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, useUIStore } from "@/stores";

function getInitials(name: string) {
  const parts = name.split(/[\s.@_-]+/).filter(Boolean);
  const first = parts[0]?.[0] || "Z";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first || ""}${second || ""}`.toUpperCase();
}

function getRouteCrumb(pathname: string) {
  if (pathname === "/") return "dashboard";
  if (pathname === "/agent") return "agent";
  if (pathname === "/learn") return "learn";
  if (pathname === "/brain") return "brain";
  if (pathname === "/settings") return "settings";
  if (pathname === "/spaces" || pathname.startsWith("/spaces/")) return "chat";
  if (pathname === "/pricing") return "billing";
  if (pathname === "/help") return "help";
  if (pathname === "/legal") return "legal";
  return "app";
}

export function AppTopbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { resolvedTheme, setThemePreference } = useUIStore();
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);
  const [agentFocusMode, setAgentFocusMode] = useState(false);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const agentMenuRef = useRef<HTMLDivElement | null>(null);
  const stage = resolvedTheme() === "dark" ? "dark" : "light";
  const isAgentRoute = (location.pathname.replace(/\/+$/, "") || "/") === "/agent";
  const displayName =
    user?.fullName?.trim() ||
    user?.username?.trim() ||
    t("appTopbar.defaultUser", { defaultValue: "ZAKI" });
  const initials = getInitials(displayName);
  const crumb = getRouteCrumb(location.pathname);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePanelState = (event: Event) => {
      const next = (event as CustomEvent<{ open?: boolean }>).detail?.open;
      if (typeof next === "boolean") setAgentPanelOpen(next);
    };
    const handleFocusState = (event: Event) => {
      const next = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      if (typeof next === "boolean") setAgentFocusMode(next);
    };
    window.addEventListener("zaki:agent-panel-state", handlePanelState);
    window.addEventListener("zaki:agent-focus-state", handleFocusState);
    return () => {
      window.removeEventListener("zaki:agent-panel-state", handlePanelState);
      window.removeEventListener("zaki:agent-focus-state", handleFocusState);
    };
  }, []);

  useEffect(() => {
    if (!isAgentRoute) {
      setAgentMenuOpen(false);
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(event.target as Node)) {
        setAgentMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAgentMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAgentRoute]);

  return (
    <header className="zaki-app-topbar hidden md:flex">
      <nav
        className="zaki-app-topbar__crumbs"
        aria-label={t("appTopbar.breadcrumbAria", { defaultValue: "Breadcrumb" })}
      >
        <button
          type="button"
          className="zaki-app-topbar__crumb"
          onClick={() => navigate("/")}
        >
          {t("appTopbar.root", { defaultValue: "ZAKI" })}
        </button>
        <span className="zaki-app-topbar__sep">/</span>
        <span className="zaki-app-topbar__here">
          {t(`appTopbar.routes.${crumb}`, { defaultValue: crumb })}
        </span>
      </nav>
      <div className="zaki-app-topbar__actions">
        {isAgentRoute ? (
          <>
            <button
              type="button"
              className={`zaki-app-topbar__toggle zaki-app-topbar__agent-focus ${agentFocusMode ? "is-active" : ""}`}
              aria-pressed={agentFocusMode}
              onClick={() => window.dispatchEvent(new CustomEvent("zaki:toggle-agent-focus"))}
              aria-label={
                agentFocusMode
                  ? t("appTopbar.agent.exitFocusAria", { defaultValue: "Exit agent focus mode" })
                  : t("appTopbar.agent.focusAria", { defaultValue: "Enter agent focus mode" })
              }
              title={t("appTopbar.agent.focusShortcut", { defaultValue: "Focus mode · Command Backslash" })}
              data-testid="agent-focus-toggle"
            >
              <Focus className="zaki-app-topbar__toggle-icon" aria-hidden="true" />
              <span>{t("appTopbar.agent.focus", { defaultValue: "Focus" })}</span>
              <kbd>⌘\</kbd>
            </button>
            <button
              type="button"
              className={`zaki-app-topbar__toggle zaki-app-topbar__agent-panel ${agentPanelOpen ? "is-active" : ""}`}
              aria-pressed={agentPanelOpen}
              onClick={() => window.dispatchEvent(new CustomEvent("zaki:toggle-agent-panel"))}
              aria-label={
                agentPanelOpen
                  ? t("appTopbar.agent.hidePanelAria", { defaultValue: "Hide agent panel" })
                  : t("appTopbar.agent.showPanelAria", { defaultValue: "Show agent panel" })
              }
              title={t("appTopbar.agent.panelShortcut", { defaultValue: "Panel · Command Period" })}
              data-testid="agent-inspector-toggle"
            >
              <PanelRight className="zaki-app-topbar__toggle-icon" aria-hidden="true" />
              <span>{t("appTopbar.agent.panel", { defaultValue: "Panel" })}</span>
              <kbd>⌘.</kbd>
            </button>
            <button
              type="button"
              className="zaki-app-topbar__toggle zaki-app-topbar__agent-share"
              onClick={() => window.dispatchEvent(new CustomEvent("zaki:agent-share"))}
              aria-label={t("appTopbar.agent.shareAria", { defaultValue: "Share conversation" })}
              data-testid="agent-share-toggle"
            >
              <Share2 className="zaki-app-topbar__toggle-icon" aria-hidden="true" />
              <span>{t("appTopbar.agent.share", { defaultValue: "Share" })}</span>
            </button>
            <div className="zaki-app-topbar__menu-wrap" ref={agentMenuRef}>
              <button
                type="button"
                className={`zaki-app-topbar__toggle zaki-app-topbar__agent-more ${agentMenuOpen ? "is-active" : ""}`}
                onClick={() => setAgentMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={agentMenuOpen}
                aria-label={t("appTopbar.agent.moreAria", { defaultValue: "More agent actions" })}
                data-testid="agent-more-toggle"
              >
                <MoreVertical className="zaki-app-topbar__toggle-icon" aria-hidden="true" />
              </button>
              {agentMenuOpen ? (
                <div className="zaki-app-topbar__menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAgentMenuOpen(false);
                      window.dispatchEvent(new CustomEvent("zaki:agent-review-memories"));
                    }}
                  >
                    <Brain className="zaki-app-topbar__menu-icon" aria-hidden="true" />
                    <span>{t("appTopbar.agent.reviewMemories", { defaultValue: "Review memories" })}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAgentMenuOpen(false);
                      window.dispatchEvent(new CustomEvent("zaki:agent-export"));
                    }}
                  >
                    <Download className="zaki-app-topbar__menu-icon" aria-hidden="true" />
                    <span>{t("appTopbar.agent.exportJson", { defaultValue: "Export JSON" })}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
        <button
          type="button"
          className="zaki-app-topbar__toggle"
          onClick={() => setThemePreference(stage === "dark" ? "light" : "dark")}
          aria-label={t("appTopbar.themeAria", {
            defaultValue: stage === "dark" ? "Switch to light mode" : "Switch to dark mode",
          })}
        >
          {stage.toUpperCase()}
        </button>
        <button
          type="button"
          className="zaki-app-topbar__avatar"
          onClick={() => navigate("/settings")}
          aria-label={t("appTopbar.accountAria", { defaultValue: "Open account settings" })}
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
