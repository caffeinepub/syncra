import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BillToken,
  ExternalBlob,
  Product,
  ProductVariant,
  SalesmanActivityLog,
  SalesmanInvite,
  UserProfile,
} from "../backend.d";
import { BillStatus, ProductState } from "../backend.d";
import { useActor } from "./useActor";

// ─── Products ──────────────────────────────────────────────

// bigint 0n is falsy in JS — use explicit null/undefined check instead of !!
function isDefined<T>(v: T | undefined | null): v is T {
  return v !== undefined && v !== null;
}

// Serialize products for offline cache — strip ExternalBlob objects down to
// plain URL strings so JSON.stringify doesn't lose the getDirectURL method.
function serializeProductsForCache(
  products: Product[],
): Array<Omit<Product, "imageUrls"> & { imageUrls: string[] }> {
  return products.map((p) => ({
    ...p,
    imageUrls: p.imageUrls.map((b) => {
      try {
        return b.getDirectURL();
      } catch {
        return "";
      }
    }),
  }));
}

// Rehydrate cached products — convert plain URL strings back into ExternalBlob
// instances via ExternalBlob.fromURL so .getDirectURL() works correctly.
import { ExternalBlob as ExternalBlobImpl } from "../backend";
function deserializeProductsFromCache(
  raw: Array<Omit<Product, "imageUrls"> & { imageUrls: string[] }>,
): Product[] {
  return raw.map((p) => ({
    ...p,
    id: BigInt(p.id),
    businessId: BigInt(p.businessId),
    imageUrls: (p.imageUrls ?? [])
      .filter(Boolean)
      .map((url) => ExternalBlobImpl.fromURL(url)),
  })) as unknown as Product[];
}

export function useProducts(businessId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<Product[]>({
    queryKey: ["products", businessId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(businessId)) return [];
      const products = await actor.getProductsForBusiness(businessId);
      // Cache serialized (URL strings only) for offline use
      try {
        localStorage.setItem(
          `syncra_products_${businessId}`,
          JSON.stringify(serializeProductsForCache(products)),
        );
      } catch {
        // Ignore storage quota errors
      }
      return products;
    },
    enabled: !!actor && !isFetching && isDefined(businessId),
    placeholderData: () => {
      if (!isDefined(businessId)) return [];
      const cached = localStorage.getItem(`syncra_products_${businessId}`);
      if (cached) {
        try {
          const raw = JSON.parse(cached) as Array<
            Omit<Product, "imageUrls"> & { imageUrls: string[] }
          >;
          return deserializeProductsFromCache(raw);
        } catch {
          return [];
        }
      }
      return [];
    },
    staleTime: 60_000,
  });
}

export function useProductVariants(productId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<ProductVariant[]>({
    queryKey: ["variants", productId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(productId)) return [];
      return actor.getVariantsForProduct(productId);
    },
    enabled: !!actor && !isFetching && isDefined(productId),
    staleTime: 10_000,
  });
}

export function useGetUserById(userId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["user", userId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(userId)) return null;
      const result = await actor.getUserById(userId);
      return result ?? null;
    },
    enabled: !!actor && !isFetching && isDefined(userId),
    staleTime: 300_000, // names rarely change
  });
}

export function useLockVariant() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.lockVariant(variantId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["variants"] });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("not available") || msg.includes("out of stock")) {
        // Generic fallback — ProductDetailPage shows salesman name on the tile itself
        toast.error(
          "This item is currently being handled by another salesman.",
        );
      } else {
        toast.error("Could not lock this item — try again");
      }
    },
  });
}

export function useReleaseVariant() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.releaseVariantLock(variantId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["variants"] });
    },
    onError: () => {
      toast.error("Failed to release lock");
    },
  });
}

export function useResetVariantToAvailable() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: bigint) => {
      if (!actor) throw new Error("Not connected");
      // releaseVariantLock resets the variant back to available state
      await actor.releaseVariantLock(variantId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["variants"] });
      toast.success("Variant reset to Available");
    },
    onError: () => {
      toast.error("Failed to reset variant state");
    },
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      businessId: bigint;
      name: string;
      sku: string;
      category: string;
      description: string;
      imageUrls: ExternalBlob[];
      isActive: boolean;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addProduct(
        params.businessId,
        params.name,
        params.sku,
        params.category,
        params.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params.imageUrls as any[],
        params.isActive,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product added successfully");
    },
    onError: (error) => {
      console.error("addProduct error:", error);
      toast.error(
        `Failed to add product: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
  });
}

export function useEditProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      productId: bigint;
      name: string;
      sku: string;
      category: string;
      description: string;
      imageUrls: ExternalBlob[];
      isActive: boolean;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.editProduct(
        params.productId,
        params.name,
        params.sku,
        params.category,
        params.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params.imageUrls as any[],
        params.isActive,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated");
    },
    onError: (error) => {
      console.error("editProduct error:", error);
      toast.error(
        `Failed to update product: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
  });
}

