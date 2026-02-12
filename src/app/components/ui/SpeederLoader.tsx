export function SpeederLoader({
  size = 140,
  className = "",
  label = "Starting chat...",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className="zaki-speeder"
        style={{
          width: size,
          height: Math.round(size * 0.6),
        }}
        aria-hidden="true"
      >
        <span>
          <span />
          <span />
          <span />
          <span />
        </span>
        <div className="zaki-speeder-base">
          <span />
          <div className="zaki-speeder-face" />
        </div>
      </div>
      <div className="text-xs text-zaki-muted">{label}</div>
    </div>
  );
}
