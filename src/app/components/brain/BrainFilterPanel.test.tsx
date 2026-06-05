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

import {
  BrainFilterPanel,
  DEFAULT_FILTERS,
  formatConnectionStrength,
  type BrainFilters,
} from "./BrainFilterPanel";

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

describe("formatConnectionStrength", () => {
  it("turns the raw semantic cutoff into plain words across the range", () => {
    expect(formatConnectionStrength(0.7)).toBe("Show all");
    expect(formatConnectionStrength(0.75)).toBe("Loose");
    expect(formatConnectionStrength(0.85)).toBe("Balanced");
    expect(formatConnectionStrength(0.9)).toBe("Strong");
    expect(formatConnectionStrength(1)).toBe("Strongest only");
  });

  it("is monotonic — higher cutoff never reads as weaker", () => {
    const order = ["Show all", "Loose", "Balanced", "Strong", "Strongest only"];
    let lastRank = -1;
    for (let v = 0.7; v <= 1.0001; v += 0.05) {
      const rank = order.indexOf(formatConnectionStrength(Number(v.toFixed(2))));
      expect(rank).toBeGreaterThanOrEqual(lastRank);
      lastRank = rank;
    }
  });
});
