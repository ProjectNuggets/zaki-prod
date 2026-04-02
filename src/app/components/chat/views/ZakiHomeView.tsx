import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  MoreVertical,
  Sparkles,
  Brain,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { CenterLogo, LogoArabicOrange } from "../../icons";
import { useAuthStore } from "@/stores";
import type { Space } from "@/types";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

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
      {items.map((item, index) => (
        <button
          key={`${item.title}-${index}`}
          type="button"
          className="rounded-zaki-2xl border border-zaki bg-zaki-raised p-5 text-left shadow-zaki-md hover:bg-zaki-hover transition-colors dark:border-[#2a2018] dark:!bg-[#0F0B0A] dark:shadow-zaki-lg dark:hover:bg-[#17110f]"
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
  getSlideAriaLabel,
}: {
  label: string;
  slides: MissionSlide[];
  activeSlide: number;
  onSelect: (index: number) => void;
  icon?: React.ReactNode;
  getSlideAriaLabel: (index: number) => string;
}) {
  return (
    <div className="rounded-zaki-2xl border border-zaki bg-zaki-raised p-5 shadow-zaki-lg mb-8 dark:border-[#2a2018] dark:!bg-[#0F0B0A] dark:shadow-zaki-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-2xs text-zaki-muted font-semibold uppercase tracking-wider dark:text-zaki-dark-muted">
          {icon}
          {label}
        </div>
      </div>
      <div className="px-1 py-2 min-h-[188px] flex flex-col justify-between text-center">
        <div>
          <div className="text-xl md:text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            {slides[activeSlide]?.title}
          </div>
          <div className="text-base md:text-lg leading-relaxed text-zaki-secondary dark:text-zaki-dark-subtle mt-3">
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
              aria-label={getSlideAriaLabel(index + 1)}
            />
          ))}
        </div>
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
    <div className="mt-2 border-t border-zaki-subtle/80 pt-5 dark:border-[#2a2018]">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rtl:text-right">
          <div className="min-h-[20px] flex items-center text-[11px] text-zaki-muted font-semibold uppercase tracking-[0.18em] dark:text-zaki-dark-muted">
            {capabilitiesLabel}
          </div>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
            {capabilities.map((item) => (
              <li key={item} className="flex items-start gap-2 rtl:flex-row-reverse">
                <span
                  className="mt-[6px] size-1.5 rounded-full bg-zaki-muted dark:bg-zaki-dark-muted"
                  aria-hidden="true"
                />
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rtl:text-right">
          <div className="min-h-[20px] flex items-center text-[11px] text-zaki-muted font-semibold uppercase tracking-[0.18em] dark:text-zaki-dark-muted">
            {limitationsLabel}
          </div>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
            {limitations.map((item) => (
              <li key={item} className="flex items-start gap-2 rtl:flex-row-reverse">
                <span
                  className="mt-[6px] size-1.5 rounded-full bg-zaki-muted dark:bg-zaki-dark-muted"
                  aria-hidden="true"
                />
                <span className="flex-1">{item}</span>
              </li>
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
  closeLabel,
  onClose,
  panelRef,
  isRtl,
  panelStyle,
}: {
  cards: MemoryCard[];
  news: NewsItem[];
  label: string;
  body: string;
  latestLabel: string;
  closeLabel: string;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement>;
  isRtl: boolean;
  panelStyle: CSSProperties;
}) {
  const stageIcons = [Brain, CalendarClock, AlertTriangle, CheckCircle2];
  const stageClasses = [
    "border-[#dbe6f5] bg-[#f3f7fd] text-[#3f5f8a] dark:border-[#2d3f56] dark:bg-[#162130] dark:text-[#b9cde9]",
    "border-[#e8e1cd] bg-[#f9f5e8] text-[#846f3b] dark:border-[#4d442f] dark:bg-[#221d14] dark:text-[#d8c79d]",
    "border-[#ecd7d1] bg-[#fbf1ee] text-[#8d5144] dark:border-[#503228] dark:bg-[#251714] dark:text-[#e4b9af]",
    "border-[#d8e9dd] bg-[#eff8f2] text-[#3e7853] dark:border-[#2c4634] dark:bg-[#15231a] dark:text-[#abd4ba]",
  ];

  return (
    <div
      ref={panelRef}
      dir={isRtl ? "rtl" : "ltr"}
      style={panelStyle}
      className="fixed z-[120]"
    >
      <div className="overflow-y-auto rounded-[22px] border border-[#e7ddd2] dark:border-[#2e241d] bg-[linear-gradient(160deg,#fffcf8_0%,#fff7ef_100%)] dark:bg-[linear-gradient(160deg,#13100d_0%,#1a1410_100%)] shadow-[0px_26px_60px_rgba(13,11,10,0.24)]">
        <div className="border-b border-[#eadfce] dark:border-[#2e241d] px-6 py-5">
          <div className={cn("flex items-start justify-between gap-3", isRtl && "flex-row-reverse text-right")}>
            <div className={cn(isRtl && "text-right")}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zaki-muted dark:text-zaki-dark-muted">
                {label}
              </div>
              <div className="mt-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle max-w-3xl leading-relaxed">
                {body}
              </div>
            </div>
            <button
              type="button"
              className="size-8 rounded-full border border-[#e2d7ca] dark:border-[#413227] bg-white/85 dark:bg-[#181210] text-zaki-muted dark:text-zaki-dark-muted hover:bg-[#f5eee7] dark:hover:bg-[#241a14] transition-colors"
              onClick={onClose}
              aria-label={closeLabel}
            >
              <X className="mx-auto size-4" />
            </button>
          </div>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[1.32fr_0.68fr]">
          <section className={cn(isRtl && "text-right")}>
            <div className={cn("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted", isRtl && "flex-row-reverse justify-end")}>
              <Sparkles className="size-3.5 text-zaki-brand dark:text-[#ffb38f]" />
              {label}
            </div>
            <div className="mt-3">
              {cards.map((card, index) => {
                const Icon = stageIcons[index % stageIcons.length] ?? Brain;
                const style = stageClasses[index % stageClasses.length] ?? stageClasses[0];
                return (
                  <article
                    key={card.title}
                    className={cn(
                      "py-3",
                      index < cards.length - 1
                        ? "border-b border-[#eadfce] dark:border-[#2e241d]"
                        : ""
                    )}
                  >
                    <div className={cn("flex items-start gap-3 w-full", isRtl && "flex-row-reverse text-right")}>
                      <span className={cn("mt-0.5 inline-flex size-8 items-center justify-center rounded-lg border", style)}>
                        <Icon className="size-4" />
                      </span>
                      <div className={cn("min-w-0 flex-1", isRtl && "text-right")}>
                        <div className="text-xs font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {card.title}
                        </div>
                        <div className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle leading-relaxed">
                          {card.body}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e7ddd2] dark:border-[#2e241d] bg-white/70 dark:bg-[#17120f]/85 px-4 py-4">
            <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted", isRtl && "text-right")}>
              {latestLabel}
            </div>
            <div className="mt-2">
              {news.map((item, index) => (
                <article
                  key={item.title}
                  className={cn(
                    "py-3",
                    index < news.length - 1
                      ? "border-b border-[#eadfce] dark:border-[#2e241d]"
                      : "",
                    isRtl && "text-right"
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
                    {item.meta}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {item.title}
                  </div>
                  <div className="mt-1.5 text-xs text-zaki-secondary dark:text-zaki-dark-subtle leading-relaxed">
                    {item.body}
                  </div>
                </article>
              ))}
            </div>
          </section>
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
  const { t, i18n } = useTranslation();
  const displayName =
    user?.fullName?.trim() || user?.username?.trim() || t("home.guestName");
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [zakiMenuOpen, setZakiMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const memoryPanelRef = useRef<HTMLDivElement>(null);
  const memoryButtonRef = useRef<HTMLButtonElement>(null);
  const [memoryPanelStyle, setMemoryPanelStyle] = useState<CSSProperties>({
    top: 80,
    left: 24,
    width: 680,
    maxHeight: 560,
  });
  const zakiMissionSlides = t("home.missionSlides", { returnObjects: true }) as MissionSlide[];
  const zakiNews = t("home.news", { returnObjects: true }) as NewsItem[];
  const quickStart = t("home.quickStart", { returnObjects: true }) as QuickStartItem[];
  const memoryCards = t("home.memoryCards", { returnObjects: true }) as MemoryCard[];
  const capabilities = t("home.capabilities", { returnObjects: true }) as string[];
  const limitations = t("home.limitations", { returnObjects: true }) as string[];

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
    if (!memoryPanelOpen) return;
    const updatePanelPosition = () => {
      const button = memoryButtonRef.current;
      if (!button || typeof window === "undefined") return;

      const viewportPadding = 12;
      const gap = 10;
      const buttonRect = button.getBoundingClientRect();
      const mainRect =
        document
          .getElementById("main-content")
          ?.getBoundingClientRect() ?? {
          left: viewportPadding,
          right: window.innerWidth - viewportPadding,
        };

      const safeLeft = Math.max(viewportPadding, mainRect.left + viewportPadding);
      const safeRight = Math.min(
        window.innerWidth - viewportPadding,
        mainRect.right - viewportPadding
      );
      const availableWidth = Math.max(0, safeRight - safeLeft);
      const panelWidth = Math.max(
        0,
        Math.min(680, window.innerWidth - viewportPadding * 2, availableWidth)
      );

      // Keep the panel attached to the trigger's right edge in both LTR/RTL,
      // then clamp to the main content bounds so it never slides under sidebar.
      const preferredLeft = buttonRect.right - panelWidth;
      const left = Math.min(
        Math.max(preferredLeft, safeLeft),
        safeRight - panelWidth
      );

      const estimatedHeight = 560;
      const canOpenDown =
        buttonRect.bottom + gap + estimatedHeight <=
        window.innerHeight - viewportPadding;
      const top = canOpenDown
        ? buttonRect.bottom + gap
        : Math.max(viewportPadding, buttonRect.top - estimatedHeight - gap);
      const maxHeight = canOpenDown
        ? Math.max(320, window.innerHeight - top - viewportPadding)
        : Math.max(320, buttonRect.top - viewportPadding - gap);

      setMemoryPanelStyle({
        top: Math.round(top),
        left: Math.round(left),
        width: Math.round(panelWidth),
        maxHeight: Math.round(maxHeight),
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
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
    if (!user?.username) return;
    apiRequest("/api/memory/status")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.conflicts !== undefined) {
          setConflictCount(Math.max(0, Number(data.conflicts || 0)));
        }
      })
      .catch(() => null);
  }, [user?.username]);

  useEffect(() => {
    const handleConflictCount = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") {
        setConflictCount(detail.count);
      }
    };
    window.addEventListener("zaki:memory-conflicts-count", handleConflictCount);
    return () => {
      window.removeEventListener("zaki:memory-conflicts-count", handleConflictCount);
    };
  }, []);

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
            <span>{t("home.heroHeadline")}</span>
          </h1>
          <div className="mt-3 text-base md:text-lg text-zaki-secondary max-w-2xl leading-relaxed">
            {t("home.heroSubtext")}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 relative">
            {conflictCount > 0 ? (
              <div className="inline-flex items-center rounded-full border border-zaki-subtle bg-white/80 px-3 py-1 text-xs text-zaki-secondary">
                {t("home.conflictsBadge", { count: conflictCount })}
              </div>
            ) : null}
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-zaki-subtle dark:border-[#3a2d22] bg-white/85 dark:bg-[#15100f] px-3 py-1.5 text-xs font-semibold text-zaki-brand dark:text-[#ffb38f] hover:bg-zaki-hover dark:hover:bg-[#1d1512] transition-colors"
                onClick={() => setMemoryPanelOpen((open) => !open)}
                ref={memoryButtonRef}
              >
                <Sparkles className="size-3.5" />
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
                  closeLabel={t("home.closeMemoryDetailsAria")}
                  onClose={() => setMemoryPanelOpen(false)}
                  isRtl={isRtl}
                  panelStyle={memoryPanelStyle}
                />
              )}
            </div>
          </div>
        </div>
        <div className="relative self-start sm:self-auto" ref={menuRef}>
          <button
            type="button"
            className="size-9 rounded-full border border-zaki bg-white flex items-center justify-center text-zaki-muted hover:bg-zaki-hover transition-colors"
            onClick={() => setZakiMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={zakiMenuOpen}
            aria-label={t("home.homeMenuAria")}
          >
            <MoreVertical className="size-4" />
          </button>
          {zakiMenuOpen && (
            <div
              className={cn(
                "absolute mt-2 w-44 rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1",
                isRtl ? "left-0" : "right-0"
              )}
            >
              <button
                className={cn(
                  "w-full px-3 py-2 text-sm text-zaki-primary hover:bg-zaki-hover rounded-zaki-md",
                  isRtl ? "text-right" : "text-left"
                )}
                type="button"
                onClick={() => window.open("https://www.chatzaki.com", "_blank", "noopener,noreferrer")}
              >
                {t("home.aboutZaki")}
              </button>
              <button
                className={cn(
                  "w-full px-3 py-2 text-sm text-zaki-primary hover:bg-zaki-hover rounded-zaki-md",
                  isRtl ? "text-right" : "text-left"
                )}
                type="button"
                onClick={() => window.open("https://www.novanuggets.com", "_blank", "noopener,noreferrer")}
              >
                {t("home.aboutNovaNuggets")}
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
        getSlideAriaLabel={(index) => t("home.missionSlideAria", { index })}
      />

      <div>
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
