import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { PricingPage } from "./PricingPage";
import { useAuthStore } from "@/stores";

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
      "pricingPage.subtitleAccessActive":
        "Your access code unlocks the full app for now. Product-specific codes come later.",
      "pricingPage.comparisonNote":
        "Agent and Learn each include a free weekly preview. Complete is the cleanest paid path when you want all products and uncapped Spaces.",
      "pricingPage.cancelSubscription": "Cancel subscription",
      "pricingPage.cancellationScheduled": "Cancellation scheduled",
      "pricingPage.cancelScheduled": "Subscription will cancel at period end.",
      "pricingPage.cancelAlreadyScheduled":
        "Cancellation is already scheduled for period end.",
      "pricingPage.cancelError": "Unable to cancel subscription",
      "pricingPage.cancelUnavailable": "Subscription cancellation is temporarily unavailable.",
      "pricingPage.access.purchase.cta": "Buy access code",
      "pricingPage.access.purchase.unavailable":
        "Code purchase is not enabled in this environment yet.",
      "pricingPage.access.purchase.processing": "Opening checkout...",
      "pricingPage.access.purchase.checkoutError":
        "Unable to start code purchase checkout.",
      "pricingPage.access.extendHint": "Redeem another code to extend your access.",
      "pricingPage.viewPlans": "View plans",
      "pricingPage.accessActiveCta": "Access active",
      "pricingPage.included": "Included",
      "pricingPage.upgradeToComplete": "Upgrade to Complete",
      "pricingPage.signInRequired": "Sign in",
      "pricingPage.signInToChoose": "Sign in for {{plan}}",
      "pricingPage.choose": "Choose {{plan}}",
      "pricingPage.managePlan": "Manage plan",
      "pricingPage.plans.free.label": "Spaces Free",
      "pricingPage.plans.free.price": "$0",
      "pricingPage.plans.free.cta": "Open Spaces",
      "pricingPage.plans.free.features": ["10 Spaces messages per day", "No durable memory while anonymous", "Upgrade when you need memory or uncapped Spaces"],
      "pricingPage.plans.agent.label": "ZAKI Agent",
      "pricingPage.plans.agent.price": "$29 / month",
      "pricingPage.plans.agent.features": ["10 free preview messages each week"],
      "pricingPage.plans.learn.label": "ZAKI Learn",
      "pricingPage.plans.learn.price": "$19 / month",
      "pricingPage.plans.learn.features": ["10 free preview messages each week"],
      "pricingPage.plans.complete.label": "ZAKI Complete",
      "pricingPage.plans.complete.price": "$39 / month",
      "pricingPage.plans.complete.features": ["ZAKI Agent included", "ZAKI Learn included", "Uncapped Spaces with memory"],
    };
    return {
      t: (key: string, options?: { returnObjects?: boolean; defaultValue?: string; plan?: string }) => {
        if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
          const value = dictionary[key];
          if (typeof value === "string" && options?.plan) {
            return value.replace("{{plan}}", options.plan);
          }
          return value;
        }
        if (options?.returnObjects) {
          return [];
        }
        if (typeof options?.defaultValue === "string") {
          return options.defaultValue;
        }
        if (options && "plan" in options) {
          return String(key)
            .replace("pricingPage.choose", `Choose ${String((options as { plan?: string }).plan)}`)
            .replace("pricingPage.signInToChoose", `Sign in for ${String((options as { plan?: string }).plan)}`);
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
    effective: {
      tier: "free",
      status: "inactive",
      source: "free",
      premium: false,
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
      checkoutProviders: [{ key: "stripe", label: "Stripe", enabled: true }],
      accessCodePurchaseEnabled: true,
      pricingAvailability: {
        agent: { monthly: true, yearly: false },
        learn: { monthly: true, yearly: false },
        complete: { monthly: true, yearly: false },
      },
      missing: [],
    },
  },
};

