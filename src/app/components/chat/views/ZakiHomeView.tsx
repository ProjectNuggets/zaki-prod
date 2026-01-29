import { useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { ChevronDownIcon } from "../../icons";
import type { Space } from "@/types";

interface ZakiHomeViewProps {
  primarySpace: Space | null;
  onSendExample: (example: string) => void;
  onGoToThread: (spaceId: string, threadId: string) => void;
  onDeleteThread: (threadId: string, spaceId?: string) => void;
}

const zakiExamples = [
  "Explain quantum computing in simple terms",
  "Got any creative ideas for a 10 year old's birthday?",
  "How do I make an HTTP request in JavaScript?",
];

const zakiRamadanExamples = [
  "When is Iftar time in Dubai today?",
  "What are good Suhoor meal ideas?",
  "Share a Ramadan greeting message",
];

const zakiCapabilities = [
  "Remembers what user said earlier in the conversation",
  "Allows user to provide follow-up corrections",
  "Trained to decline inappropriate requests",
];

const zakiLimitations = [
  "May occasionally generate incorrect information",
  "May occasionally produce harmful instructions or biased content",
  "Limited knowledge of world and events after training",
];

export function ZakiHomeView({
  primarySpace,
  onSendExample,
  onGoToThread,
  onDeleteThread,
}: ZakiHomeViewProps) {
  const [zakiMenuOpen, setZakiMenuOpen] = useState(false);
  const [zakiExamplesOpen, setZakiExamplesOpen] = useState(false);
  const [zakiThreadMenuOpen, setZakiThreadMenuOpen] = useState<string | null>(null);
  const zakiMenuRef = useRef<HTMLDivElement>(null);
  const zakiExamplesRef = useRef<HTMLDivElement>(null);
  const zakiThreadMenuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="px-10 py-12">
      <div className="flex items-center justify-between mb-10">
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="text-xl font-semibold text-zaki-primary tracking-tight">ZAKI</div>
          <div
            className="relative text-base text-zaki-brand font-semibold uppercase tracking-wide inline-flex items-center gap-1 cursor-pointer"
            ref={zakiExamplesRef}
            onClick={() => setZakiExamplesOpen((open) => !open)}
            role="button"
            tabIndex={0}
          >
            UNDERSTANDS
            <ChevronDownIcon color="#D24430" />
            {zakiExamplesOpen && (
              <div className="absolute left-1/2 top-full mt-3 w-[320px] -translate-x-1/2 rounded-zaki-lg border border-zaki bg-white p-3 shadow-[0px_14px_30px_rgba(15,15,15,0.12)] z-20">
                <div className="text-[11px] text-zaki-brand font-semibold uppercase tracking-wider">Examples</div>
                <div className="mt-2 flex flex-col gap-2">
                  {zakiExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="rounded-zaki-md border border-zaki bg-zaki-raised px-3 py-2 text-sm text-zaki-primary text-left hover:bg-zaki-hover transition-colors"
                      onClick={() => onSendExample(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-zaki-brand font-semibold uppercase tracking-wider">Examples · Ramadan Special</div>
                <div className="mt-2 flex flex-col gap-2">
                  {zakiRamadanExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="rounded-zaki-md border border-zaki bg-zaki-raised px-3 py-2 text-sm text-zaki-primary text-left hover:bg-zaki-hover transition-colors"
                      onClick={() => onSendExample(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="relative" ref={zakiMenuRef}>
          <button
            type="button"
            className="size-9 rounded-full border border-zaki bg-white flex items-center justify-center text-zaki-muted hover:bg-zaki-hover transition-colors"
            onClick={() => setZakiMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={zakiMenuOpen}
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
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
          <div className="text-[11px] text-zaki-muted font-semibold mb-4 uppercase tracking-wider">Capabilities</div>
          <div className="flex flex-col gap-3 text-sm text-zaki-primary text-center">
            {zakiCapabilities.map((item) => (
              <div key={item} className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-zaki-2xl border border-zaki bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
          <div className="text-[11px] text-zaki-muted font-semibold mb-4 uppercase tracking-wider">Limitations</div>
          <div className="flex flex-col gap-3 text-sm text-zaki-primary text-center">
            {zakiLimitations.map((item) => (
              <div key={item} className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
      {primarySpace && (primarySpace.threads?.length ?? 0) > 0 && (
        <div className="mt-10">
          <div className="text-xs text-zaki-muted font-semibold mb-3">Recent chats</div>
          <div className="flex flex-col gap-2">
            {primarySpace.threads?.map((thread) => (
              <div key={thread.id} className="flex items-center justify-between rounded-zaki-md border border-zaki bg-white px-4 py-3 text-sm text-zaki-primary">
                <button
                  type="button"
                  className="flex-1 text-left font-medium"
                  onClick={() => {
                    if (!primarySpace) return;
                    onGoToThread(primarySpace.id, thread.id);
                  }}
                >
                  {thread.label}
                </button>
                <div className="relative" ref={zakiThreadMenuRef}>
                  <button
                    type="button"
                    className="size-8 rounded-full hover:bg-zaki-hover flex items-center justify-center text-zaki-muted"
                    onClick={() => setZakiThreadMenuOpen((prev) => (prev === thread.id ? null : thread.id))}
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  {zakiThreadMenuOpen === thread.id && (
                    <div className="absolute right-0 mt-2 w-32 rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1">
                      <button className="w-full text-left px-3 py-2 text-sm text-zaki-primary hover:bg-zaki-hover rounded-zaki-md" type="button">
                        Rename
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-zaki-brand hover:bg-zaki-error rounded-zaki-md"
                        type="button"
                        onClick={() => {
                          onDeleteThread(thread.id, primarySpace?.id);
                          setZakiThreadMenuOpen(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
