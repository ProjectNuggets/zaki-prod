import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  FileCheck2,
  FileText,
  ListChecks,
  Loader2,
  PanelRightOpen,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { HireLead, HireLeadStatus } from "@/lib/hireApi";
import { cn } from "@/lib/utils";
import { HireLeadDossier } from "./HireLeadDossier";
import {
  EmptyState,
  HireStatusChip,
  displayScore,
  hasGeneratedPackage,
  hostName,
  leadId,
  leadPrimarySignal,
  needsReviewLead,
  packageStateLabel,
  scoreTone,
} from "./hireUi";

export function HireTodayCommandCenter({
  leads,
  selectedLead,
  selectedLeadId,
  leadsLoading,
  profileSignals,
  generatedCount,
  dueFollowups,
  actionsDisabled,
  manualLeadText,
  manualLeadUrl,
  manualLeadPending,
  automationConsent,
  automationDisabled,
  automationBusy,
  onSelectLead,
  onManualText,
  onManualUrl,
  onManualSubmit,
  onStatusChange,
  onGenerate,
  onPipeline,
  onFollowup,
  onConsent,
  onReadForm,
  onPreview,
  onFire,
}: {
  leads: HireLead[];
  selectedLead: HireLead | null;
  selectedLeadId: string;
  leadsLoading: boolean;
  profileSignals: number;
  generatedCount: number;
  dueFollowups: number;
  actionsDisabled: boolean;
  manualLeadText: string;
  manualLeadUrl: string;
  manualLeadPending: boolean;
  automationConsent: boolean;
  automationDisabled: boolean;
  automationBusy: boolean;
  onSelectLead: (id: string) => void;
  onManualText: (value: string) => void;
  onManualUrl: (value: string) => void;
  onManualSubmit: () => void;
  onStatusChange: (id: string, status: HireLeadStatus) => void;
  onGenerate: (id: string) => void;
  onPipeline: (id: string) => void;
  onFollowup: (id: string) => void;
  onConsent: (value: boolean) => void;
  onReadForm: (id: string, url: string) => void;
  onPreview: (id: string) => void;
  onFire: (id: string) => void;
}) {
  const needsReview = leads.filter(needsReviewLead).length;
  const readyToApply = leads.filter(hasGeneratedPackage).length;
  const missingSignals = Math.max(0, 8 - profileSignals);

  return (
    <section className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(270px,0.58fr)_minmax(0,1.1fr)_minmax(340px,0.72fr)]">
      <TodayQueue
        leads={leads}
        selectedLeadId={selectedLeadId}
        isLoading={leadsLoading}
        needsReview={needsReview}
        readyToApply={readyToApply}
        missingSignals={missingSignals}
        dueFollowups={dueFollowups}
        onSelectLead={onSelectLead}
      />

      <div className="min-w-0 space-y-4">
        <NextActionPanel
          lead={selectedLead}
          generatedCount={generatedCount}
          missingSignals={missingSignals}
          onGenerate={onGenerate}
          disabled={actionsDisabled}
        />
        <HireLeadDossier
          lead={selectedLead}
          disabled={actionsDisabled}
          onStatusChange={onStatusChange}
          onGenerate={onGenerate}
          onPipeline={onPipeline}
          onFollowup={onFollowup}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <ManualLeadPanel
          text={manualLeadText}
          url={manualLeadUrl}
          isPending={manualLeadPending}
          disabled={actionsDisabled}
          onText={onManualText}
          onUrl={onManualUrl}
          onSubmit={onManualSubmit}
        />
        <AutomationPanel
          lead={selectedLead}
          consent={automationConsent}
          disabled={automationDisabled}
          serviceDisabled={actionsDisabled}
          busy={automationBusy}
          onConsent={onConsent}
          onReadForm={onReadForm}
          onPreview={onPreview}
          onFire={onFire}
        />
      </div>
    </section>
  );
}

