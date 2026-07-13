import { cn } from "./utils";

interface SafariMockupProps {
  url?: string;
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function SafariMockup({
  url = "chatzaki.com",
  src,
  alt = "ZAKI AI",
  className,
  width = 1203,
  height = 753,
}: SafariMockupProps) {
  return (
    <div className={cn("relative rounded-xl overflow-hidden", className)}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 bg-zk-surface border-b border-zk-border px-4 py-2.5">
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-zk-text-ghost" />
          <div className="h-2.5 w-2.5 rounded-full bg-zk-text-ghost" />
          <div className="h-2.5 w-2.5 rounded-full bg-zk-text-ghost" />
        </div>
        {/* URL bar */}
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-zk-bg/60 px-3 py-1 text-xs text-zk-text-tertiary">
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1.333A6.674 6.674 0 0 0 1.333 8 6.674 6.674 0 0 0 8 14.667 6.674 6.674 0 0 0 14.667 8 6.674 6.674 0 0 0 8 1.333Zm0 1.334A5.333 5.333 0 0 1 13.333 8 5.333 5.333 0 0 1 8 13.333 5.333 5.333 0 0 1 2.667 8 5.333 5.333 0 0 1 8 2.667Z"
              fill="currentColor"
              fillOpacity="0.4"
            />
            <path d="M7.333 4h1.334v4.667H7.333V4Zm0 5.333h1.334v1.334H7.333V9.333Z" fill="currentColor" fillOpacity="0.4" />
          </svg>
          <span>{url}</span>
        </div>
      </div>
      {/* Content */}
      <div className="relative bg-zk-bg">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
