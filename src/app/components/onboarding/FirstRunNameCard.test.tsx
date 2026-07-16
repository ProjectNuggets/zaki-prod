import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FirstRunNameCard } from "./FirstRunNameCard";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

describe("FirstRunNameCard", () => {
  it("lets the user name the engine-owned agent", async () => {
    const onComplete = jest.fn(async () => {});
    render(<FirstRunNameCard phase="awaiting_name" onComplete={onComplete} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Name your agent" }), {
      target: { value: "Nova" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Make Nova mine" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith("Nova"));
  });

  it("locks the name control while the choice is being saved", () => {
    render(<FirstRunNameCard phase="saving_name" onComplete={async () => {}} />);

    expect(screen.getByRole("textbox", { name: "Name your agent" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving name…" })).toBeDisabled();
  });
});
