import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  useBillingPortal,
  useCancelSubscription,
  useDeleteAccount,
  useEntitlements,
} from "@/queries";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  email: string;
  onDisplayNameChange: (name: string) => void;
  themePreference: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onSave: () => void | Promise<void>;
  onAccountDeleted: () => void;
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
  onAccountDeleted,
  saving = false,
}: SettingsModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: entitlementsResult } = useEntitlements();
  const billingPortal = useBillingPortal();
  const cancelSubscription = useCancelSubscription();
  const deleteAccountMutation = useDeleteAccount();
  const planTier = entitlementsResult?.data?.plan?.tier ?? "free";
  const planStatus = entitlementsResult?.data?.plan?.status ?? "inactive";
  const cancelAtPeriodEnd = Boolean(entitlementsResult?.data?.plan?.cancelAtPeriodEnd);
  const isPremium =
    ["student", "personal", "pro"].includes(planTier) &&
    ["active", "trialing", "past_due"].includes(planStatus);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canDeleteAccount =
    normalizedEmail.length > 0 &&
    deleteConfirmValue.trim().toLowerCase() === normalizedEmail &&
    !deleteAccountMutation.isPending;
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
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted">Plan & Billing</div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle bg-white px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
              <div className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-secondary">
                <span>Current plan</span>
                <span className="text-zaki-primary font-semibold uppercase text-xs tracking-wider">
                  {planTier}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-secondary">
                <span>Status</span>
                <span className="text-zaki-muted text-xs uppercase tracking-wider">
                  {planStatus}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-zaki-subtle px-3 py-2 text-xs text-zaki-secondary hover:bg-zaki-hover transition-colors"
                  onClick={() => {
                    onClose();
                    navigate("/pricing");
                  }}
                >
                  View pricing
                </button>
                <button
                  type="button"
                  className="rounded-full bg-zaki-brand text-white px-3 py-2 text-xs hover:bg-zaki-brand-hover transition-colors"
                  onClick={async () => {
                    try {
                      await billingPortal.mutateAsync();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Unable to open billing portal");
                    }
                  }}
                >
                  {isPremium ? "Manage plan" : "Upgrade"}
                </button>
                {isPremium && (
                  <button
                    type="button"
                    className="rounded-full border border-zaki-strong px-3 py-2 text-xs text-zaki-brand hover:bg-zaki-error transition-colors disabled:opacity-50"
                    onClick={async () => {
                      try {
                        const result = await cancelSubscription.mutateAsync();
                        toast.success(
                          result?.alreadyScheduled
                            ? "Cancellation is already scheduled for period end."
                            : "Subscription will cancel at period end."
                        );
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Unable to cancel subscription"
                        );
                      }
                    }}
                    disabled={cancelAtPeriodEnd || cancelSubscription.isPending}
                  >
                    {cancelAtPeriodEnd ? "Cancellation scheduled" : "Cancel subscription"}
                  </button>
                )}
              </div>
              {cancelAtPeriodEnd && (
                <div className="text-xs text-zaki-muted">
                  Your plan will remain active until the current billing period ends.
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted">Data & Privacy</div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle bg-white px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
              <button className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-secondary hover:bg-zaki-elevated transition-colors text-left">
                Export all data
                <span className="text-xs text-zaki-disabled">Download your chats and files</span>
              </button>
              <button
                className="flex items-center justify-between rounded-zaki-lg border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-brand hover:bg-zaki-error transition-colors text-left"
                onClick={() => setDeleteConfirmOpen((open) => !open)}
                type="button"
              >
                Delete account
                <span className="text-xs text-zaki-brand">This action cannot be undone</span>
              </button>
              {deleteConfirmOpen && (
                <div className="rounded-zaki-lg border border-zaki-strong bg-zaki-error px-3 py-3">
                  <p className="text-xs text-zaki-brand">
                    Type your email to confirm permanent account deletion.
                  </p>
                  <input
                    className="mt-2 w-full rounded-zaki-md border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-brand"
                    value={deleteConfirmValue}
                    onChange={(event) => setDeleteConfirmValue(event.target.value)}
                    placeholder={email || "you@example.com"}
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-zaki-subtle px-3 py-1.5 text-xs text-zaki-secondary hover:bg-zaki-hover"
                      onClick={() => {
                        setDeleteConfirmOpen(false);
                        setDeleteConfirmValue("");
                      }}
                    >
                      Keep account
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-zaki-brand px-3 py-1.5 text-xs text-white hover:bg-zaki-brand-hover disabled:opacity-50"
                      disabled={!canDeleteAccount}
                      onClick={async () => {
                        try {
                          await deleteAccountMutation.mutateAsync(normalizedEmail);
                          toast.success("Account deleted.");
                          onClose();
                          onAccountDeleted();
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Unable to delete account"
                          );
                        }
                      }}
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Delete permanently"}
                    </button>
                  </div>
                </div>
              )}
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