function QueueStat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "zaki-hire-score-high"
      : tone === "warning"
        ? "zaki-hire-score-mid"
        : "zaki-hire-muted";
  return (
    <div className="zaki-hire-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="zaki-hire-label">{label}</span>
        <span className={cn("zaki-hire-icon-button size-7 border-0", toneClass)}>{icon}</span>
      </div>
      <div className="zaki-hire-num mt-2 text-2xl font-semibold leading-none">{value}</div>
    </div>
  );
}

function TodayQueue({
  leads,
  selectedLeadId,
  isLoading,
  needsReview,
  readyToApply,
  missingSignals,
  dueFollowups,
  onSelectLead,
}: {
  leads: HireLead[];
  selectedLeadId: string;
  isLoading: boolean;
  needsReview: number;
  readyToApply: number;
  missingSignals: number;
  dueFollowups: number;
  onSelectLead: (id: string) => void;
}) {
  return (
    <aside className="min-w-0 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <QueueStat label="Review" value={needsReview} icon={<ListChecks className="size-3.5" />} tone="warning" />
        <QueueStat label="Apply" value={readyToApply} icon={<FileCheck2 className="size-3.5" />} tone="success" />
        <QueueStat
          label="Follow up"
          value={dueFollowups}
          icon={<Clock3 className="size-3.5" />}
          tone={dueFollowups ? "warning" : "default"}
        />
        <QueueStat
          label="Profile gaps"
          value={missingSignals}
          icon={<Target className="size-3.5" />}
          tone={missingSignals ? "warning" : "success"}
        />
      </div>

      <div className="zaki-hire-panel">
        <div className="zaki-hire-rule border-b p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="zaki-hire-label-strong">Today</h2>
              <p className="zaki-hire-text mt-1 text-xs">
                Highest-signal opportunities and work needing attention.
              </p>
            </div>
            <PanelRightOpen className="zaki-hire-muted size-4 shrink-0" />
          </div>
        </div>
        <div className="max-h-[640px] overflow-y-auto p-2 zaki-scrollbar-fade">
          {isLoading ? (
            <div className="zaki-hire-text flex items-center gap-2 p-4 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading leads
            </div>
          ) : leads.length === 0 ? (
            <EmptyState title="No lead queue yet" body="Add a lead or run a scan to build today's work queue." />
          ) : (
            <div className="flex flex-col gap-2">
              {leads.slice(0, 18).map((lead) => {
                const id = leadId(lead);
                const active = id === selectedLeadId;
                return (
                  <button
                    key={id || `${lead.title}-${lead.company}`}
                    type="button"
                    onClick={() => onSelectLead(id)}
                    className={cn(
                      "zaki-hire-row-button w-full p-3 text-left",
                      active && "is-active",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="zaki-hire-num truncate text-sm font-semibold">
                          {lead.title || "Untitled role"}
                        </p>
                        <p className="zaki-hire-muted mt-1 truncate text-xs">
                          {lead.company || "Unknown company"} · {lead.location || lead.platform || "source"}
                        </p>
                      </div>
                      <span className={cn("shrink-0 text-lg font-semibold leading-none", scoreTone(lead.score))}>
                        {displayScore(lead.score)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <HireStatusChip status={String(lead.status || "discovered")} />
                      <span className="zaki-hire-muted truncate text-xs">{packageStateLabel(lead)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function NextActionPanel({
  lead,
  generatedCount,
  missingSignals,
  disabled,
  onGenerate,
}: {
  lead: HireLead | null;
  generatedCount: number;
  missingSignals: number;
  disabled: boolean;
  onGenerate: (id: string) => void;
}) {
  const id = leadId(lead);
  const needsPackage = Boolean(id && !hasGeneratedPackage(lead));
  const actionLabel = needsPackage ? "Generate package" : id ? "Review dossier" : "Add first lead";
  return (
    <section className="zaki-hire-panel p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="zaki-hire-label flex items-center gap-2">
            <Target className="size-4" style={{ color: "var(--v2-accent)" }} />
            Next best action
          </div>
          <p className="zaki-hire-title mt-2 text-base">{actionLabel}</p>
          <p className="zaki-hire-text mt-1 text-sm">
            {id
              ? `${packageStateLabel(lead)} · ${leadPrimarySignal(lead)}`
              : missingSignals > 0
                ? "Import profile evidence or add a job lead to activate matching."
                : "Run a scan or add a manual lead to start the queue."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="zaki-hire-sunken zaki-hire-muted px-3 py-2 text-xs font-semibold">
            {generatedCount} package{generatedCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            disabled={disabled || !id || !needsPackage}
            onClick={() => id && onGenerate(id)}
            className="zaki-hire-button zaki-hire-button-primary"
          >
            <ArrowRight className="size-4" />
            Prepare
          </button>
        </div>
      </div>
    </section>
  );
}

function ManualLeadPanel({
  text,
  url,
  isPending,
  disabled,
  onText,
  onUrl,
  onSubmit,
}: {
  text: string;
  url: string;
  isPending: boolean;
  disabled: boolean;
  onText: (value: string) => void;
  onUrl: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="zaki-hire-panel p-4">
      <h2 className="zaki-hire-label-strong">Add lead</h2>
      <div className="mt-3 space-y-3">
        <input
          value={url}
          onChange={(event) => onUrl(event.target.value)}
          className="zaki-hire-input w-full px-3 py-2"
          placeholder="Job URL"
        />
        <textarea
          value={text}
          onChange={(event) => onText(event.target.value)}
          className="zaki-hire-input min-h-28 w-full resize-y px-3 py-2"
          placeholder="Paste job text"
        />
        <button
          type="button"
          disabled={disabled || isPending || (!text.trim() && !url.trim())}
          className="zaki-hire-button zaki-hire-button-primary flex w-full"
          onClick={onSubmit}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <BriefcaseBusiness className="size-4" />}
          Add to pipeline
        </button>
      </div>
    </section>
  );
}

function AutomationPanel({
  lead,
  consent,
  disabled,
  serviceDisabled,
  busy,
  onConsent,
  onReadForm,
  onPreview,
  onFire,
}: {
  lead: HireLead | null;
  consent: boolean;
  disabled: boolean;
  serviceDisabled: boolean;
  busy: boolean;
  onConsent: (value: boolean) => void;
  onReadForm: (id: string, url: string) => void;
  onPreview: (id: string) => void;
  onFire: (id: string) => void;
}) {
  const id = leadId(lead);
  const destination = hostName(lead?.url);
  return (
    <section className="zaki-hire-panel-strong p-4">
      <div className="flex items-start gap-3">
        <span className="zaki-hire-icon-button size-8 shrink-0" style={{ color: "var(--v2-warn)" }}>
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="zaki-hire-label-strong">Apply safety lane</h2>
          <p className="zaki-hire-text mt-1 text-xs">
            Review extracted fields and approve this destination before ZAKI submits anything.
          </p>
          {destination ? (
            <p className="mt-1 truncate text-xs font-semibold" style={{ color: "var(--v2-warn)" }}>
              Destination: {destination}
            </p>
          ) : null}
        </div>
      </div>
      <label className="zaki-hire-sunken zaki-hire-text mt-3 flex items-start gap-3 p-3 text-xs">
        <input
          type="checkbox"
          checked={consent}
          disabled={serviceDisabled || !id}
          onChange={(event) => onConsent(event.target.checked)}
          className="mt-0.5 size-4 accent-[var(--v2-accent)]"
        />
        <span>I approve this lead-specific automation action for the selected job application.</span>
      </label>
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={disabled || busy || !lead?.url}
          className="zaki-hire-button flex w-full"
          onClick={() => onReadForm(id, lead?.url || "")}
        >
          <FileText className="size-4" />
          Read form
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          className="zaki-hire-button flex w-full"
          onClick={() => onPreview(id)}
        >
          <Search className="size-4" />
          Preview apply
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          className="zaki-hire-button zaki-hire-button-primary flex w-full"
          onClick={() => onFire(id)}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Auto-apply
        </button>
      </div>
    </section>
  );
}
