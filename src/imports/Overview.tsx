import svgPaths from "./svg-g3updgkf22";

function Layer() {
  return (
    <div className="absolute contents inset-0" data-name="Layer 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46 32">
        <g id="Group">
          <path d={svgPaths.p2adfc080} fill="var(--fill-0, #f10202)" id="Vector" style={{ fill: "color(display-p3 0.8235 0.2667 0.1882)", fillOpacity: "1" }} />
          <path d={svgPaths.pc99e400} fill="var(--fill-0, #f10202)" id="Vector_2" style={{ fill: "color(display-p3 0.8235 0.2667 0.1882)", fillOpacity: "1" }} />
          <path d={svgPaths.p36333a00} fill="var(--fill-0, #f10202)" id="Vector_3" style={{ fill: "color(display-p3 0.8235 0.2667 0.1882)", fillOpacity: "1" }} />
          <path d={svgPaths.p387374d0} fill="var(--fill-0, #f10202)" id="Vector_4" style={{ fill: "color(display-p3 0.8235 0.2667 0.1882)", fillOpacity: "1" }} />
          <path d={svgPaths.p34990b80} fill="var(--fill-0, #f10202)" id="Vector_5" style={{ fill: "color(display-p3 0.8235 0.2667 0.1882)", fillOpacity: "1" }} />
          <path d={svgPaths.p22acf480} fill="var(--fill-0, #f10202)" id="Vector_6" style={{ fill: "color(display-p3 0.8235 0.2667 0.1882)", fillOpacity: "1" }} />
          <path d={svgPaths.p1ae9a300} fill="var(--fill-0, #f10202)" id="Vector_7" style={{ fill: "color(display-p3 0.8235 0.2667 0.1882)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function LogoArabicRed() {
  return (
    <div className="h-[32px] overflow-clip relative shrink-0 w-[46px]" data-name="logo arabic orange 1">
      <Layer />
    </div>
  );
}

function SideBarLine() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="side-bar-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_24)" id="side-bar-line">
          <path d={svgPaths.p2c70e300} fill="var(--fill-0, #B09472)" id="Vector" style={{ fill: "color(display-p3 0.6902 0.5804 0.4471)", fillOpacity: "1" }} />
        </g>
        <defs>
          <clipPath id="clip0_1_24">
            <rect fill="white" height="20" style={{ fill: "white", fillOpacity: "1" }} width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function CustomIconButtonAiTemplate() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center overflow-clip p-[6px] relative rounded-[8px] shrink-0" data-name="Custom Icon Button / AI Template">
      <SideBarLine />
    </div>
  );
}

function Top() {
  return (
    <div className="relative shrink-0 w-full" data-name="Top">
      <div className="content-stretch flex items-start justify-between pl-[6px] pr-0 py-0 relative w-full">
        <LogoArabicRed />
        <CustomIconButtonAiTemplate />
      </div>
    </div>
  );
}

function SearchLine() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="search-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="search-line">
          <path d={svgPaths.p1d5fc900} fill="var(--fill-0, #B09472)" id="Vector" style={{ fill: "color(display-p3 0.6902 0.5804 0.4471)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function SearchInputAiTemplate() {
  return (
    <div className="bg-zaki-hover relative rounded-[10px] shrink-0 w-full" data-name="Search Input / AI Template">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[8px] items-center p-[8px] relative w-full">
          <SearchLine />
          <p className="css-4hzbpn flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px relative text-zaki-muted text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
            Search...
          </p>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0 w-full" data-name="Header">
      <Top />
      <SearchInputAiTemplate />
    </div>
  );
}

function AddLine() {
  return (
    <div className="absolute left-1/2 size-[18px] top-1/2 translate-x-[-50%] translate-y-[-50%]" data-name="add-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="add-line">
          <path d={svgPaths.p90a02f0} fill="var(--fill-0, #f10202)" id="Vector" style={{ fill: "color(display-p3 0.8235 0.2667 0.1882)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function AddCircleLine() {
  return (
    <div className="bg-[rgba(250,115,25,0.16)] overflow-clip relative rounded-[96px] shrink-0 size-[20px]" data-name="add-circle-line">
      <AddLine />
    </div>
  );
}

function CustomButtonAiTemplate() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip p-[6px] relative rounded-[8px] shrink-0 w-[244px]" data-name="Custom Button / AI Template">
      <AddCircleLine />
      <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-brand text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[20px]">New chat</p>
      </div>
    </div>
  );
}

function EditCircleLine() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="edit-circle-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_33)" id="edit-circle-line">
          <path d={svgPaths.p2e9da000} fill="var(--fill-0, #CDB394)" id="Vector" style={{ fill: "color(display-p3 0.8039 0.7020 0.5804)", fillOpacity: "1" }} />
        </g>
        <defs>
          <clipPath id="clip0_1_33">
            <rect fill="white" height="20" style={{ fill: "white", fillOpacity: "1" }} width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ItemsNavigationAiTemplate() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip pl-[6px] pr-[8px] py-[6px] relative rounded-[8px] shrink-0 w-[244px]" data-name="Items / Navigation / AI Template">
      <EditCircleLine />
      <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-secondary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[20px]">Spaces</p>
      </div>
    </div>
  );
}

function BookOpenLine() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="book-open-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_59)" id="book-open-line">
          <path d={svgPaths.p3d3cc780} fill="var(--fill-0, #CDB394)" id="Vector" style={{ fill: "color(display-p3 0.8039 0.7020 0.5804)", fillOpacity: "1" }} />
        </g>
        <defs>
          <clipPath id="clip0_1_59">
            <rect fill="white" height="20" style={{ fill: "white", fillOpacity: "1" }} width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ItemsNavigationAiTemplate1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip pl-[6px] pr-[8px] py-[6px] relative rounded-[8px] shrink-0 w-[244px]" data-name="Items / Navigation / AI Template">
      <BookOpenLine />
      <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-secondary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[20px]">Library</p>
      </div>
    </div>
  );
}

