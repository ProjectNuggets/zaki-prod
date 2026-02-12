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
      <div ref={modalRef} className="relative w-[460px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-zaki-primary">Profile</div>
            <div className="text-xs text-zaki-disabled">Update your display name and photo</div>
          </div>
          <button
            type="button"
            className="size-8 rounded-full bg-zaki-elevated text-zaki-secondary hover:bg-zaki-active transition-colors"
            onClick={onClose}
            aria-label="Close profile editor"
          >
            <span className="block text-lg leading-none">×</span>
          </button>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="size-16 rounded-full bg-zaki-elevated flex items-center justify-center text-zaki-primary font-semibold text-lg overflow-hidden">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <label className="text-sm text-zaki-secondary cursor-pointer">
            <span className="underline hover:text-zaki-primary">Upload new photo</span>
            <input type="file" className="hidden" accept="image/*" />
          </label>
        </div>
        <div className="mt-5">
          <label className="flex flex-col gap-1 text-xs text-zaki-muted">
            Display name
            <input
              className="rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="zaki-btn zaki-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="zaki-btn bg-zaki-primary text-white hover:bg-zaki-active transition-colors"
            onClick={onClose}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
