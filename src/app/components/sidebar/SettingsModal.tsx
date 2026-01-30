import { useFocusTrap } from "@/hooks/useFocusTrap";
import { MemoryViewer } from "../memory/MemoryViewer";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  themePreference: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  userId?: string; // Add userId prop for memory viewer
}

export function SettingsModal({
  isOpen,
  onClose,
  userName,
  themePreference,
  onThemeChange,
  userId,
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
      <div ref={modalRef} className="relative w-[560px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zaki">
          <div>
            <div className="text-lg font-semibold text-zaki-primary">Settings</div>
            <div className="text-xs text-zaki-disabled">Manage your preferences and account</div>
          </div>
          <button
            type="button"
            className="size-8 rounded-full bg-zaki-elevated text-zaki-secondary hover:bg-zaki-active transition-colors"
            onClick={onClose}
            aria-label="Close settings"
          >
            <span className="block text-lg leading-none">×</span>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <div className="text-sm font-semibold text-zaki-primary">Profile</div>
            <div className="mt-3 grid gap-3">
              <label className="flex flex-col gap-1 text-xs text-zaki-muted">
                Display name
                <input
                  className="rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                  defaultValue={userName}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zaki-muted">
                Email
                <input
                  className="rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                  defaultValue={userName}
                />
              </label>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-zaki-primary">Preferences</div>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center justify-between rounded-zaki-lg border border-zaki px-3 py-2 text-sm text-zaki-secondary">
                Theme
                <select
                  className="rounded-lg border border-zaki-strong bg-white px-2 py-1 text-sm text-zaki-primary"
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
              <label className="flex items-center justify-between rounded-zaki-lg border border-zaki px-3 py-2 text-sm text-zaki-secondary">
                Language
                <select className="rounded-lg border border-zaki-strong bg-white px-2 py-1 text-sm text-zaki-primary">
                  <option>English</option>
                  <option>العربية</option>
                </select>
              </label>
            </div>
          </div>
          {/* Memory Section */}
          {userId && (
            <div>
              <MemoryViewer userId={userId} />
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-zaki-primary">Data & Privacy</div>
            <div className="mt-3 grid gap-3">
              <button className="flex items-center justify-between rounded-zaki-lg border border-zaki px-3 py-2 text-sm text-zaki-secondary hover:bg-zaki-elevated transition-colors text-left">
                Export all data
                <span className="text-xs text-zaki-disabled">Download your chats and files</span>
              </button>
              <button className="flex items-center justify-between rounded-zaki-lg border border-zaki-strong px-3 py-2 text-sm text-zaki-brand hover:bg-zaki-error transition-colors text-left">
                Delete account
                <span className="text-xs text-zaki-brand">This action cannot be undone</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zaki">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-zaki-secondary hover:bg-zaki-hover transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-white bg-zaki-primary hover:bg-zaki-active transition-colors"
            onClick={onClose}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
