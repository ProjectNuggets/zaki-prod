import { fireEvent, render, screen } from "@testing-library/react";
import type { SlashCommand } from "@/lib/slashCommands";
import { SlashCommandPalette } from "./SlashCommandPalette";

const baseProps = {
  open: true,
  filter: "",
  highlightIndex: 0,
  onHighlightChange: jest.fn(),
  onSelect: jest.fn(),
  onDismiss: jest.fn(),
  showAliases: false,
  onToggleAliases: jest.fn(),
  isOperator: false,
  isRtl: false,
  listboxId: "test-listbox",
  optionId: (index: number) => `test-option-${index}`,
};

describe("SlashCommandPalette", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<SlashCommandPalette {...baseProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the listbox when open", () => {
    render(<SlashCommandPalette {...baseProps} />);
    const listbox = screen.getByRole("listbox", { name: /slash command/i });
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveAttribute("id", "test-listbox");
  });

  it("filters by prefix and shows /help when filter is 'he'", () => {
    render(<SlashCommandPalette {...baseProps} filter="he" />);
    expect(screen.getByText("/help")).toBeInTheDocument();
    expect(screen.getByText("/health")).toBeInTheDocument();
    expect(screen.queryByText("/new")).not.toBeInTheDocument();
  });

  it("shows the no-match placeholder when filter has no results", () => {
    render(<SlashCommandPalette {...baseProps} filter="zzznotacommand" />);
    expect(screen.getByText(/no matching commands/i)).toBeInTheDocument();
  });

  it("hides operator-only commands when isOperator is false", () => {
    render(<SlashCommandPalette {...baseProps} filter="ba" />);
    expect(screen.queryByText("/bash")).not.toBeInTheDocument();
  });

  it("shows operator-only commands when isOperator is true", () => {
    render(<SlashCommandPalette {...baseProps} filter="ba" isOperator />);
    expect(screen.getByRole("option", { name: /\/bash/i })).toBeInTheDocument();
  });

  it("hides alias entries by default", () => {
    render(<SlashCommandPalette {...baseProps} filter="commands" />);
    expect(screen.queryByText("/commands")).not.toBeInTheDocument();
  });

  it("shows alias entries when showAliases is true", () => {
    render(<SlashCommandPalette {...baseProps} filter="commands" showAliases />);
    expect(screen.getByText("/commands")).toBeInTheDocument();
  });

  it("toggles alias visibility via the toggle button", () => {
    const onToggleAliases = jest.fn();
    render(<SlashCommandPalette {...baseProps} onToggleAliases={onToggleAliases} />);
    const toggle = screen.getByTestId("slash-toggle-aliases");
    expect(toggle).toHaveTextContent(/show aliases/i);
    fireEvent.mouseDown(toggle);
    expect(onToggleAliases).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect with the canonical command on item mousedown", () => {
    const onSelect = jest.fn<void, [SlashCommand]>();
    render(<SlashCommandPalette {...baseProps} filter="help" onSelect={onSelect} />);
    fireEvent.mouseDown(screen.getByText("/help"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]?.name).toBe("/help");
  });

  it("calls onDismiss when clicking outside the palette", () => {
    const onDismiss = jest.fn();
    render(
      <div>
        <button data-testid="outside">outside</button>
        <SlashCommandPalette {...baseProps} onDismiss={onDismiss} />
      </div>,
    );
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("does not dismiss when clicking inside the palette", () => {
    const onDismiss = jest.fn();
    render(<SlashCommandPalette {...baseProps} onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByTestId("slash-command-palette"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("marks the highlighted option with aria-selected=true", () => {
    render(<SlashCommandPalette {...baseProps} filter="help" highlightIndex={0} />);
    const help = screen.getByText("/help").closest("[role='option']");
    expect(help).toHaveAttribute("aria-selected", "true");
  });

  it("groups by category when filter is empty", () => {
    render(<SlashCommandPalette {...baseProps} />);
    expect(screen.getByText("Channels & docking")).toBeInTheDocument();
    expect(screen.getByText("Subagents & focus")).toBeInTheDocument();
  });

  it("renders flat list (no category headers) when filter is non-empty", () => {
    render(<SlashCommandPalette {...baseProps} filter="he" />);
    expect(screen.queryByText("Channels & docking")).not.toBeInTheDocument();
  });
});
