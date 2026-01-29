import { CenterLogo } from "../icons";
import { MoreVertical, Share2, Copy } from "lucide-react";
import { useState } from "react";

interface ChatHeaderProps {
  title: string;
  onMenuToggle?: () => void;
  onShare?: () => void;
  menuOpen?: boolean;
  shareOpen?: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
  className?: string;
}

export function ChatHeader({
  title,
  onMenuToggle,
  onShare,
  menuOpen,
  shareOpen,
  onRegenerate,
  onCopy,
  className,
}: ChatHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#efe4d6] dark:border-[#2a2118] bg-white/50 dark:bg-[#16120e]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <CenterLogo className="size-6 text-[#D24430]" />
          <h1 className="text-sm font-semibold text-[#1f1a14] dark:text-[#efe6d9] truncate max-w-[200px]">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center gap-1">
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="size-8 flex items-center justify-center rounded-lg text-[#88735A] hover:bg-[#f8f2e9] dark:hover:bg-[#2a2118] transition-colors"
              aria-label="Regenerate"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </button>
          )}
          
          {onCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className="size-8 flex items-center justify-center rounded-lg text-[#88735A] hover:bg-[#f8f2e9] dark:hover:bg-[#2a2118] transition-colors"
              aria-label={copied ? "Copied" : "Copy"}
            >
              {copied ? (
                <svg className="size-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          )}
          
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className={`size-8 flex items-center justify-center rounded-lg transition-colors ${
                shareOpen ? "bg-[#f8f2e9] text-[#D24430]" : "text-[#88735A] hover:bg-[#f8f2e9] dark:hover:bg-[#2a2118]"
              }`}
              aria-label="Share"
              aria-expanded={shareOpen}
            >
              <Share2 className="size-4" />
            </button>
          )}
          
          {onMenuToggle && (
            <button
              type="button"
              onClick={onMenuToggle}
              className={`size-8 flex items-center justify-center rounded-lg transition-colors ${
                menuOpen ? "bg-[#f8f2e9] text-[#D24430]" : "text-[#88735A] hover:bg-[#f8f2e9] dark:hover:bg-[#2a2118]"
              }`}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
