import { render, screen } from "@testing-library/react";
import { GatedRow } from "./V2SettingsPrimitives";

describe("GatedRow", () => {
  it("renders the name and the reason, and marks the row disabled", () => {
    render(<GatedRow name="Active sessions" reason="No session API yet" />);

    expect(screen.getByText("Active sessions")).toBeInTheDocument();
    expect(screen.getByText("No session API yet")).toBeInTheDocument();

    const row = screen.getByText("Active sessions").closest(".v2-settings-row");
    expect(row).not.toBeNull();
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(row).toHaveAttribute("data-gated", "true");
  });

  it("renders an optional description", () => {
    render(
      <GatedRow
        name="Slack"
        description="Connect your Slack workspace"
        reason="Backend channel contract pending"
      />,
    );
    expect(screen.getByText("Connect your Slack workspace")).toBeInTheDocument();
  });

  it("shows a default badge of 'Gated' and supports a custom badge", () => {
    const { rerender } = render(<GatedRow name="A" reason="r" />);
    expect(screen.getByText("Gated")).toBeInTheDocument();

    rerender(<GatedRow name="A" reason="r" badge="Coming soon" />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByText("Gated")).not.toBeInTheDocument();
  });

  // Locks the CSS contract: badge + reason carry the classes styled in v2.css.
  it("applies the styled badge and reason class names", () => {
    render(<GatedRow name="Slack" reason="Backend channel contract pending" />);
    expect(screen.getByText("Gated")).toHaveClass("v2-settings-gated__badge");
    expect(screen.getByText("Backend channel contract pending")).toHaveClass(
      "v2-settings-gated__reason",
    );
  });
});
