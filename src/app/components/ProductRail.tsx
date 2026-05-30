import {
  Brain,
  BriefcaseBusiness,
  GraduationCap,
  LayoutGrid,
  MessageSquareText,
  Palette,
  Settings,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/hooks/useNavigation";
import { useNavigationStore } from "@/stores";
import { getDesignHealth } from "@/lib/designApi";
import { useProductRegistry } from "@/queries/useProducts";

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
  if (itemId === "design") return pathname === "/design";
  return false;
}

export function ProductRail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { goHome, goToSpaces, goToZakiBot } = useNavigation();
  const setSidebarMode = useNavigationStore((state) => state.setSidebarMode);
  const productRegistry = useProductRegistry();
  const designProduct = productRegistry.data?.data?.products?.find(
    (product) => product.productId === "design",
  );
  const designConfigured = designProduct?.state === "enabled";
  const designHealth = useQuery({
    queryKey: ["design", "health", "product-rail"],
    queryFn: getDesignHealth,
    enabled: designConfigured,
    retry: false,
    staleTime: 15_000,
  });
  const designEnabled = designConfigured && designHealth.data?.ok === true;

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
      action: () => {
        setSidebarMode("learning");
        navigate("/learn");
      },
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
      disabled: !designEnabled,
      action: () => {
        setSidebarMode("zaki");
        navigate("/design");
      },
    },
  ];

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
      <button
        type="button"
        className="zaki-product-rail__button"
        onClick={() => navigate("/settings")}
        aria-current={location.pathname === "/settings" ? "page" : undefined}
        title={t("productRail.settings", { defaultValue: "Settings" })}
        aria-label={t("productRail.settings", { defaultValue: "Settings" })}
      >
        <Settings className="zaki-product-rail__icon" aria-hidden="true" />
        <span className="zaki-product-rail__tip">
          {t("productRail.settings", { defaultValue: "Settings" })}
          <span className="zaki-product-rail__kbd">⌘,</span>
        </span>
      </button>
    </nav>
  );
}
