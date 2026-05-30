import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CronManagementSheet } from "./CronManagementSheet";

jest.mock("@/lib/api", () => ({
  createAgentCron: jest.fn(),
  deleteAgentCron: jest.fn(),
  listAgentCron: jest.fn(),
  updateAgentCron: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const createAgentCronMock = jest.requireMock("@/lib/api").createAgentCron as jest.Mock;
const deleteAgentCronMock = jest.requireMock("@/lib/api").deleteAgentCron as jest.Mock;
const listAgentCronMock = jest.requireMock("@/lib/api").listAgentCron as jest.Mock;
const updateAgentCronMock = jest.requireMock("@/lib/api").updateAgentCron as jest.Mock;

const baseJob = {
  id: "cron-1",
  expression: "0 9 * * *",
  name: "Morning scan",
  prompt: "Check the launch queue",
  command: "",
  job_type: "agent",
  paused: false,
  enabled: true,
  one_shot: false,
  next_run_secs: 1_770_000_000,
  last_run_secs: null,
  last_status: "ok",
  last_output: null,
  consecutive_failures: 0,
  created_at_s: 1_760_000_000,
};

beforeEach(() => {
  jest.clearAllMocks();
  listAgentCronMock.mockResolvedValue({
    response: { ok: true },
    data: { jobs: [baseJob] },
  });
  createAgentCronMock.mockResolvedValue({
    response: { ok: true },
    data: {
      status: "created",
      job: {
        ...baseJob,
        id: "cron-created",
        expression: "0 12 * * *",
        name: "Noon scan",
        prompt: "Check noon status",
      },
    },
  });
  updateAgentCronMock.mockResolvedValue({
    response: { ok: true },
    data: { status: "updated", job: { ...baseJob, paused: true } },
  });
  deleteAgentCronMock.mockResolvedValue({
    response: { ok: true },
    data: { ok: true, deleted: true },
  });
});

describe("CronManagementSheet", () => {
  it("creates cron jobs through the single-job BFF route", async () => {
    await act(async () => {
      render(<CronManagementSheet isOpen onClose={() => {}} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Morning scan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("New cron job"));
    fireEvent.change(screen.getByPlaceholderText("Name (optional)"), {
      target: { value: "Noon scan" },
    });
    fireEvent.change(screen.getByPlaceholderText("Cron expression (e.g. 0 */6 * * *)"), {
      target: { value: "0 12 * * *" },
    });
    fireEvent.change(screen.getByPlaceholderText("Agent prompt. What should ZAKI do?"), {
      target: { value: "Check noon status" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create" }));
    });

    await waitFor(() => {
      expect(createAgentCronMock).toHaveBeenCalledWith({
        expression: "0 12 * * *",
        prompt: "Check noon status",
        name: "Noon scan",
        job_type: "agent",
      });
    });
    expect(Array.isArray(createAgentCronMock.mock.calls[0][0])).toBe(false);
  });

  it("patches pause and edit actions through per-job BFF routes", async () => {
    await act(async () => {
      render(<CronManagementSheet isOpen onClose={() => {}} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Morning scan")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Pause cron job"));
    });

    await waitFor(() => {
      expect(updateAgentCronMock).toHaveBeenCalledWith("cron-1", { paused: true });
    });

    updateAgentCronMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        status: "updated",
        job: {
          ...baseJob,
          expression: "30 8 * * 1-5",
          name: "Weekday scan",
          prompt: "Check weekday queue",
        },
      },
    });

    fireEvent.click(screen.getByLabelText("Edit cron job"));
    fireEvent.change(screen.getByPlaceholderText("Name (optional)"), {
      target: { value: "Weekday scan" },
    });
    fireEvent.change(screen.getByPlaceholderText("Cron expression (e.g. 0 */6 * * *)"), {
      target: { value: "30 8 * * 1-5" },
    });
    fireEvent.change(screen.getByPlaceholderText("Agent prompt. What should ZAKI do?"), {
      target: { value: "Check weekday queue" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Update" }));
    });

    await waitFor(() => {
      expect(updateAgentCronMock).toHaveBeenCalledWith("cron-1", {
        expression: "30 8 * * 1-5",
        prompt: "Check weekday queue",
        name: "Weekday scan",
      });
    });
  });

  it("deletes cron jobs through the per-job BFF route", async () => {
    await act(async () => {
      render(<CronManagementSheet isOpen onClose={() => {}} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Morning scan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Delete cron job"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    await waitFor(() => {
      expect(deleteAgentCronMock).toHaveBeenCalledWith("cron-1");
    });
    expect(screen.queryByText("Morning scan")).not.toBeInTheDocument();
  });
});
