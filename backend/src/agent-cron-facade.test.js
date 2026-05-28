import { describe, expect, it } from "@jest/globals";
import {
  appendAgentCronJob,
  applyAgentCronPatch,
  ensureAgentCronJobIds,
  getAgentCronJobId,
  isAgentCronJobIdSafe,
  normalizeAgentCronJobsPayload,
  removeAgentCronJob,
} from "./agent-cron-facade.js";

describe("agent cron facade helpers", () => {
  it("normalizes array and object cron payloads without mutating jobs", () => {
    const jobs = normalizeAgentCronJobsPayload({
      jobs: [{ id: "job-1", prompt: "Run" }, null, "bad"],
    });
    expect(jobs).toEqual([{ id: "job-1", prompt: "Run" }]);
    jobs[0].prompt = "Changed";
    expect(normalizeAgentCronJobsPayload([{ id: "job-1", prompt: "Run" }])[0].prompt).toBe("Run");
  });

  it("generates stable ids for UI-created jobs that do not have one", () => {
    const jobs = ensureAgentCronJobIds(
      [{ prompt: "No id" }, { id: "existing", prompt: "Existing" }],
      { now: () => 1779988800000, random: () => 0.25 }
    );

    expect(jobs[0].id).toMatch(/^zaki-ui-/);
    expect(jobs[1].id).toBe("existing");
  });

  it("materializes alias ids as canonical id for frontend rows", () => {
    expect(ensureAgentCronJobIds([{ job_id: "snake-id" }])).toEqual([
      { job_id: "snake-id", id: "snake-id" },
    ]);
    expect(ensureAgentCronJobIds([{ jobId: "camel-id" }])).toEqual([
      { jobId: "camel-id", id: "camel-id" },
    ]);
  });

  it("appends a single create payload and returns the canonical created job", () => {
    const { jobs, job } = appendAgentCronJob(
      [{ id: "job-1", prompt: "Existing" }],
      { expression: "0 5 * * *", prompt: "New" },
      { now: () => 1779988800000, random: () => 0.5 }
    );

    expect(jobs).toHaveLength(2);
    expect(job).toMatchObject({ prompt: "New" });
    expect(getAgentCronJobId(job)).toMatch(/^zaki-ui-/);
  });

  it("patches only the matching job and preserves its canonical id", () => {
    const { found, jobs, job } = applyAgentCronPatch(
      [
        { id: "job-1", prompt: "Existing" },
        { id: "job-2", prompt: "Other" },
      ],
      "job-1",
      { id: "attempted-change", prompt: "Updated", paused: true }
    );

    expect(found).toBe(true);
    expect(job).toMatchObject({ id: "job-1", prompt: "Updated", paused: true });
    expect(jobs.find((item) => item.id === "job-2")).toMatchObject({ prompt: "Other" });
  });

  it("removes matching jobs idempotently", () => {
    expect(removeAgentCronJob([{ id: "job-1" }], "job-1")).toEqual({
      found: true,
      jobs: [],
    });
    expect(removeAgentCronJob([{ id: "job-1" }], "missing")).toEqual({
      found: false,
      jobs: [{ id: "job-1" }],
    });
  });

  it("validates route ids without allowing path separators", () => {
    expect(isAgentCronJobIdSafe("job:one-2")).toBe(true);
    expect(isAgentCronJobIdSafe("job/one")).toBe(false);
    expect(isAgentCronJobIdSafe("")).toBe(false);
  });
});
