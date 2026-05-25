import { Folder, Settings, MessageSquareText, Clock3, KeyRound, Activity, SlidersHorizontal, Brain, GraduationCap } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CenterLogo } from "../icons";
import { ZAKI_BOT_LABEL } from "@/lib/zakiBot";
import { useNavigationStore } from "@/stores/navigationStore";
import type { SidebarMode } from "@/stores/navigationStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

interface SidebarModeSwitchProps {
  sidebarMode: SidebarMode;
  onSelectZaki: () => void;
  onSelectSpaces: () => void;
  isRtl: boolean;
  onOpenControls: () => void;
  controlBadgeCount?: number;
  onOpenSettings: () => void;
  onOpenSessions: () => void;
  onOpenCron: () => void;
  onOpenSecrets: () => void;
  onOpenDiagnostics: () => void;
}

export function SidebarModeSwitch({
  sidebarMode,
  onSelectZaki,
  onSelectSpaces,
  isRtl,
  onOpenControls,
  controlBadgeCount = 0,
  onOpenSettings,
  onOpenSessions,
  onOpenCron,
  onOpenSecrets,
  onOpenDiagnostics,
}: SidebarModeSwitchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSidebarMode = useNavigationStore((s) => s.setSidebarMode);

  // Sync store when user arrives at direct URL pages or browser navigation.
  useEffect(() => {
    if (location.pathname === "/brain" && sidebarMode !== "brain") {
      setSidebarMode("brain");
    } else if (location.pathname === "/agent" && sidebarMode !== "zaki") {
      setSidebarMode("zaki");
    } else if (location.pathname === "/learn" && sidebarMode !== "learning") {
      setSidebarMode("learning");
    }
  }, [location.pathname, sidebarMode, setSidebarMode]);

  return (
    <div className="flex flex-col gap-1 mb-3">
      {/* ZAKI nav item */}
      <div className="relative group">
        <button
          className={cn(
            "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors",
            isRtl ? "text-right flex-row-reverse" : "text-left",
            sidebarMode === "zaki" ? "bg-zaki-selected" : "hover:bg-zaki-hover"
          )}
          onClick={onSelectZaki}
          type="button"
        >
          {sidebarMode === "zaki" && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-zaki-brand rounded-r-sm",
                isRtl ? "right-0 rounded-r-none rounded-l-sm" : "left-0"
              )}
            />
          )}
          <div className="size-5 flex items-center justify-center">
            <div className="scale-[0.6]">
              <CenterLogo />
            </div>
          </div>
          <span
            className={cn(
              "text-sm font-medium flex-1",
              sidebarMode === "zaki" ? "text-zaki-primary" : "text-zaki-secondary"
            )}
          >
            {ZAKI_BOT_LABEL}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 size-7 rounded-md p-0 flex items-center justify-center text-zaki-muted hover:text-zaki-text hover:bg-zaki-hover transition focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isRtl ? "left-1" : "right-1"
              )}
              onClick={(event) => event.stopPropagation()}
              aria-label={`${ZAKI_BOT_LABEL} menu`}
            >
              <Settings className="size-4 text-zaki-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-48">
            <DropdownMenuItem onClick={onOpenControls}>
              <SlidersHorizontal className="size-3.5" />
              <span>{t("zakiControls.common.controls")}</span>
              {controlBadgeCount > 0 ? (
                <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-zaki-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {controlBadgeCount}
                </span>
              ) : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="size-3.5" />
              <span>{t("zakiControls.sidebarMenu.settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSessions}>
              <MessageSquareText className="size-3.5" />
              <span>{t("zakiControls.sidebarMenu.sessions")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenCron}>
              <Clock3 className="size-3.5" />
              <span>{t("zakiControls.sidebarMenu.scheduledJobs")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSecrets}>
              <KeyRound className="size-3.5" />
              <span>{t("zakiControls.sidebarMenu.secretsVault")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenDiagnostics}>
              <Activity className="size-3.5" />
              <span>{t("zakiControls.sidebarMenu.diagnostics")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Spaces nav item */}
      <button
        className={cn(
          "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors relative",
          isRtl ? "text-right flex-row-reverse" : "text-left",
          sidebarMode === "spaces" ? "bg-zaki-selected" : "hover:bg-zaki-hover"
        )}
        onClick={onSelectSpaces}
        type="button"
      >
        {sidebarMode === "spaces" && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-zaki-brand rounded-r-sm",
              isRtl ? "right-0 rounded-r-none rounded-l-sm" : "left-0"
            )}
          />
        )}
        <div className="size-5 flex items-center justify-center">
          <Folder className="size-4 text-zaki-muted" />
        </div>
        <span
          className={cn(
            "text-sm font-medium flex-1",
            sidebarMode === "spaces" ? "text-zaki-primary" : "text-zaki-secondary"
          )}
        >
          {t("sidebar.nav.spaces")}
        </span>
      </button>

      {/* Learning nav item */}
      <button
        className={cn(
          "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors relative",
          isRtl ? "text-right flex-row-reverse" : "text-left",
          sidebarMode === "learning" ? "bg-zaki-selected" : "hover:bg-zaki-hover"
        )}
        onClick={() => { navigate("/learn"); setSidebarMode("learning"); }}
        type="button"
        aria-current={sidebarMode === "learning" ? "page" : undefined}
      >
        {sidebarMode === "learning" && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-zaki-brand rounded-r-sm",
              isRtl ? "right-0 rounded-r-none rounded-l-sm" : "left-0"
            )}
          />
        )}
        <div className="size-5 flex items-center justify-center">
          <GraduationCap className="size-4 text-zaki-muted" />
        </div>
        <span
          className={cn(
            "text-sm font-medium flex-1",
            sidebarMode === "learning" ? "text-zaki-primary" : "text-zaki-secondary"
          )}
        >
          {t("sidebar.learning")}
        </span>
      </button>

      {/* Brain nav item */}
      <button
        className={cn(
          "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors relative",
          isRtl ? "text-right flex-row-reverse" : "text-left",
          sidebarMode === "brain" ? "bg-zaki-selected" : "hover:bg-zaki-hover"
        )}
        onClick={() => { navigate("/brain"); setSidebarMode("brain"); }}
        type="button"
        aria-current={sidebarMode === "brain" ? "page" : undefined}
      >
        {sidebarMode === "brain" && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-zaki-brand rounded-r-sm",
              isRtl ? "right-0 rounded-r-none rounded-l-sm" : "left-0"
            )}
          />
        )}
        <div className="size-5 flex items-center justify-center">
          <Brain className="size-4 text-zaki-muted" />
        </div>
        <span
          className={cn(
            "text-sm font-medium flex-1",
            sidebarMode === "brain" ? "text-zaki-primary" : "text-zaki-secondary"
          )}
        >
          {t("sidebar.brain")}
        </span>
      </button>
    </div>
  );
}
