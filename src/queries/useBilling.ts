import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBillingSubscription,
  createAccessCodePurchaseCheckoutSession,
  createBillingPortal,
  createCheckoutSession,
  createTopupCheckoutSession,
  deleteAccount,
  fetchBillingConfig,
  fetchEntitlements,
  fetchAnonymousMeterStatus,
  fetchMeterStatus,
  fetchPlatformUsageSummary,
  redeemAccessCode,
  resendPurchasedAccessCodeEmail,
  syncBillingSubscription,
} from "@/lib/api";
import type { ProductTelemetrySource } from "@/lib/productTelemetry";
import { useAuthStore } from "@/stores";

export const billingKeys = {
  entitlements: ["billing", "entitlements"] as const,
  config: ["billing", "config"] as const,
  platformUsageSummary: ["billing", "platformUsageSummary"] as const,
  meterStatus: ["billing", "meterStatus"] as const,
  anonymousMeterStatus: ["billing", "anonymousMeterStatus"] as const,
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
    queryKey: [...billingKeys.config, token ? "auth" : "public"] as const,
    queryFn: fetchBillingConfig,
    enabled: true,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function usePlatformUsageSummary() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: billingKeys.platformUsageSummary,
    queryFn: fetchPlatformUsageSummary,
    enabled: Boolean(token),
    staleTime: 30_000,
    retry: false,
  });
}

export function useMeterStatus() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: billingKeys.meterStatus,
    queryFn: fetchMeterStatus,
    enabled: Boolean(token),
    staleTime: 30_000,
    retry: false,
  });
}

export function useAnonymousMeterStatus(enabled = true) {
  return useQuery({
    queryKey: billingKeys.anonymousMeterStatus,
    queryFn: fetchAnonymousMeterStatus,
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

function invalidateCommercialState(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: billingKeys.entitlements });
  queryClient.invalidateQueries({ queryKey: billingKeys.platformUsageSummary });
  queryClient.invalidateQueries({ queryKey: billingKeys.meterStatus });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  type CheckoutPlan = "student" | "personal" | "agent" | "learn" | "complete";
  return useMutation({
    mutationFn: async (
      payload:
        | CheckoutPlan
        | {
            plan: CheckoutPlan;
            provider?: "stripe" | "paddle" | "creem";
            interval?: "monthly" | "yearly";
            context?: {
              source?: ProductTelemetrySource;
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
      invalidateCommercialState(queryClient);
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
      invalidateCommercialState(queryClient);
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    },
  });
}

export function useTopupCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      packId: string;
      context?: {
        source?: ProductTelemetrySource;
      };
    }) => {
      const { response, data } = await createTopupCheckoutSession(payload.packId, payload.context);
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to start top-up checkout");
      }
      return data.url;
    },
    onSuccess: (url) => {
      invalidateCommercialState(queryClient);
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
      invalidateCommercialState(queryClient);
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
      invalidateCommercialState(queryClient);
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
      invalidateCommercialState(queryClient);
    },
  });
}

export function useAccessCodePurchaseCheckout() {
  return useMutation({
    mutationFn: async (context?: {
      source?: ProductTelemetrySource;
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
