import { useState, useEffect, useRef } from "react";

interface TypingTextProps {
  text: string;
  /** Characters to type letter-by-letter before switching to instant */
  typingChars?: number;
  /** Milliseconds between each character */
  speed?: number;
  /** Called when typing animation completes */
  onComplete?: () => void;
  className?: string;
}

export function TypingText({
  text,
  typingChars = 60,
  speed = 15,
  onComplete,
  className,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const prevTextRef = useRef("");
  const indexRef = useRef(0);

  useEffect(() => {
    // If text changed significantly (new message), reset
    if (!text.startsWith(prevTextRef.current.slice(0, 20))) {
      setDisplayedText("");
      indexRef.current = 0;
      setIsTyping(true);
    }
    prevTextRef.current = text;

    // If we've typed enough chars, show the rest instantly
    if (indexRef.current >= typingChars) {
      setDisplayedText(text);
      setIsTyping(false);
      onComplete?.();
      return;
    }

    // If text is shorter than what we've displayed, update
    if (text.length <= displayedText.length) {
      setDisplayedText(text);
      return;
    }

    // Type next character
    const timer = setTimeout(() => {
      if (indexRef.current < text.length && indexRef.current < typingChars) {
        indexRef.current += 1;
        setDisplayedText(text.slice(0, indexRef.current));
      } else {
        // Done typing the initial chars, show rest
        setDisplayedText(text);
        setIsTyping(false);
        onComplete?.();
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [text, displayedText, typingChars, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {isTyping && displayedText.length < text.length && (
        <span className="inline-block w-0.5 h-4 bg-zaki-brand ml-0.5 animate-pulse" />
      )}
    </span>
  );
}
