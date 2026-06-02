import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
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
