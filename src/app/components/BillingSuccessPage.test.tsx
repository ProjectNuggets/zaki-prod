import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { BillingSuccessPage } from "./BillingSuccessPage";

const resendMutateAsync = jest.fn();
const syncBillingMutateAsync = jest.fn().mockResolvedValue({ success: true });

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string; plan?: string; interval?: string; returnObjects?: boolean }) => {
      const dictionary: Record<string, string | string[]> = {
        "billingSuccess.defaultName": "there",
        "billingSuccess.planFallback": "plan",
        "billingSuccess.intervalFallback": "interval",
        "billingSuccess.punchlines": ["You're set."],
        "billingSuccess.punchlineFallback": "You're set.",
        "billingSuccess.shareText": "Share text",
        "billingSuccess.shareTitle": "Share",
        "billingSuccess.shareCopied": "Copied",
        "billingSuccess.shareManual": "Share manually",
        "billingSuccess.accessCode.resendMissing": "Missing session id.",
        "billingSuccess.accessCode.resendProcessing": "Still processing your purchase.",
        "billingSuccess.accessCode.resendAlreadySent": "Code email already sent recently.",
        "billingSuccess.accessCode.resendSent": "Code email sent again.",
        "billingSuccess.accessCode.resendError": "Unable to resend code email.",
        "billingSuccess.accessCode.badge": "Access code purchase",
        "billingSuccess.accessCode.title": `Code ready, ${options?.name || "there"}`,
        "billingSuccess.accessCode.subtitle": "We'll email the code details shortly.",
        "billingSuccess.accessCode.punchline": "Share it when ready.",
        "billingSuccess.accessCode.nextSteps": ["Check your inbox", "Use resend if needed"],
        "billingSuccess.actions.start": "Start",
        "billingSuccess.actions.manage": "Manage",
        "billingSuccess.accessCode.resending": "Resending...",
        "billingSuccess.accessCode.resendCta": "Resend code email",
      };
      if (options?.returnObjects) {
        return (dictionary[key] as string[]) || [];
      }
      return (dictionary[key] as string) || key;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

jest.mock("@/queries", () => ({
  useEntitlements: () => ({
    data: {
      data: {
        plan: { tier: "free", interval: "monthly" },
      },
    },
  }),
  useResendPurchasedAccessCodeEmail: () => ({
    mutateAsync: resendMutateAsync,
    isPending: false,
  }),
  useSyncBilling: () => ({
    mutateAsync: syncBillingMutateAsync,
    isPending: false,
  }),
}));

jest.mock("@/stores", () => ({
  useAuthStore: (selector: (state: { user: { fullName: string } | null }) => unknown) =>
    selector({ user: { fullName: "Nova" } }),
}));

describe("BillingSuccessPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resendMutateAsync.mockResolvedValue({ status: "sent" });
  });

  it("resends purchased access code email from the success page", async () => {
    render(
      <MemoryRouter initialEntries={["/pricing/success?billing=code_success&kind=access_code&session_id=sess_123"]}>
        <Routes>
          <Route path="/pricing/success" element={<BillingSuccessPage />} />
        </Routes>
      </MemoryRouter>
    );

    screen.getByRole("button", { name: "Resend code email" }).click();

    await waitFor(() => {
      expect(resendMutateAsync).toHaveBeenCalledWith("sess_123");
    });
    expect((toast as unknown as { success: jest.Mock }).success).toHaveBeenCalledWith(
      "Code email sent again."
    );
  });
});
