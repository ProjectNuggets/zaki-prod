import {
  Brain,
  BriefcaseBusiness,
  Bot,
  Cable,
  CreditCard,
  Database,
  GraduationCap,
  LayoutGrid,
  LogOut,
  MessageSquareText,
  Palette,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/hooks/useNavigation";
import { useAuthStore, useNavigationStore } from "@/stores";
import { requestLogout } from "@/lib/api";
import { toast } from "sonner";

type ProductRailItem = {
  id: "dashboard" | "agent" | "chat" | "brain" | "learn" | "hire" | "design";
  labelKey: string;
  fallback: string;
  shortcut: string;
  icon: typeof LayoutGrid;
  disabled?: boolean;
  action: () => void;
};

function isActiveProduct(pathname: string, itemId: ProductRailItem["id"]) {
  if (itemId === "dashboard") return pathname === "/" || pathname === "/about";
  if (itemId === "agent") return pathname === "/agent";
  if (itemId === "chat") return pathname === "/spaces" || pathname.startsWith("/spaces/");
  if (itemId === "brain") return pathname === "/brain";
  if (itemId === "learn") return pathname === "/learn";
  if (itemId === "hire") return pathname === "/hire";
  if (itemId === "design") return pathname === "/design";
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
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const items: ProductRailItem[] = [
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
      action: goToZakiBot,
    },
    {
      id: "chat",
      labelKey: "productRail.chat",
      fallback: "Chat",
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
      action: () => {
        setSidebarMode("brain");
        navigate("/brain");
      },
    },
    {
      id: "learn",
      labelKey: "productRail.learn",
      fallback: "Learn",
      shortcut: "⌘5",
      icon: GraduationCap,
      disabled: true,
      action: () => undefined,
    },
    {
      id: "hire",
      labelKey: "productRail.hire",
      fallback: "Hire",
      shortcut: "⌘6",
      icon: BriefcaseBusiness,
      disabled: true,
      action: () => undefined,
    },
    {
      id: "design",
      labelKey: "productRail.design",
      fallback: "Design",
      shortcut: "⌘7",
      icon: Palette,
      disabled: true,
      action: () => undefined,
    },
  ];

  const quickSettingsItems = useMemo(
    () => [
      {
        label: t("productRail.quickSettings.account", { defaultValue: "Account" }),
        description: t("productRail.quickSettings.accountHelper", { defaultValue: "Profile and sign-in" }),
        icon: UserRound,
        action: () => navigate("/settings#settings-account"),
      },
      {
        label: t("productRail.quickSettings.plan", { defaultValue: "Plan & usage" }),
        description: t("productRail.quickSettings.planHelper", { defaultValue: "Billing and meters" }),
        icon: CreditCard,
        action: () => navigate("/settings#settings-billing"),
      },
      {
        label: t("productRail.quickSettings.agent", { defaultValue: "Agent defaults" }),
        description: t("productRail.quickSettings.agentHelper", { defaultValue: "Reasoning and autonomy" }),
        icon: Bot,
        action: () => navigate("/settings#settings-agent"),
      },
      {
        label: t("productRail.quickSettings.channels", { defaultValue: "Channels" }),
        description: t("productRail.quickSettings.channelsHelper", { defaultValue: "Tokens and bindings" }),
        icon: Cable,
        action: () => navigate("/settings#settings-channels"),
      },
      {
        label: t("productRail.quickSettings.memory", { defaultValue: "Memory & privacy" }),
        description: t("productRail.quickSettings.memoryHelper", { defaultValue: "Export, forget, PII" }),
        icon: Database,
        action: () => navigate("/settings#settings-memory-data"),
      },
    ],
    [navigate, t]
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
      />
      <div className="zaki-product-rail__sep" />
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActiveProduct(location.pathname, item.id);
        const label = t(item.labelKey, { defaultValue: item.fallback });
        return (
          <button
            key={item.id}
            type="button"
            className={cn("zaki-product-rail__button", item.disabled && "is-disabled")}
            onClick={item.disabled ? undefined : item.action}
            aria-current={active ? "page" : undefined}
            aria-disabled={item.disabled ? true : undefined}
            disabled={item.disabled}
            title={label}
          >
            <Icon className="zaki-product-rail__icon" aria-hidden="true" />
            <span className="zaki-product-rail__tip">
              {label}
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
              <strong>{user?.fullName || user?.username || "ZAKI"}</strong>
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
              <button type="button" role="menuitem" onClick={() => runMenuAction(goToZakiBot)}>
                {t("productRail.agent", { defaultValue: "Agent" })}
              </button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(goToSpaces)}>
                {t("productRail.chat", { defaultValue: "Chat" })}
              </button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(() => navigate("/brain"))}>
                {t("productRail.brain", { defaultValue: "Brain" })}
              </button>
            </div>
            <div className="zaki-product-rail__quick-actions">
              <button type="button" role="menuitem" onClick={() => runMenuAction(() => navigate("/settings"))}>
                {t("productRail.quickSettings.allSettings", { defaultValue: "All settings" })}
              </button>
              <button type="button" role="menuitem" onClick={() => void handleSecureLogout()} className="is-danger">
                <LogOut className="zaki-product-rail__quick-icon" aria-hidden="true" />
                {t("settingsModal.account.signOut", { defaultValue: "Sign out" })}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
