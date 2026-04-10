import svgPaths from "@/imports/svg-g3updgkf22";

export function LogoArabicOrange({ className }: { className?: string }) {
  return (
    <div className={className || "relative h-[32px] w-[46px] shrink-0"}>
      <svg className="block size-full" fill="none" preserveAspectRatio="xMidYMid meet" viewBox="0 0 46 32">
        <g>
          <path d={svgPaths.p2adfc080} fill="#D24430" />
          <path d={svgPaths.pc99e400} fill="#D24430" />
          <path d={svgPaths.p36333a00} fill="#D24430" />
          <path d={svgPaths.p387374d0} fill="#D24430" />
          <path d={svgPaths.p34990b80} fill="#D24430" />
          <path d={svgPaths.p22acf480} fill="#D24430" />
          <path d={svgPaths.p1ae9a300} fill="#D24430" />
        </g>
      </svg>
    </div>
  );
}

export function SideBarIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p2c70e300} fill="#B09472" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p1d5fc900} fill="#B09472" />
    </svg>
  );
}

export function AddIcon({ color = "#D24430" }: { color?: string }) {
  return (
    <svg className="size-[18px]" fill="none" viewBox="0 0 18 18">
      <path d={svgPaths.p90a02f0} fill={color} />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p2e9da000} fill="#CDB394" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p3d3cc780} fill="#CDB394" />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p117a2c00} fill="#CDB394" />
    </svg>
  );
}

export function ChevronDownIcon({ color = "#A4A4A4" }: { color?: string }) {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p2c6f4a00} fill={color} />
    </svg>
  );
}

export function FlashlightIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 16 16">
      <path d={svgPaths.p25976f00} fill="#88735A" />
    </svg>
  );
}

export function CenterLogo({ className }: { className?: string }) {
  return (
    <div className={className || "size-8 relative"}>
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g>
          <path d={svgPaths.pb726e00} fill="#D24430" />
          <path d={svgPaths.p20a408f0} fill="#D24430" />
          <path d={svgPaths.p1d386f80} fill="#D24430" />
        </g>
      </svg>
    </div>
  );
}

export function SendIcon() {
    // I need to find a send icon. The design has an up arrow in a circle.
    // I can use Lucide for this if I can't find it in the imports, or look at "ArrowDownSLine" and rotate it?
    // Or maybe "Layer1" in "Asset" component (line 603) is the logo mark?
    // Wait, the send button is usually an arrow.
    // I'll use Lucide for generic icons I can't find, to be safe.
    return null; 
}
