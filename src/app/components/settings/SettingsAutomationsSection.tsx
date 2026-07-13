import { useQuery } from "@tanstack/react-query";

import { listAgentJobs, type AgentJob } from "@/lib/api";
import { V2Badge, V2Button } from "@/app/components/v2";

import { V2SettingsBlock, V2SettingsRow } from "./V2SettingsPrimitives";

function jobText(job: AgentJob, ...keys: string[]) {
  const record = job as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function jobTimestamp(job: AgentJob) {
  const record = job as Record<string, unknown>;
  const raw =
    record.next_run_at ?? record.nextRunAt ?? record.next_run_secs ?? record.nextRunSecs ?? null;
  if (raw == null) return null;
  const numeric = typeof raw === "number" ? raw : Number(raw);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

function automationKind(job: AgentJob) {
  const haystack = [
    jobText(job, "command", "prompt"),
    jobText(job, "name", "title", "label"),
    jobText(job, "id", "job_id", "jobId"),
  ]
    .join(" ")
    .toLowerCase();
  if (/(^|\W)dream(\W|$)/.test(haystack)) return "Dream reflection";
  if (/(^|\W)mine(\W|$)/.test(haystack)) return "Learning miner";
  return jobText(job, "name", "title", "label", "prompt", "command") || "Scheduled task";
}

function isJobEnabled(job: AgentJob) {
  const record = job as Record<string, unknown>;
  return record.enabled !== false && record.paused !== true;
}

export function SettingsAutomationsSection() {
  const jobsQuery = useQuery({
    queryKey: ["agent", "jobs"],
    queryFn: async () => {
      const { response, data } = await listAgentJobs({ redirectOnAuthFailure: false });
      if (!response.ok) throw new Error("automations_unavailable");
      return data?.jobs ?? data?.items ?? [];
    },
    staleTime: 30_000,
  });
  const jobs = jobsQuery.data ?? [];

  return (
    <V2SettingsBlock
      id="settings-automations"
      data-testid="settings-automations"
      title="Automations"
      meta={jobs.length > 0 ? `${jobs.length} scheduled` : undefined}
    >
      {jobsQuery.isLoading ? (
        <V2SettingsRow name="Loading automations…" />
      ) : jobsQuery.isError ? (
        <V2SettingsRow
          name="Automations are unavailable"
          description="ZAKI couldn't load scheduled work right now."
        >
          <V2Button variant="ghost" size="sm" onClick={() => void jobsQuery.refetch()}>
            Retry
          </V2Button>
        </V2SettingsRow>
      ) : jobs.length === 0 ? (
        <V2SettingsRow
          name="No automations scheduled"
          description="Dream reflection, the learning miner, and tasks you schedule with ZAKI will appear here."
        />
      ) : (
        jobs.map((job, index) => {
          const nextRun = jobTimestamp(job);
          const enabled = isJobEnabled(job);
          const id = jobText(job, "id", "job_id", "jobId") || `automation-${index}`;
          return (
            <V2SettingsRow
              key={id}
              name={automationKind(job)}
              description={
                nextRun
                  ? `Next run ${nextRun.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                  : enabled
                    ? "Next run is being scheduled."
                    : "Paused"
              }
            >
              <V2Badge tone={enabled ? "success" : "default"}>{enabled ? "Active" : "Paused"}</V2Badge>
            </V2SettingsRow>
          );
        })
      )}
    </V2SettingsBlock>
  );
}
