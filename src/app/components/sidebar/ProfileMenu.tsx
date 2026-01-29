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
    <div className="absolute bottom-14 left-0 right-0 mx-2 rounded-2xl border border-[#EBEBEB] bg-white shadow-[0px_20px_50px_rgba(15,15,15,0.15)] p-2 z-30">
      <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
        <div className="size-8 rounded-full bg-[#f6efe6] flex items-center justify-center text-[#1f1a14] text-sm font-semibold">
          {userInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#1f1a14] truncate">{userName}</div>
          <div className="text-[10px] text-[#a3a3a3]">{planLabel} plan</div>
        </div>
      </div>
      <div className="h-px bg-[#f1f1f1] my-1" />
      <button
        className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
        type="button"
        onClick={onToggleTheme}
      >
        <Moon className="size-4 text-[#88735A]" />
        Dark mode
        <span className="ml-auto text-[#a3a3a3] text-xs">{isDark ? "On" : "Off"}</span>
      </button>
      <button
        className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
        type="button"
        onClick={() => {
          onClose();
          onOpenSettings();
        }}
      >
        <Settings className="size-4 text-[#88735A]" />
        Settings
      </button>
      <button className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors" type="button">
        <Globe className="size-4 text-[#88735A]" />
        Language
      </button>
      <button className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors" type="button">
        <HelpCircle className="size-4 text-[#88735A]" />
        Need help?
      </button>
      <div className="h-px bg-[#f1f1f1] my-1" />
      <button
        className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#d24430] hover:bg-[#fff3f0] transition-colors"
        type="button"
        onClick={() => {
          onClose();
          onLogout();
        }}
      >
        <LogOut className="size-4" />
        Log out
      </button>
      <div className="px-2.5 pt-1 text-[10px] text-[#a3a3a3]">v1.5.69 · Terms & Conditions</div>
    </div>
  );
}
