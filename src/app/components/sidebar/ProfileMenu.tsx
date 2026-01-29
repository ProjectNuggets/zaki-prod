import { Moon, Settings, Globe, HelpCircle, LogOut } from "lucide-react";

interface ProfileMenuProps {
  isOpen: boolean;
  userName: string;
  userInitials: string;
  planLabel: "FREE" | "PRO";
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export function ProfileMenu({
  isOpen,
  userName,
  userInitials,
  planLabel,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onLogout,
  onClose,
}: ProfileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-14 left-0 right-0 mx-2 rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_20px_50px_rgba(15,15,15,0.15)] p-2 z-30">
      <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
        <div className="size-8 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-primary text-sm font-semibold">
          {userInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zaki-primary truncate">{userName}</div>
          <div className="text-[10px] text-zaki-disabled">{planLabel} plan</div>
        </div>
      </div>
      <div className="h-px bg-zaki-sunken my-1" />
      <button
        className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
        type="button"
        onClick={onToggleTheme}
      >
        <Moon className="size-4 text-zaki-muted" />
        Dark mode
        <span className="ml-auto text-zaki-disabled text-xs">{isDark ? "On" : "Off"}</span>
      </button>
      <button
        className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
        type="button"
        onClick={() => {
          onClose();
          onOpenSettings();
        }}
      >
        <Settings className="size-4 text-zaki-muted" />
        Settings
      </button>
      <button className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors" type="button">
        <Globe className="size-4 text-zaki-muted" />
        Language
      </button>
      <button className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors" type="button">
        <HelpCircle className="size-4 text-zaki-muted" />
        Need help?
      </button>
      <div className="h-px bg-zaki-sunken my-1" />
      <button
        className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-brand hover:bg-zaki-error transition-colors"
        type="button"
        onClick={() => {
          onClose();
          onLogout();
        }}
      >
        <LogOut className="size-4" />
        Log out
      </button>
      <div className="px-2.5 pt-1 text-[10px] text-zaki-disabled">v1.5.69 · Terms & Conditions</div>
    </div>
  );
}