function ActionItems() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="Action Items">
      <CustomButtonAiTemplate />
      <ItemsNavigationAiTemplate />
      <ItemsNavigationAiTemplate1 />
    </div>
  );
}

function Divider() {
  return (
    <div className="h-[4px] relative shrink-0 w-[244px]" data-name="Divider">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 244 4">
        <g id="Divider">
          <line id="Divider_2" stroke="var(--stroke-0, #EBEBEB)" style={{ stroke: "color(display-p3 0.9200 0.9200 0.9200)", strokeOpacity: "1" }} x1="6" x2="238" y1="2" y2="2" />
        </g>
      </svg>
    </div>
  );
}

function Subtitle() {
  return (
    <div className="relative shrink-0 w-full" data-name="Subtitle">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[6px] py-0 relative w-full">
          <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-[#a08462] text-[12px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
            <p className="css-4hzbpn leading-[16px]">Space</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Folder2Line() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="folder-2-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="folder-2-line">
          <path d={svgPaths.p117a2c00} fill="var(--fill-0, #CDB394)" id="Vector" style={{ fill: "color(display-p3 0.8039 0.7020 0.5804)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function ArrowDownSLine() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-down-s-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="arrow-down-s-line">
          <path d={svgPaths.p2c6f4a00} fill="var(--fill-0, #A4A4A4)" id="Vector" style={{ fill: "color(display-p3 0.6412 0.6412 0.6412)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function ItemsNavigationAiTemplate2() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip pl-[6px] pr-[8px] py-[6px] relative rounded-[8px] shrink-0 w-[244px]" data-name="Items / Navigation / AI Template">
      <Folder2Line />
      <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-secondary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[20px]">{`Research & Analysis`}</p>
      </div>
      <ArrowDownSLine />
    </div>
  );
}

function ItemsNavigationAiTemplate3() {
  return (
    <div className="bg-zaki-hover relative rounded-[8px] shrink-0 w-full" data-name="Items / Navigation / AI Template">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center pl-[10px] pr-[8px] py-[6px] relative w-full">
          <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-secondary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
            <p className="css-4hzbpn leading-[20px]">User research analysis</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemsNavigationAiTemplate4() {
  return (
    <div className="relative rounded-[8px] shrink-0 w-full" data-name="Items / Navigation / AI Template">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center pl-[6px] pr-[8px] py-[6px] relative w-full">
          <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-secondary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
            <p className="css-4hzbpn leading-[20px]">Competitive analysis</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemsNavigationAiTemplate5() {
  return (
    <div className="relative rounded-[8px] shrink-0 w-full" data-name="Items / Navigation / AI Template">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center pl-[6px] pr-[8px] py-[6px] relative w-full">
          <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-secondary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
            <p className="css-4hzbpn leading-[20px]">Meeting notes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Items() {
  return (
    <div className="relative shrink-0 w-full" data-name="Items">
      <div className="content-stretch flex flex-col gap-[4px] items-start pl-[24px] pr-0 py-0 relative w-full">
        <ItemsNavigationAiTemplate3 />
        <ItemsNavigationAiTemplate4 />
        <ItemsNavigationAiTemplate5 />
      </div>
    </div>
  );
}

function AddLine1() {
  return (
    <div className="absolute left-1/2 size-[18px] top-1/2 translate-x-[-50%] translate-y-[-50%]" data-name="add-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="add-line">
          <path d={svgPaths.p90a02f0} fill="var(--fill-0, #88735A)" id="Vector" style={{ fill: "color(display-p3 0.5333 0.4510 0.3529)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function AddCircleLine1() {
  return (
    <div className="bg-zaki-elevated overflow-clip relative rounded-[96px] shrink-0 size-[20px]" data-name="add-circle-line">
      <AddLine1 />
    </div>
  );
}

function CustomButtonAiTemplate1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip p-[6px] relative rounded-[8px] shrink-0 w-[244px]" data-name="Custom Button / AI Template">
      <AddCircleLine1 />
      <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-muted text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[20px]">New thread</p>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <Items />
      <CustomButtonAiTemplate1 />
    </div>
  );
}

function Folder2Line1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="folder-2-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="folder-2-line">
          <path d={svgPaths.p117a2c00} fill="var(--fill-0, #CDB394)" id="Vector" style={{ fill: "color(display-p3 0.8039 0.7020 0.5804)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function ItemsNavigationAiTemplate6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip pl-[6px] pr-[8px] py-[6px] relative rounded-[8px] shrink-0 w-[244px]" data-name="Items / Navigation / AI Template">
      <Folder2Line1 />
      <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-secondary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[20px]">Web Search</p>
      </div>
    </div>
  );
}

function Folder2Line2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="folder-2-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="folder-2-line">
          <path d={svgPaths.p117a2c00} fill="var(--fill-0, #CDB394)" id="Vector" style={{ fill: "color(display-p3 0.8039 0.7020 0.5804)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function ItemsNavigationAiTemplate7() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip pl-[6px] pr-[8px] py-[6px] relative rounded-[8px] shrink-0 w-[244px]" data-name="Items / Navigation / AI Template">
      <Folder2Line2 />
      <div className="flex flex-[1_0_0] flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] min-h-px min-w-px relative text-zaki-secondary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[20px]">Knowledge Base</p>
      </div>
    </div>
  );
}

function Items1() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="Items">
      <ItemsNavigationAiTemplate2 />
      <Frame />
      <ItemsNavigationAiTemplate6 />
      <ItemsNavigationAiTemplate7 />
    </div>
  );
}

function Starred() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[8px] items-start min-h-px min-w-px relative w-full" data-name="Starred">
      <Subtitle />
      <Items1 />
    </div>
  );
}

function Divider1() {
  return (
    <div className="h-[4px] relative shrink-0 w-[244px]" data-name="Divider">
      <div className="absolute inset-0" style={{ "--fill-0": "rgba(255, 255, 255, 1)" } as React.CSSProperties}>
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 244 4">
          <g id="Divider">
            <rect fill="white" height="4" style={{ fill: "white", fillOpacity: "1" }} width="244" />
            <line id="Divider_2" stroke="var(--stroke-0, #EBEBEB)" style={{ stroke: "color(display-p3 0.9200 0.9200 0.9200)", strokeOpacity: "1" }} x1="6" x2="238" y1="2" y2="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="bg-zaki-elevated relative rounded-[999px] shrink-0 size-[40px]" data-name="Avatar [1.1]">
      <p className="absolute css-4hzbpn font-['Geist:Medium',sans-serif] font-medium inset-[20%_0] leading-[24px] text-zaki-primary text-[16px] text-center tracking-[-0.176px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        TA
      </p>
    </div>
  );
}

function Badge() {
  return (
    <div className="bg-zaki-success content-stretch flex items-center justify-center overflow-clip px-[6px] py-[2px] relative rounded-[5px] shrink-0" data-name="Badge">
      <p className="css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[12px] not-italic relative shrink-0 text-[#0c291d] text-[11px] tracking-[0.22px] uppercase" style={{ fontFeatureSettings: "'ss11', 'calt' 0, 'liga' 0" }}>
        PRO
      </p>
    </div>
  );
}

function Name() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-full" data-name="Name">
      <p className="css-ew64yg font-['Geist:Medium',sans-serif] font-medium leading-[20px] relative shrink-0 text-zaki-primary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        Tarek Adaoui
      </p>
      <Badge />
    </div>
  );
}

function Content() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start justify-center min-h-px min-w-px relative" data-name="Content">
      <Name />
      <p className="css-4hzbpn font-['Geist:Medium',sans-serif] font-medium leading-[16px] relative shrink-0 text-zaki-muted text-[12px] w-full" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        ta@novanuggets.com
      </p>
    </div>
  );
}

function ArrowDownSLine1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-down-s-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-down-s-line">
          <path d={svgPaths.p1737e400} fill="var(--fill-0, #B09472)" id="Vector" style={{ fill: "color(display-p3 0.6902 0.5804 0.4471)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function CustomIconButtonAiTemplate1() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center overflow-clip p-[3px] relative rounded-[6px] shrink-0" data-name="Custom Icon Button / AI Template">
      <ArrowDownSLine1 />
    </div>
  );
}

function Profile() {
  return (
    <div className="bg-white relative rounded-[10px] shrink-0 w-full" data-name="Profile">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[6px] relative w-full">
          <Avatar />
          <Content />
          <CustomIconButtonAiTemplate1 />
        </div>
      </div>
    </div>
  );
}

function Profile1() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Profile">
      <Divider1 />
      <Profile />
    </div>
  );
}

function SidebarAiTemplate() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[16px] h-[900px] items-start left-0 overflow-clip pb-[14px] pt-[20px] px-[14px] top-1/2 translate-y-[-50%] w-[272px]" data-name="Sidebar / AI Template">
      <Header />
      <ActionItems />
      <Divider />
      <Starred />
      <Profile1 />
    </div>
  );
}

