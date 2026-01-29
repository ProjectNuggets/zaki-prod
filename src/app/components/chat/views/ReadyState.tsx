import { forwardRef } from "react";
import { CenterLogo } from "../../icons";

export const ReadyState = forwardRef<HTMLDivElement>(function ReadyState(_, ref) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-16 pb-32">
      <div ref={ref} className="flex flex-col items-center gap-2 mb-6">
        <div className="scale-110">
          <CenterLogo />
        </div>
        <div className="text-[#1f1a14] text-sm font-medium">ZKAI</div>
        <div className="text-[#a3a3a3] text-base">Ready when you are</div>
      </div>
    </div>
  );
});
