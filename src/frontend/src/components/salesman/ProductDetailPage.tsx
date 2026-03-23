import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type {
  ExternalBlob,
  Product,
  ProductVariant,
  UserProfile,
} from "../../backend.d";
import type { CartItem } from "./BillReviewSheet";

/** Safely get a display URL from an ExternalBlob that may be a plain object after cache rehydration */
function safeGetURL(blob: ExternalBlob): string {
  try {
    if (typeof blob.getDirectURL === "function") return blob.getDirectURL();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = blob as any;
    if (typeof raw.url === "string") return raw.url;
    return "";
  } catch {
    return "";
  }
}
import { ProductState } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import { useActor } from "../../hooks/useActor";
import {
  useCreateBillToken,
  useLockVariant,
  useProductVariants,
  useReleaseVariant,
} from "../../hooks/useQueries";

interface Props {
  product: Product;
  onBack: () => void;
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
}

export function ProductDetailPage({
  product,
  onBack,
  cartItems,
  setCartItems,
}: Props) {
  const { userProfile } = useAppContext();
  const { actor } = useActor();
  const { data: variants, isLoading } = useProductVariants(product.id);
  const lockMutation = useLockVariant();
  const releaseMutation = useReleaseVariant();
  const createBill = useCreateBillToken();

  // Derive locked items for THIS product from the shared cart
  const myCartForProduct = cartItems.filter(
    (ci) => ci.productId === product.id,
  );

  // lockedItems is a map of variantId -> quantity, derived from cart
  const lockedItems: Record<string, number> = {};
  for (const ci of myCartForProduct) {
    lockedItems[ci.variantId.toString()] = ci.quantity;
  }

  const [showBillModal, setShowBillModal] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

  // Quantity selector state
  const [selectedVariantForLock, setSelectedVariantForLock] =
    useState<ProductVariant | null>(null);
  const [lockQty, setLockQty] = useState(1);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const myUserId = userProfile?.userId;
  const qc = useQueryClient();

  // Collect unique lockedBy userIds from variants (only for locks by others)
  const otherLockerIds = useMemo(() => {
    if (!variants) return [];
    const ids = new Set<string>();
    for (const v of variants) {
      if (
        v.state === ProductState.locked &&
        v.lockedBy !== undefined &&
        v.lockedBy !== null &&
        v.lockedBy !== myUserId
      ) {
        ids.add(v.lockedBy.toString());
      }
    }
    return Array.from(ids);
  }, [variants, myUserId]);

  // Fetch profiles for all lockers in parallel
  const lockerQueries = useQueries({
    queries: otherLockerIds.map((idStr) => ({
      queryKey: ["user", idStr],
      queryFn: async (): Promise<UserProfile | null> => {
        if (!actor) return null;
        const result = await actor.getUserById(BigInt(idStr));
        return result ?? null;
      },
      enabled: !!actor,
      staleTime: 300_000,
    })),
  });

  // Build a map from userId string -> name
  const lockerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (let i = 0; i < otherLockerIds.length; i++) {
      const profile = lockerQueries[i]?.data;
      if (profile) {
        map[otherLockerIds[i]] = profile.name;
      }
    }
    return map;
  }, [otherLockerIds, lockerQueries]);

  const handleVariantTap = async (variant: ProductVariant) => {
    // Only block tap if truly out of stock (stockCount = 0)
    // Don't block on state=sold because backend may set that incorrectly when stock > 0
    if (variant.stockCount === BigInt(0)) return;

    const isMyLock =
      variant.state === ProductState.locked &&
      myUserId &&
      variant.lockedBy === myUserId;
    const isMyLocalLock = lockedItems[variant.id.toString()] !== undefined;
    const isOtherLock =
      variant.state === ProductState.locked &&
      variant.lockedBy !== undefined &&
      variant.lockedBy !== null &&
      !(myUserId && variant.lockedBy === myUserId) &&
      !isMyLocalLock;

    if (isOtherLock) {
      const lockerName =
        variant.lockedBy !== undefined && variant.lockedBy !== null
          ? (lockerNameMap[variant.lockedBy.toString()] ?? "Another salesman")
          : "Another salesman";
      const { toast } = await import("sonner");
      toast.warning(`${lockerName} is currently selling this variant.`, {
        description: "It will become available if they release it.",
      });
      return;
    }

    if (isMyLock || isMyLocalLock) {
      // Release lock — remove from shared cart
      const updatedCart = cartItems.filter((ci) => ci.variantId !== variant.id);
      setCartItems(updatedCart);
      await releaseMutation.mutateAsync(variant.id);
    } else {
      // Show quantity selector
      setSelectedVariantForLock(variant);
      setLockQty(1);
    }
  };

  // A variant is "mine" if I have a local lock entry for it (lockedItems is the source of truth)
  const myLockedVariants = (variants ?? []).filter(
    (v) => lockedItems[v.id.toString()] !== undefined,
  );

  // Pre-populate prices when the bill modal opens
  const basePrice = product.basePrice;
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only on modal open
  useEffect(() => {
    if (showBillModal && myLockedVariants.length > 0) {
      setItemPrices((prev) => {
        const next = { ...prev };
        for (const v of myLockedVariants) {
          const key = v.id.toString();
          // Only pre-fill if the salesman hasn't already typed a custom price
          if (!next[key]) {
            const effectivePrice = v.price > 0n ? v.price : basePrice;
            next[key] =
              effectivePrice > 0n
                ? (Number(effectivePrice) / 100).toString()
                : "";
          }
        }
        return next;
      });
    }
  }, [showBillModal]);

  const handleGenerateBill = async () => {
    if (!userProfile?.businessId) return;
    const items = myLockedVariants.map((v) => ({
      variantId: v.id,
      quantity: BigInt(lockedItems[v.id.toString()] ?? 1),
      priceAtSale: BigInt(
        Math.round(Number.parseFloat(itemPrices[v.id.toString()] || "0") * 100),
      ),
    }));
    const total = items.reduce((acc, i) => acc + i.priceAtSale, BigInt(0));
    await createBill.mutateAsync({
      businessId: userProfile.businessId,
      items,
      totalAmount: total,
    });
    setShowBillModal(false);
    // Clear only this product's items from the shared cart
    setCartItems(cartItems.filter((ci) => ci.productId !== product.id));
    onBack();
  };

  const totalAmount = myLockedVariants.reduce(
    (acc, v) => acc + Number.parseFloat(itemPrices[v.id.toString()] || "0"),
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="fixed inset-0 z-50 mesh-bg overflow-auto"
    >
      <div className="max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="glass-sidebar sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display font-bold truncate">{product.name}</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Image carousel */}
          <div className="rounded-2xl overflow-hidden glass-card">
            {product.imageUrls.length > 0 ? (
              <div className="relative">
                <div
                  className="flex overflow-x-auto snap-x snap-mandatory scrollbar-thin"
                  style={{ scrollSnapType: "x mandatory" }}
                >
                  {product.imageUrls.map((url, i) => {
                    const imgSrc = safeGetURL(url);
                    if (!imgSrc) return null;
                    return (
                      <button
                        // biome-ignore lint/suspicious/noArrayIndexKey: image list is stable
                        key={i}
                        type="button"
                        className="shrink-0 w-full snap-center aspect-[4/3] cursor-zoom-in block"
                        onClick={() => setLightboxIndex(i)}
                        aria-label={`View ${product.name} fullscreen, photo ${i + 1}`}
                      >
                        <img
                          src={imgSrc}
                          alt={`${product.name} ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
                {product.imageUrls.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                    {product.imageUrls.map((_, i) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: image dot list is stable
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === 0
                            ? "w-4 bg-foreground"
                            : "w-1.5 bg-foreground/40"
                        }`}
                      />
                    ))}
                  </div>
                )}
                <div className="absolute bottom-10 right-3 bg-black/50 rounded-md px-2 py-1 text-white text-xs pointer-events-none">
                  Tap to expand
                </div>
              </div>
            ) : (
              <div
                className="aspect-[4/3] flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.22 0.03 195), oklch(0.18 0.025 215))",
                }}
              >
                <Package className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h2 className="text-xl font-display font-bold">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: "oklch(0.72 0.14 195 / 0.4)",
                      color: "oklch(0.72 0.14 195)",
                      background: "oklch(0.72 0.14 195 / 0.1)",
                    }}
                  >
                    {product.category}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    SKU: {product.sku}
                  </span>
                </div>
              </div>
            </div>
            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                {product.description}
              </p>
            )}
          </div>

          {/* Variants */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Select Variants</h3>
            {isLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : (variants ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No variants available
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(variants ?? []).map((variant) => {
                  const myQty = lockedItems[variant.id.toString()];
                  const isMyLock =
                    myQty !== undefined ||
                    (variant.state === ProductState.locked &&
                      !!myUserId &&
                      variant.lockedBy === myUserId);
                  const otherLockerName =
                    !isMyLock &&
                    variant.state === ProductState.locked &&
                    variant.lockedBy !== undefined &&
                    variant.lockedBy !== null
                      ? (lockerNameMap[variant.lockedBy.toString()] ?? null)
                      : null;
                  return (
                    <VariantTile
                      key={variant.id.toString()}
                      variant={variant}
                      isMyLock={isMyLock}
                      lockedQty={myQty}
                      otherLockerName={otherLockerName}
                      onClick={() => void handleVariantTap(variant)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Generate Bill Button */}
        {myLockedVariants.length > 0 && !selectedVariantForLock && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-20 left-0 right-0 px-4 z-40"
          >
            <Button
              className="w-full max-w-2xl mx-auto flex h-12 gap-2 text-base font-semibold shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 155), oklch(0.68 0.18 170))",
                color: "oklch(0.08 0.01 264)",
              }}
              onClick={() => setShowBillModal(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {(() => {
                const totalUnits = myLockedVariants.reduce(
                  (sum, v) => sum + (lockedItems[v.id.toString()] ?? 1),
                  0,
                );
                return `Generate Bill Token (${totalUnits} item${totalUnits !== 1 ? "s" : ""})`;
              })()}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Quantity Lock Panel */}
      <AnimatePresence>
        {selectedVariantForLock && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-0 right-0 px-4 z-50"
          >
            <div className="max-w-2xl mx-auto glass-card rounded-2xl p-4 border border-border/50 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">
                    {selectedVariantForLock.variantName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(selectedVariantForLock.stockCount)} available
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVariantForLock(null)}
                  className="p-1 rounded-full hover:bg-accent/50 transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <p className="text-sm font-medium">Quantity:</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLockQty((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 rounded-full border border-border/50 flex items-center justify-center hover:bg-accent/50 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-lg">
                    {lockQty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLockQty((q) =>
                        Math.min(
                          Number(selectedVariantForLock.stockCount),
                          q + 1,
                        ),
                      )
                    }
                    className="h-8 w-8 rounded-full border border-border/50 flex items-center justify-center hover:bg-accent/50 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Button
                className="w-full"
                style={{
                  background: "oklch(0.78 0.17 73)",
                  color: "oklch(0.08 0.01 264)",
                }}
                onClick={async () => {
                  const variantToLock = selectedVariantForLock;
                  const qty = lockQty;
                  setSelectedVariantForLock(null);
                  setLockQty(1);
                  try {
                    await lockMutation.mutateAsync(variantToLock.id);
                    // Compute price: variant price > 0 ? variant price : base price (in rupees)
                    const effectivePrice =
                      variantToLock.price > 0n
                        ? Number(variantToLock.price) / 100
                        : Number(product.basePrice) / 100;

                    // Add to shared cart (or update if already exists)
                    const existingIdx = cartItems.findIndex(
                      (ci) => ci.variantId === variantToLock.id,
                    );
                    if (existingIdx >= 0) {
                      const updated = cartItems.map((ci, i) =>
                        i === existingIdx ? { ...ci, quantity: qty } : ci,
                      );
                      setCartItems(updated);
                    } else {
                      setCartItems([
                        ...cartItems,
                        {
                          variantId: variantToLock.id,
                          productId: product.id,
                          productName: product.name,
                          variantName: variantToLock.variantName,
                          quantity: qty,
                          price: effectivePrice,
                        },
                      ]);
                    }
                  } catch {
                    // error toast already shown by useLockVariant onError
                    void qc.invalidateQueries({ queryKey: ["variants"] });
                  }
                }}
                disabled={lockMutation.isPending}
              >
                {lockMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Lock {lockQty} unit{lockQty !== 1 ? "s" : ""}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill Modal */}
      <Dialog open={showBillModal} onOpenChange={setShowBillModal}>
        <DialogContent className="max-w-sm glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">
              Generate Bill Token
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Review or adjust the price for each item
            </p>
            <ScrollArea className="max-h-60">
              <div className="space-y-4 pr-1">
                {myLockedVariants.map((v) => {
                  const hasVariantPrice = v.price > 0n;
                  const hasBasePrice = product.basePrice > 0n;
                  return (
                    <div key={v.id.toString()} className="space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{v.variantName}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {lockedItems[v.id.toString()] ?? 1}
                          </p>
                        </div>
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            ₹
                          </span>
                          <Input
                            type="number"
                            className="pl-6 h-8 text-sm bg-input/50"
                            placeholder="0"
                            value={itemPrices[v.id.toString()] ?? ""}
                            onChange={(e) =>
                              setItemPrices((p) => ({
                                ...p,
                                [v.id.toString()]: e.target.value,
                              }))
                            }
                            min={0}
                            step={1}
                          />
                        </div>
                      </div>
                      {/* Price hint */}
                      {hasVariantPrice ? (
                        <p className="text-[11px] text-muted-foreground/60 text-right">
                          Listed: ₹
                          {(Number(v.price) / 100).toLocaleString("en-IN")}
                        </p>
                      ) : hasBasePrice ? (
                        <p className="text-[11px] text-muted-foreground/60 text-right">
                          Base price: ₹
                          {(Number(product.basePrice) / 100).toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="border-t border-border/50 pt-2 flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span
                className="font-bold"
                style={{ color: "oklch(0.72 0.18 155)" }}
              >
                ₹{Math.round(totalAmount).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBillModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createBill.isPending}
              onClick={() => void handleGenerateBill()}
              style={{
                background: "oklch(0.72 0.18 155)",
                color: "oklch(0.08 0.01 264)",
              }}
            >
              {createBill.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
              Confirm Bill Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && product.imageUrls.length > 0 && (
          <ImageLightbox
            images={product.imageUrls}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: ExternalBlob[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight")
        setCurrent((c) => Math.min(images.length - 1, c + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {current + 1} / {images.length}
        </div>
      )}

      {/* Main image */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by window listener in useEffect */}
      <div
        className="max-w-screen-lg max-h-screen w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={safeGetURL(images[current])}
          alt={`${current + 1} of ${images.length}`}
          className="max-w-full max-h-full object-contain rounded-lg select-none"
          draggable={false}
        />
      </div>

      {/* Prev/Next arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrent((c) => Math.max(0, c - 1));
            }}
            disabled={current === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrent((c) => Math.min(images.length - 1, c + 1));
            }}
            disabled={current === images.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {images.map((_, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: stable image list
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrent(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-6 bg-white" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function VariantTile({
  variant,
  isMyLock,
  lockedQty,
  otherLockerName,
  onClick,
}: {
  variant: ProductVariant;
  isMyLock: boolean;
  lockedQty?: number;
  otherLockerName: string | null;
  onClick: () => void;
}) {
  // FIXED: base availability on stockCount, not just state
  // The backend may incorrectly set state=#sold even when stockCount > 0
  const isOutOfStock = variant.stockCount === BigInt(0);
  // Only truly sold if backend says sold AND there's actually no stock left
  const isSold =
    variant.state === ProductState.sold && variant.stockCount === BigInt(0);
  const isLocked = variant.state === ProductState.locked;
  const isOtherLock =
    isLocked &&
    !isMyLock &&
    variant.lockedBy !== undefined &&
    variant.lockedBy !== null;
  // Available = has stock AND (not locked by someone else) AND not truly sold AND not my lock
  const isAvailable = !isOutOfStock && !isOtherLock && !isSold && !isMyLock;
  const isLowStock =
    isAvailable &&
    variant.stockCount > BigInt(0) &&
    variant.stockCount < BigInt(3);

  let borderColor = "oklch(0.28 0.02 264)";
  let bgColor = "oklch(0.18 0.015 264)";
  let textColor = "oklch(0.96 0.005 264)";

  if (isMyLock) {
    borderColor = "oklch(0.78 0.17 73 / 0.6)";
    bgColor = "oklch(0.35 0.12 73 / 0.2)";
    textColor = "oklch(0.78 0.17 73)";
  } else if (isOtherLock || isSold || isOutOfStock) {
    borderColor = "oklch(0.25 0.01 264)";
    bgColor = "oklch(0.15 0.01 264)";
    textColor = "oklch(0.40 0.01 264)";
  } else if (isAvailable) {
    borderColor = "oklch(0.72 0.18 155 / 0.3)";
    bgColor = "oklch(0.18 0.02 155 / 0.5)";
  }

  const disabled = isOtherLock || isSold || isOutOfStock;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-center transition-all duration-150 min-h-16 ${
        disabled
          ? "cursor-not-allowed"
          : "hover:scale-[1.02] active:scale-[0.98]"
      }`}
      style={{ borderColor, background: bgColor, color: textColor }}
    >
      <span
        className={`text-sm font-semibold ${isSold || isOutOfStock ? "line-through opacity-60" : ""}`}
      >
        {variant.variantName}
      </span>

      {isMyLock && (
        <span
          className="text-[10px] font-bold"
          style={{ color: "oklch(0.78 0.17 73)" }}
        >
          🟡 Locked
          {lockedQty !== undefined && lockedQty > 1 ? ` ×${lockedQty}` : ""}
        </span>
      )}
      {isOtherLock && (
        <span className="text-[9px] text-center leading-tight opacity-70 px-0.5">
          {otherLockerName ? `${otherLockerName} selling` : "Reserved"}
        </span>
      )}
      {isSold && (
        <span className="text-[10px]" style={{ color: "oklch(0.65 0.22 25)" }}>
          Sold
        </span>
      )}
      {isOutOfStock && !isSold && (
        <span className="text-[10px] opacity-60">Out of stock</span>
      )}
      {isAvailable && !isLowStock && (
        <span className="text-[10px]" style={{ color: "oklch(0.72 0.18 155)" }}>
          {variant.stockCount.toString()} left
        </span>
      )}
      {isLowStock && (
        <span
          className="text-[10px] font-bold animate-pulse"
          style={{ color: "oklch(0.78 0.17 73)" }}
        >
          Only {variant.stockCount.toString()} left!
        </span>
      )}
    </button>
  );
}
