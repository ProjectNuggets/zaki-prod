import { useEffect, useRef, useState } from "react";
import { cn } from "./utils";

interface TextGenerateProps {
  words: string;
  className?: string;
  delay?: number;
}

export function TextGenerate({
  words,
  className,
  delay = 0,
}: TextGenerateProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setStarted(true), delay * 1000);
      return () => clearTimeout(t);
    }
  }, [visible, delay]);

  const wordArray = words.split(" ");

  return (
    <span ref={ref} className={cn("inline", className)}>
      {wordArray.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block transition-all duration-500"
          style={{
            transitionDelay: started ? `${i * 80}ms` : "0ms",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            opacity: started ? 1 : 0,
            filter: started ? "blur(0px)" : "blur(8px)",
            transform: started ? "translateY(0)" : "translateY(4px)",
          }}
        >
          {word}
          {i < wordArray.length - 1 && "\u00A0"}
        </span>
      ))}
    </span>
  );
}
