import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "./utils";

export function Separator({ className, decorative = true }: { className?: string; decorative?: boolean }) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      className={cn("h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]", className)}
    />
  );
}
