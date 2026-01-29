import { Search } from "lucide-react";
import { SkeletonMessage } from "../../ui/skeleton";

interface Space {
  id: string;
  title: string;
  description?: string;
}

interface LibraryResult {
  id: string;
  text: string;
  score?: number;
  metadata?: Record<string, string>;
}

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
    <div className="px-10 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-[#f6efe6] flex items-center justify-center text-[#88735A] text-xs font-semibold">LB</div>
        <div>
          <div className="text-lg font-semibold text-[#1f1a14]">Library</div>
          <div className="text-sm text-[#a3a3a3]">Search pinned documents inside each workspace</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-[#efe4d6] bg-white p-4">
          <div className="text-xs text-[#88735A] font-semibold mb-3">Workspaces</div>
          <div className="flex flex-col gap-2">
            {spacesList.map((space) => {
              const slug = space.id;
              return (
                <button
                  key={space.id}
                  type="button"
                  className={librarySlug === slug
                    ? "rounded-xl border border-[#e7dbc9] bg-[#f8f2e9] px-3 py-2 text-left text-sm text-[#1f1a14]"
                    : "rounded-xl border border-transparent hover:bg-[#f8f2e9] px-3 py-2 text-left text-sm text-[#655543]"
                  }
                  onClick={() => setLibrarySlug(slug)}
                >
                  <div className="text-sm font-medium">{space.title}</div>
                  <div className="text-xs text-[#a3a3a3] truncate">{space.description || "Workspace documents"}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-[#efe4d6] bg-white p-5">
          <div className="text-sm font-semibold text-[#1f1a14]">Vector search</div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-full border border-[#efe4d6] bg-[#fffdfa] px-3 py-2 text-sm">
              <Search className="size-4 text-[#b09472]" />
              <input
                className="flex-1 bg-transparent outline-none text-[#1f1a14] placeholder-[#b09472]"
                placeholder="Search within selected workspace"
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="rounded-full bg-[#1f1a14] text-white text-sm px-4 py-2 hover:bg-[#2b241c] transition-colors"
              onClick={onSearch}
              disabled={libraryLoading}
            >
              {libraryLoading ? "Searching..." : "Search"}
            </button>
          </div>
          {libraryError && (
            <div className="mt-3 text-sm text-[#d24430]">{libraryError}</div>
          )}
          <div className="mt-4 flex flex-col gap-3">
            {libraryLoading && (
              <div className="flex flex-col gap-3">
                <SkeletonMessage />
                <SkeletonMessage />
              </div>
            )}
            {!libraryLoading && libraryResults.length === 0 && (
              <div className="text-sm text-[#a3a3a3]">No results yet. Choose a workspace and search.</div>
            )}
            {!libraryLoading && libraryResults.map((result) => (
              <div key={result.id} className="rounded-2xl border border-[#efe4d6] bg-[#fffdfa] p-4">
                <div className="text-xs text-[#88735A]">Score: {result.score?.toFixed(2) ?? "N/A"}</div>
                <div className="text-sm text-[#1f1a14] mt-2 whitespace-pre-line">{result.text}</div>
                {result.metadata?.title && (
                  <div className="text-xs text-[#a3a3a3] mt-2">Source: {result.metadata.title}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
