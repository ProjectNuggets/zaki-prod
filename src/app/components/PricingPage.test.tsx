import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { PricingPage } from "./PricingPage";

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => {
    const dictionary: Record<string, unknown> = {
      "pricingPage.billingNotices.success":
        "Billing update received. Your plan status will refresh shortly.",
      "pricingPage.billingNotices.cancel":
        "Checkout canceled. You can pick a plan anytime.",
      "pricingPage.billingNotices.manage": "Returned from billing portal.",
      "pricingPage.plans.free.features": ["Core chat", "Memory basics", "Standard response quality"],
      "pricingPage.plans.student.features": [
        "Premium models",
        "Priority responses",
        "Expanded memory limits",
      ],
      "pricingPage.plans.personal.features": [
        "Premium models",
        "Priority responses",
        "Advanced memory insights",
      ],
    };
    return {
      t: (key: string, options?: { returnObjects?: boolean; defaultValue?: string }) => {
        if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
          return dictionary[key];
        }
        if (options?.returnObjects) {
          return [];
        }
        if (typeof options?.defaultValue === "string") {
          return options.defaultValue;
        }
        return key;
      },
      i18n: { language: "en", dir: () => "ltr" },
    };
  },
}));

jest.mock("@/queries", () => ({
  useEntitlements: () => ({
    data: {
      data: {
        plan: {
          tier: "free",
          status: "inactive",
        },
        access: {
          active: false,
          expiresAt: null,
          campaign: null,
        },
      },
    },
  }),
  useCheckout: () => ({
    mutateAsync: jest.fn(),
  }),
  useBillingPortal: () => ({
    mutateAsync: jest.fn(),
  }),
  useRedeemAccessCode: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

describe("PricingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows billing success notice from query params", async () => {
    render(
      <MemoryRouter initialEntries={["/pricing?billing=success"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByText("Billing update received. Your plan status will refresh shortly.")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect((toast as unknown as { success: jest.Mock }).success).toHaveBeenCalledWith(
        "Billing update received. Your plan status will refresh shortly."
      );
    });
  });
});
