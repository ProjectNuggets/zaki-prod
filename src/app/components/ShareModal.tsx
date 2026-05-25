import { useState } from 'react';
import { X, Link2, Lock, Copy, Check, Loader2, Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/app/components/ui/ModalShell";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  threadSlug: string;
  threadTitle: string;
  messages: Message[];
}

type ShareType = 'public' | 'password';

export function ShareModal({
  isOpen,
  onClose,
  workspaceSlug,
  threadSlug,
  threadTitle,
  messages,
}: ShareModalProps) {
  const [shareType, setShareType] = useState<ShareType>('public');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");

  if (!isOpen) return null;

  const handleCreate = async () => {
    setError('');

    // Validate password if protected
    if (shareType === 'password') {
      if (!password) {
        setError(t("share.errorPasswordRequired"));
        return;
      }
      if (password.length < 4) {
        setError(t("share.errorPasswordLength"));
        return;
      }
      if (password !== confirmPassword) {
        setError(t("share.errorPasswordMismatch"));
        return;
      }
    }

    setIsCreating(true);

    try {
      const response = await apiRequest('/api/share/create', {
        method: 'POST',
        body: JSON.stringify({
          workspaceSlug,
          threadSlug,
          title: threadTitle || t("share.untitled"),
          conversation: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          isPasswordProtected: shareType === 'password',
          password: shareType === 'password' ? password : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("share.errorCreate"));
        return;
      }

      setShareUrl(data.url);
    } catch {
      setError(t("share.errorCreate"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setShareType('public');
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel={t("share.title")}
      className="zaki-share-modal v2-modal w-full max-w-md"
    >
      <div dir={isRtl ? "rtl" : "ltr"}>
        <div className="v2-modal-head">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center border border-[var(--v2-accent-hairline)] bg-[var(--v2-accent-faint)] text-[var(--v2-accent)]">
              <Link2 className="size-4" />
            </div>
            <div>
              <h2 className="v2-modal-title">{t("share.title")}</h2>
              <p className="mt-1 text-xs text-[var(--v2-ink-3)]">{t("share.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="v2-btn v2-btn--icon v2-btn--sm"
            aria-label="Close share modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="v2-modal-body">
          {!shareUrl ? (
            <>
              {/* Thread info */}
                <div className="v2-card mb-4">
                <p className="v2-field-label">{t("share.sharing")}</p>
                <p className="mt-2 truncate text-sm text-[var(--v2-ink-1)]">
                  {threadTitle || t("share.untitled")}
                </p>
                <p className="mt-1 text-xs text-[var(--v2-ink-3)]">
                  {t("share.meta", { count: messages.length })}
                </p>
              </div>

              {/* Share type selection */}
              <div className="mb-4">
                <label className="v2-field-label mb-2 block">
                  {t("share.accessType")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareType('public')}
                    className={cn(
                      "flex items-center border p-3 transition-colors rtl:text-right rtl:justify-end",
                      shareType === 'public'
                        ? "border-[var(--v2-accent-hairline)] bg-[var(--v2-accent-faint)]"
                        : "border-[var(--v2-hairline)] bg-[var(--v2-bg)] hover:border-[var(--v2-hairline-strong)] hover:bg-[var(--v2-hover)]"
                    )}
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    <div className={cn("flex items-center gap-2 w-full", isRtl && "relative pr-8")}>
                      <Globe
                        className={cn(
                          "w-5 h-5",
                          isRtl ? "absolute right-0 top-1/2 -translate-y-1/2" : "",
                          shareType === 'public' ? "text-[var(--v2-accent)]" : "text-[var(--v2-ink-3)]"
                        )}
                      />
                      <div className="text-left rtl:text-right rtl:items-end rtl:flex rtl:flex-col">
                        <p className={cn(
                          "text-sm",
                        shareType === 'public' ? "text-[var(--v2-accent)]" : "text-[var(--v2-ink-1)]"
                    )}>{t("share.public")}</p>
                        <p className="text-xs text-[var(--v2-ink-3)]">{t("share.publicHelper")}</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShareType('password')}
                    className={cn(
                      "flex items-center border p-3 transition-colors rtl:text-right rtl:justify-end",
                      shareType === 'password'
                        ? "border-[var(--v2-accent-hairline)] bg-[var(--v2-accent-faint)]"
                        : "border-[var(--v2-hairline)] bg-[var(--v2-bg)] hover:border-[var(--v2-hairline-strong)] hover:bg-[var(--v2-hover)]"
                    )}
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    <div className={cn("flex items-center gap-2 w-full", isRtl && "relative pr-8")}>
                      <Shield
                        className={cn(
                          "w-5 h-5",
                          isRtl ? "absolute right-0 top-1/2 -translate-y-1/2" : "",
                          shareType === 'password' ? "text-[var(--v2-accent)]" : "text-[var(--v2-ink-3)]"
                        )}
                      />
                      <div className="text-left rtl:text-right rtl:items-end rtl:flex rtl:flex-col">
                        <p className={cn(
                          "text-sm",
                        shareType === 'password' ? "text-[var(--v2-accent)]" : "text-[var(--v2-ink-1)]"
                    )}>{t("share.protected")}</p>
                        <p className="text-xs text-[var(--v2-ink-3)]">{t("share.protectedHelper")}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password fields */}
              {shareType === 'password' && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="v2-field-label mb-2 block">
                      {t("share.password")}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="v2-input"
                      placeholder={t("share.passwordPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="v2-field-label mb-2 block">
                      {t("share.confirmPassword")}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="v2-input"
                      placeholder={t("share.confirmPasswordPlaceholder")}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-4 border border-[var(--v2-accent-hairline)] bg-[var(--v2-danger-faint)] p-4">
                  <p className="text-sm text-[var(--v2-danger)]">{error}</p>
                </div>
              )}

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="v2-btn v2-btn--accent w-full disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("share.creating")}
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    {t("share.create")}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-[var(--v2-accent-hairline)] bg-[var(--v2-accent-faint)] text-[var(--v2-accent)]">
                  <Check className="size-6" />
                </div>
                <h3 className="v2-modal-title mb-2">
                  {t("share.successTitle")}
                </h3>
                <p className="v2-body-sm">
                  {shareType === 'password'
                    ? t("share.successProtected")
                    : t("share.successPublic")}
                </p>
              </div>

              {/* Share URL */}
              <div className="mb-4">
                <label className="v2-field-label mb-2 block">
                  {t("share.shareLink")}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="v2-input flex-1"
                  />
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "v2-btn v2-btn--sm w-full transition-colors sm:w-auto",
                      copied
                        ? "v2-btn--accent"
                        : ""
                    )}
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="v2-card mb-4 p-3 text-sm text-[var(--v2-ink-3)]">
                <div className="flex items-center gap-2">
                    {shareType === 'password' ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                  <span>
                    {shareType === 'password'
                      ? t("share.passwordProtected")
                      : t("share.publicLink")}
                  </span>
                </div>
                <p className="mt-1 text-xs">
                  {t("share.expires")}
                </p>
              </div>

              {/* Done button */}
              <button
                onClick={handleClose}
                className="v2-btn w-full"
              >
                {t("share.done")}
              </button>
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
