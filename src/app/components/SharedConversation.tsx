import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Calendar, Eye, ArrowLeft, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMarkdown } from './ChatMarkdown';
import { CenterLogo } from './icons';
import { buildApiUrl } from '@/lib/api';
import { useTranslation } from "react-i18next";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ShareInfo {
  title: string;
  isPasswordProtected: boolean;
  expiresAt: string;
  viewCount: number;
  createdAt: string;
  sharedByName?: string;
}

interface ConversationData {
  title: string;
  conversation: Message[];
  expiresAt: string;
  viewCount: number;
  createdAt: string;
  sharedByName?: string;
}

type ViewState = 'loading' | 'password' | 'viewing' | 'error' | 'expired';

export function SharedConversation() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.toLowerCase().startsWith("ar");
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState<string>('');
  const [password, setPassword] = useState('');
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const sharedByName = conversation?.sharedByName || shareInfo?.sharedByName || "";
  const sharedByInitials = sharedByName
    ? sharedByName
        .split(/[\s.@_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "";

  // Fetch share info on mount
  useEffect(() => {
    if (!token) {
      setState('error');
      setError(t("shared.errors.invalid"));
      return;
    }

    const fetchShareInfo = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/share/${token}`));
        const data = await response.json();

        if (response.status === 404) {
          setState('error');
          setError(t("shared.errors.notFound"));
          return;
        }

        if (response.status === 410) {
          setState('expired');
          setError(t("shared.errors.expired"));
          return;
        }

        if (!response.ok) {
          setState('error');
          setError(data.error || t("shared.errors.failedInfo"));
          return;
        }

        setShareInfo(data);

        if (data.isPasswordProtected) {
          setState('password');
        } else {
          // Load conversation directly
          await loadConversation();
        }
      } catch (err) {
        setState('error');
        setError(t("shared.errors.failedServer"));
      }
    };

    fetchShareInfo();
  }, [token]);

  const loadConversation = async (pwd?: string) => {
    try {
      setIsVerifying(true);
      const response = await fetch(buildApiUrl(`/api/share/${token}/view`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });

      const data = await response.json();

      if (response.status === 401 && data.requiresPassword) {
        setState('password');
        setIsVerifying(false);
        return;
      }

      if (response.status === 401) {
        setError(t("shared.errors.incorrectPassword"));
        setIsVerifying(false);
        return;
      }

      if (response.status === 410) {
        setState('expired');
        setError(t("shared.errors.expired"));
        return;
      }

      if (!response.ok) {
        setState('error');
        setError(data.error || t("shared.errors.failedConversation"));
        return;
      }

      setConversation(data);
      setState('viewing');
    } catch (err) {
      setState('error');
      setError(t("shared.errors.failedConversation"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    await loadConversation(password);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isRtl ? 'ar' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const daysUntilExpiry = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-zaki-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-2 border-zaki-spinner border-t-zaki-muted rounded-full animate-spin" />
          <div className="text-sm text-zaki-muted">{t("shared.loading")}</div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-zaki-base flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zaki-primary border border-zaki-subtle rounded-zaki-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-zaki-brand mb-4" />
          <h1 className="text-xl font-semibold text-zaki-primary mb-2">{t("shared.errorTitle")}</h1>
          <p className="text-zaki-muted mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 zaki-btn bg-zaki-dark-elevated hover:bg-zaki-dark-elevated text-zaki-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("shared.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  // Expired state
  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-zaki-base flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zaki-primary border border-zaki-subtle rounded-zaki-lg p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-zaki-muted mb-4" />
          <h1 className="text-xl font-semibold text-zaki-primary mb-2">{t("shared.expiredTitle")}</h1>
          <p className="text-zaki-muted mb-6">{t("shared.expiredBody")}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 zaki-btn bg-zaki-brand hover:bg-zaki-brand text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("shared.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  // Password entry state
  if (state === 'password') {
    return (
      <div className="min-h-screen bg-zaki-base flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zaki-primary border border-zaki-subtle rounded-zaki-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="size-16 rounded-full bg-zaki-dark-elevated flex items-center justify-center">
              <Lock className="w-8 h-8 text-zaki-brand" />
            </div>
          </div>
          
          <h1 className="text-xl font-semibold text-zaki-primary text-center mb-2">
            {t("shared.protectedTitle")}
          </h1>
          <p className="text-zaki-muted text-center mb-6">
            {shareInfo?.title && <span className="font-medium text-zaki-primary">"{shareInfo.title}"</span>}
            <br />
            {t("shared.protectedBody")}
          </p>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zaki-muted mb-2">
                {t("shared.passwordLabel")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zaki-base border border-zaki-subtle rounded-zaki-md text-zaki-primary placeholder-zaki-muted focus:outline-none focus:border-zaki-focus transition-colors"
                placeholder={t("shared.passwordPlaceholder")}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-zaki-brand">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full zaki-btn bg-zaki-brand hover:bg-zaki-brand disabled:bg-zaki-secondary disabled:cursor-not-allowed text-white transition-colors"
            >
              {isVerifying ? t("shared.verifying") : t("shared.viewConversation")}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zaki-subtle">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-sm text-zaki-muted hover:text-zaki-brand transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("shared.backHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Viewing state
  return (
    <div
      className="min-h-screen bg-zaki-base dark:bg-[#0f0b08] text-zaki-primary dark:text-zaki-dark-primary"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zaki-base/95 dark:bg-[#0f0b08]/95 backdrop-blur-sm border-b border-zaki-subtle dark:border-zaki-dark">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 text-zaki-brand hover:text-zaki-brand transition-colors">
              <CenterLogo className="size-6" />
              <span className="font-semibold">ZAKI</span>
            </Link>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
              <span>{t("shared.views", { count: conversation?.viewCount ?? 0 })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(conversation?.createdAt || '')}</span>
            </div>
            {conversation?.expiresAt && (
              <div className="flex items-center gap-1 text-zaki-brand">
                <Clock className="w-3.5 h-3.5" />
                <span>{t("shared.expiresIn", { days: daysUntilExpiry(conversation.expiresAt) })}</span>
              </div>
            )}
          </div>
          </div>
          
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zaki-subtle dark:border-zaki-dark bg-zaki-raised dark:bg-zaki-dark-elevated px-3 py-1 text-2xs text-zaki-muted dark:text-zaki-dark-muted">
            <Lock className="size-3.5 text-zaki-muted dark:text-zaki-dark-muted" />
            {t("shared.readOnlyBanner")}
          </div>
          {!sharedByName && (
            <div className="mt-2 text-2xs text-zaki-muted dark:text-zaki-dark-muted">
              {t("shared.profileHint")}
            </div>
          )}
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zaki-primary dark:text-zaki-dark-primary">
            {conversation?.title}
          </h1>
        </div>
      </header>

      {/* Conversation */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-8">
        <div className="flex flex-col gap-6">
          {conversation?.conversation.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-4",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === 'assistant' && (
                <div className="size-9 rounded-full bg-zaki-base dark:bg-zaki-dark-card border border-zaki-subtle dark:border-zaki-dark flex items-center justify-center shrink-0">
                  <CenterLogo className="size-4" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[92%] sm:max-w-[80%] rounded-zaki-xl px-4 py-3 border border-zaki-subtle dark:border-zaki-dark",
                  msg.role === 'user'
                    ? "bg-zaki-elevated/80 dark:bg-zaki-dark-elevated text-zaki-primary dark:text-zaki-dark-primary"
                    : "bg-zaki-raised dark:bg-zaki-dark-card text-zaki-primary dark:text-zaki-dark-primary"
                )}
              >
                <ChatMarkdown content={typeof msg.content === "string" ? msg.content : ""} />
              </div>
              
              {msg.role === 'user' && (
                <div className="size-9 rounded-full bg-transparent border border-zaki-subtle dark:border-zaki-dark flex items-center justify-center shrink-0 text-xs font-semibold text-zaki-muted dark:text-zaki-dark-muted">
                  {sharedByInitials || ""}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-zaki-subtle dark:border-zaki-dark text-center">
          <p className="text-sm text-zaki-muted dark:text-zaki-dark-muted mb-4">
            {t("shared.footerNote")}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 zaki-btn bg-zaki-brand hover:bg-zaki-brand text-white transition-colors"
          >
            {t("shared.footerCta")}
          </Link>
        </div>
      </main>
    </div>
  );
}
