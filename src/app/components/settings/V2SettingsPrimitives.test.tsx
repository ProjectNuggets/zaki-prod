import { render, screen } from "@testing-library/react";
import { GatedRow, V2SettingsBlock, V2SettingsNav } from "./V2SettingsPrimitives";

function TestIcon({ className }: { className?: string }) {
  return <svg className={className} aria-hidden="true" />;
}

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

describe("V2SettingsBlock", () => {
  it("renders the header band title, meta, and an optional header action", () => {
    render(
      <V2SettingsBlock
        title="Agent"
        meta="Tenant defaults"
        action={<button type="button">Reset to defaults</button>}
      >
        <div>Body</div>
      </V2SettingsBlock>,
    );

    expect(screen.getByRole("heading", { name: "Agent" })).toBeInTheDocument();
    expect(screen.getByText("Tenant defaults")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset to defaults" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("omits the header aside when neither meta nor action is provided", () => {
    const { container } = render(
      <V2SettingsBlock title="Privacy">
        <div>Body</div>
      </V2SettingsBlock>,
    );

    expect(container.querySelector(".v2-settings-block__head-aside")).toBeNull();
  });
});

describe("V2SettingsNav", () => {
  it("marks the active hash as the current settings section", () => {
    render(
      <V2SettingsNav
        eyebrow="Control plane"
        title="Settings"
        ariaLabel="Settings sections"
        activeHref="#settings-memory-data"
        items={[
          { href: "#settings-agent", label: "Agent", icon: TestIcon },
          { href: "#settings-memory-data", label: "Memory & Data", icon: TestIcon },
        ]}
      />,
    );

    const activeLink = screen.getByRole("link", { name: "Memory & Data" });
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(activeLink).toHaveClass("is-active");
    expect(screen.getByRole("link", { name: "Agent" })).not.toHaveAttribute("aria-current");
  });
});
