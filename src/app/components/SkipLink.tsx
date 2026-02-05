/**
 * Skip Link - Accessibility component for keyboard navigation
 * 
 * Allows keyboard users to skip directly to main content.
 * Only visible when focused (pressing Tab from page load).
 */

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[100]
        bg-zaki-brand text-white
        px-4 py-2 rounded-zaki-md
        font-medium text-sm
        focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zaki-brand
        transition-all duration-200
      "
    >
      Skip to main content
    </a>
  );
}
