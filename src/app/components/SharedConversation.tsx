import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Calendar, Eye, ArrowLeft, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMarkdown } from './ChatMarkdown';
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
      <div className="min-h-screen bg-[#0f0b08] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-2 border-[#88735A]/20 border-t-[#88735A] rounded-full animate-spin" />
          <div className="text-sm text-[#c9b8a4]">Loading conversation...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-[#0f0b08] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1a1410] border border-[#2a2420] rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-[#D24430] mb-4" />
          <h1 className="text-xl font-semibold text-[#efe6d9] mb-2">Unable to Load</h1>
          <p className="text-[#c9b8a4] mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2a2420] hover:bg-[#3a3430] text-[#efe6d9] font-medium rounded-xl transition-colors"
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
      <div className="min-h-screen bg-[#0f0b08] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1a1410] border border-[#2a2420] rounded-2xl p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-[#88735A] mb-4" />
          <h1 className="text-xl font-semibold text-[#efe6d9] mb-2">Link Expired</h1>
          <p className="text-[#c9b8a4] mb-6">
            This shared conversation link has expired and is no longer available.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#D24430] hover:bg-[#b33a2c] text-white font-medium rounded-xl transition-colors"
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
      <div className="min-h-screen bg-[#0f0b08] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1a1410] border border-[#2a2420] rounded-2xl p-8">
          <div className="flex justify-center mb-6">
            <div className="size-16 rounded-full bg-[#2a2420] flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#D24430]" />
            </div>
          </div>
          
          <h1 className="text-xl font-semibold text-[#efe6d9] text-center mb-2">
            Protected Conversation
          </h1>
          <p className="text-[#c9b8a4] text-center mb-6">
            {shareInfo?.title && <span className="font-medium text-[#efe6d9]">"{shareInfo.title}"</span>}
            <br />
            This conversation is password protected.
          </p>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#c9b8a4] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f0b08] border border-[#2a2420] rounded-xl text-[#efe6d9] placeholder-[#655543] focus:outline-none focus:border-[#D24430] transition-colors"
                placeholder="Enter password"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-[#D24430]">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full px-6 py-3 bg-[#D24430] hover:bg-[#b33a2c] disabled:bg-[#655543] disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'View Conversation'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#2a2420]">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-sm text-[#88735A] hover:text-[#D24430] transition-colors"
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
    <div className="min-h-screen bg-[#0f0b08] text-[#efe6d9]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f0b08]/95 backdrop-blur-sm border-b border-[#2a2420]">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-[#D24430] hover:text-[#b33a2c] transition-colors">
              <CenterLogo className="size-6" />
              <span className="font-semibold">ZAKI</span>
            </Link>
            
            <div className="flex items-center gap-4 text-xs text-[#88735A]">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{conversation?.viewCount} views</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(conversation?.createdAt || '')}</span>
              </div>
              {conversation?.expiresAt && (
                <div className="flex items-center gap-1 text-[#D24430]">
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
                <div className="size-8 rounded-full bg-[#D24430] flex items-center justify-center shrink-0">
                  <CenterLogo className="size-4 text-white" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  msg.role === 'user'
                    ? "bg-[#2a2420] text-[#efe6d9]"
                    : "bg-[#1a1410] border border-[#2a2420] text-[#efe6d9]"
                )}
              >
                {/* Use simple text rendering since ChatMarkdown uses light-mode colors */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
              
              {msg.role === 'user' && (
                <div className="size-8 rounded-full bg-[#655543] flex items-center justify-center shrink-0 text-xs font-medium">
                  U
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[#2a2420] text-center">
          <p className="text-sm text-[#88735A] mb-4">
            This is a read-only view of a shared conversation.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#D24430] hover:bg-[#b33a2c] text-white font-medium rounded-xl transition-colors"
          >
            Start your own conversation on ZAKI
          </Link>
        </div>
      </main>
    </div>
  );
}
