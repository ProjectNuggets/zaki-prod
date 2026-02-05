import type { Space } from "@/types";
import { SkeletonSpaceGrid } from "../../ui/skeleton";

interface SpacesViewProps {
  spacesList: Space[];
  isLoading?: boolean;
  onCreateSpace: () => void;
  onViewSpace: (id: string) => void;
}

export function SpacesView({
  spacesList,
  isLoading = false,
  onCreateSpace,
  onViewSpace,
}: SpacesViewProps) {
  if (isLoading) {
    return (
      <div className="px-10 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-muted text-xs font-semibold">SP</div>
          <div>
            <div className="text-lg font-semibold text-zaki-primary">Spaces</div>
            <div className="text-sm text-zaki-disabled">Manage and explore your spaces in one place</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 rounded-full border border-zaki bg-white px-4 py-2 text-sm text-zaki-muted">
            Search spaces...
          </div>
          <span className="text-sm text-zaki-muted">Sort by recent</span>
        </div>

        <SkeletonSpaceGrid />
      </div>
    );
  }

  return (
    <div className="px-10 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-muted text-xs font-semibold">SP</div>
        <div>
          <div className="text-lg font-semibold text-zaki-primary">Spaces</div>
          <div className="text-sm text-zaki-disabled">Manage and explore your spaces in one place</div>
        </div>
        <button
          type="button"
          className="ml-auto rounded-full bg-zaki-brand text-white text-sm px-4 py-2 hover:bg-zaki-brand-hover active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2"
          onClick={onCreateSpace}
          aria-label="Create new space"
        >
          Create new space
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 rounded-full border border-zaki bg-white px-4 py-2 text-sm text-zaki-muted">
          Search spaces...
        </div>
        <button className="text-sm text-zaki-muted hover:text-zaki-secondary focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 rounded px-2 py-1" aria-label="Sort spaces by recent">Sort by recent</button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {spacesList.map((space) => (
          <div
            key={space.id}
            className="rounded-zaki-lg border border-zaki bg-white p-4 shadow-[0px_6px_18px_rgba(15,15,15,0.06)] cursor-pointer hover:shadow-[0px_8px_24px_rgba(15,15,15,0.1)] transition-shadow"
            role="button"
            onClick={() => onViewSpace(space.id)}
          >
            <div className="text-sm font-semibold text-zaki-primary">{space.title}</div>
            <div className="text-xs text-zaki-disabled mt-1">
              {space.description || "Space description"}
            </div>
            <div className="text-[10px] text-zaki-muted mt-3">Updated recently</div>
          </div>
        ))}
      </div>
    </div>
  );
}
