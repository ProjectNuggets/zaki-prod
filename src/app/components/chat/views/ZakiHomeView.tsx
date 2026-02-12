import { useState } from "react";
import { MoreVertical, ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Clock } from "lucide-react";
import type { Space } from "@/types";
import {
  emptyStateExamples,
  emptyStateHeadline,
  emptyStateSubtext,
  emptyStateCta,
  emptyStateCtaHelper,
} from "../emptyStateContent";

interface ZakiHomeViewProps {
  primarySpace: Space | null;
  onSendExample: (example: string) => void;
  onGoToThread: (spaceId: string, threadId: string) => void;
  onDeleteThread: (threadId: string, spaceId?: string) => void;
}

const zakiExamples = emptyStateExamples;

const zakiMissionSlides = [
  {
    title: "Memory-first by design",
    body: "ZAKI keeps the context that matters so every conversation feels continuous.",
  },
  {
    title: "Human-centered focus",
    body: "Built to reduce friction, not add it. Fast, calm, and predictable.",
  },
  {
    title: "Trustable by default",
    body: "Clear boundaries, transparent behaviors, and respectful defaults.",
  },
];

const zakiNews = [
  {
    title: "ZAKI Weekly",
    body: "Product updates, memory tips, and launch progress.",
    meta: "Latest",
  },
  {
    title: "Behind the memory engine",
    body: "A short note on how we keep context private and useful.",
    meta: "Blog",
  },
];

const quickStart = [
  {
    title: "Summarize the last meeting",
    body: "Turn notes into clean highlights and next steps.",
  },
  {
    title: "Plan a launch timeline",
    body: "Break goals into weekly milestones with owners.",
  },
  {
    title: "Draft a message",
    body: "Write a crisp update for your team or client.",
  },
];

export function ZakiHomeView({
  primarySpace,
  onSendExample,
  onGoToThread,
  onDeleteThread,
}: ZakiHomeViewProps) {
  void primarySpace;
  void onGoToThread;
  void onDeleteThread;
  const [zakiMenuOpen, setZakiMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  return (
    <div className="px-4 sm:px-6 md:px-10 py-10 md:py-12 min-h-full flex flex-col max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-10">
        <div className="flex-1 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/80 px-3 py-1 text-2xs text-zaki-muted uppercase tracking-[0.2em]">
            Welcome back
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-semibold text-zaki-primary tracking-tight">
            {emptyStateHeadline}
          </h1>
          <div className="mt-3 text-base text-zaki-muted max-w-2xl">{emptyStateSubtext}</div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/80 px-3 py-1 text-xs text-zaki-secondary">
              <ShieldCheck className="size-4 text-zaki-success" />
              Memory is on
              <span className="text-zaki-muted">·</span>
              We only store what you approve.
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-zaki-brand hover:underline"
            >
              Learn how memory works
            </button>
          </div>
          <div className="mt-6 flex flex-col items-start gap-2 w-full">
            <div className="text-[11px] uppercase tracking-[0.24em] text-zaki-muted">
              {emptyStateCtaHelper}
            </div>
            <button
              type="button"
              className="zaki-btn bg-zaki-accent text-white w-full sm:w-auto"
              onClick={() => onSendExample(emptyStateExamples[0])}
            >
              {emptyStateCta}
            </button>
          </div>
        </div>
        <div className="relative self-start sm:self-auto">
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
              <button className="w-full text-left px-3 py-2 text-sm text-zaki-primary hover:bg-zaki-hover rounded-zaki-md" type="button">
                About ZAKI
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-zaki-brand hover:bg-zaki-error rounded-zaki-md" type="button">
                Clear chats
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-10">
        {quickStart.map((item) => (
          <button
            key={item.title}
            type="button"
            className="rounded-zaki-2xl border border-zaki-subtle bg-white/90 p-5 text-left shadow-[0px_10px_26px_rgba(15,15,15,0.06)] hover:shadow-[0px_16px_30px_rgba(15,15,15,0.08)] transition-shadow"
            onClick={() => onSendExample(item.title)}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zaki-muted">
              <Sparkles className="size-4 text-zaki-brand" />
              Quick start
            </div>
            <div className="mt-3 text-base font-semibold text-zaki-primary">{item.title}</div>
            <div className="mt-2 text-sm text-zaki-secondary">{item.body}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xs text-zaki-muted font-semibold uppercase tracking-wider">
              Latest from ZAKI
            </div>
            <button
              type="button"
              className="zaki-btn-sm text-zaki-brand hover:text-zaki-brand bg-transparent"
            >
              View all
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {zakiNews.map((item) => (
              <div key={item.title} className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3">
                <div className="text-2xs text-zaki-muted uppercase tracking-wider">{item.meta}</div>
                <div className="text-sm text-zaki-primary font-semibold mt-1">{item.title}</div>
                <div className="text-xs text-zaki-secondary mt-2">{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xs text-zaki-muted font-semibold uppercase tracking-wider">
              Mission
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="zaki-btn-sm size-8 p-0 border border-zaki bg-white flex items-center justify-center text-zaki-muted hover:bg-zaki-hover transition-colors"
                onClick={() => setActiveSlide((prev) => (prev - 1 + zakiMissionSlides.length) % zakiMissionSlides.length)}
                aria-label="Previous mission"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                className="zaki-btn-sm size-8 p-0 border border-zaki bg-white flex items-center justify-center text-zaki-muted hover:bg-zaki-hover transition-colors"
                onClick={() => setActiveSlide((prev) => (prev + 1) % zakiMissionSlides.length)}
                aria-label="Next mission"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-5 py-4 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="text-lg font-semibold text-zaki-primary">
                {zakiMissionSlides[activeSlide]?.title}
              </div>
              <div className="text-sm text-zaki-secondary mt-2">
                {zakiMissionSlides[activeSlide]?.body}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {zakiMissionSlides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeSlide ? "w-6 bg-zaki-brand" : "w-3 bg-zaki-border-default"
                  }`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Mission slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs text-zaki-muted font-semibold uppercase tracking-wider">Memory clarity</div>
              <div className="mt-2 text-sm text-zaki-secondary max-w-xl">
                ZAKI only saves what helps you. Review and manage memories anytime.
              </div>
            </div>
            <div className="size-10 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-brand">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3">
              <div className="text-xs font-semibold text-zaki-primary">Review saved memories</div>
              <div className="text-xs text-zaki-muted mt-1">Edit or delete anything ZAKI keeps.</div>
            </div>
            <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3">
              <div className="text-xs font-semibold text-zaki-primary">You stay in control</div>
              <div className="text-xs text-zaki-muted mt-1">ZAKI asks for confirmation in manual mode.</div>
            </div>
          </div>
        </div>
        <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
          <div className="text-2xs text-zaki-muted font-semibold uppercase tracking-wider">Examples</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {zakiExamples.slice(0, 4).map((example) => (
              <button
                key={example}
                type="button"
                className="zaki-btn-sm border border-zaki-subtle bg-white text-zaki-secondary hover:bg-zaki-hover"
                onClick={() => onSendExample(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
