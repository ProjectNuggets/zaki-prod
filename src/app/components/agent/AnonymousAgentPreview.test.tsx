import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AnonymousAgentPreview } from "./AnonymousAgentPreview";
import { requestAnonymousAgentPreview } from "@/lib/api";
import { readAnonymousWorkLedger } from "@/lib/anonymousWork";
import { PENDING_INTENT_KEY, readPendingIntent } from "@/lib/pendingIntent";

/**
 * WP-F — the anonymous Agent surface (spec F7).
 *
 * What these tests hold in place:
 *   (a) an anon submits a prompt and gets a PLAN, framed as a preview — nothing is run;
 *   (b) the shared anon DAILY counter is what shows and what bites, and at the cap the visitor
 *       gets #91's real limit state with "Sign in to keep going" — never a toast;
 *   (c) "Save and continue" writes the intent + ledger in the shape #89's claim imports;
 *       failures speak #91's taxonomy, never a raw code.
 */

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom") as Record<string, unknown>;
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock("@/lib/api", () => ({
  requestAnonymousAgentPreview: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    // Render the English defaultValue, which is what ships. A missing defaultValue would
    // surface here as an empty string rather than silently passing.
    t: (_key: string, options?: Record<string, unknown>) => {
      const value = String(options?.defaultValue ?? "");
      return value
        .replace("{{remaining}}", String(options?.remaining ?? ""))
        .replace("{{limit}}", String(options?.limit ?? ""));
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

const previewMock = requestAnonymousAgentPreview as unknown as jest.Mock;

const PLAN_OK = {
  response: { ok: true, status: 200 },
  data: {
    success: true,
    preview: true,
    executed: false,
    prompt: "Research our top 3 competitors",
    plan: { steps: ["Identify the competitors", "Pull their pricing pages", "Summarise the deltas"] },
    planMarkdown:
      "**Agent plan (preview)**\n\nTask: Research our top 3 competitors\n\n1. Identify the competitors\n2. Pull their pricing pages\n3. Summarise the deltas\n\n_This plan was previewed while signed out. Nothing was run._",
    quota: { remaining: 7, limit: 10, used: 3, resetAt: "2026-07-15T00:00:00.000Z", period: "day" },
  },
};

/** The backend's 429 at the anon daily cap — the code PaywallCard maps to `limit_reached`. */
const AT_THE_CAP = {
  response: { ok: false, status: 429 },
  data: {
    code: "daily_limit_reached",
    error: "You reached today's limit. Free usage resets daily.",
    message: "You reached today's limit. Free usage resets daily.",
    limit: 10,
    remaining: 0,
    resetAt: "2026-07-15T00:00:00.000Z",
    period: "day",
  },
};

function renderPreview() {
  return render(
    <MemoryRouter>
      <AnonymousAgentPreview />
    </MemoryRouter>
  );
}

async function submitTask(task = "Research our top 3 competitors") {
  fireEvent.change(screen.getByLabelText("Describe the task"), { target: { value: task } });
  fireEvent.click(screen.getByRole("button", { name: "Preview the plan" }));
}

describe("AnonymousAgentPreview — a plan, not a run (F7)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    previewMock.mockResolvedValue(PLAN_OK);
  });

  // (a) The anon gets a PLAN. The tool path is never invoked — the only call this surface can
  //     make is to the tool-less preview endpoint.
  it("renders the proposed plan and calls ONLY the preview endpoint", async () => {
    renderPreview();
    await submitTask();

    expect(await screen.findByTestId("anon-agent-plan-card")).toBeInTheDocument();

    const steps = screen.getAllByTestId("anon-agent-plan-step");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Identify the competitors");
    expect(steps[2]).toHaveTextContent("Summarise the deltas");

    // The ONE network call this surface is capable of making.
    expect(previewMock).toHaveBeenCalledTimes(1);
    expect(previewMock).toHaveBeenCalledWith("Research our top 3 competitors");
  });

  // The framing is load-bearing: a plan that reads like a completed run is a lie.
  it("frames the plan unmistakably as a preview that ran nothing", async () => {
    renderPreview();
    await submitTask();

    const badge = await screen.findByTestId("anon-agent-plan-badge");
    expect(badge).toHaveTextContent("Preview — nothing has been run");
  });

  it("does not render a plan card before anything is submitted", () => {
    renderPreview();
    expect(screen.queryByTestId("anon-agent-plan-card")).not.toBeInTheDocument();
    expect(previewMock).not.toHaveBeenCalled();
  });

  // A dashboard hand-off carries the typed task across the navigation.
  it("picks up the prompt a dashboard hand-off left in the pending intent", () => {
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "agent",
        taskKind: "plan",
        prompt: "Plan the cutover checklist",
        source: "dashboard",
        returnTo: "/agent",
        anonymousWorkId: null,
        createdAt: new Date().toISOString(),
      })
    );

    renderPreview();
    expect(screen.getByLabelText("Describe the task")).toHaveValue("Plan the cutover checklist");
  });
});

