import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";

const SLIDES = [
  "/slides/1.png",
  "/slides/2.png",
  "/slides/3.png",
  "/slides/4.png",
  "/slides/5.png",
  "/slides/6.png",
];

const AUTO_INTERVAL = 8000;

export function HeroParallaxImage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isInteracting) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_INTERVAL);

    return () => window.clearInterval(timer);
  }, [isInteracting]);

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const progress = (relX + relY) / 2;
    const nextIndex = Math.round(progress * (SLIDES.length - 1));
    setActiveIndex(nextIndex);

    if (!reduceMotion) {
      setTranslate({
        x: (relX - 0.5) * 12,
        y: (relY - 0.5) * 10,
      });
    }
  };

  const handlePointerEnter = () => setIsInteracting(true);

  const handlePointerLeave = () => {
    setIsInteracting(false);
    setTranslate({ x: 0, y: 0 });
  };

  return (
    <div
      className="relative w-full aspect-square min-h-[280px] overflow-hidden rounded-card border border-line-strong shadow-[0_20px_60px_rgba(17,10,6,0.10)]"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className="h-full w-full transition-transform duration-500 ease-out will-change-transform"
        style={{
          transform: reduceMotion
            ? "none"
            : `translate3d(${translate.x}px, ${translate.y}px, 0) scale(1.03)`,
        }}
      >
        {SLIDES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`ZAKI AI product experience — view ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
            style={{ opacity: i === activeIndex ? 1 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}
