import { useMemo } from "react";
import { CircleAlert, LifeBuoy, ShieldCheck, Wallet } from "lucide-react";

const FAQ_ITEMS = [
  {
    key: "access",
    title: "Access code says expired",
    body: "Open Pricing, redeem a fresh code, then refresh the chat view. If it still fails, contact support with your account email and code campaign.",
  },
  {
    key: "stream",
    title: "Chat stream failed or stopped",
    body: "Check connection stability, then retry from the same thread. If failures repeat, include timestamp, workspace/thread, and any request reference shown in the error toast.",
  },
  {
    key: "billing",
    title: "Subscription and billing controls",
    body: "Use Settings → Plan & Billing to manage plan changes, cancellation, and account lifecycle controls. Billing portal availability depends on deployment configuration.",
  },
  {
    key: "memory",
    title: "Memory not visible or conflict not clear",
    body: "Open Memory from profile, review pending items, and resolve conflicts. If a memory toast appears but the item is missing, report the exact prompt and timestamp.",
  },
];

export function HelpPage() {
  const supportEmail = "info@novanuggets.com";
  const subject = useMemo(() => encodeURIComponent("ZAKI support request"), []);
  const body = useMemo(
    () =>
      encodeURIComponent(
        [
          "Issue summary:",
          "Workspace/thread:",
          "Expected result:",
          "Actual result:",
          "Timestamp + timezone:",
          "Screenshots / network details:",
        ].join("\n")
      ),
    []
  );

  return (
    <div className="h-full overflow-y-auto zaki-scrollbar-fade px-6 py-10" dir="ltr" lang="en">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="rounded-[26px] border border-zaki-subtle bg-[linear-gradient(145deg,#fffdf9_0%,#fff7ed_62%,#f5e8d8_100%)] px-6 py-6 shadow-[0px_24px_56px_rgba(15,15,15,0.08)] dark:border-[#2a2018] dark:bg-[linear-gradient(150deg,#1a140f_0%,#130f0c_58%,#0f0b08_100%)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:border-[#2a2018] dark:bg-[#1d1712] dark:text-zaki-dark-muted">
            <LifeBuoy className="size-3.5" />
            Support
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            Need help?
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            Fast paths for access, billing, memory, and stream reliability. Use this page before launch issues escalate.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zaki-subtle bg-white px-4 py-4 dark:border-[#2a2018] dark:bg-[#15110d]">
            <div className="inline-flex size-9 items-center justify-center rounded-xl bg-zaki-hover text-zaki-brand dark:bg-[#21170f]">
              <CircleAlert className="size-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">Incident report</p>
            <p className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              Include exact error text, affected workspace/thread, and time.
            </p>
          </div>
          <div className="rounded-2xl border border-zaki-subtle bg-white px-4 py-4 dark:border-[#2a2018] dark:bg-[#15110d]">
            <div className="inline-flex size-9 items-center justify-center rounded-xl bg-zaki-hover text-zaki-accent dark:bg-[#132019]">
              <Wallet className="size-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">Billing and access</p>
            <p className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              Plan state and access-code entitlements can differ by account lifecycle.
            </p>
          </div>
          <div className="rounded-2xl border border-zaki-subtle bg-white px-4 py-4 dark:border-[#2a2018] dark:bg-[#15110d]">
            <div className="inline-flex size-9 items-center justify-center rounded-xl bg-zaki-hover text-zaki-secondary dark:bg-[#221a13]">
              <ShieldCheck className="size-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">Security/compliance</p>
            <p className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              Privacy and legal requests are handled via the compliance contact channel.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zaki-subtle bg-white px-5 py-5 dark:border-[#2a2018] dark:bg-[#15110d]">
          <h2 className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">FAQs</h2>
          <div className="mt-4 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-zaki-subtle bg-zaki-base/70 px-4 py-3 dark:border-[#2a2018] dark:bg-[#1b1511]"
              >
                <p className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">{item.title}</p>
                <p className="mt-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zaki-subtle bg-white px-5 py-5 dark:border-[#2a2018] dark:bg-[#15110d]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted">
            Contact support
          </h2>
          <p className="mt-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            For launch blockers or account incidents, email support with diagnostic details.
          </p>
          <a
            className="mt-3 inline-flex items-center rounded-full border border-zaki-subtle bg-zaki-hover px-4 py-2 text-sm font-semibold text-zaki-primary hover:bg-zaki-elevated dark:border-[#2a2018] dark:bg-[#201812] dark:text-zaki-dark-primary dark:hover:bg-[#271d16]"
            href={`mailto:${supportEmail}?subject=${subject}&body=${body}`}
          >
            {supportEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
