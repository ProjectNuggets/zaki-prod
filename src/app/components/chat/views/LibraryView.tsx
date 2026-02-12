import { Search } from "lucide-react";
import { SkeletonMessage } from "../../ui/skeleton";
import type { Space, LibraryResult } from "@/types";

interface LibraryViewProps {
  spacesList: Space[];
  librarySlug: string;
  setLibrarySlug: (slug: string) => void;
  libraryQuery: string;
  setLibraryQuery: (query: string) => void;
  libraryResults: LibraryResult[];
  libraryLoading: boolean;
  libraryError: string;
  onSearch: () => void;
}

export function LibraryView({
  spacesList,
  librarySlug,
  setLibrarySlug,
  libraryQuery,
  setLibraryQuery,
  libraryResults,
  libraryLoading,
  libraryError,
  onSearch,
}: LibraryViewProps) {
  return (
    <div className="px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-muted text-xs font-semibold">LB</div>
        <div>
          <div className="text-lg font-semibold text-zaki-primary">Library</div>
          <div className="text-sm text-zaki-disabled">Search pinned documents inside each workspace</div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-zaki-lg border border-zaki bg-white p-4 md:p-5">
          <div className="text-xs text-zaki-muted font-semibold mb-3">Workspaces</div>
          <div className="flex flex-col gap-2">
            {spacesList.map((space) => {
              const slug = space.id;
              return (
                <button
                  key={space.id}
                  type="button"
                  className={librarySlug === slug
                    ? "rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2 text-left text-sm text-zaki-primary"
                    : "rounded-zaki-md border border-transparent hover:bg-zaki-hover px-3 py-2 text-left text-sm text-zaki-secondary"
                  }
                  onClick={() => setLibrarySlug(slug)}
                >
                  <div className="text-sm font-medium">{space.title}</div>
                  <div className="text-xs text-zaki-disabled truncate">{space.description || "Workspace documents"}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-zaki-lg border border-zaki bg-white p-4 md:p-5">
          <div className="text-sm font-semibold text-zaki-primary">Vector search</div>
          <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-full border border-zaki bg-zaki-raised px-4 py-2.5 text-sm">
              <Search className="size-4 text-zaki-muted" />
              <input
                className="flex-1 bg-transparent outline-none text-zaki-primary placeholder-zaki"
                placeholder="Search this workspace"
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="zaki-btn w-full sm:w-auto bg-zaki-primary text-white hover:bg-zaki-active transition-colors"
              onClick={onSearch}
              disabled={libraryLoading}
            >
              {libraryLoading ? "Searching..." : "Search"}
            </button>
          </div>
          {libraryError && (
            <div className="mt-3 text-sm text-zaki-brand">{libraryError}</div>
          )}
          <div className="mt-4 flex flex-col gap-3">
            {libraryLoading && (
              <div className="flex flex-col gap-3">
                <SkeletonMessage />
                <SkeletonMessage />
              </div>
            )}
            {!libraryLoading && libraryResults.length === 0 && (
              <div className="text-sm text-zaki-disabled">No results yet. Choose a workspace and search.</div>
            )}
            {!libraryLoading && libraryResults.map((result) => (
              <div key={result.id} className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4">
                <div className="text-xs text-zaki-muted">Score: {result.score?.toFixed(2) ?? "N/A"}</div>
                <div className="text-sm text-zaki-primary mt-2 whitespace-pre-line">{result.text}</div>
                {result.metadata?.title && (
                  <div className="text-xs text-zaki-disabled mt-2">Source: {result.metadata.title}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
