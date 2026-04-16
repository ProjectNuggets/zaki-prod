import { Folder, Settings, MessageSquareText, Clock3, KeyRound, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { CenterLogo } from "../icons";
import { ZAKI_BOT_LABEL } from "@/lib/zakiBot";
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
  onOpenSettings,
  onOpenSessions,
  onOpenCron,
  onOpenSecrets,
  onOpenDiagnostics,
}: SidebarModeSwitchProps) {
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
                "absolute top-1/2 -translate-y-1/2 size-7 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zaki-hover transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isRtl ? "left-1" : "right-1"
              )}
              onClick={(event) => event.stopPropagation()}
              aria-label={`${ZAKI_BOT_LABEL} menu`}
            >
              <Settings className="size-4 text-zaki-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-48">
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="size-3.5" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSessions}>
              <MessageSquareText className="size-3.5" />
              <span>Sessions</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenCron}>
              <Clock3 className="size-3.5" />
              <span>Scheduled Jobs</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSecrets}>
              <KeyRound className="size-3.5" />
              <span>Secrets Vault</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenDiagnostics}>
              <Activity className="size-3.5" />
              <span>Diagnostics</span>
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
          Spaces
        </span>
      </button>
    </div>
  );
}