function PatternTiled() {
  return (
    <div className="h-[1334px] overflow-clip relative w-[890px]" data-name="pattern tiled 1">
      <div className="absolute inset-[-0.04%_-0.06%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 891 1335">
          <g id="Layer 1">
            <path d={svgPaths.p774f400} id="Vector" stroke="url(#paint0_linear_1_18)" />
          </g>
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_18" x1="0.5" x2="890.5" y1="667.5" y2="667.5">
              <stop stopColor="#F8F2E9" style={{ stopColor: "color(display-p3 0.9725 0.9490 0.9137)", stopOpacity: "1" }} />
              <stop offset="0.817308" stopColor="#E5D3BD" stopOpacity="0" style={{ stopColor: "none", stopOpacity: "0" }} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function ArrowDownSLine2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-down-s-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="arrow-down-s-line">
          <path d={svgPaths.p2c6f4a00} fill="var(--fill-0, #B09472)" id="Vector" style={{ fill: "color(display-p3 0.6902 0.5804 0.4471)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function CustomIconButtonAiTemplate2() {
  return (
    <div className="bg-zaki-hover content-stretch flex items-center justify-center overflow-clip relative rounded-[6px] shrink-0" data-name="Custom Icon Button / AI Template">
      <ArrowDownSLine2 />
    </div>
  );
}

function Breadcrumb() {
  return (
    <div className="absolute content-stretch flex gap-[4px] items-center left-[19px] top-[19px]" data-name="Breadcrumb">
      <div className="css-g0mm18 flex flex-col font-['Geist:Regular',sans-serif] font-normal justify-center leading-[0] relative shrink-0 text-zaki-muted text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-ew64yg leading-[20px]">{`Research & Analysis`}</p>
      </div>
      <div className="css-g0mm18 flex flex-col font-['Geist:Regular',sans-serif] font-normal justify-center leading-[0] relative shrink-0 text-zaki-disabled text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-ew64yg leading-[20px]">/</p>
      </div>
      <div className="css-g0mm18 flex flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-zaki-primary text-[14px] tracking-[-0.084px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-ew64yg leading-[20px]">New chat</p>
      </div>
      <CustomIconButtonAiTemplate2 />
    </div>
  );
}

function Layer1() {
  return (
    <div className="absolute contents inset-0" data-name="Layer 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="Group">
          <path d={svgPaths.pb726e00} fill="var(--fill-0, #88735A)" id="Vector" style={{ fill: "color(display-p3 0.5333 0.4510 0.3529)", fillOpacity: "1" }} />
          <path d={svgPaths.p20a408f0} fill="var(--fill-0, #88735A)" id="Vector_2" style={{ fill: "color(display-p3 0.5333 0.4510 0.3529)", fillOpacity: "1" }} />
          <path d={svgPaths.p1d386f80} fill="var(--fill-0, #88735A)" id="Vector_3" style={{ fill: "color(display-p3 0.5333 0.4510 0.3529)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function Asset() {
  return (
    <div className="overflow-clip relative shrink-0 size-[32px]" data-name="Asset 1 1">
      <Layer1 />
    </div>
  );
}

function Text() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Medium',sans-serif] font-medium gap-[4px] items-start leading-[0] relative shrink-0 text-center w-full" data-name="Text">
      <div className="flex flex-col h-[22px] justify-center relative shrink-0 text-zaki-primary text-[18px] tracking-[-0.27px] w-full" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[24px]">Marhaba Tarek</p>
      </div>
      <div className="flex flex-col h-[22px] justify-center relative shrink-0 text-zaki-muted text-[14px] tracking-[-0.084px] w-full" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
        <p className="css-4hzbpn leading-[20px]">What can I help you with today?</p>
      </div>
    </div>
  );
}

function Content1() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[20px] items-center left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] w-[700px]" data-name="Content">
      <Asset />
      <Text />
    </div>
  );
}

function FlashlightFill() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="flashlight-fill">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="flashlight-fill">
          <path d={svgPaths.p25976f00} fill="var(--fill-0, #88735A)" id="Vector" style={{ fill: "color(display-p3 0.5333 0.4510 0.3529)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function Upgrade() {
  return (
    <div className="relative shrink-0 w-full z-[2]" data-name="Upgrade">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[12px] py-0 relative w-full">
          <FlashlightFill />
          <div className="css-g0mm18 flex flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-zaki-muted text-[12px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
            <p className="css-ew64yg leading-[16px]">{`Access premium models & features`}</p>
          </div>
          <div className="css-g0mm18 flex flex-col font-['Geist:Medium','Noto_Sans:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[#d1d1d1] text-[12px] text-center" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
            <p className="css-ew64yg leading-[16px]">∙</p>
          </div>
          <div className="css-g0mm18 flex flex-col font-['Geist:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[#219171] text-[12px]" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
            <p className="css-ew64yg leading-[16px]">Upgrade</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Text1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Text">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[4px] py-0 relative w-full">
          <div className="css-g0mm18 flex flex-col font-['Inter:Regular',sans-serif] font-[430] justify-center leading-[0] not-italic relative shrink-0 text-[#bfa382] text-[15px] tracking-[-0.09px]" style={{ fontFeatureSettings: "'ss11', 'calt' 0, 'liga' 0" }}>
            <p className="css-ew64yg leading-[24px]">How can I help you today?</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddLine2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="add-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="add-line">
          <path d={svgPaths.p301d0e00} fill="var(--fill-0, #B09472)" id="Vector" style={{ fill: "color(display-p3 0.6902 0.5804 0.4471)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function ChatCustomButtonAiTemplate() {
  return (
    <div className="bg-zaki-hover content-stretch flex items-center justify-center overflow-clip p-[4px] relative rounded-[9px] shrink-0" data-name="Chat / Custom Button / AI Template">
      <AddLine2 />
    </div>
  );
}

function Left() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-h-px min-w-px relative" data-name="Left">
      <ChatCustomButtonAiTemplate />
    </div>
  );
}

function ArrowUpLine() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-up-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="arrow-up-line">
          <path d={svgPaths.p13d2a800} fill="var(--fill-0, #F8F2E9)" id="Vector" style={{ fill: "color(display-p3 0.9725 0.9490 0.9137)", fillOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function ChatCustomButtonAiTemplate1() {
  return (
    <div className="bg-[#544737] content-stretch flex items-center justify-center overflow-clip p-[4px] relative rounded-[9px] shrink-0" data-name="Chat / Custom Button / AI Template">
      <ArrowUpLine />
    </div>
  );
}

function Action() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Action">
      <Left />
      <ChatCustomButtonAiTemplate1 />
    </div>
  );
}

function Chat() {
  return (
    <div className="bg-zaki-raised relative rounded-[19px] shadow-[0px_10px_10px_-5px_rgba(23,23,23,0.02),0px_6px_6px_-3px_rgba(23,23,23,0.04),0px_3px_3px_-1.5px_rgba(23,23,23,0.04),0px_1px_1px_-0.5px_rgba(23,23,23,0.04),0px_0px_0px_1px_rgba(23,23,23,0.02)] shrink-0 w-full z-[1]" data-name="Chat">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[31px] items-start pb-[12px] pt-[14px] px-[12px] relative w-full">
          <Text1 />
          <Action />
        </div>
      </div>
    </div>
  );
}

function PromptAreaAiTemplate() {
  return (
    <div className="bg-[#efe3d2] relative rounded-[20px] shrink-0 w-full" data-name="Prompt Area / AI Template">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[10px] isolate items-center pb-px pt-[10px] px-px relative w-full">
          <Upgrade />
          <Chat />
        </div>
      </div>
    </div>
  );
}

function MessageArea() {
  return (
    <div className="absolute bottom-[15px] content-stretch flex flex-col items-start justify-end left-1/2 px-[4px] py-0 translate-x-[-50%] w-[700px]" data-name="Message Area">
      <PromptAreaAiTemplate />
    </div>
  );
}

function More2Line() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="more-2-line">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_7)" id="more-2-line">
          <path d={svgPaths.p34a11180} fill="var(--fill-0, #B09472)" id="Vector" style={{ fill: "color(display-p3 0.6902 0.5804 0.4471)", fillOpacity: "1" }} />
        </g>
        <defs>
          <clipPath id="clip0_1_7">
            <rect fill="white" height="20" style={{ fill: "white", fillOpacity: "1" }} width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function CustomIconButtonAiTemplate3() {
  return (
    <div className="absolute bg-zaki-hover content-stretch flex items-center justify-center overflow-clip p-[4px] right-[15px] rounded-[8px] top-[15px]" data-name="Custom Icon Button / AI Template">
      <More2Line />
    </div>
  );
}

function Chat1() {
  return (
    <div className="absolute bg-zaki-elevated border border-[#e5d3bd] border-solid h-[888px] left-[272px] overflow-clip rounded-[24px] top-1/2 translate-y-[-50%] w-[1162px]" data-name="Chat">
      <div className="absolute flex h-[890px] items-center justify-center left-[-18px] top-[-3px] w-[1334px]" style={{ "--transform-inner-width": "0", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-[90deg]">
          <PatternTiled />
        </div>
      </div>
      <Breadcrumb />
      <Content1 />
      <MessageArea />
      <CustomIconButtonAiTemplate3 />
    </div>
  );
}

export default function Overview() {
  return (
    <div className="bg-zaki-raised overflow-clip relative rounded-[28px] size-full" data-name="Overview">
      <SidebarAiTemplate />
      <Chat1 />
      <div className="absolute flex h-[99px] items-center justify-center left-[30px] top-[314px] w-0" style={{ "--transform-inner-width": "0", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-[90deg]">
          <div className="h-0 relative w-[99px]">
            <div className="absolute inset-[-1px_-1.01%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 101 2">
                <path d="M1 1H100" id="Line 1" stroke="var(--stroke-0, #EFE3D2)" strokeLinecap="round" strokeWidth="2" style={{ stroke: "color(display-p3 0.9373 0.8902 0.8235)", strokeOpacity: "1" }} />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute h-0 left-[30px] top-[413px] w-[9px]">
        <div className="absolute inset-[-1px_-11.11%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 2">
            <path d="M1 1H10" id="Line 2" stroke="var(--stroke-0, #EFE3D2)" strokeLinecap="round" strokeWidth="2" style={{ stroke: "color(display-p3 0.9373 0.8902 0.8235)", strokeOpacity: "1" }} />
          </svg>
        </div>
      </div>
    </div>
  );
}