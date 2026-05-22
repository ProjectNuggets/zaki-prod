import { useQuery } from "@tanstack/react-query";
import { fetchProductRegistry } from "@/lib/api";

export const productKeys = {
  registry: ["products", "registry"] as const,
};

export function useProductRegistry() {
  return useQuery({
    queryKey: productKeys.registry,
    queryFn: fetchProductRegistry,
    staleTime: 30_000,
    retry: false,
  });
}
