import { describe, expect, it, jest } from "@jest/globals";
import { compileSchedule, scheduleAgentFollowUp } from "./useAgentScheduledFollowUps";

jest.mock("@/lib/api", () => ({
  createAgentCron: jest.fn(),
}));

const createAgentCronMock = jest.requireMock("@/lib/api").createAgentCron as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  createAgentCronMock.mockResolvedValue({
    response: { ok: true, status: 201 },
    data: { status: "created", job: { id: "cron-1" } },
  });
});

describe("useAgentScheduledFollowUps", () => {
  it("compiles one-shot schedules into 5-field cron expressions", () => {
    const compiled = compileSchedule({
      kind: "at_datetime",
      date: new Date(2026, 4, 30, 9, 15, 0, 0),
    });

    expect(compiled).toEqual({
      expression: "15 9 30 5 *",
      oneShot: true,
      firesAt: new Date(2026, 4, 30, 9, 15, 0, 0),
    });
  });

  it("appends follow-ups through the single-job cron BFF route", async () => {
    await scheduleAgentFollowUp({
      schedule: { kind: "weekly", dow: 1, hour: 9, minute: 0 },
      prompt: " Check the weekly launch risks ",
      name: " Weekly launch scan ",
    });

    expect(createAgentCronMock).toHaveBeenCalledWith({
      expression: "0 9 * * 1",
      prompt: "Check the weekly launch risks",
      name: "Weekly launch scan",
      job_type: "agent",
      one_shot: false,
    });
    expect(Array.isArray(createAgentCronMock.mock.calls[0][0])).toBe(false);
  });

  it("fails fast when the cron BFF rejects the append", async () => {
    createAgentCronMock.mockResolvedValueOnce({
      response: { ok: false, status: 503 },
      data: { error: "state_unavailable" },
    });

    await expect(
      scheduleAgentFollowUp({
        schedule: { kind: "weekdays", hour: 9, minute: 0 },
        prompt: "Check production health",
      })
    ).rejects.toThrow("createAgentCron 503");
  });
});
