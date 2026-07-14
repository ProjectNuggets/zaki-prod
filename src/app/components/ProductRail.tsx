import {
  Brain,
  Bot,
  Cable,
  Clock3,
  CreditCard,
  Database,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageSquareText,
  Palette,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/hooks/useNavigation";
import { useAuthStore, useNavigationStore } from "@/stores";
import { requestLogout } from "@/lib/api";
import { isProductVisibleInRelease } from "@/lib/productRoutes";
import { toast } from "sonner";
import { LogoArabicRed } from "./icons";

type ProductRailItem = {
  id: "dashboard" | "agent" | "spaces" | "brain" | "design" | "minutes";
  labelKey: string;
  fallback: string;
  shortcut: string;
  icon: typeof LayoutGrid;
  /**
   * Marks a spoke that is visible but not live yet. It stays CLICKABLE — it navigates to
   * the lane's coming-soon gate page. Never render an inert control (spec §A2).
   */
  comingSoon?: boolean;
  action: () => void;
};

function isActiveProduct(pathname: string, itemId: ProductRailItem["id"]) {
  if (itemId === "dashboard") return pathname === "/" || pathname === "/about";
  if (itemId === "agent") return pathname === "/agent";
  if (itemId === "spaces") return pathname === "/spaces" || pathname.startsWith("/spaces/");
  if (itemId === "brain") return pathname === "/brain";
  if (itemId === "design") return pathname === "/design";
  if (itemId === "minutes") return pathname === "/minutes";
  return false;
}

export function ProductRail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const { goHome, goToSpaces, goToZakiBot } = useNavigation();
  const setSidebarMode = useNavigationStore((state) => state.setSidebarMode);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const goToProtectedRoute = useCallback(
    (route: string) => {
      navigate(token ? route : `/?auth=login&next=${encodeURIComponent(route)}`);
    },
    [navigate, token]
  );

  const openAgent = useCallback(() => {
    if (!token) {
      goToProtectedRoute("/agent");
      return;
    }
    goToZakiBot();
  }, [goToProtectedRoute, goToZakiBot, token]);

  const openBrain = useCallback(() => {
    setSidebarMode("brain");
    goToProtectedRoute("/brain");
  }, [goToProtectedRoute, setSidebarMode]);

  const items = ([
    {
      id: "dashboard",
      labelKey: "productRail.dashboard",
      fallback: "Dashboard",
      shortcut: "⌘1",
      icon: LayoutGrid,
      action: goHome,
    },
    {
      id: "agent",
      labelKey: "productRail.agent",
      fallback: "Agent",
      shortcut: "⌘2",
      icon: Sparkles,
      action: openAgent,
    },
    {
      id: "spaces",
      labelKey: "productRail.spaces",
      fallback: "Spaces",
      shortcut: "⌘3",
      icon: MessageSquareText,
      action: goToSpaces,
    },
    {
      id: "brain",
      labelKey: "productRail.brain",
      fallback: "Brain",
      shortcut: "⌘4",
      icon: Brain,
      action: openBrain,
    },
    {
      id: "design",
      labelKey: "productRail.design",
      fallback: "Design",
      shortcut: "⌘5",
      icon: Palette,
      comingSoon: true,
      action: () => navigate("/design"),
    },
    {
      id: "minutes",
      labelKey: "productRail.minutes",
      fallback: "Minutes",
      shortcut: "⌘6",
      icon: Clock3,
      comingSoon: true,
      action: () => navigate("/minutes"),
    },
  ] satisfies ProductRailItem[]).filter(
    (item) => item.id === "dashboard" || isProductVisibleInRelease(item.id)
  );

  const quickSettingsItems = useMemo(
    () => [
      {
        label: t("productRail.quickSettings.account", { defaultValue: "Account" }),
        description: t("productRail.quickSettings.accountHelper", { defaultValue: "Profile and sign-in" }),
        icon: UserRound,
        action: () => goToProtectedRoute("/settings#settings-account"),
      },
      {
        label: t("productRail.quickSettings.plan", { defaultValue: "Plan & usage" }),
        description: t("productRail.quickSettings.planHelper", { defaultValue: "Billing and meters" }),
        icon: CreditCard,
        action: () => goToProtectedRoute("/settings#settings-billing"),
      },
      {
        label: t("productRail.quickSettings.agent", { defaultValue: "Agent defaults" }),
        description: t("productRail.quickSettings.agentHelper", { defaultValue: "Reasoning and autonomy" }),
        icon: Bot,
        action: () => goToProtectedRoute("/settings#settings-agent"),
      },
      {
        label: t("productRail.quickSettings.channels", { defaultValue: "Channels" }),
        description: t("productRail.quickSettings.channelsHelper", { defaultValue: "Tokens and bindings" }),
        icon: Cable,
        action: () => goToProtectedRoute("/settings#settings-channels"),
      },
      {
        label: t("productRail.quickSettings.memory", { defaultValue: "Memory & privacy" }),
        description: t("productRail.quickSettings.memoryHelper", { defaultValue: "Export, forget, PII" }),
        icon: Database,
        action: () => goToProtectedRoute("/settings#settings-memory-data"),
      },
    ],
    [goToProtectedRoute, t]
  );

  useEffect(() => {
    if (!settingsMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        (settingsMenuRef.current?.contains(target) || settingsButtonRef.current?.contains(target))
      ) {
        return;
      }
      setSettingsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsMenuOpen(false);
        settingsButtonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsMenuOpen]);

  const runMenuAction = (action: () => void) => {
    setSettingsMenuOpen(false);
    action();
  };

  const handleSecureLogout = async () => {
    try {
      const { response, data } = await requestLogout();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "logout_failed");
      }
      setSettingsMenuOpen(false);
      logout();
      navigate("/?auth=login");
    } catch {
      toast.error(
        t("settingsModal.account.signOutError", {
          defaultValue: "Unable to sign out securely. Check your connection and try again.",
        })
      );
    }
  };

  return (
    <nav className="zaki-product-rail hidden md:flex" aria-label={t("productRail.ariaLabel", { defaultValue: "Products" })}>
      <button
        type="button"
        className="zaki-product-rail__mark"
        onClick={goHome}
        aria-label={t("productRail.openDashboard", { defaultValue: "Open dashboard" })}
      >
        <LogoArabicRed className="zaki-product-rail__brand-logo" />
      </button>
      <div className="zaki-product-rail__sep" />
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActiveProduct(location.pathname, item.id);
        const label = t(item.labelKey, { defaultValue: item.fallback });
        const comingSoonLabel = t("productRail.comingSoon", { defaultValue: "Coming soon" });
        return (
          <button
            key={item.id}
            type="button"
            className={cn("zaki-product-rail__button", item.comingSoon && "is-soon")}
            onClick={item.action}
            aria-current={active ? "page" : undefined}
            data-coming-soon={item.comingSoon ? "true" : undefined}
            title={item.comingSoon ? `${label} — ${comingSoonLabel}` : label}
          >
            <Icon className="zaki-product-rail__icon" aria-hidden="true" />
            <span className="zaki-product-rail__tip">
              {label}
              {item.comingSoon ? (
                <span className="zaki-product-rail__state">{comingSoonLabel}</span>
              ) : null}
              <span className="zaki-product-rail__kbd">{item.shortcut}</span>
            </span>
          </button>
        );
      })}
      <div className="zaki-product-rail__spacer" />
      <div className="zaki-product-rail__settings">
        <button
          ref={settingsButtonRef}
          type="button"
          className={cn("zaki-product-rail__button", settingsMenuOpen && "is-menu-open")}
          onClick={() => setSettingsMenuOpen((open) => !open)}
          aria-current={location.pathname === "/settings" ? "page" : undefined}
          aria-haspopup="menu"
          aria-expanded={settingsMenuOpen}
          aria-controls="zaki-product-rail-settings-menu"
          title={t("productRail.settings", { defaultValue: "Settings" })}
          aria-label={t("productRail.settings", { defaultValue: "Settings" })}
        >
          <Settings className="zaki-product-rail__icon" aria-hidden="true" />
          <span className="zaki-product-rail__tip">
            {t("productRail.settings", { defaultValue: "Settings" })}
            <span className="zaki-product-rail__kbd">⌘,</span>
          </span>
        </button>
        {settingsMenuOpen ? (
          <div
            ref={settingsMenuRef}
            id="zaki-product-rail-settings-menu"
            className="zaki-product-rail__quick-menu"
            role="menu"
            aria-label={t("productRail.quickSettings.title", { defaultValue: "Quick settings" })}
          >
            <header className="zaki-product-rail__quick-head">
              <span>{t("productRail.quickSettings.eyebrow", { defaultValue: "Quick settings" })}</span>
              <strong>
                {token
                  ? user?.fullName || user?.username || "ZAKI"
                  : t("productRail.quickSettings.guest", { defaultValue: "Guest" })}
              </strong>
            </header>
            <div className="zaki-product-rail__quick-group">
              {quickSettingsItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className="zaki-product-rail__quick-row"
                    onClick={() => runMenuAction(item.action)}
                  >
                    <Icon className="zaki-product-rail__quick-icon" aria-hidden="true" />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="zaki-product-rail__quick-apps" aria-label={t("productRail.quickSettings.apps", { defaultValue: "App links" })}>
              <button type="button" role="menuitem" onClick={() => runMenuAction(goHome)}>
                {t("productRail.dashboard", { defaultValue: "Dashboard" })}
              </button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(openAgent)}>
                {t("productRail.agent", { defaultValue: "Agent" })}
              </button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(goToSpaces)}>
                {t("productRail.spaces", { defaultValue: "Spaces" })}
              </button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(openBrain)}>
                {t("productRail.brain", { defaultValue: "Brain" })}
              </button>
            </div>
            <div className="zaki-product-rail__quick-actions">
              <button type="button" role="menuitem" onClick={() => runMenuAction(() => goToProtectedRoute("/settings"))}>
                {t("productRail.quickSettings.allSettings", { defaultValue: "All settings" })}
              </button>
              {token ? (
                <button type="button" role="menuitem" onClick={() => void handleSecureLogout()} className="is-danger">
                  <LogOut className="zaki-product-rail__quick-icon" aria-hidden="true" />
                  {t("settingsModal.account.signOut", { defaultValue: "Sign out" })}
                </button>
              ) : (
                <button type="button" role="menuitem" onClick={() => runMenuAction(() => goToProtectedRoute("/settings"))}>
                  <LogIn className="zaki-product-rail__quick-icon" aria-hidden="true" />
                  {t("settingsModal.account.signIn", { defaultValue: "Sign in" })}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
