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
      className="zaki-share-modal w-full max-w-md rounded-zaki-lg border border-zaki-subtle bg-white"
    >
      <div dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between p-4 border-b border-zaki-subtle bg-zaki-base">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-zaki-brand/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-zaki-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zaki-primary">{t("share.title")}</h2>
              <p className="text-xs text-zaki-muted">{t("share.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="zaki-icon-btn size-9 rounded-lg"
            aria-label="Close share modal"
          >
            <X className="w-5 h-5 text-zaki-muted" />
          </button>
        </div>

        <div className="p-4">
          {!shareUrl ? (
            <>
              {/* Thread info */}
                <div className="mb-4 p-4 bg-zaki-base rounded-zaki-md border border-zaki-subtle">
                <p className="text-sm text-zaki-muted">{t("share.sharing")}</p>
                <p className="text-zaki-primary font-medium truncate">
                  {threadTitle || t("share.untitled")}
                </p>
                <p className="text-xs text-zaki-secondary mt-1">
                  {t("share.meta", { count: messages.length })}
                </p>
              </div>

              {/* Share type selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zaki-muted mb-2">
                  {t("share.accessType")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareType('public')}
                    className={cn(
                      "flex items-center p-3 rounded-zaki-md border transition-all bg-white rtl:text-right rtl:justify-end",
                      shareType === 'public'
                        ? "border-zaki-focus bg-zaki-selected"
                        : "border-zaki-subtle hover:border-zaki-strong hover:bg-zaki-hover"
                    )}
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    <div className={cn("flex items-center gap-2 w-full", isRtl && "relative pr-8")}>
                      <Globe
                        className={cn(
                          "w-5 h-5",
                          isRtl ? "absolute right-0 top-1/2 -translate-y-1/2" : "",
                          shareType === 'public' ? "text-zaki-brand" : "text-zaki-muted"
                        )}
                      />
                      <div className="text-left rtl:text-right rtl:items-end rtl:flex rtl:flex-col">
                        <p className={cn(
                          "text-sm font-medium",
                        shareType === 'public' ? "text-zaki-brand" : "text-zaki-primary"
                    )}>{t("share.public")}</p>
                        <p className="text-xs text-zaki-muted">{t("share.publicHelper")}</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShareType('password')}
                    className={cn(
                      "flex items-center p-3 rounded-zaki-md border transition-all bg-white rtl:text-right rtl:justify-end",
                      shareType === 'password'
                        ? "border-zaki-focus bg-zaki-selected"
                        : "border-zaki-subtle hover:border-zaki-strong hover:bg-zaki-hover"
                    )}
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    <div className={cn("flex items-center gap-2 w-full", isRtl && "relative pr-8")}>
                      <Shield
                        className={cn(
                          "w-5 h-5",
                          isRtl ? "absolute right-0 top-1/2 -translate-y-1/2" : "",
                          shareType === 'password' ? "text-zaki-brand" : "text-zaki-muted"
                        )}
                      />
                      <div className="text-left rtl:text-right rtl:items-end rtl:flex rtl:flex-col">
                        <p className={cn(
                          "text-sm font-medium",
                        shareType === 'password' ? "text-zaki-brand" : "text-zaki-primary"
                    )}>{t("share.protected")}</p>
                        <p className="text-xs text-zaki-muted">{t("share.protectedHelper")}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password fields */}
              {shareType === 'password' && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-zaki-muted mb-2">
                      {t("share.password")}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zaki-base border border-zaki-subtle rounded-zaki-md text-zaki-primary placeholder-zaki-muted focus:outline-none focus:border-zaki-focus transition-colors"
                      placeholder={t("share.passwordPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zaki-muted mb-2">
                      {t("share.confirmPassword")}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zaki-base border border-zaki-subtle rounded-zaki-md text-zaki-primary placeholder-zaki-muted focus:outline-none focus:border-zaki-focus transition-colors"
                      placeholder={t("share.confirmPasswordPlaceholder")}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-4 p-4 bg-zaki-brand/10 border border-zaki-focus/30 rounded-zaki-md">
                  <p className="text-sm text-zaki-brand">{error}</p>
                </div>
              )}

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full zaki-btn zaki-btn-primary disabled:cursor-not-allowed"
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
                <div className="size-16 rounded-full bg-zaki-accent-10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-zaki-accent" />
                </div>
                <h3 className="text-lg font-semibold text-zaki-primary mb-1">
                  {t("share.successTitle")}
                </h3>
                <p className="text-sm text-zaki-muted">
                  {shareType === 'password'
                    ? t("share.successProtected")
                    : t("share.successPublic")}
                </p>
              </div>

              {/* Share URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zaki-muted mb-2">
                  {t("share.shareLink")}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-2.5 bg-zaki-base border border-zaki-subtle rounded-zaki-md text-zaki-primary text-sm font-medium"
                  />
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "zaki-btn-sm rounded-zaki-md font-semibold transition-colors w-full sm:w-auto",
                      copied
                        ? "bg-zaki-accent text-white"
                        : "zaki-btn-secondary"
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
              <div className="p-3 bg-zaki-raised border border-zaki-subtle rounded-zaki-md text-sm text-zaki-muted mb-4">
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
                className="w-full zaki-btn zaki-btn-secondary"
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
