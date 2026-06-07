import { CheckCircle2, Clock3, Download, ExternalLink, FileText, Sparkles, Target, Wand2 } from "lucide-react";
import type { HireLead, HireLeadStatus } from "@/lib/hireApi";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  HireStatusChip,
  LEAD_STATUSES,
  displayScore,
  hostName,
  isPositiveLeadStatus,
  leadId,
  scoreTone,
  shortDate,
} from "./hireUi";

export function HireLeadDossier({
  lead,
  disabled,
  onStatusChange,
  onGenerate,
  onPipeline,
  onFollowup,
}: {
  lead: HireLead | null;
  disabled: boolean;
  onStatusChange: (id: string, status: HireLeadStatus) => void;
  onGenerate: (id: string) => void;
  onPipeline: (id: string) => void;
  onFollowup: (id: string) => void;
}) {
  const id = leadId(lead);
  if (!lead || !id) {
    return (
      <div className="zaki-hire-panel p-4">
        <EmptyState title="Select a lead" body="Lead details, generated assets, and actions appear here." />
      </div>
    );
  }
  const destination = hostName(lead.url);
  const positive = isPositiveLeadStatus(String(lead.status || ""));
  return (
    <article className="zaki-hire-panel">
      <div className="zaki-hire-rule border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="zaki-hire-status zaki-hire-status-muted">
                <FileText className="size-3.5" />
                Opportunity dossier
              </span>
              <HireStatusChip status={String(lead.status || "discovered")} />
              <span className="zaki-hire-muted text-xs">{id}</span>
            </div>
            <h2 className="zaki-hire-title mt-2">
              {lead.title || "Untitled role"}
            </h2>
            <p className="zaki-hire-text mt-1">
              {lead.company || "Unknown company"} · {lead.location || "Location not listed"}
            </p>
            {destination ? (
              <p className="zaki-hire-muted mt-1 text-xs">Destination: {destination}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="zaki-hire-sunken px-3 py-2 text-right">
              <div className={cn("text-3xl font-semibold leading-none", scoreTone(lead.score))}>
                {displayScore(lead.score)}
              </div>
              <div className="zaki-hire-muted text-xs">fit score</div>
            </div>
            {lead.url ? (
              <a
                href={lead.url}
                target="_blank"
                rel="noreferrer"
                className="zaki-hire-icon-button size-9"
                aria-label="Open job"
              >
                <ExternalLink className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-4">
          <section className="zaki-hire-sunken p-3">
            <div className="flex items-center gap-2">
              {positive ? <CheckCircle2 className="zaki-hire-score-high size-4" /> : <Target className="size-4" style={{ color: "var(--v2-accent)" }} />}
              <h3 className="zaki-hire-label-strong">Fit summary</h3>
            </div>
            <p className="zaki-hire-text mt-2">
              {lead.reason || lead.signal_reason || "No scoring explanation was returned yet."}
            </p>
          </section>
          <TwoColumnList title="Evidence map" items={lead.match_points || []} empty="No match points yet." />
          <TwoColumnList title="Gaps to handle" items={lead.gaps || []} empty="No gaps reported." />
          <section>
            <h3 className="zaki-hire-label-strong">Role brief</h3>
            <p className="zaki-hire-sunken zaki-hire-text mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap p-3 zaki-scrollbar-fade">
              {lead.description || lead.text || "No description available."}
            </p>
          </section>
        </div>
        <aside className="space-y-3">
          <label className="block">
            <span className="zaki-hire-label">
              Status
            </span>
            <select
              value={String(lead.status || "discovered")}
              disabled={disabled}
              onChange={(event) => onStatusChange(id, event.target.value as HireLeadStatus)}
              className="zaki-hire-select mt-1 w-full px-3 py-2"
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={disabled}
            className="zaki-hire-button zaki-hire-button-primary flex w-full"
            onClick={() => onGenerate(id)}
          >
            <Sparkles className="size-4" />
            Generate package
          </button>
          <button
            type="button"
            disabled={disabled}
            className="zaki-hire-button flex w-full"
            onClick={() => onPipeline(id)}
          >
            <Wand2 className="size-4" />
            Run pipeline
          </button>
          <button
            type="button"
            disabled={disabled}
            className="zaki-hire-button flex w-full"
            onClick={() => onFollowup(id)}
          >
            <Clock3 className="size-4" />
            Follow up in 5 days
          </button>
          <div className="zaki-hire-sunken zaki-hire-text p-3 text-xs">
            <div className="zaki-hire-label-strong flex items-center gap-2">
              <Download className="size-3.5" />
              Package studio
            </div>
            <div className="mt-2 space-y-1">
              <div>Resume: {lead.resume_asset || lead.asset || "Not generated"}</div>
              <div>Cover letter: {lead.cover_letter_asset || "Not generated"}</div>
              <div>Follow-up: {shortDate(lead.followup_due_at)}</div>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function TwoColumnList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section>
      <h3 className="zaki-hire-label-strong">{title}</h3>
      {items.length ? (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {items.slice(0, 8).map((item) => (
            <li
              key={item}
              className="zaki-hire-sunken zaki-hire-text px-3 py-2"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="zaki-hire-text mt-2">{empty}</p>
      )}
    </section>
  );
}
