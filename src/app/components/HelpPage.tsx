import { useMemo } from "react";

export function HelpPage() {
  const supportEmail = "info@novanuggets.com";
  const subject = useMemo(
    () => encodeURIComponent("ZAKI support request"),
    []
  );
  const body = useMemo(
    () =>
      encodeURIComponent(
        "Please describe the issue, what you expected, and what happened."
      ),
    []
  );

  return (
    <div className="min-h-full px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-zaki-subtle bg-white px-6 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] dark:bg-zaki-dark-card">
        <h1 className="text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
          Help & Support
        </h1>
        <p className="mt-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
          Need help with billing, access codes, onboarding, or chat quality.
        </p>

        <div className="mt-5 rounded-xl border border-zaki-subtle bg-zaki-hover/50 px-4 py-4 dark:bg-zaki-dark-bg/30">
          <div className="text-sm font-medium text-zaki-primary dark:text-zaki-dark-primary">
            Contact support
          </div>
          <a
            className="mt-1 inline-block text-sm text-zaki-brand hover:underline"
            href={`mailto:${supportEmail}?subject=${subject}&body=${body}`}
          >
            {supportEmail}
          </a>
          <p className="mt-2 text-xs text-zaki-muted">
            Include screenshots and exact error text for faster resolution.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-zaki-subtle px-4 py-4">
          <div className="text-sm font-medium text-zaki-primary dark:text-zaki-dark-primary">
            Common issues
          </div>
          <ul className="mt-2 space-y-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            <li>Access expired: open Pricing and redeem a fresh access code.</li>
            <li>Stream failed: confirm your session is valid and retry.</li>
            <li>Billing: use Settings → Plan & Billing to manage your subscription.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
