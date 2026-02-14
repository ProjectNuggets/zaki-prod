import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { MoreVertical, ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { CenterLogo, LogoArabicOrange } from "../../icons";
import { useAuthStore } from "@/stores";
import type { Space } from "@/types";

interface ZakiHomeViewProps {
  primarySpace: Space | null;
  onSendExample: (example: string) => void;
  onGoToThread: (spaceId: string, threadId: string) => void;
  onDeleteThread: (threadId: string, spaceId?: string) => void;
}

type QuickStartItem = { title: string; body: string };
type MissionSlide = { title: string; body: string };
type NewsItem = { title: string; body: string; meta: string };
type MemoryCard = { title: string; body: string };

function QuickStartGrid({
  items,
  label,
  onSendExample,
}: {
  items: QuickStartItem[];
  label: string;
  onSendExample: (example: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-10">
      {items.map((item) => (
        <button
          key={item.title}
          type="button"
          className="rounded-zaki-2xl border border-zaki-subtle bg-white/90 p-5 text-left shadow-[0px_10px_26px_rgba(15,15,15,0.06)] hover:bg-zaki-hover transition-colors dark:border-[#2a2018] dark:!bg-[#0F0B0A] dark:shadow-[0px_10px_26px_rgba(15,15,15,0.12)] dark:hover:bg-[#17110f]"
          onClick={() => onSendExample(item.title)}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zaki-muted rtl:text-right rtl:justify-end rtl:w-full rtl:flex-row-reverse dark:text-zaki-dark-muted">
            <Sparkles className="size-4 text-zaki-brand" />
            {label}
          </div>
          <div className="mt-3 text-base font-semibold text-zaki-primary rtl:text-right dark:text-zaki-dark-primary">{item.title}</div>
          <div className="mt-2 text-sm text-zaki-secondary rtl:text-right dark:text-zaki-dark-subtle">{item.body}</div>
        </button>
      ))}
    </div>
  );
}

function MissionCard({
  label,
  slides,
  activeSlide,
  onSelect,
  icon,
  carouselHint,
}: {
  label: string;
  slides: MissionSlide[];
  activeSlide: number;
  onSelect: (index: number) => void;
  icon?: React.ReactNode;
  carouselHint: string;
}) {
  return (
    <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)] mb-8 dark:border-[#2a2018] dark:!bg-[#0F0B0A] dark:shadow-[0px_18px_40px_rgba(15,15,15,0.18)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-2xs text-zaki-muted font-semibold uppercase tracking-wider dark:text-zaki-dark-muted">
          {icon}
          {label}
        </div>
      </div>
      <div className="px-1 py-2 min-h-[160px] flex flex-col justify-between text-center">
        <div>
          <div className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            {slides[activeSlide]?.title}
          </div>
          <div className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle mt-2">
            {slides[activeSlide]?.body}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 justify-center">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`h-1.5 rounded-full transition-all ${
                index === activeSlide
                  ? "w-6 bg-zaki-brand"
                  : "w-3 border border-zaki-border-default bg-transparent opacity-60"
              }`}
              onClick={() => onSelect(index)}
              aria-label={`Mission slide ${index + 1}`}
            />
          ))}
        </div>
        <div className="mt-2 text-2xs text-zaki-muted dark:text-zaki-dark-muted">
          {carouselHint}
        </div>
      </div>
    </div>
  );
}

function ExamplesCard({
  label,
  ramadanLabel,
  activeSet,
  examples,
  isRtl,
  onPrev,
  onNext,
  onSendExample,
}: {
  label: string;
  ramadanLabel: string;
  activeSet: number;
  examples: string[];
  isRtl: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSendExample: (example: string) => void;
}) {
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  return (
    <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-4 shadow-[0px_18px_40px_rgba(15,15,15,0.08)] dark:border-[#2a2018] dark:!bg-[#0F0B0A] dark:shadow-[0px_18px_40px_rgba(15,15,15,0.18)]">
      <div className="flex items-center justify-between gap-2 min-h-[28px]">
        <div className="flex items-center gap-2 justify-end text-right leading-none">
          <div className="text-2xs text-zaki-muted font-semibold uppercase tracking-wider dark:text-zaki-dark-muted">
            {label}
          </div>
          {activeSet === 1 && (
            <div className="text-2xs font-semibold uppercase tracking-wider text-zaki-brand leading-none">
              {ramadanLabel}
            </div>
          )}
        </div>
        <div className="flex items-center">
          <button
            type="button"
            className="zaki-btn-sm size-10 p-0 border border-zaki bg-white flex items-center justify-center text-zaki-brand hover:bg-zaki-hover transition-colors dark:border-[#2a2018] dark:bg-[#15100e] dark:text-zaki-brand dark:hover:bg-[#1d1512]"
            onClick={onNext}
            aria-label="Next examples"
          >
            <ArrowIcon className="size-5" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1.5 rtl:text-right">
        {examples.slice(0, 3).map((example) => (
          <button
            key={example}
            type="button"
            className="text-left text-sm leading-5 text-zaki-secondary hover:text-zaki-primary hover:bg-zaki-hover rounded-zaki-md px-2 py-1 transition-colors rtl:text-right dark:text-zaki-dark-subtle dark:hover:text-zaki-dark-primary dark:hover:bg-[#17110f]"
            onClick={() => onSendExample(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

function CapabilitiesCard({
  capabilities,
  limitations,
  capabilitiesLabel,
  limitationsLabel,
}: {
  capabilities: string[];
  limitations: string[];
  capabilitiesLabel: string;
  limitationsLabel: string;
}) {
  return (
    <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-4 shadow-[0px_18px_40px_rgba(15,15,15,0.08)] dark:border-[#2a2018] dark:!bg-[#0F0B0A] dark:shadow-[0px_18px_40px_rgba(15,15,15,0.18)]">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rtl:text-right">
          <div className="min-h-[28px] flex items-center text-2xs text-zaki-muted font-semibold uppercase tracking-wider dark:text-zaki-dark-muted">
            {capabilitiesLabel}
          </div>
          <ul className="mt-2 space-y-1.5 text-sm leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
            {capabilities.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="rtl:text-right">
          <div className="min-h-[28px] flex items-center text-2xs text-zaki-muted font-semibold uppercase tracking-wider dark:text-zaki-dark-muted">
            {limitationsLabel}
          </div>
          <ul className="mt-2 space-y-1.5 text-sm leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
            {limitations.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MemoryPopover({
  cards,
  news,
  label,
  body,
  latestLabel,
  onClose,
  panelRef,
}: {
  cards: MemoryCard[];
  news: NewsItem[];
  label: string;
  body: string;
  latestLabel: string;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={panelRef}
      className="absolute right-0 mt-3 w-[520px] max-w-[calc(100vw-3rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5 z-30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted">
            {label}
          </div>
          <div className="mt-2 text-sm text-zaki-secondary max-w-2xl">{body}</div>
        </div>
        <button
          type="button"
          className="size-8 rounded-full border border-zaki-subtle bg-white text-zaki-muted hover:bg-zaki-hover transition-colors"
          onClick={onClose}
          aria-label="Close memory details"
        >
          ×
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <div key={card.title} className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3">
            <div className="text-xs font-semibold text-zaki-primary">{card.title}</div>
            <div className="text-xs text-zaki-muted mt-1">{card.body}</div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="text-2xs text-zaki-muted font-semibold uppercase tracking-wider">
          {latestLabel}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {news.map((item) => (
            <div key={item.title} className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3">
              <div className="text-2xs text-zaki-muted uppercase tracking-wider">{item.meta}</div>
              <div className="text-sm text-zaki-primary font-semibold mt-1">{item.title}</div>
              <div className="text-xs text-zaki-secondary mt-2">{item.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ZakiHomeView({
  primarySpace,
  onSendExample,
  onGoToThread,
  onDeleteThread,
}: ZakiHomeViewProps) {
  void primarySpace;
  void onGoToThread;
  void onDeleteThread;
  const { user } = useAuthStore();
  const displayName = user?.fullName?.trim() || user?.username?.trim() || "there";
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [zakiMenuOpen, setZakiMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeExampleSet, setActiveExampleSet] = useState(0);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const memoryPanelRef = useRef<HTMLDivElement>(null);
  const memoryButtonRef = useRef<HTMLButtonElement>(null);
  const zakiExamples = t("empty.examples", { returnObjects: true }) as string[];
  const zakiMissionSlides = t("home.missionSlides", { returnObjects: true }) as MissionSlide[];
  const zakiNews = t("home.news", { returnObjects: true }) as NewsItem[];
  const quickStart = t("home.quickStart", { returnObjects: true }) as QuickStartItem[];
  const memoryCards = t("home.memoryCards", { returnObjects: true }) as MemoryCard[];
  const capabilities = t("home.capabilities", { returnObjects: true }) as string[];
  const limitations = t("home.limitations", { returnObjects: true }) as string[];
  const ramadanExamples = t("home.ramadanExamples", { returnObjects: true }) as string[];
  const exampleSets = [
    { label: t("home.examplesSets.default"), items: zakiExamples },
    { label: t("home.examplesSets.ramadan"), items: ramadanExamples },
  ];
  const activeExamples = exampleSets[activeExampleSet]?.items ?? zakiExamples;

  useEffect(() => {
    if (!memoryPanelOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (memoryPanelRef.current?.contains(target)) return;
      if (memoryButtonRef.current?.contains(target)) return;
      setMemoryPanelOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMemoryPanelOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [memoryPanelOpen]);

  useEffect(() => {
    if (!zakiMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      setZakiMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [zakiMenuOpen]);

  useEffect(() => {
    if (zakiMissionSlides.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % zakiMissionSlides.length);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [zakiMissionSlides.length]);
  return (
    <div className="px-4 sm:px-6 md:px-10 py-10 md:py-12 min-h-full flex flex-col max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-10">
        <div className="flex-1 max-w-3xl">
          <div className="text-sm md:text-base font-semibold text-zaki-secondary tracking-[0.16em] uppercase">
            {t("home.welcome")} {displayName}
          </div>
          <h1 className="mt-4 flex items-center gap-3 text-4xl md:text-5xl font-semibold text-zaki-primary tracking-tight">
            <span className="inline-flex size-12 md:size-14 items-center justify-center">
              <LogoArabicOrange />
            </span>
            <span>{t("empty.headline")}</span>
          </h1>
          <div className="mt-3 text-base md:text-lg text-zaki-secondary max-w-2xl leading-relaxed">
            {t("empty.subtext")}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/80 px-3 py-1 text-xs text-zaki-secondary">
              <ShieldCheck className="size-4 text-zaki-success" />
              {t("home.memoryOn")}
              <span className="text-zaki-muted">·</span>
              {t("home.memoryOnHelper")}
            </div>
            <div className="relative">
              <button
                type="button"
                className="text-xs font-semibold text-zaki-brand hover:underline"
                onClick={() => setMemoryPanelOpen((open) => !open)}
                ref={memoryButtonRef}
              >
                {t("home.learnMemory")}
              </button>
              {memoryPanelOpen && (
                <MemoryPopover
                  panelRef={memoryPanelRef}
                  cards={memoryCards}
                  news={zakiNews}
                  label={t("home.memoryClarityLabel")}
                  body={t("home.memoryClarityBody")}
                  latestLabel={t("home.latestLabel")}
                  onClose={() => setMemoryPanelOpen(false)}
                />
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-col items-start gap-2 w-full">
            <div className="text-[11px] uppercase tracking-[0.24em] text-zaki-muted">
              {t("empty.ctaHelper")}
            </div>
            <button
              type="button"
              className="zaki-btn bg-zaki-accent text-white w-full sm:w-auto"
              onClick={() => onSendExample(zakiExamples[0])}
            >
              {t("empty.cta")}
            </button>
          </div>
        </div>
        <div className="relative self-start sm:self-auto" ref={menuRef}>
          <button
            type="button"
            className="size-9 rounded-full border border-zaki bg-white flex items-center justify-center text-zaki-muted hover:bg-zaki-hover transition-colors"
            onClick={() => setZakiMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={zakiMenuOpen}
            aria-label="Home menu"
          >
            <MoreVertical className="size-4" />
          </button>
          {zakiMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1">
              <button
                className="w-full text-left px-3 py-2 text-sm text-zaki-primary hover:bg-zaki-hover rounded-zaki-md"
                type="button"
                onClick={() => window.open("https://www.chatzaki.com", "_blank", "noopener,noreferrer")}
              >
                About ZAKI
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-zaki-primary hover:bg-zaki-hover rounded-zaki-md"
                type="button"
                onClick={() => window.open("https://www.novanuggets.com", "_blank", "noopener,noreferrer")}
              >
                About Nova Nuggets
              </button>
            </div>
          )}
        </div>
      </div>

      <QuickStartGrid
        items={quickStart}
        label={t("home.quickStartLabel")}
        onSendExample={onSendExample}
      />

      <MissionCard
        label={t("home.missionLabel")}
        slides={zakiMissionSlides}
        activeSlide={activeSlide}
        onSelect={(index) => setActiveSlide(index)}
        icon={<CenterLogo className="size-4" />}
        carouselHint={t("home.missionCarouselHint", { current: activeSlide + 1, total: zakiMissionSlides.length })}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ExamplesCard
          label={t("home.examplesLabel")}
          ramadanLabel={t("home.examplesSets.ramadan")}
          activeSet={activeExampleSet}
          examples={activeExamples}
          isRtl={isRtl}
          onPrev={() => setActiveExampleSet((prev) => (prev - 1 + exampleSets.length) % exampleSets.length)}
          onNext={() => setActiveExampleSet((prev) => (prev + 1) % exampleSets.length)}
          onSendExample={onSendExample}
        />
        <CapabilitiesCard
          capabilities={capabilities}
          limitations={limitations}
          capabilitiesLabel={t("home.capabilitiesLabel")}
          limitationsLabel={t("home.limitationsLabel")}
        />
      </div>

    </div>
  );
}
