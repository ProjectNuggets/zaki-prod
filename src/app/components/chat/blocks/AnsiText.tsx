import { parseAnsi } from "@/lib/ansi";

export function AnsiText({ text }: { text: string }) {
  const segments = parseAnsi(text);
  if (segments.length === 0) return null;
  return (
    <>
      {segments.map((seg, idx) => {
        const style: React.CSSProperties = {};
        if (seg.fg) style.color = seg.fg;
        if (seg.bg) style.backgroundColor = seg.bg;
        if (seg.bold) style.fontWeight = 600;
        if (seg.italic) style.fontStyle = "italic";
        if (seg.underline) style.textDecoration = "underline";
        if (seg.dim) style.opacity = 0.7;
        return (
          <span key={idx} style={style}>
            {seg.text}
          </span>
        );
      })}
    </>
  );
}
