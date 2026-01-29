import svgPaths from "@/imports/svg-g3updgkf22";

export function BackgroundPattern() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 891 1335"
      >
        <g opacity="0.18">
          <path d={svgPaths.p774f400} stroke="url(#paint0_linear_pattern)" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_pattern" x1="0.5" x2="890.5" y1="667.5" y2="667.5">
            <stop stopColor="var(--zaki-pattern-start)" />
            <stop offset="0.6" stopColor="var(--zaki-pattern-mid)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--zaki-pattern-end)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,var(--zaki-pattern-glow-1),transparent_55%),radial-gradient(circle_at_85%_20%,var(--zaki-pattern-glow-2),transparent_50%)] opacity-70" />
    </div>
  );
}
