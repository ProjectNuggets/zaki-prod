import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

import { BrainFilterPanel, DEFAULT_FILTERS, type BrainFilters } from "./BrainFilterPanel";

function renderPanel(overrides?: Partial<BrainFilters>) {
  const onChange = jest.fn();
  const filters: BrainFilters = { ...DEFAULT_FILTERS, ...overrides };
  render(
    <MemoryRouter>
      <BrainFilterPanel filters={filters} onChange={onChange} />
    </MemoryRouter>,
  );
  return { onChange };
}

describe("BrainFilterPanel — scope separation", () => {
  it("marks Personal brain as the scope shown on this surface", () => {
    renderPanel();
    const active = screen.getByTestId("brain-scope-active");
    expect(within(active).getByText("Personal brain")).toBeInTheDocument();
    expect(within(active).getByText("Shown here")).toBeInTheDocument();
  });

  it("names Workspace, Learner, and Hire memory as separate (not merged into this graph)", () => {
    renderPanel();
    expect(screen.getByTestId("brain-scope-separate-workspace")).toHaveTextContent(
      "Workspace",
    );
    expect(screen.getByTestId("brain-scope-separate-learner")).toHaveTextContent(
      "Learner",
    );
    expect(screen.getByTestId("brain-scope-separate-hire")).toHaveTextContent("Hire");
  });

  it("routes scope/privacy governance to route-level Settings", () => {
    renderPanel();
    expect(screen.getByTestId("brain-scope-settings-link")).toHaveAttribute(
      "href",
      "/settings#settings-memory-data",
    );
  });
});

describe("BrainFilterPanel — graph filters", () => {
  it("toggles the hide-orphans filter", () => {
    const { onChange } = renderPanel({ excludeOrphans: true });
    fireEvent.click(screen.getByLabelText("Hide orphans"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ excludeOrphans: false }),
    );
  });

  it("toggles a link-type pill into the active filter set", () => {
    const { onChange } = renderPanel({ linkTypes: [] });
    const pill = screen.getByTestId("brain-link-type-pill-preference");
    fireEvent.click(pill);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ linkTypes: ["preference"] }),
    );
  });

  it("switches the color preset", () => {
    const { onChange } = renderPanel({ colorPreset: "kind" });
    fireEvent.click(screen.getByTestId("brain-color-preset-community"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ colorPreset: "community" }),
    );
  });
});
