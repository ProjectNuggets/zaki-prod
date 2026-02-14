import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTranslation } from "react-i18next";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  email: string;
  onDisplayNameChange: (name: string) => void;
  themePreference: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  displayName,
  email,
  onDisplayNameChange,
  themePreference,
  onThemeChange,
  onSave,
  saving = false,
}: SettingsModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const { t, i18n } = useTranslation();
  const languageValue = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div
        className="absolute inset-0"
        onClick={onClose}
        role="button"
        aria-label="Close settings"
      />
      <div ref={modalRef} className="relative w-[620px] max-w-[calc(100%-2rem)] rounded-[28px] border border-zaki-subtle bg-white shadow-[0px_30px_80px_rgba(15,15,15,0.18)]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zaki-subtle bg-zaki-base/80">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full border border-zaki-subtle bg-white flex items-center justify-center text-zaki-brand text-sm font-semibold">
              S
            </div>
            <div>
              <div className="text-lg font-semibold text-zaki-primary">Settings</div>
              <div className="text-xs text-zaki-muted">Profile, preferences, and data controls</div>
            </div>
          </div>
          <button
            type="button"
            className="size-9 rounded-full border border-zaki-subtle bg-white text-zaki-secondary hover:bg-zaki-hover transition-colors"
            onClick={onClose}
            aria-label="Close settings"
          >
            <span className="block text-lg leading-none">×</span>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted">Profile</div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle bg-white px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
              <label className="flex flex-col gap-1 text-xs text-zaki-muted">
                Display name
                <input
                  className="rounded-zaki-md border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                  value={displayName}
                  onChange={(event) => onDisplayNameChange(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zaki-muted">
                Email
                <input
                  className="rounded-zaki-md border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                  value={email}
                  readOnly
                />
              </label>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted">Preferences</div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle bg-white px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
              <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-secondary">
                Theme
                <select
                  className="rounded-lg border border-zaki-subtle bg-white px-2 py-1 text-sm text-zaki-primary"
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
              <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-secondary">
                {t("settings.language")}
                <select
                  className="rounded-lg border border-zaki-subtle bg-white px-2 py-1 text-sm text-zaki-primary"
                  value={languageValue}
                  onChange={(event) => i18n.changeLanguage(event.target.value)}
                >
                  <option value="en">{t("language.english")}</option>
                  <option value="ar">{t("language.arabic")}</option>
                </select>
              </label>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted">Data & Privacy</div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle bg-white px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
              <button className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-secondary hover:bg-zaki-elevated transition-colors text-left">
                Export all data
                <span className="text-xs text-zaki-disabled">Download your chats and files</span>
              </button>
              <button className="flex items-center justify-between rounded-zaki-lg border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-brand hover:bg-zaki-error transition-colors text-left">
                Delete account
                <span className="text-xs text-zaki-brand">This action cannot be undone</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-zaki-subtle bg-zaki-base/80">
          <div className="text-xs text-zaki-muted">Changes apply immediately</div>
          <button
            type="button"
            className="zaki-btn zaki-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="zaki-btn bg-zaki-brand text-white hover:bg-zaki-brand-hover transition-colors"
            onClick={onSave}
            disabled={saving}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
