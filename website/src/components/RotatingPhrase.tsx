import { useEffect, useState } from "react";

export function RotatingPhrase({
  phrases,
  className = "",
}: {
  phrases: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (phrases.length <= 1) return;

    let timeoutId: number | null = null;
    const intervalId = window.setInterval(() => {
      setIsVisible(false);

      timeoutId = window.setTimeout(() => {
        setIndex((current) => (current + 1) % phrases.length);
        setIsVisible(true);
      }, 180);
    }, 2400);

    return () => {
      window.clearInterval(intervalId);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [phrases]);

  return (
    <span
      className={`hero-rotating-phrase ${isVisible ? "is-visible" : "is-hidden"} ${className}`.trim()}
      aria-live="polite"
    >
      {phrases[index] ?? ""}
    </span>
  );
}
