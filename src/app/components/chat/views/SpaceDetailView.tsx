import { useEffect, useRef, useState } from "react";
import { Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette, FileText } from "lucide-react";
import { CenterLogo } from "../../icons";
import { InputArea } from "../../InputArea";
import type { PinnedFileStatus, Space } from "@/types";

interface SpaceDetailViewProps {
  spaceDetail: Space;
  attachments: File[];
  setAttachments: (value: File[] | ((prev: File[]) => File[])) => void;
  isStreaming: boolean;
  queryModeEnabled: boolean;
  onToggleQueryMode: () => void;
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

const fileStatusTone: Record<PinnedFileStatus, { chip: string; label: string; dot: string }> = {
  embedded: {
    chip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    label: "Embedded",
    dot: "bg-emerald-500",
  },
  processing: {
    chip: "bg-amber-50 text-amber-700 border border-amber-200",
    label: "Processing",
    dot: "bg-amber-500",
  },
  failed: {
    chip: "bg-rose-50 text-rose-700 border border-rose-200",
    label: "Failed",
    dot: "bg-rose-500",
  },
};

export function SpaceDetailView({
  spaceDetail,
  attachments,
  setAttachments,
  isStreaming,
  queryModeEnabled,
  onToggleQueryMode,
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

  useEffect(() => {
    if (!iconPickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!iconPickerRef.current) return;
      if (!iconPickerRef.current.contains(event.target as Node)) {
        setIconPickerOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIconPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [iconPickerOpen]);

  return (
    <div className="px-4 sm:px-6 md:px-10 py-8 max-w-6xl mx-auto w-full">
      <button
        type="button"
        className="text-xs text-zaki-muted hover:text-zaki-secondary mb-4 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 rounded px-2 py-1"
        onClick={onGoToSpaces}
        aria-label="Back to all spaces"
      >
        ← All spaces
      </button>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
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
              className="absolute top-14 left-0 w-[240px] rounded-zaki-xl border border-zaki-subtle bg-white text-zaki-primary shadow-[0px_18px_36px_rgba(15,15,15,0.16)] p-3 z-30"
            >
              <div className="text-2xs text-zaki-muted font-semibold uppercase tracking-wider mb-3">
                Appearance
              </div>
              <div className="flex items-center gap-2 mb-3">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="size-6 rounded-full border border-zaki-subtle hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onUpdateSpace(spaceDetail.id, { color });
                      setIconPickerOpen(false);
                    }}
                  />
                ))}
              </div>
              <div className="h-px bg-zaki-subtle mb-3" />
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="size-8 rounded-lg hover:bg-zaki-hover flex items-center justify-center"
                    onClick={() => {
                      onUpdateSpace(spaceDetail.id, { icon: option.id });
                      setIconPickerOpen(false);
                    }}
                  >
                    <option.icon className="size-4 text-zaki-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-zaki-primary">{spaceDetail.title}</div>
            <span className="text-2xs uppercase tracking-wide rounded-full bg-zaki-sunken text-zaki-secondary px-2 py-0.5">Private</span>
          </div>
          <div className="text-sm text-zaki-disabled mt-1">{spaceDetail.description}</div>
        </div>
        <button
          type="button"
          className="zaki-btn w-full md:w-auto bg-zaki-secondary text-white hover:bg-zaki-brand active:scale-[0.98] transition-[transform,background-color]"
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
          queryModeEnabled={queryModeEnabled}
          onToggleQueryMode={onToggleQueryMode}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-zaki-xl border border-zaki-subtle bg-white/90 p-4 md:p-5 shadow-[0px_10px_26px_rgba(15,15,15,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zaki-muted font-semibold uppercase tracking-wider">Project files</div>
              <div className={`text-sm mt-1 ${spaceDetail.fixed ? "text-zaki-disabled" : "text-zaki-primary"}`}>
                {spaceDetail.fixed ? "ZAKI is not a project" : `${spaceDetail.pinnedFiles?.length ?? 0} files`}
              </div>
            </div>
            {!spaceDetail.fixed && (
              <button
                type="button"
                className="zaki-btn-sm bg-white border border-zaki-subtle text-zaki-secondary hover:bg-zaki-hover"
                onClick={onUploadFiles}
              >
                Upload
              </button>
            )}
          </div>
          {!spaceDetail.fixed && (
            <div className="mt-4 space-y-2">
              {(spaceDetail.pinnedFiles ?? []).length > 0 ? (
                (spaceDetail.pinnedFiles ?? []).map((file) => {
                  const status = file.status ?? "embedded";
                  const tone = fileStatusTone[status];
                  return (
                    <div
                      key={`${file.name}:${file.size}:${file.type}`}
                      className="flex items-start justify-between gap-3 rounded-zaki-md border border-zaki-subtle bg-zaki-raised/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zaki-primary">{file.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-2xs text-zaki-muted">
                          <span className={`size-1.5 rounded-full ${tone.dot}`} />
                          <span>{file.type || "document"}</span>
                        </div>
                        {status === "failed" && file.error && (
                          <div className="mt-1 text-2xs text-rose-700">{file.error}</div>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-2xs font-semibold ${tone.chip}`}>
                        {tone.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-zaki-md border border-dashed border-zaki-subtle px-3 py-3 text-sm text-zaki-muted">
                  Upload documents to ground this workspace. Embedded files stay with the whole space.
                </div>
              )}
            </div>
          )}
        </div>
        <div className="rounded-zaki-xl border border-zaki-subtle bg-white/90 p-4 md:p-5 shadow-[0px_10px_26px_rgba(15,15,15,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zaki-muted font-semibold uppercase tracking-wider">Instructions</div>
              <div className={`text-sm mt-1 ${spaceDetail.fixed ? "text-zaki-disabled" : "text-zaki-primary"} line-clamp-2`}>
                {spaceDetail.fixed ? "ZAKI doesn't take instructions from anyone." : (spaceDetail.instructions || "Add guidance for this space.")}
              </div>
            </div>
            {!spaceDetail.fixed && (
              <button
                type="button"
                className="zaki-btn-sm bg-white border border-zaki-subtle text-zaki-secondary hover:bg-zaki-hover"
                onClick={() => onEditInstructions(spaceDetail.instructions || "")}
                aria-label="Edit instructions"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-zaki-xl border border-zaki bg-zaki-raised p-4 md:p-5 shadow-[0px_10px_26px_rgba(15,15,15,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-zaki-muted font-semibold uppercase tracking-wider">Chats in this space</div>
          <div className="text-2xs text-zaki-muted">{(spaceDetail.threads ?? []).length} total</div>
        </div>
        <div className="flex flex-col divide-y divide-zaki-subtle">
          {(spaceDetail.threads ?? []).map((thread) => (
            <div
              key={thread.id}
              role="button"
              tabIndex={0}
              className="group flex items-center justify-between px-2 py-3 text-sm text-zaki-primary hover:bg-zaki-hover rounded-zaki-md transition-colors"
              onClick={() => onGoToThread(spaceDetail.id, thread.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onGoToThread(spaceDetail.id, thread.id);
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-2 rounded-full bg-zaki-accent/40 group-hover:bg-zaki-accent transition-colors" />
                <span className="font-medium text-left truncate">{thread.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {spaceDetail.fixed && (
                  <button
                    type="button"
                    className="text-2xs text-zaki-brand hover:text-zaki-brand"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteThread(thread.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {(!spaceDetail.threads || spaceDetail.threads.length === 0) && (
            <div className="text-sm text-zaki-disabled py-4">No chats yet. Start one above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
