import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaywallCard, classifyBillingDenial } from "./PaywallCard";

// The limit state is translated; return the shipped English defaults so these assertions
// check the copy a user actually reads.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      let out = String(opts?.defaultValue ?? key);
      for (const [k, v] of Object.entries(opts ?? {})) {
        if (k === "defaultValue") continue;
        out = out.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      }
      return out;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

describe("classifyBillingDenial", () => {
  it("maps insufficient_units → out_of_usage", () => {
    expect(classifyBillingDenial("insufficient_units")).toEqual({ isPaywall: true, state: "out_of_usage" });
  });
  it("maps entitlement_inactive + access_expired → plan_inactive", () => {
    expect(classifyBillingDenial("entitlement_inactive")).toEqual({ isPaywall: true, state: "plan_inactive" });
    expect(classifyBillingDenial("access_expired")).toEqual({ isPaywall: true, state: "plan_inactive" });
  });
  it("does NOT classify generic/unknown codes", () => {
    expect(classifyBillingDenial("rate_limited").isPaywall).toBe(false);
    expect(classifyBillingDenial(null).isPaywall).toBe(false);
    expect(classifyBillingDenial(undefined).isPaywall).toBe(false);
  });

  // WP-B2 — THE fix: these codes are what the backend actually enforces for chat. They
  // were absent from the map, so they fell through to a bare toast.error().
  it("maps the enforced quota codes → limit_reached (they used to fall through to a toast)", () => {
    expect(classifyBillingDenial("daily_limit_reached")).toEqual({
      isPaywall: true,
      state: "limit_reached",
    });
    expect(classifyBillingDenial("weekly_limit_reached")).toEqual({
      isPaywall: true,
      state: "limit_reached",
    });
    expect(classifyBillingDenial("quota_exceeded")).toEqual({
      isPaywall: true,
      state: "limit_reached",
    });
  });
});

describe("PaywallCard — limit_reached (WP-B2)", () => {
  const base = { message: "fallback", onSeePlans: jest.fn(), onDismiss: jest.fn() };
  // 2026-07-15T00:00:00Z — a real instant, so the card can print a real date AND time.
  const resetAt = "2026-07-15T00:00:00Z";

  it("NAMES the limit — how much of what was used", () => {
    render(
      <PaywallCard
        state="limit_reached"
        identity="anon"
        limitPeriod="day"
        limitUsed={10}
        limitTotal={10}
        resetAt={resetAt}
        {...base}
      />
    );
    expect(screen.getByTestId("zaki-limit-state")).toBeInTheDocument();
    expect(screen.getByText(/you've used today's free limit/i)).toBeInTheDocument();
    expect(screen.getByTestId("zaki-limit-usage")).toHaveTextContent(
      "10 of 10 free chats used today"
    );
  });

  // (b) — the anon variant: sign-in CTA + a REAL reset time (date AND clock time).
  it("anon variant shows the sign-in CTA and an exact reset date + time", () => {
    const onSignIn = jest.fn();
    render(
      <PaywallCard
        state="limit_reached"
        identity="anon"
        limitPeriod="day"
        limitUsed={10}
        limitTotal={10}
        resetAt={resetAt}
        onSignIn={onSignIn}
        {...base}
      />
    );

    const cta = screen.getByRole("button", { name: /sign in to keep going/i });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onSignIn).toHaveBeenCalled();

    // An anon cannot upgrade — never offer it.
    expect(screen.queryByRole("button", { name: /upgrade/i })).not.toBeInTheDocument();

    // A real reset instant: a date AND a wall-clock time, not "tomorrow".
    const reset = screen.getByTestId("zaki-limit-reset");
    expect(reset).toHaveTextContent(/resets/i);
    expect(reset).toHaveTextContent(/\d{1,2}:\d{2}/); // clock time present
    expect(reset).not.toHaveTextContent(/tomorrow|next week/i);
  });

  it("authed variant frames the upgrade as continuing THIS task", () => {
    const onSeePlans = jest.fn();
    render(
      <PaywallCard
        state="limit_reached"
        identity="authed"
        limitPeriod="day"
        limitUsed={10}
        limitTotal={10}
        resetAt={resetAt}
        message="fallback"
        onSeePlans={onSeePlans}
        onDismiss={jest.fn()}
      />
    );
    const cta = screen.getByRole("button", { name: /upgrade to finish this task/i });
    fireEvent.click(cta);
    expect(onSeePlans).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /sign in to keep going/i })).not.toBeInTheDocument();
  });

  it("tells the user their unsent prompt was preserved", () => {
    render(
      <PaywallCard
        state="limit_reached"
        identity="anon"
        limitPeriod="day"
        limitUsed={10}
        limitTotal={10}
        resetAt={resetAt}
        promptPreserved
        {...base}
      />
    );
    expect(screen.getByTestId("zaki-limit-preserved")).toHaveTextContent(/saved in the composer/i);
  });

  it("names the WEEKLY limit when that is the bucket that was hit", () => {
    render(
      <PaywallCard
        state="limit_reached"
        identity="authed"
        limitPeriod="week"
        limitUsed={25}
        limitTotal={25}
        resetAt={resetAt}
        {...base}
      />
    );
    expect(screen.getByText(/you've used this week's free limit/i)).toBeInTheDocument();
    expect(screen.getByTestId("zaki-limit-usage")).toHaveTextContent(
      "25 of 25 free chats used this week"
    );
  });

  it("never renders a machine code", () => {
    const { container } = render(
      <PaywallCard
        state="limit_reached"
        identity="anon"
        limitPeriod="day"
        limitUsed={10}
        limitTotal={10}
        resetAt={resetAt}
        message="daily_limit_reached"
        {...base}
      />
    );
    expect(container.textContent).not.toContain("daily_limit_reached");
  });
});

