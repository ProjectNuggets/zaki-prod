import { CenterLogo } from "../icons";

export function StreamingIndicator() {
  return (
    <div className="flex gap-4 items-start">
      <div className="size-8 shrink-0 flex items-start justify-center pt-[6px]">
        <div className="scale-75">
          <CenterLogo />
        </div>
      </div>
      <div className="rounded-2xl px-4 py-3 text-sm bg-transparent text-[#1f1a14]">
        <div className="flex items-center gap-2 text-[#88735A]">
          <span>Thinking</span>
          <span className="flex gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b09472] animate-bounce [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#b09472] animate-bounce [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#b09472] animate-bounce" />
          </span>
        </div>
      </div>
    </div>
  );
}
