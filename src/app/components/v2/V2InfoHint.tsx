import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type V2InfoHintProps = {
  /** Plain-language note shown in the bubble. */
  note: ReactNode;
  /** Accessible name for the (i) trigger button (e.g. "What's this?"). */
  triggerLabel: string;
  className?: string;
};

/**
 * V2InfoHint — a small, hairline-led, mono-forward info affordance.
 *
 * A keyboard-focusable (i) button that reveals a short note on hover, focus,
 * and tap. The note is a `role="tooltip"` referenced via `aria-describedby`
 * while open. No portal/observer dependency (keeps it testable in jsdom); a
 * lightweight layout pass flips the bubble above/below and nudges it back
 * inside the viewport so it does not clip at the edges.
 */
export function V2InfoHint({ note, triggerLabel, className }: V2InfoHintProps) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const [side, setSide] = useState<"top" | "bottom">("top");
  const [shift, setShift] = useState(0);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);

  const open = hovered || active;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setHovered(false);
        setActive(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHovered(false);
        setActive(false);
        triggerRef.current?.blur();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      setSide("top");
      return;
    }
    const bubble = bubbleRef.current;
    const trigger = wrapRef.current;
    if (!bubble || !trigger || typeof bubble.getBoundingClientRect !== "function") return;
    const margin = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    if (viewportWidth > 0 && bubbleRect.width > 0) {
      const overflowRight = bubbleRect.right - (viewportWidth - margin);
      const overflowLeft = margin - bubbleRect.left;
      let next = 0;
      if (overflowRight > 0) next = -overflowRight;
      else if (overflowLeft > 0) next = overflowLeft;
      setShift(Math.round(next));
    } else {
      setShift(0);
    }

    if (viewportHeight > 0 && bubbleRect.height > 0) {
      setSide(triggerRect.top < bubbleRect.height + margin ? "bottom" : "top");
    }
  }, [open, note]);

  return (
    <span
      ref={wrapRef}
      className={cn("v2-info-hint", className)}
      data-open={open ? "true" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        className="v2-info-hint__trigger"
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        onClick={(event) => {
          event.preventDefault();
          setActive(true);
        }}
      >
        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="8" cy="4.7" r="0.95" fill="currentColor" />
          <rect x="7.1" y="6.7" width="1.8" height="5" rx="0.9" fill="currentColor" />
        </svg>
      </button>
      <span
        ref={bubbleRef}
        role="tooltip"
        id={id}
        className="v2-info-hint__bubble"
        data-side={side}
        hidden={!open}
        style={shift ? ({ "--v2-hint-shift": `${shift}px` } as CSSProperties) : undefined}
      >
        {note}
      </span>
    </span>
  );
}
