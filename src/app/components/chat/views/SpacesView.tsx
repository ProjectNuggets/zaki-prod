interface Space {
  id: string;
  title: string;
  description?: string;
}

interface SpacesViewProps {
  spacesList: Space[];
  onCreateSpace: () => void;
  onViewSpace: (id: string) => void;
}

export function SpacesView({
  spacesList,
  onCreateSpace,
  onViewSpace,
}: SpacesViewProps) {
  return (
    <div className="px-10 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-[#f6efe6] flex items-center justify-center text-[#88735A] text-xs font-semibold">SP</div>
        <div>
          <div className="text-lg font-semibold text-[#1f1a14]">Spaces</div>
          <div className="text-sm text-[#a3a3a3]">Manage and explore your spaces in one place</div>
        </div>
        <button
          type="button"
          className="ml-auto rounded-full bg-[#655543] text-white text-sm px-4 py-2 hover:bg-[#D24430] active:scale-[0.98] transition-[transform,background-color] focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2"
          onClick={onCreateSpace}
          aria-label="Create new space"
        >
          Create new space
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 rounded-full border border-[#efe4d6] bg-white px-4 py-2 text-sm text-[#b09472]">
          Search spaces...
        </div>
        <button className="text-sm text-[#88735A] hover:text-[#655543] focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2 rounded px-2 py-1" aria-label="Sort spaces by recent">Sort by recent</button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {spacesList.map((space) => (
          <div
            key={space.id}
            className="rounded-2xl border border-[#efe4d6] bg-white p-4 shadow-[0px_6px_18px_rgba(15,15,15,0.06)] cursor-pointer hover:shadow-[0px_8px_24px_rgba(15,15,15,0.1)] transition-shadow"
            role="button"
            onClick={() => onViewSpace(space.id)}
          >
            <div className="text-sm font-semibold text-[#1f1a14]">{space.title}</div>
            <div className="text-xs text-[#a3a3a3] mt-1">
              {space.description || "Space description"}
            </div>
            <div className="text-[10px] text-[#c1b6a5] mt-3">Updated recently</div>
          </div>
        ))}
      </div>
    </div>
  );
}