describe("AnonymousAgentPreview — the shared anon daily meter (WP-B/WP-C)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    previewMock.mockResolvedValue(PLAN_OK);
  });

  // (b) The counter the backend just decremented is the counter the visitor sees.
  it("shows the remaining anon DAILY allowance the preview just consumed", async () => {
    renderPreview();
    await submitTask();

    const meter = await screen.findByTestId("anon-agent-preview-meter");
    expect(meter).toHaveTextContent("7 of 10 free chats left today");
    expect(meter).toHaveAttribute("data-remaining", "7");
    expect(meter).toHaveAttribute("data-limit", "10");
  });

  // (b) At the cap: #91's LIMIT STATE, with the anonymous CTA. Not a toast.
  it("renders the limit state with 'Sign in to keep going' at the cap", async () => {
    previewMock.mockResolvedValue(AT_THE_CAP);
    renderPreview();
    await submitTask();

    const limitState = await screen.findByTestId("zaki-limit-state");
    expect(limitState).toBeInTheDocument();
    // The anonymous variant — a visitor with no wallet has nothing to upgrade.
    expect(limitState).toHaveAttribute("data-identity", "anon");

    // The one door forward.
    const cta = screen.getByRole("button", { name: "Sign in to keep going" });
    expect(cta).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upgrade/i })).not.toBeInTheDocument();

    // It names the limit and shows a REAL reset instant.
    expect(screen.getByTestId("zaki-limit-usage")).toHaveTextContent("10 of 10 free chats used today");
    expect(screen.getByTestId("zaki-limit-reset")).toHaveAttribute("data-reset", expect.stringContaining("Jul"));

    // The typed task is preserved, not silently dropped behind the wall.
    expect(screen.getByTestId("zaki-limit-preserved")).toBeInTheDocument();
    expect(screen.getByLabelText("Describe the task")).toHaveValue("Research our top 3 competitors");

    // No plan card at the cap: nothing was generated, so nothing is claimed to have been.
    expect(screen.queryByTestId("anon-agent-plan-card")).not.toBeInTheDocument();

    fireEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith("/?auth=login&next=%2Fagent");
  });
});

describe("AnonymousAgentPreview — Save and continue hands off to the #89 claim", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    previewMock.mockResolvedValue(PLAN_OK);
  });

  // (c) The handoff. The ledger row must be IMPORTABLE — a prompt AND the plan as the reply,
  //     status "succeeded". A draft here would import nothing and the plan would be lost at
  //     exactly the moment we promised to keep it.
  it("writes an importable ledger row + pending intent, then routes to auth", async () => {
    renderPreview();
    await submitTask();
    await screen.findByTestId("anon-agent-plan-card");

    fireEvent.click(screen.getByTestId("anon-agent-save-continue"));

    const items = readAnonymousWorkLedger().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: "agent",
      taskKind: "plan",
      prompt: "Research our top 3 competitors",
      route: "/agent",
      // NOT "draft" — this is a real result, and #89 imports results.
      status: "succeeded",
    });
    // The plan text itself rides along: this is what the claim writes as the assistant turn.
    expect(items[0]!.reply).toContain("Identify the competitors");
    expect(items[0]!.reply).toContain("Summarise the deltas");

    const intent = readPendingIntent();
    expect(intent).toMatchObject({
      productId: "agent",
      taskKind: "plan",
      prompt: "Research our top 3 competitors",
      returnTo: "/agent",
      anonymousWorkId: items[0]!.id,
    });

    expect(mockNavigate).toHaveBeenCalledWith("/?auth=signup&next=%2Fagent");
  });
});

describe("AnonymousAgentPreview — failures speak the #91 taxonomy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders human copy with ONE recovery action, never a machine code", async () => {
    previewMock.mockResolvedValue({
      response: { ok: false, status: 502 },
      data: { success: false, code: "model_overload" },
    });

    renderPreview();
    await submitTask();

    const error = await screen.findByTestId("anon-agent-preview-error");
    expect(error).toHaveTextContent("The model is busy");
    // The machine code never reaches the DOM.
    expect(error).not.toHaveTextContent("model_overload");
    expect(screen.getByRole("button", { name: "Switch model" })).toBeInTheDocument();
  });

  // A bare 429 is the anonymous TURN RATE LIMITER, not the daily cap. Telling a visitor who
  // double-clicked that they have used up today's free chats would be a lie — and it would be
  // the same class of lie #91 removed from the meter. Slow-down copy, not the limit state.
  it("treats a bare 429 as rate limiting, NOT as the daily limit state", async () => {
    previewMock.mockResolvedValue({
      response: { ok: false, status: 429 },
      // No daily_limit_reached code: this is the rate limiter, not the quota.
      data: {},
    });

    renderPreview();
    await submitTask();

    const error = await screen.findByTestId("anon-agent-preview-error");
    expect(error).toHaveTextContent("Too many requests");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    // Crucially: NOT the "you're out of free chats today" card.
    expect(screen.queryByTestId("zaki-limit-state")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in to keep going" })
    ).not.toBeInTheDocument();
  });

  it("treats a thrown network error as a network drop, not a crash", async () => {
    previewMock.mockRejectedValue(new Error("offline"));

    renderPreview();
    await submitTask();

    const error = await screen.findByTestId("anon-agent-preview-error");
    expect(error).toHaveTextContent("Connection lost");
    // The provider/transport words never reach the browser.
    expect(error).not.toHaveTextContent("offline");
  });

  it("a failed preview saves NOTHING — there is no plan to keep", async () => {
    previewMock.mockResolvedValue({
      response: { ok: false, status: 502 },
      data: { success: false, code: "model_overload" },
    });

    renderPreview();
    await submitTask();
    await screen.findByTestId("anon-agent-preview-error");

    expect(screen.queryByTestId("anon-agent-save-continue")).not.toBeInTheDocument();
    expect(readAnonymousWorkLedger().items).toHaveLength(0);
  });

  it("retries the same task from the error state", async () => {
    previewMock.mockResolvedValueOnce({
      response: { ok: false, status: 502 },
      data: { success: false, code: "model_overload" },
    });
    previewMock.mockResolvedValueOnce(PLAN_OK);

    renderPreview();
    await submitTask();
    await screen.findByTestId("anon-agent-preview-error");

    fireEvent.click(screen.getByRole("button", { name: "Switch model" }));

    await waitFor(() => {
      expect(screen.getByTestId("anon-agent-plan-card")).toBeInTheDocument();
    });
    expect(previewMock).toHaveBeenCalledTimes(2);
  });
});
