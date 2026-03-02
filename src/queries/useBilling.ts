import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBillingSubscription,
  createAccessCodePurchaseCheckoutSession,
  createBillingPortal,
  createCheckoutSession,
  deleteAccount,
  fetchBillingConfig,
  fetchEntitlements,
  redeemAccessCode,
  resendPurchasedAccessCodeEmail,
  syncBillingSubscription,
} from "@/lib/api";
import { useAuthStore } from "@/stores";

export const billingKeys = {
  entitlements: ["billing", "entitlements"] as const,
  config: ["billing", "config"] as const,
};

export function useEntitlements() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: billingKeys.entitlements,
    queryFn: fetchEntitlements,
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
  });
}

export function useBillingConfig() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: billingKeys.config,
    queryFn: fetchBillingConfig,
    enabled: Boolean(token),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload:
        | "student"
        | "personal"
        | {
            plan: "student" | "personal";
            provider?: "stripe" | "paddle" | "creem";
            interval?: "monthly" | "yearly";
            context?: {
              source?:
                | "website_nav"
                | "website_pricing"
                | "chat_input"
                | "settings"
                | "pricing_page"
                | "success_page";
            };
          }
    ) => {
      const plan = typeof payload === "string" ? payload : payload.plan;
      const provider = typeof payload === "string" ? undefined : payload.provider;
      const interval = typeof payload === "string" ? "monthly" : payload.interval || "monthly";
      const context = typeof payload === "string" ? undefined : payload.context;
      const { response, data } = await createCheckoutSession(plan, provider, interval, context);
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to start checkout");
      }
      return data.url;
    },
    onSuccess: (url) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.entitlements });
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    },
  });
}

export function useBillingPortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { response, data } = await createBillingPortal();
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to open billing portal");
      }
      return data.url;
    },
    onSuccess: (url) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.entitlements });
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { response, data } = await cancelBillingSubscription();
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to cancel subscription");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.entitlements });
    },
  });
}

export function useSyncBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { response, data } = await syncBillingSubscription();
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to sync billing state");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.entitlements });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (confirmEmail: string) => {
      const { response, data } = await deleteAccount(confirmEmail);
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to delete account");
      }
      return data;
    },
  });
}

export function useRedeemAccessCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { response, data } = await redeemAccessCode(code);
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to redeem access code");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.entitlements });
    },
  });
}

export function useAccessCodePurchaseCheckout() {
  return useMutation({
    mutationFn: async (context?: {
      source?:
        | "website_nav"
        | "website_pricing"
        | "chat_input"
        | "settings"
        | "pricing_page"
        | "success_page";
    }) => {
      const { response, data } = await createAccessCodePurchaseCheckoutSession(context);
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to start access-code checkout");
      }
      return data.url;
    },
    onSuccess: (url) => {
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    },
  });
}

export function useResendPurchasedAccessCodeEmail() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { response, data } = await resendPurchasedAccessCodeEmail(sessionId);
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to resend access-code email");
      }
      return data;
    },
  });
}
