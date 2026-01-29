import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Calendar, Eye, ArrowLeft, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
// ChatMarkdown not currently used - using simple text rendering for share view
import { CenterLogo } from './icons';
import { buildApiUrl } from '@/lib/api';

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
}

interface ConversationData {
  title: string;
  conversation: Message[];
  expiresAt: string;
  viewCount: number;
  createdAt: string;
}

type ViewState = 'loading' | 'password' | 'viewing' | 'error' | 'expired';

export function SharedConversation() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState<string>('');
  const [password, setPassword] = useState('');
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch share info on mount
  useEffect(() => {
    if (!token) {
      setState('error');
      setError('Invalid share link');
      return;
    }

    const fetchShareInfo = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/share/${token}`));
        const data = await response.json();

        if (response.status === 404) {
          setState('error');
          setError('This share link does not exist');
          return;
        }

        if (response.status === 410) {
          setState('expired');
          setError('This share link has expired');
          return;
        }

        if (!response.ok) {
          setState('error');
          setError(data.error || 'Failed to load share info');
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
        setError('Failed to connect to server');
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
        setError('Incorrect password');
        setIsVerifying(false);
        return;
      }

      if (response.status === 410) {
        setState('expired');
        setError('This share link has expired');
        return;
      }

      if (!response.ok) {
        setState('error');
        setError(data.error || 'Failed to load conversation');
        return;
      }

      setConversation(data);
      setState('viewing');
    } catch (err) {
      setState('error');
      setError('Failed to load conversation');
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
    return new Date(dateStr).toLocaleDateString('en-US', {
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
          <div className="size-8 border-2 border-[#88735A]/20 border-t-[#88735A] rounded-full animate-spin" />
          <div className="text-sm text-zaki-muted">Loading conversation...</div>
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
          <h1 className="text-xl font-semibold text-zaki-primary mb-2">Unable to Load</h1>
          <p className="text-zaki-muted mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2a2420] hover:bg-[#3a3430] text-zaki-primary font-medium rounded-zaki-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to ZAKI
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
          <h1 className="text-xl font-semibold text-zaki-primary mb-2">Link Expired</h1>
          <p className="text-zaki-muted mb-6">
            This shared conversation link has expired and is no longer available.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zaki-brand hover:bg-zaki-brand text-white font-medium rounded-zaki-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to ZAKI
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
            <div className="size-16 rounded-full bg-[#2a2420] flex items-center justify-center">
              <Lock className="w-8 h-8 text-zaki-brand" />
            </div>
          </div>
          
          <h1 className="text-xl font-semibold text-zaki-primary text-center mb-2">
            Protected Conversation
          </h1>
          <p className="text-zaki-muted text-center mb-6">
            {shareInfo?.title && <span className="font-medium text-zaki-primary">"{shareInfo.title}"</span>}
            <br />
            This conversation is password protected.
          </p>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zaki-muted mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zaki-base border border-zaki-subtle rounded-zaki-md text-zaki-primary placeholder-[#655543] focus:outline-none focus:border-zaki-focus transition-colors"
                placeholder="Enter password"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-zaki-brand">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full px-6 py-3 bg-zaki-brand hover:bg-zaki-brand disabled:bg-zaki-secondary disabled:cursor-not-allowed text-white font-medium rounded-zaki-md transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'View Conversation'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zaki-subtle">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-sm text-zaki-muted hover:text-zaki-brand transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to ZAKI
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Viewing state
  return (
    <div className="min-h-screen bg-zaki-base text-zaki-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zaki-base/95 backdrop-blur-sm border-b border-zaki-subtle">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-zaki-brand hover:text-zaki-brand transition-colors">
              <CenterLogo className="size-6" />
              <span className="font-semibold">ZAKI</span>
            </Link>
            
            <div className="flex items-center gap-4 text-xs text-zaki-muted">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{conversation?.viewCount} views</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(conversation?.createdAt || '')}</span>
              </div>
              {conversation?.expiresAt && (
                <div className="flex items-center gap-1 text-zaki-brand">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires in {daysUntilExpiry(conversation.expiresAt)} days</span>
                </div>
              )}
            </div>
          </div>
          
          <h1 className="mt-3 text-lg font-semibold">{conversation?.title}</h1>
        </div>
      </header>

      {/* Conversation */}
      <main className="max-w-3xl mx-auto px-4 py-8">
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
                <div className="size-8 rounded-full bg-zaki-brand flex items-center justify-center shrink-0">
                  <CenterLogo className="size-4 text-white" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-zaki-lg px-4 py-3",
                  msg.role === 'user'
                    ? "bg-[#2a2420] text-zaki-primary"
                    : "bg-zaki-primary border border-zaki-subtle text-zaki-primary"
                )}
              >
                {/* Use simple text rendering since ChatMarkdown uses light-mode colors */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
              
              {msg.role === 'user' && (
                <div className="size-8 rounded-full bg-zaki-secondary flex items-center justify-center shrink-0 text-xs font-medium">
                  U
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-zaki-subtle text-center">
          <p className="text-sm text-zaki-muted mb-4">
            This is a read-only view of a shared conversation.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zaki-brand hover:bg-zaki-brand text-white font-medium rounded-zaki-md transition-colors"
          >
            Start your own conversation on ZAKI
          </Link>
        </div>
      </main>
    </div>
  );
}