export function useAddVariant() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      productId: bigint;
      variantName: string;
      stockCount: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addProductVariant(
        params.productId,
        params.variantName,
        params.stockCount,
        ProductState.available,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["variants"] });
      toast.success("Variant added");
    },
    onError: () => {
      toast.error("Failed to add variant");
    },
  });
}

export function useEditVariant() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      variantId: bigint;
      variantName: string;
      stockCount: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.editProductVariant(
        params.variantId,
        params.variantName,
        params.stockCount,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["variants"] });
      toast.success("Variant updated");
    },
    onError: () => {
      toast.error("Failed to update variant");
    },
  });
}

// ─── Bills ─────────────────────────────────────────────────

export function usePendingBills(businessId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<BillToken[]>({
    queryKey: ["pendingBills", businessId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(businessId)) return [];
      return actor.getPendingBills(businessId);
    },
    enabled: !!actor && !isFetching && isDefined(businessId),
    refetchInterval: 10_000,
  });
}

export function useBillsForBusiness(businessId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<BillToken[]>({
    queryKey: ["bills", businessId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(businessId)) return [];
      return actor.getBillsForBusiness(businessId);
    },
    enabled: !!actor && !isFetching && isDefined(businessId),
    staleTime: 30_000,
  });
}

export function useCreateBillToken() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      businessId: bigint;
      items: Array<{
        variantId: bigint;
        quantity: bigint;
        priceAtSale: bigint;
      }>;
      totalAmount: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createBillToken(
        params.businessId,
        params.items,
        params.totalAmount,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pendingBills"] });
      void qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill token generated!");
    },
    onError: () => {
      toast.error("Failed to create bill token");
    },
  });
}

export function useFinalizeBill() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (billId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.finalizeBill(billId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pendingBills"] });
      void qc.invalidateQueries({ queryKey: ["bills"] });
      void qc.invalidateQueries({ queryKey: ["variants"] });
      toast.success("Payment confirmed! Stock updated.");
    },
    onError: () => {
      toast.error("Failed to finalize bill");
    },
  });
}

export function useCancelBill() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (billId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.cancelBill(billId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pendingBills"] });
      void qc.invalidateQueries({ queryKey: ["bills"] });
      void qc.invalidateQueries({ queryKey: ["variants"] });
      toast.success("Bill cancelled — items are available again");
    },
    onError: () => {
      toast.error("Failed to cancel bill");
    },
  });
}

// ─── Analytics ─────────────────────────────────────────────

export function useTotalSales(businessId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["totalSales", businessId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(businessId)) return BigInt(0);
      return actor.getTotalSales(businessId);
    },
    enabled: !!actor && !isFetching && isDefined(businessId),
    staleTime: 60_000,
  });
}

export function useTotalBillsCount(businessId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["totalBillsCount", businessId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(businessId)) return BigInt(0);
      return actor.getTotalBillsCount(businessId);
    },
    enabled: !!actor && !isFetching && isDefined(businessId),
    staleTime: 60_000,
  });
}

export function useActivityLogs(businessId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<SalesmanActivityLog[]>({
    queryKey: ["activityLogs", businessId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(businessId)) return [];
      return actor.getActivityLogs(businessId);
    },
    enabled: !!actor && !isFetching && isDefined(businessId),
    staleTime: 60_000,
  });
}

// ─── Staff / Invites ────────────────────────────────────────

export function useInvites(businessId: bigint | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery<SalesmanInvite[]>({
    queryKey: ["invites", businessId?.toString()],
    queryFn: async () => {
      if (!actor || !isDefined(businessId)) return [];
      return actor.getInvitesForBusiness(businessId);
    },
    enabled: !!actor && !isFetching && isDefined(businessId),
    staleTime: 30_000,
  });
}

export function useInviteSalesman() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { businessId: bigint; contactInfo: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.inviteSalesman(params.businessId, params.contactInfo);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Invite sent!");
    },
    onError: () => {
      toast.error("Failed to send invite");
    },
  });
}

export function useRevokeInvite() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.revokeInvite(inviteId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Invite revoked");
    },
    onError: () => {
      toast.error("Failed to revoke invite");
    },
  });
}

export function useDeactivateSalesman() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (salesmanUserId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.deactivateSalesman(salesmanUserId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Salesman deactivated");
    },
    onError: () => {
      toast.error("Failed to deactivate salesman");
    },
  });
}

export { BillStatus };
