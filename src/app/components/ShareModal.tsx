import { useState } from 'react';
import { X, Link2, Lock, Copy, Check, Loader2, Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setError('');

    // Validate password if protected
    if (shareType === 'password') {
      if (!password) {
        setError('Please enter a password');
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
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
          title: threadTitle || 'Shared Conversation',
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
        setError(data.error || 'Failed to create share link');
        return;
      }

      setShareUrl(data.url);
    } catch (err) {
      setError('Failed to create share link');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        ref={focusTrapRef}
        className="relative bg-zaki-primary border border-zaki-subtle rounded-zaki-lg w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zaki-subtle">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-zaki-brand/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-zaki-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zaki-primary">Share Conversation</h2>
              <p className="text-xs text-zaki-muted">Create a shareable link</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zaki-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zaki-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!shareUrl ? (
            <>
              {/* Thread info */}
              <div className="mb-4 p-3 bg-zaki-base rounded-zaki-md">
                <p className="text-sm text-zaki-muted">Sharing</p>
                <p className="text-zaki-primary font-medium truncate">
                  {threadTitle || 'Untitled Conversation'}
                </p>
                <p className="text-xs text-zaki-secondary mt-1">
                  {messages.length} messages • Expires in 10 days
                </p>
              </div>

              {/* Share type selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zaki-muted mb-2">
                  Access Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareType('public')}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-zaki-md border transition-all",
                      shareType === 'public'
                        ? "border-zaki-focus bg-zaki-brand/10"
                        : "border-zaki-subtle hover:border-zaki-strong"
                    )}
                  >
                    <Globe className={cn(
                      "w-5 h-5",
                      shareType === 'public' ? "text-zaki-brand" : "text-zaki-muted"
                    )} />
                    <div className="text-left">
                      <p className={cn(
                        "text-sm font-medium",
                        shareType === 'public' ? "text-zaki-brand" : "text-zaki-primary"
                      )}>Public</p>
                      <p className="text-xs text-zaki-muted">Anyone with link</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShareType('password')}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-zaki-md border transition-all",
                      shareType === 'password'
                        ? "border-zaki-focus bg-zaki-brand/10"
                        : "border-zaki-subtle hover:border-zaki-strong"
                    )}
                  >
                    <Shield className={cn(
                      "w-5 h-5",
                      shareType === 'password' ? "text-zaki-brand" : "text-zaki-muted"
                    )} />
                    <div className="text-left">
                      <p className={cn(
                        "text-sm font-medium",
                        shareType === 'password' ? "text-zaki-brand" : "text-zaki-primary"
                      )}>Protected</p>
                      <p className="text-xs text-zaki-muted">Requires password</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password fields */}
              {shareType === 'password' && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-zaki-muted mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zaki-base border border-zaki-subtle rounded-zaki-md text-zaki-primary placeholder-zaki-muted focus:outline-none focus:border-zaki-focus transition-colors"
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zaki-muted mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zaki-base border border-zaki-subtle rounded-zaki-md text-zaki-primary placeholder-zaki-muted focus:outline-none focus:border-zaki-focus transition-colors"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-zaki-brand/10 border border-zaki-focus/30 rounded-zaki-md">
                  <p className="text-sm text-zaki-brand">{error}</p>
                </div>
              )}

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zaki-brand hover:bg-zaki-brand disabled:bg-zaki-secondary disabled:cursor-not-allowed text-white font-medium rounded-zaki-md transition-colors"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating link...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Create Share Link
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="text-center mb-6">
                <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-zaki-primary mb-1">
                  Link Created!
                </h3>
                <p className="text-sm text-zaki-muted">
                  {shareType === 'password'
                    ? 'Your password-protected link is ready'
                    : 'Anyone with this link can view the conversation'}
                </p>
              </div>

              {/* Share URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zaki-muted mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-2.5 bg-zaki-base border border-zaki-subtle rounded-zaki-md text-zaki-primary text-sm"
                  />
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "px-4 py-2.5 rounded-zaki-md font-medium transition-colors",
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-zaki-dark-elevated hover:bg-zaki-dark-elevated text-zaki-primary"
                    )}
                  >
                    {copied ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 bg-zaki-base rounded-zaki-md text-sm text-zaki-muted mb-4">
                <div className="flex items-center gap-2">
                  {shareType === 'password' ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  <span>
                    {shareType === 'password'
                      ? 'Password protected'
                      : 'Public link'}
                  </span>
                </div>
                <p className="mt-1 text-xs">
                  This link will expire in 10 days.
                </p>
              </div>

              {/* Done button */}
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 bg-zaki-dark-elevated hover:bg-zaki-dark-elevated text-zaki-primary font-medium rounded-zaki-md transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
