import { useRef, useState } from "react";
import { Pencil, Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette, FileText } from "lucide-react";
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

  return (
    <div className="px-10 py-8">
      <button
        type="button"
        className="text-xs text-zaki-muted hover:text-zaki-secondary mb-4 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 rounded px-2 py-1"
        onClick={onGoToSpaces}
        aria-label="Back to all spaces"
      >
        ← All spaces
      </button>
      <div className="flex items-start gap-4">
        <div className="relative">
          <button
            type="button"
            className="size-12 rounded-full bg-zaki-sunken flex items-center justify-center"
            onClick={() => {
              if (!spaceDetail.fixed) {
                setIconPickerOpen((open) => !open);
              }
            }}
            aria-haspopup="menu"
            aria-expanded={iconPickerOpen}
          >
            {(() => {
              if (spaceDetail.icon === "zaki") {
                return <CenterLogo />;
              }
              const Icon = iconOptions.find((option) => option.id === (spaceDetail.icon ?? "folder"))?.icon ?? Folder;
              return <Icon className="size-5" style={{ color: spaceDetail.color ?? "#88735A" }} />;
            })()}
          </button>
          {iconPickerOpen && !spaceDetail.fixed && (
            <div
              ref={iconPickerRef}
              className="absolute top-14 left-0 w-[220px] rounded-zaki-lg border border-zaki-subtle bg-zaki-dark-elevated text-white shadow-[0px_18px_36px_rgba(0,0,0,0.35)] p-3 z-30"
            >
              <div className="flex items-center gap-2 mb-3">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="size-6 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onUpdateSpace(spaceDetail.id, { color });
                    }}
                  />
                ))}
              </div>
              <div className="h-px bg-white/10 mb-3" />
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="size-7 rounded-lg hover:bg-white/10 flex items-center justify-center"
                    onClick={() => {
                      onUpdateSpace(spaceDetail.id, { icon: option.id });
                    }}
                  >
                    <option.icon className="size-4 text-white" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-zaki-primary">{spaceDetail.title}</div>
            <span className="text-[10px] uppercase tracking-wide rounded-full bg-zaki-sunken text-zaki-secondary px-2 py-0.5">Private</span>
          </div>
          <div className="text-sm text-zaki-disabled mt-1">{spaceDetail.description}</div>
        </div>
        <button
          type="button"
          className="rounded-full bg-zaki-secondary text-white text-sm px-4 py-2 hover:bg-zaki-brand active:scale-[0.98] transition-[transform,background-color]"
          onClick={() => onCreateThread(spaceDetail.id)}
        >
          New chat
        </button>
      </div>
      <div className="mt-6">
        <InputArea
          onSend={onSend}
          attachments={attachments}
          setAttachments={setAttachments}
          isSending={isStreaming}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-zaki-lg border border-zaki bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zaki-muted font-semibold">Project files</div>
            {!spaceDetail.fixed && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-zaki-muted hover:text-zaki-secondary"
                  onClick={onUploadFiles}
                >
                  +
                </button>
                <button
                  type="button"
                  className="text-xs text-zaki-brand hover:text-zaki-brand"
                  onClick={() => {
                    onUpdateSpace(spaceDetail.id, { pinnedFiles: [] });
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          <div className={`text-sm mt-1 ${spaceDetail.fixed ? "text-zaki-disabled" : "text-zaki-primary"}`}>
            {spaceDetail.fixed ? "ZAKI is not a project" : `${spaceDetail.pinnedFiles?.length ?? 0} files`}
          </div>
        </div>
        <div className="rounded-zaki-lg border border-zaki bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zaki-muted font-semibold">Instructions</div>
            {!spaceDetail.fixed && (
              <button
                type="button"
                className="text-zaki-muted hover:text-zaki-secondary focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 rounded p-1"
                onClick={() => onEditInstructions(spaceDetail.instructions || "")}
                aria-label="Edit instructions"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
          <div className={`text-sm mt-1 ${spaceDetail.fixed ? "text-zaki-disabled" : "text-zaki-primary"} line-clamp-2`}>
            {spaceDetail.fixed ? "ZAKI doesn't take instructions from anyone." : (spaceDetail.instructions || "No instructions yet.")}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <div className="text-xs text-zaki-muted font-semibold mb-3">Chats in this space</div>
        <div className="flex flex-col gap-2">
          {(spaceDetail.threads ?? []).map((thread) => (
            <button
              key={thread.id}
              type="button"
              className="flex items-center justify-between rounded-zaki-md border border-zaki bg-white px-4 py-3 text-sm text-zaki-primary hover:bg-zaki-hover"
            >
              <span
                className="font-medium flex-1 text-left"
                onClick={() => onGoToThread(spaceDetail.id, thread.id)}
                role="button"
              >
                {thread.label}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zaki-disabled">Recently updated</span>
                {spaceDetail.fixed && (
                  <button
                    type="button"
                    className="text-xs text-zaki-brand hover:text-zaki-brand"
                    onClick={() => onDeleteThread(thread.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </button>
          ))}
          {(!spaceDetail.threads || spaceDetail.threads.length === 0) && (
            <div className="text-sm text-zaki-disabled">No chats yet. Start one above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
