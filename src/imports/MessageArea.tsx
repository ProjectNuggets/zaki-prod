import svgPaths from "./svg-qzn44rnixp";

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
          <div className="css-g0mm18 flex flex-col font-['Geist:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[#d1d1d1] text-[12px] text-center" style={{ fontFeatureSettings: "'calt' 0, 'liga' 0" }}>
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

function Text() {
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

function AddLine() {
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
      <AddLine />
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
          <Text />
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

export default function MessageArea() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end px-[4px] py-0 relative size-full" data-name="Message Area">
      <PromptAreaAiTemplate />
    </div>
  );
}