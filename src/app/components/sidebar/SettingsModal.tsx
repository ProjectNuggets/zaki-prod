import { useFocusTrap } from "@/hooks/useFocusTrap";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  themePreference: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  userName,
  themePreference,
  onThemeChange,
}: SettingsModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div
        className="absolute inset-0"
        onClick={onClose}
        role="button"
        aria-label="Close settings"
      />
      <div ref={modalRef} className="relative w-[560px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1ece3]">
          <div>
            <div className="text-lg font-semibold text-[#1f1a14]">Settings</div>
            <div className="text-xs text-[#a3a3a3]">Manage your preferences and account</div>
          </div>
          <button
            type="button"
            className="size-8 rounded-full bg-[#faf6f0] text-[#655543] hover:bg-[#f0e6d8] transition-colors"
            onClick={onClose}
            aria-label="Close settings"
          >
            <span className="block text-lg leading-none">×</span>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <div className="text-sm font-semibold text-[#1f1a14]">Profile</div>
            <div className="mt-3 grid gap-3">
              <label className="flex flex-col gap-1 text-xs text-[#88735A]">
                Display name
                <input
                  className="rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                  defaultValue={userName}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#88735A]">
                Email
                <input
                  className="rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                  defaultValue={userName}
                />
              </label>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#1f1a14]">Preferences</div>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center justify-between rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543]">
                Theme
                <select
                  className="rounded-lg border border-[#e7dbc9] bg-white px-2 py-1 text-sm text-[#1f1a14]"
                  value={themePreference}
                  onChange={(event) =>
                    onThemeChange(event.target.value as "light" | "dark" | "system")
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543]">
                Language
                <select className="rounded-lg border border-[#e7dbc9] bg-white px-2 py-1 text-sm text-[#1f1a14]">
                  <option>English</option>
                  <option>العربية</option>
                </select>
              </label>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#1f1a14]">Data & Privacy</div>
            <div className="mt-3 grid gap-3">
              <button className="flex items-center justify-between rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543] hover:bg-[#faf6f0] transition-colors text-left">
                Export all data
                <span className="text-xs text-[#a3a3a3]">Download your chats and files</span>
              </button>
              <button className="flex items-center justify-between rounded-2xl border border-[#f6d5ce] px-3 py-2 text-sm text-[#d24430] hover:bg-[#fff3f0] transition-colors text-left">
                Delete account
                <span className="text-xs text-[#d24430]">This action cannot be undone</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#f1ece3]">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-white bg-[#1f1a14] hover:bg-[#2b241c] transition-colors"
            onClick={onClose}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
