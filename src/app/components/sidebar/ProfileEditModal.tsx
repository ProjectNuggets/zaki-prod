import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userInitials: string;
  displayName: string;
  setDisplayName: (name: string) => void;
  profileImageUrl: string | null;
}

export function ProfileEditModal({
  isOpen,
  onClose,
  userName,
  userInitials,
  displayName,
  setDisplayName,
  profileImageUrl,
}: ProfileEditModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div
        className="absolute inset-0"
        onClick={onClose}
        role="button"
        aria-label="Close profile editor"
      />
      <div ref={modalRef} className="relative w-[460px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-[#1f1a14]">Profile</div>
            <div className="text-xs text-[#a3a3a3]">Update your display name and photo</div>
          </div>
          <button
            type="button"
            className="size-8 rounded-full bg-[#faf6f0] text-[#655543] hover:bg-[#f0e6d8] transition-colors"
            onClick={onClose}
            aria-label="Close profile editor"
          >
            <span className="block text-lg leading-none">×</span>
          </button>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="size-16 rounded-full bg-[#faf6f0] flex items-center justify-center text-[#1f1a14] font-semibold text-lg overflow-hidden">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <label className="text-sm text-[#655543] cursor-pointer">
            <span className="underline hover:text-[#1f1a14]">Upload new photo</span>
            <input type="file" className="hidden" accept="image/*" />
          </label>
        </div>
        <div className="mt-5">
          <label className="flex flex-col gap-1 text-xs text-[#88735A]">
            Display name
            <input
              className="rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-white bg-[#1f1a14] hover:bg-[#2b241c] transition-colors"
            onClick={onClose}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
