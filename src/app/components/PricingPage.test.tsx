import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      "pricingPage.cancelSubscription": "Cancel subscription",
      "pricingPage.cancellationScheduled": "Cancellation scheduled",
      "pricingPage.cancelScheduled": "Subscription will cancel at period end.",
      "pricingPage.cancelAlreadyScheduled":
        "Cancellation is already scheduled for period end.",
      "pricingPage.cancelError": "Unable to cancel subscription",
      "pricingPage.cancelUnavailable": "Subscription cancellation is temporarily unavailable.",
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

let entitlementsData = {
  data: {
    plan: {
      tier: "free",
      status: "inactive",
      cancelAtPeriodEnd: false,
    },
    access: {
      active: false,
      expiresAt: null,
      campaign: null,
    },
  },
};

let billingConfigData = {
  data: {
    configured: {
      stripeEnabled: true,
      checkoutEnabled: true,
      portalEnabled: true,
      cancelEnabled: true,
      webhookEnabled: true,
      missing: [],
    },
  },
};

const checkoutMutateAsync = jest.fn();
const portalMutateAsync = jest.fn();
const syncBillingMutateAsync = jest.fn().mockResolvedValue({ success: true });
const redeemAccessCodeMutateAsync = jest.fn();
const cancelSubscriptionMutateAsync = jest.fn().mockResolvedValue({
  success: true,
  alreadyScheduled: false,
  cancelAtPeriodEnd: true,
});

jest.mock("@/queries", () => ({
  useBillingConfig: () => ({
    data: billingConfigData,
  }),
  useEntitlements: () => ({
    data: entitlementsData,
  }),
  useCheckout: () => ({
    mutateAsync: checkoutMutateAsync,
    isPending: false,
  }),
  useBillingPortal: () => ({
    mutateAsync: portalMutateAsync,
    isPending: false,
  }),
  useCancelSubscription: () => ({
    mutateAsync: cancelSubscriptionMutateAsync,
    isPending: false,
  }),
  useSyncBilling: () => ({
    mutateAsync: syncBillingMutateAsync,
    isPending: false,
  }),
  useRedeemAccessCode: () => ({
    mutateAsync: redeemAccessCodeMutateAsync,
    isPending: false,
  }),
}));

describe("PricingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    entitlementsData = {
      data: {
        plan: {
          tier: "free",
          status: "inactive",
          cancelAtPeriodEnd: false,
        },
        access: {
          active: false,
          expiresAt: null,
          campaign: null,
        },
      },
    };
    billingConfigData = {
      data: {
        configured: {
          stripeEnabled: true,
          checkoutEnabled: true,
          portalEnabled: true,
          cancelEnabled: true,
          webhookEnabled: true,
          missing: [],
        },
      },
    };
    cancelSubscriptionMutateAsync.mockResolvedValue({
      success: true,
      alreadyScheduled: false,
      cancelAtPeriodEnd: true,
    });
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

  it("shows cancel subscription on the active paid plan and triggers cancellation", async () => {
    entitlementsData = {
      data: {
        plan: {
          tier: "student",
          status: "active",
          cancelAtPeriodEnd: false,
        },
        access: {
          active: true,
          expiresAt: null,
          campaign: null,
        },
      },
    };

    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));

    await waitFor(() => {
      expect(cancelSubscriptionMutateAsync).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect((toast as unknown as { success: jest.Mock }).success).toHaveBeenCalledWith(
        "Subscription will cancel at period end."
      );
    });
  });

  it("shows scheduled state when cancellation is already set", () => {
    entitlementsData = {
      data: {
        plan: {
          tier: "student",
          status: "active",
          cancelAtPeriodEnd: true,
        },
        access: {
          active: true,
          expiresAt: null,
          campaign: null,
        },
      },
    };

    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    const scheduledButton = screen.getByRole("button", { name: "Cancellation scheduled" });
    expect(scheduledButton).toBeDisabled();
    expect(screen.getByText("pricingPage.cancelAtPeriodEndNote")).toBeInTheDocument();
    expect(cancelSubscriptionMutateAsync).not.toHaveBeenCalled();
  });
});
