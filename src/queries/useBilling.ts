import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBillingSubscription,
  createBillingPortal,
  createCheckoutSession,
  deleteAccount,
  fetchEntitlements,
} from "@/lib/api";
import { useAuthStore } from "@/stores";

export const billingKeys = {
  entitlements: ["billing", "entitlements"] as const,
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

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: "student" | "personal") => {
      const { response, data } = await createCheckoutSession(plan);
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
