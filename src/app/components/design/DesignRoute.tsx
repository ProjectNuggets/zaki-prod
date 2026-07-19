import { ProductAccessGate } from "@/app/components/ProductAccessGate";
import { useProductRegistry } from "@/queries/useProducts";
import { useAuthStore } from "@/stores";
import { DesignPage } from "./DesignPage";

export function DesignRoute() {
  const token = useAuthStore((state) => state.token);
  const registry = useProductRegistry();
  const product = (registry.data?.data?.products ?? []).find((item) => item.productId === "design");

  if (!token) {
    return <ProductAccessGate productId="design" title="ZAKI Design" mode="coming_soon" />;
  }
  if (registry.isLoading) {
    return <div className="zaki-v2-loading min-h-screen" aria-label="Loading ZAKI Design" />;
  }
  if (product?.state !== "enabled") {
    return <ProductAccessGate productId="design" title="ZAKI Design" mode="coming_soon" />;
  }
  return <DesignPage />;
}
