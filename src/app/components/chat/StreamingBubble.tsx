import { useState, useEffect, useRef } from "react";
import { CenterLogo } from "../icons";
import { ChatMarkdown } from "../ChatMarkdown";

interface StreamingBubbleProps {
  content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTypingPhase, setIsTypingPhase] = useState(true);
  const charIndexRef = useRef(0);
  const typingCharsLimit = 80; // Type first 80 chars, then show rest instantly
  const typingSpeed = 12; // ms per character

  useEffect(() => {
    // If content grew, we need to catch up
    if (content.length > displayedContent.length) {
      if (isTypingPhase && charIndexRef.current < typingCharsLimit) {
        // Still in typing phase - animate character by character
        const timer = setTimeout(() => {
          charIndexRef.current += 1;
          setDisplayedContent(content.slice(0, charIndexRef.current));
          
          // Exit typing phase after limit
          if (charIndexRef.current >= typingCharsLimit) {
            setIsTypingPhase(false);
          }
        }, typingSpeed);
        return () => clearTimeout(timer);
      } else {
        // Past typing phase - show all content instantly
        setDisplayedContent(content);
      }
    }
  }, [content, displayedContent, isTypingPhase]);

  // Reset when content starts fresh (new message)
  useEffect(() => {
    if (content.length < 10 && displayedContent.length > content.length + 50) {
      // Likely a new message, reset
      charIndexRef.current = 0;
      setDisplayedContent("");
      setIsTypingPhase(true);
    }
  }, [content, displayedContent]);

  return (
    <div className="zaki-message-row flex gap-4 justify-start items-start zaki-message-enter-assistant">
      <div className="size-8 shrink-0 flex items-start justify-center pt-[6px]">
        <div className="scale-75">
          <CenterLogo />
        </div>
      </div>

      <div className="zaki-message-stack max-w-[80%] flex flex-col gap-2 items-start">
        <div className="zaki-message-bubble zaki-assistant-bubble rounded-zaki-lg px-4 py-3 text-sm leading-relaxed bg-transparent text-zaki-primary">
          <ChatMarkdown content={displayedContent} />
          {isTypingPhase && displayedContent.length < content.length && (
            <span className="inline-block w-0.5 h-4 bg-zaki-brand ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
