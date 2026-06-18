import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaywallCard, classifyBillingDenial } from "./PaywallCard";

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
