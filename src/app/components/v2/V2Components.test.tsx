import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  V2ActionGrid,
  V2Meter,
  V2MetricGrid,
  V2ProductCard,
  V2SectionHeader,
  V2SegmentedControl,
  V2StatusStrip,
  V2Tabs,
  V2UsageGauge,
} from ".";

describe("V2 component primitives", () => {
  it("renders status strips and metric grids from structured data", () => {
    const onTrace = jest.fn();
    render(
      <>
        <V2StatusStrip
          aria-label="System status"
          items={[
            { id: "state", label: "Online", active: true, tone: "accent" },
            { id: "quota", label: "Weekly", value: "4/5" },
            {
              id: "trace",
              label: "Trace",
              value: 3,
              onClick: onTrace,
              ariaLabel: "Open trace panel",
            },
          ]}
        />
        <V2MetricGrid
          items={[
            { id: "mode", label: "Mode", value: "Execute" },
            { id: "approvals", label: "Approvals", value: 0 },
          ]}
        />
      </>
    );

    expect(screen.getByRole("status", { name: "System status" })).toBeInTheDocument();
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(screen.getByText("Execute")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open trace panel" }));
    expect(onTrace).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard-native segmented controls and tabs", () => {
    const onModeChange = jest.fn();
    const onTabChange = jest.fn();

    render(
      <>
        <V2SegmentedControl
          ariaLabel="Mode"
          value="execute"
          onChange={onModeChange}
          options={[
            { id: "plan", label: "Plan" },
            { id: "execute", label: "Execute" },
          ]}
        />
        <V2Tabs
          ariaLabel="Panels"
          value="plan"
          onChange={onTabChange}
          options={[
            { id: "plan", label: "Plan" },
            { id: "trace", label: "Trace" },
          ]}
        />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Plan" }));
    expect(onModeChange).toHaveBeenCalledWith("plan");

    fireEvent.click(screen.getByRole("tab", { name: "Trace" }));
    expect(onTabChange).toHaveBeenCalledWith("trace");
  });

  it("clamps meters and disables missing action handlers", () => {
    render(
      <>
        <V2Meter label="Context" value={140} detail="sample" />
        <V2ActionGrid
          ariaLabel="Actions"
          actions={[
            { id: "memory", label: "Memory", onClick: undefined },
            { id: "share", label: "Share", onClick: jest.fn() },
          ]}
        />
        <V2UsageGauge
          label="Weekly allowance"
          used={3}
          limit={5}
          remaining="2 hours left"
          reset="Resets Jun 1"
          unit="hours"
        />
      </>
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("2 hours left")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Memory" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Share" })).not.toBeDisabled();
  });

  it("renders product cards and section headers from reusable V2 primitives", () => {
    const onAction = jest.fn();
    render(
      <>
        <V2SectionHeader title="Products" subtitle="What you can use" meta="6 available" />
        <V2ProductCard
          code="agent"
          tag="live"
          tagTone="accent"
          title="ZAKI Agent"
          description="Personal agent with memory."
          meta={[
            { id: "usage", label: "Usage", value: "10 left" },
            { id: "memory", label: "Memory", value: "User scoped" },
          ]}
          actionLabel="Open"
          actionAriaLabel="Open ZAKI Agent"
          onAction={onAction}
        />
      </>
    );

    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open ZAKI Agent" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
