import { useState, useEffect } from "react";
import { CenterLogo } from "../icons";
import { cn } from "@/lib/utils";

const thinkingPhrases = [
  "Thinking",
  "Mulling it over",
  "Let me think",
  "Processing",
  "Working on it",
];

interface ThinkingIndicatorProps {
  className?: string;
}

export function ThinkingIndicator({ className }: ThinkingIndicatorProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % thinkingPhrases.length);
        setIsTransitioning(false);
      }, 200); // Fade out duration
    }, 2500); // Change phrase every 2.5s

    return () => clearInterval(interval);
  }, []);

  const currentPhrase = thinkingPhrases[phraseIndex] ?? "Thinking";

  return (
    <div className={cn("flex gap-4 items-start", className)}>
      {/* Pulsing Avatar */}
      <div className="size-8 shrink-0 flex items-center justify-center">
        <div className="zaki-avatar-pulse relative">
          <div className="absolute inset-0 rounded-full bg-zaki-brand/20 animate-ping-slow" />
          <div className="relative scale-75">
            <CenterLogo />
          </div>
        </div>
      </div>

      {/* Thinking Text with Shimmer */}
      <div className="rounded-zaki-lg px-4 py-3 text-sm bg-transparent">
        <div className="flex items-center gap-3">
          {/* Rotating phrase with fade transition */}
          <span 
            className={cn(
              "zaki-thinking-text text-zaki-muted font-medium transition-opacity duration-200",
              isTransitioning ? "opacity-0" : "opacity-100"
            )}
          >
            {currentPhrase}
          </span>
          
          {/* Animated dots — teal accent */}
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="zaki-dot" style={{ animationDelay: "0s" }} />
            <span className="zaki-dot" style={{ animationDelay: "0.15s" }} />
            <span className="zaki-dot" style={{ animationDelay: "0.3s" }} />
          </span>
        </div>
      </div>
    </div>
  );
}
