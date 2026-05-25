import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  V2ActionGrid,
  V2Meter,
  V2MetricGrid,
  V2SegmentedControl,
  V2StatusStrip,
  V2Tabs,
} from ".";

describe("V2 component primitives", () => {
  it("renders status strips and metric grids from structured data", () => {
    render(
      <>
        <V2StatusStrip
          aria-label="System status"
          items={[
            { id: "state", label: "Online", active: true, tone: "accent" },
            { id: "quota", label: "Weekly", value: "4/5" },
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
      </>
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Memory" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Share" })).not.toBeDisabled();
  });
});
