import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type SlashCommand, getDisplayOrder } from "@/lib/slashCommands";

const EXTENDED_HELP_DELAY_MS = 500;

interface SlashCommandPaletteProps {
  open: boolean;
  filter: string;
  highlightIndex: number;
  onHighlightChange: (index: number) => void;
  onSelect: (cmd: SlashCommand) => void;
  onDismiss: () => void;
  showAliases: boolean;
  onToggleAliases: () => void;
  isOperator?: boolean;
  isRtl?: boolean;
  listboxId: string;
  optionId: (index: number) => string;
}

export function SlashCommandPalette({
  open,
  filter,
  highlightIndex,
  onHighlightChange,
  onSelect,
  onDismiss,
  showAliases,
  onToggleAliases,
  isOperator = false,
  isRtl = false,
  listboxId,
  optionId,
}: SlashCommandPaletteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [extendedHelpVisible, setExtendedHelpVisible] = useState(false);

  const { flat: flatOrder, grouped } = useMemo(
    () => getDisplayOrder({ filter, showAliases, isOperator }),
    [filter, showAliases, isOperator],
  );

  const indexByName = useMemo(() => {
    const map = new Map<string, number>();
    flatOrder.forEach((cmd, index) => map.set(cmd.name, index));
    return map;
  }, [flatOrder]);

  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[highlightIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, open]);

  useEffect(() => {
    setHoveredIndex(null);
  }, [flatOrder]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      onDismiss();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onDismiss]);

  const helpAnchorIndex = hoveredIndex !== null ? hoveredIndex : highlightIndex;

  useEffect(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setExtendedHelpVisible(false);
    if (!open) return;
    if (helpAnchorIndex < 0 || helpAnchorIndex >= flatOrder.length) return;
    hoverTimerRef.current = setTimeout(() => {
      setExtendedHelpVisible(true);
    }, EXTENDED_HELP_DELAY_MS);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [helpAnchorIndex, flatOrder.length, open]);

  if (!open) return null;

  const helpTarget =
    extendedHelpVisible && helpAnchorIndex >= 0
      ? flatOrder[helpAnchorIndex]
      : undefined;

  const renderItem = (cmd: SlashCommand) => {
    const idx = indexByName.get(cmd.name) ?? -1;
    const isHighlighted = idx === highlightIndex;
    return (
      <li
        key={cmd.name}
        ref={(node) => {
          if (idx >= 0) itemRefs.current[idx] = node;
        }}
        id={optionId(idx)}
        role="option"
        aria-selected={isHighlighted}
        aria-label={`${cmd.name}${cmd.args ? " " + cmd.args : ""} — ${cmd.description}`}
        className={cn(
          "flex cursor-pointer items-baseline gap-2 rounded-zaki-md px-2.5 py-1.5 text-sm transition-colors",
          isHighlighted
            ? "bg-zaki-hover text-zaki-primary"
            : "text-zaki-primary hover:bg-zaki-hover",
        )}
        onMouseEnter={() => {
          setHoveredIndex(idx);
          onHighlightChange(idx);
        }}
        onMouseLeave={() => setHoveredIndex(null)}
        onMouseDown={(event) => {
          event.preventDefault();
          onSelect(cmd);
        }}
      >
        <span className="font-mono font-semibold text-zaki-brand whitespace-nowrap">
          {cmd.name}
        </span>
        {cmd.args ? (
          <span className="font-mono text-xs text-zaki-muted whitespace-nowrap">
            {cmd.args}
          </span>
        ) : null}
        <span className="flex-1 truncate text-zaki-secondary">
          {cmd.description}
        </span>
        {cmd.isAlias ? (
          <span className="text-2xs uppercase tracking-wide text-zaki-muted">
            alias
          </span>
        ) : null}
      </li>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute bottom-full mb-2 z-40 w-full max-w-xl rounded-zaki-lg border border-zaki-strong bg-zaki-raised font-body shadow-[0px_16px_36px_rgba(15,15,15,0.12)] dark:bg-[#1a1714]",
        isRtl ? "right-0" : "left-0",
      )}
      dir={isRtl ? "rtl" : "ltr"}
      data-testid="slash-command-palette"
    >
      <div className="flex items-center justify-between border-b border-zaki-subtle px-3 py-1.5">
        <span className="text-2xs uppercase tracking-wide text-zaki-muted">
          Slash commands
        </span>
        <button
          type="button"
          className="text-2xs text-zaki-muted hover:text-zaki-primary transition-colors"
          onMouseDown={(event) => {
            event.preventDefault();
            onToggleAliases();
          }}
          aria-pressed={showAliases}
          data-testid="slash-toggle-aliases"
        >
          {showAliases ? "Hide aliases" : "Show aliases"}
        </button>
      </div>

      <ul
        id={listboxId}
        role="listbox"
        aria-label="Slash command suggestions"
        className="max-h-[320px] overflow-y-auto py-1 px-1 zaki-scrollbar-fade"
      >
        {flatOrder.length === 0 ? (
          <li
            role="option"
            aria-disabled="true"
            aria-selected={false}
            className="px-2.5 py-2 text-sm text-zaki-muted"
          >
            No matching commands
          </li>
        ) : grouped ? (
          grouped.map((group) => {
            const headingId = `${listboxId}-cat-${group.category.id}`;
            return (
              <li
                key={group.category.id}
                className="list-none"
                role="group"
                aria-labelledby={headingId}
              >
                <div
                  id={headingId}
                  className="px-2.5 py-1 text-2xs uppercase tracking-wide text-zaki-muted"
                >
                  {group.category.label}
                </div>
                <ul role="presentation" className="flex flex-col">
                  {group.commands.map((cmd) => renderItem(cmd))}
                </ul>
              </li>
            );
          })
        ) : (
          flatOrder.map((cmd) => renderItem(cmd))
        )}
      </ul>

      {helpTarget?.extendedHelp ? (
        <div className="border-t border-zaki-subtle px-3 py-2 text-xs text-zaki-secondary">
          <span className="font-mono font-semibold text-zaki-primary">
            {helpTarget.name}
          </span>{" "}
          — {helpTarget.extendedHelp}
        </div>
      ) : null}
    </div>
  );
}
