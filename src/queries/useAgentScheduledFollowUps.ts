// 2026-05-08 — Schedule-a-follow-up helper for the composer.
//
// The cron API (POST /api/agent/cron) is a full-array replace — there
// is no per-job append endpoint. So adding one job means: list current
// jobs, push the new one, POST the whole array back. Mutations are
// guarded by an in-memory mutex so concurrent calls (e.g. two clicks)
// don't race the read-modify-write.
//
// One-time vs recurring:
//   • For "in N hours" / "at YYYY-MM-DD HH:MM" we send one_shot=true so
//     nullalis disables the job after a single fire.
//   • For "every weekday at 09:00" / "daily 09:00" we send a normal
//     recurring expression with one_shot=false (default).
//
// `0 9 * * *` is the canonical 5-field cron expression (minute hour
// dom month dow). All cron parsers in the nullalis runtime use this
// format. See CronManagementSheet for the existing read-modify-write
// pattern this module follows.

import { listAgentCron, createAgentCron } from "@/lib/api";

export type FollowUpJob = {
  id?: string;
  expression: string;
  name?: string | null;
  prompt?: string | null;
  command?: string;
  job_type?: string;
  paused?: boolean;
  enabled?: boolean;
  one_shot?: boolean;
  next_run_secs?: number | null;
  last_run_secs?: number | null;
  last_status?: string | null;
};

export type FollowUpSchedule =
  | { kind: "in_minutes"; minutes: number } // 30, 60, 240 etc.
  | { kind: "at_datetime"; date: Date } // explicit one-shot
  | { kind: "weekdays"; hour: number; minute: number } // Mon-Fri
  | { kind: "weekly"; dow: number; hour: number; minute: number }; // 0=Sun

/** Build a 5-field cron expression for a one-shot at the given Date. */
export function cronForOneShotDate(date: Date): string {
  const m = date.getMinutes();
  const h = date.getHours();
  const dom = date.getDate();
  const mon = date.getMonth() + 1; // cron months are 1-12
  return `${m} ${h} ${dom} ${mon} *`;
}

/** Translate a FollowUpSchedule into the cron expression + one_shot flag. */
export function compileSchedule(
  schedule: FollowUpSchedule,
): { expression: string; oneShot: boolean; firesAt: Date | null } {
  switch (schedule.kind) {
    case "in_minutes": {
      const target = new Date(Date.now() + schedule.minutes * 60_000);
      return {
        expression: cronForOneShotDate(target),
        oneShot: true,
        firesAt: target,
      };
    }
    case "at_datetime":
      return {
        expression: cronForOneShotDate(schedule.date),
        oneShot: true,
        firesAt: schedule.date,
      };
    case "weekdays":
      return {
        expression: `${schedule.minute} ${schedule.hour} * * 1-5`,
        oneShot: false,
        firesAt: null,
      };
    case "weekly":
      return {
        expression: `${schedule.minute} ${schedule.hour} * * ${schedule.dow}`,
        oneShot: false,
        firesAt: null,
      };
  }
}

let mutationLock: Promise<unknown> | null = null;

async function readCurrentJobs(): Promise<FollowUpJob[]> {
  const { data } = await listAgentCron();
  const raw =
    (data as { jobs?: FollowUpJob[] })?.jobs ??
    (Array.isArray(data) ? (data as FollowUpJob[]) : []);
  return raw;
}

/**
 * Append a follow-up job. Performs a serialized read-modify-write so
 * two concurrent calls don't clobber each other (the API replaces the
 * whole array). Resolves with the compiled job entry.
 */
export async function scheduleAgentFollowUp(input: {
  schedule: FollowUpSchedule;
  prompt: string;
  name?: string | null;
}): Promise<{ expression: string; oneShot: boolean; firesAt: Date | null }> {
  const trimmedPrompt = input.prompt.trim();
  if (!trimmedPrompt) throw new Error("prompt is required");
  const compiled = compileSchedule(input.schedule);

  const run = async () => {
    const current = await readCurrentJobs();
    const next: FollowUpJob = {
      expression: compiled.expression,
      prompt: trimmedPrompt,
      name: input.name?.trim() || null,
      job_type: "agent",
      one_shot: compiled.oneShot,
    };
    const updated = [...current, next];
    const { response } = await createAgentCron(updated as unknown[]);
    if (!response.ok) {
      throw new Error(`createAgentCron ${response.status}`);
    }
  };

  // Chain onto any in-flight mutation to serialize R-M-W.
  const previous = mutationLock ?? Promise.resolve();
  const next = previous.then(run, run);
  mutationLock = next.finally(() => {
    if (mutationLock === next) mutationLock = null;
  });
  await next;
  return compiled;
}
