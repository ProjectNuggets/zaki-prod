import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { InputArea } from "./InputArea";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("@/queries", () => ({
  useEntitlements: () => ({
    data: {
      data: {
        plan: { tier: "free", status: "inactive" },
      },
    },
  }),
  useCheckout: () => ({
    mutateAsync: jest.fn(),
  }),
  useBillingPortal: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) =>
      options?.returnObjects ? ["Ask anything", "Draft something"] : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("InputArea primary action button", () => {
  it("sends when not streaming and does not call stop", () => {
    const onSend = jest.fn();
    const onStop = jest.fn();
    const setAttachments = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={setAttachments}
        isSending={false}
        onStop={onStop}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "hello zaki" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("hello zaki", []);
    expect(onStop).not.toHaveBeenCalled();
  });

  it("turns into stop mode only while streaming", () => {
    const onSend = jest.fn();
    const onStop = jest.fn();
    const setAttachments = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={setAttachments}
        isSending
        onStop={onStop}
      />
    );

    const stopButton = screen.getByRole("button", { name: "input.stopAria" });
    fireEvent.click(stopButton);

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
