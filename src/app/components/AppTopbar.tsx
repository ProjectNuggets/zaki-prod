import { Search } from "lucide-react";
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
  const stage = resolvedTheme() === "dark" ? "dark" : "light";
  const displayName =
    user?.fullName?.trim() ||
    user?.username?.trim() ||
    t("appTopbar.defaultUser", { defaultValue: "ZAKI" });
  const initials = getInitials(displayName);
  const crumb = getRouteCrumb(location.pathname);

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
        <button
          type="button"
          className="zaki-app-topbar__command"
          onClick={() => window.dispatchEvent(new Event("zaki:open-command-palette"))}
          aria-label={t("appTopbar.commandAria", { defaultValue: "Open command palette" })}
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span>{t("appTopbar.command", { defaultValue: "Search, run, jump" })}</span>
          <kbd>⌘K</kbd>
        </button>
        <button
          type="button"
          className="zaki-app-topbar__toggle"
          onClick={() => setThemePreference(stage === "dark" ? "light" : "dark")}
        >
          {t("appTopbar.stage", { defaultValue: "Stage" })} · {stage.toUpperCase()}
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