describe("PaywallCard", () => {
  const base = { message: "fallback msg", onSeePlans: jest.fn(), onDismiss: jest.fn() };
  it("out_of_usage shows the usage headline + plan/reset without raw units", () => {
    render(<PaywallCard state="out_of_usage" planLabel="Free" remaining={0} resetAt="2026-06-20T00:00:00Z" {...base} />);
    expect(screen.getByText(/weekly usage is full/i)).toBeInTheDocument();
    expect(screen.getByText(/Free/)).toBeInTheDocument();
    expect(screen.queryByText(/0 available/i)).not.toBeInTheDocument();
  });
  it("out_of_usage names the rolling capacity window when that is the limiter", () => {
    render(
      <PaywallCard
        state="out_of_usage"
        planLabel="Free"
        effectiveRemaining={20}
        requiredUnits={40}
        constraint="rolling"
        rollingWindowPercent={100}
        rollingWindowHours={5}
        resetAt="2026-06-20T00:00:00Z"
        {...base}
      />
    );
    expect(screen.getByText(/current capacity window needs room/i)).toBeInTheDocument();
    expect(screen.getByText(/5-hour window is 100% used/i)).toBeInTheDocument();
    expect(screen.getByText(/next room clears/i)).toBeInTheDocument();
    expect(screen.queryByText(/20 available now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/40 needed/i)).not.toBeInTheDocument();
  });
  it("plan_inactive shows the inactive headline", () => {
    render(<PaywallCard state="plan_inactive" planLabel="Agent" {...base} />);
    expect(screen.getByText(/plan is inactive/i)).toBeInTheDocument();
  });
  it("turns a truly inactive Agent denial into a clear upgrade CTA instead of raw engine copy", () => {
    render(
      <PaywallCard
        state="plan_inactive"
        planLabel="Free"
        message="subscription inactive — update billing to continue"
        {...base}
      />
    );
    expect(screen.getByRole("button", { name: /see plans/i })).toBeInTheDocument();
    expect(screen.getByText(/plan is inactive/i)).toBeInTheDocument();
    expect(
      screen.queryByText("subscription inactive — update billing to continue")
    ).not.toBeInTheDocument();
  });
  it("falls back to the denial message when plan data is absent", () => {
    render(<PaywallCard state="out_of_usage" {...base} />);
    expect(screen.getByText("fallback msg")).toBeInTheDocument();
  });
  it("fires onSeePlans and onDismiss", () => {
    const onSeePlans = jest.fn(); const onDismiss = jest.fn();
    render(<PaywallCard state="out_of_usage" message="m" onSeePlans={onSeePlans} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /see plans/i }));
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onSeePlans).toHaveBeenCalled(); expect(onDismiss).toHaveBeenCalled();
  });
});