const checkoutMutateAsync = jest.fn();
const accessCodePurchaseCheckoutMutateAsync = jest.fn();
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
  useAccessCodePurchaseCheckout: () => ({
    mutateAsync: accessCodePurchaseCheckoutMutateAsync,
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
    useAuthStore.setState({
      token: "test-token",
      user: { id: 1, username: "user@example.com" },
      isHydrating: false,
      isLoading: false,
    });
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
        effective: {
          tier: "free",
          status: "inactive",
          source: "free",
          premium: false,
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
          checkoutProviders: [{ key: "stripe", label: "Stripe", enabled: true }],
          accessCodePurchaseEnabled: true,
          pricingAvailability: {
            agent: { monthly: true, yearly: false },
            learn: { monthly: true, yearly: false },
            complete: { monthly: true, yearly: false },
          },
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

  it("starts Agent checkout with monthly Stripe selection", async () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose ZAKI Agent" }));

    await waitFor(() => {
      expect(checkoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "agent", interval: "monthly", provider: "stripe" })
      );
    });
  });

  it("starts Learn checkout with monthly Stripe selection", async () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose ZAKI Learn" }));

    await waitFor(() => {
      expect(checkoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "learn", interval: "monthly", provider: "stripe" })
      );
    });
  });

  it("starts Complete checkout with monthly Stripe selection", async () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose ZAKI Complete" }));

    await waitFor(() => {
      expect(checkoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "complete", interval: "monthly", provider: "stripe" })
      );
    });
  });

  it("keeps commercial checkout on Stripe when legacy providers are also configured", async () => {
    billingConfigData = {
      data: {
        configured: {
          stripeEnabled: true,
          checkoutEnabled: true,
          portalEnabled: true,
          cancelEnabled: true,
          webhookEnabled: true,
          checkoutProviders: [
            { key: "stripe", label: "Stripe", enabled: true },
            { key: "paddle", label: "Paddle", enabled: true },
          ],
          accessCodePurchaseEnabled: true,
          pricingAvailability: {
            agent: { monthly: true, yearly: false },
            learn: { monthly: true, yearly: false },
            complete: { monthly: true, yearly: false },
          },
          missing: [],
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

    fireEvent.click(screen.getByRole("button", { name: "Choose ZAKI Agent" }));

    await waitFor(() => {
      expect(checkoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "agent", interval: "monthly", provider: "stripe" })
      );
    });
    expect(screen.queryByText("Paddle")).not.toBeInTheDocument();
  });

  it("does not send a commercial plan to a legacy-only provider", async () => {
    billingConfigData = {
      data: {
        configured: {
          stripeEnabled: false,
          checkoutEnabled: true,
          portalEnabled: false,
          cancelEnabled: false,
          webhookEnabled: false,
          checkoutProviders: [{ key: "paddle", label: "Paddle", enabled: true }],
          accessCodePurchaseEnabled: false,
          pricingAvailability: {
            agent: { monthly: false, yearly: false },
            learn: { monthly: false, yearly: false },
            complete: { monthly: false, yearly: false },
          },
          missing: ["stripe_price_agent_monthly"],
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

    fireEvent.click(screen.getByRole("button", { name: "Choose ZAKI Agent" }));

    await waitFor(() => {
      expect((toast as unknown as { error: jest.Mock }).error).toHaveBeenCalledWith(
        "pricingPage.checkoutError"
      );
    });
    expect(checkoutMutateAsync).not.toHaveBeenCalled();
  });

  it("autostarts Complete checkout from a signed-in pricing intent", async () => {
    render(
      <MemoryRouter initialEntries={["/pricing?plan=complete&interval=monthly&autostart=1"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(checkoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "complete", interval: "monthly", provider: "stripe" })
      );
    });
  });

  it("starts access-code purchase checkout from pricing card", async () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Buy access code" }));

    await waitFor(() => {
      expect(accessCodePurchaseCheckoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ source: "pricing_page" })
      );
    });
  });

  it("shows active access state while still allowing paid checkout for access-code users", async () => {
    entitlementsData = {
      data: {
        plan: {
          tier: "free",
          status: "inactive",
          cancelAtPeriodEnd: false,
        },
        access: {
          active: true,
          expiresAt: "2026-04-20T00:00:00.000Z",
          campaign: "Founders Circle",
        },
        effective: {
          tier: "personal",
          status: "active",
          source: "access_code",
          premium: true,
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

    expect(screen.getByText("Your access code unlocks the full app for now. Product-specific codes come later.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose ZAKI Agent" }));
    await waitFor(() => {
      expect(checkoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "agent", interval: "monthly", provider: "stripe" })
      );
    });
    expect(screen.queryByRole("button", { name: "Cancel subscription" })).not.toBeInTheDocument();
    expect(screen.getByText("Redeem another code to extend your access.")).toBeInTheDocument();
  });

  it("routes single-product subscribers to Complete instead of a second product subscription", async () => {
    entitlementsData = {
      data: {
        plan: {
          tier: "agent",
          status: "active",
          cancelAtPeriodEnd: false,
        },
        access: {
          active: false,
          expiresAt: null,
          campaign: null,
        },
        effective: {
          tier: "agent",
          status: "active",
          source: "subscription",
          premium: true,
        },
        commercial: {
          planId: "agent",
          source: "subscription",
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

    fireEvent.click(screen.getAllByRole("button", { name: "Upgrade to Complete" })[0]);

    await waitFor(() => {
      expect(checkoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "complete", interval: "monthly", provider: "stripe" })
      );
    });
  });

  it("does not autostart access-code purchase checkout from gift intent query", async () => {
    render(
      <MemoryRouter
        initialEntries={["/pricing?intent=gift_code&autostart=1&source=website_pricing"]}
      >
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(accessCodePurchaseCheckoutMutateAsync).not.toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Buy access code" }));

    await waitFor(() => {
      expect(accessCodePurchaseCheckoutMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ source: "website_pricing" })
      );
    });
  });

  it("disables access-code purchase checkout when not configured", () => {
    billingConfigData = {
      data: {
        configured: {
          stripeEnabled: true,
          checkoutEnabled: true,
          portalEnabled: true,
          cancelEnabled: true,
          webhookEnabled: true,
          checkoutProviders: [{ key: "stripe", label: "Stripe", enabled: true }],
          accessCodePurchaseEnabled: false,
          pricingAvailability: {
            student: { monthly: true, yearly: true },
            personal: { monthly: true, yearly: true },
          },
          missing: [],
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

    expect(screen.getByRole("button", { name: "Buy access code" })).toBeDisabled();
    expect(
      screen.getByText("Code purchase is not enabled in this environment yet.")
    ).toBeInTheDocument();
  });
});
