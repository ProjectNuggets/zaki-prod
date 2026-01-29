import { useRef, useState } from "react";
import { Pencil, Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette, FileText, MessageSquare, Plus } from "lucide-react";
import { CenterLogo } from "../../icons";
import { InputArea } from "../../InputArea";
import type { Space } from "@/types";

interface SpaceDetailViewProps {
  spaceDetail: Space;
  attachments: File[];
  setAttachments: (value: File[] | ((prev: File[]) => File[])) => void;
  isStreaming: boolean;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onSend: (text: string, files: File[]) => void;
  onGoToSpaces: () => void;
  onGoToThread: (spaceId: string, threadId: string) => void;
  onCreateThread: (spaceId: string) => void;
  onUpdateSpace: (id: string, updates: Partial<Space>) => void;
  onDeleteThread: (threadId: string) => void;
  onEditInstructions: (instructions: string) => void;
  onUploadFiles: () => void;
}

const iconOptions = [
  { id: "folder", icon: Folder },
  { id: "briefcase", icon: Briefcase },
  { id: "book", icon: BookOpen },
  { id: "graduation", icon: GraduationCap },
  { id: "sparkles", icon: Sparkles },
  { id: "palette", icon: Palette },
  { id: "file", icon: FileText },
];

const colorOptions = ["#E24A3B", "#F57C1F", "#F2B705", "#20A559", "#2F7EEA", "#7B4BE4", "#FF6FB1"];

export function SpaceDetailView({
  spaceDetail,
  attachments,
  setAttachments,
  isStreaming,
  webSearchEnabled,
  onToggleWebSearch,
  onSend,
  onGoToSpaces,
  onGoToThread,
  onCreateThread,
  onUpdateSpace,
  onDeleteThread,
  onEditInstructions,
  onUploadFiles,
}: SpaceDetailViewProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const threads = spaceDetail.threads ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Back link */}
          <button
            type="button"
            className="text-xs text-zaki-muted hover:text-zaki-secondary mb-6 focus-visible:ring-2 focus-visible:ring-zaki-brand rounded"
            onClick={onGoToSpaces}
          >
            ← All spaces
          </button>

          {/* Space header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <button
                type="button"
                className="size-14 rounded-2xl bg-zaki-sunken flex items-center justify-center hover:bg-zaki-hover transition-colors"
                onClick={() => !spaceDetail.fixed && setIconPickerOpen((o) => !o)}
              >
                {spaceDetail.icon === "zaki" ? (
                  <CenterLogo />
                ) : (
                  (() => {
                    const Icon = iconOptions.find((o) => o.id === (spaceDetail.icon ?? "folder"))?.icon ?? Folder;
                    return <Icon className="size-6" style={{ color: spaceDetail.color ?? "#88735A" }} />;
                  })()
                )}
              </button>
              {iconPickerOpen && !spaceDetail.fixed && (
                <div
                  ref={iconPickerRef}
                  className="absolute top-16 left-0 w-[220px] rounded-xl border border-[#333] bg-[#1a1a1a] text-white shadow-xl p-3 z-30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="size-6 rounded-full border-2 border-transparent hover:border-white/50 transition-colors"
                        style={{ backgroundColor: color }}
                        onClick={() => onUpdateSpace(spaceDetail.id, { color })}
                      />
                    ))}
                  </div>
                  <div className="h-px bg-white/10 mb-3" />
                  <div className="grid grid-cols-6 gap-1">
                    {iconOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                        onClick={() => onUpdateSpace(spaceDetail.id, { icon: option.id })}
                      >
                        <option.icon className="size-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-zaki-primary">{spaceDetail.title}</h1>
              <p className="text-sm text-zaki-muted mt-0.5">{spaceDetail.description || "No description"}</p>
            </div>
          </div>

          {/* Quick actions grid */}
          <div className="grid gap-3 sm:grid-cols-2 mb-8">
            <button
              type="button"
              onClick={() => onCreateThread(spaceDetail.id)}
              className="flex items-center gap-3 p-4 rounded-xl border border-zaki bg-white hover:border-zaki-brand hover:bg-zaki-hover transition-all group"
            >
              <div className="size-10 rounded-xl bg-zaki-brand/10 flex items-center justify-center group-hover:bg-zaki-brand/20 transition-colors">
                <Plus className="size-5 text-zaki-brand" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zaki-primary">New chat</div>
                <div className="text-xs text-zaki-muted">Start a conversation</div>
              </div>
            </button>

            {!spaceDetail.fixed && (
              <button
                type="button"
                onClick={() => onEditInstructions(spaceDetail.instructions || "")}
                className="flex items-center gap-3 p-4 rounded-xl border border-zaki bg-white hover:border-zaki-strong hover:bg-zaki-hover transition-all group"
              >
                <div className="size-10 rounded-xl bg-zaki-sunken flex items-center justify-center group-hover:bg-zaki-active transition-colors">
                  <Pencil className="size-4 text-zaki-muted" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-zaki-primary">Instructions</div>
                  <div className="text-xs text-zaki-muted truncate max-w-[180px]">
                    {spaceDetail.instructions || "Add custom instructions"}
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Recent chats */}
          {threads.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zaki-muted uppercase tracking-wider mb-3">
                Recent chats
              </h2>
              <div className="space-y-2">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => onGoToThread(spaceDetail.id, thread.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-zaki bg-white hover:border-zaki-strong hover:bg-zaki-hover transition-all text-left group"
                  >
                    <MessageSquare className="size-4 text-zaki-muted group-hover:text-zaki-secondary transition-colors" />
                    <span className="flex-1 text-sm text-zaki-primary truncate">{thread.label}</span>
                    {!spaceDetail.fixed && (
                      <button
                        type="button"
                        className="text-xs text-zaki-muted hover:text-zaki-brand opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteThread(thread.id);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {threads.length === 0 && (
            <div className="text-center py-12">
              <div className="size-12 rounded-2xl bg-zaki-sunken flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="size-5 text-zaki-muted" />
              </div>
              <p className="text-sm text-zaki-muted">No chats yet</p>
              <p className="text-xs text-zaki-disabled mt-1">Start typing below to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed input area at bottom */}
      <div className="shrink-0 border-t border-zaki bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <InputArea
            onSend={onSend}
            attachments={attachments}
            setAttachments={setAttachments}
            isSending={isStreaming}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={onToggleWebSearch}
          />
        </div>
      </div>
    </div>
  );
}
