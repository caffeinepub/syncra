import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCreateBillToken, useReleaseVariant } from "../../hooks/useQueries";
import { mergeVariantNameCache } from "../../utils/profilePhoto";

export interface CartItem {
  variantId: bigint;
  productId: bigint;
  productName: string;
  variantName: string;
  quantity: number;
  price: number; // in rupees (not paise)
}

interface EditableCartItem extends CartItem {
  editPrice: string; // local editable price string
}

interface BillReviewSheetProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
  businessId: bigint | undefined;
}

export function BillReviewSheet({
  open,
  onClose,
  cartItems,
  setCartItems,
  businessId,
}: BillReviewSheetProps) {
  const createBill = useCreateBillToken();
  const releaseVariant = useReleaseVariant();

  // Local editable state initialized from cartItems
  const [editableItems, setEditableItems] = useState<EditableCartItem[]>([]);

  // Sync editableItems when cartItems changes (from outside, e.g. adding more items)
  useEffect(() => {
    setEditableItems((prev) => {
      // Merge: keep existing edits for items already in list, add new ones
      const prevMap = new Map(prev.map((i) => [i.variantId.toString(), i]));
      return cartItems.map((item) => {
        const existing = prevMap.get(item.variantId.toString());
        if (existing) {
          // Update quantity from cart but keep user-edited price
          return { ...existing, quantity: item.quantity };
        }
        return { ...item, editPrice: item.price.toString() };
      });
    });
  }, [cartItems]);

  const updateQty = (variantId: bigint, delta: number) => {
    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.variantId !== variantId) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }),
    );
  };

  const updatePrice = (variantId: bigint, value: string) => {
    const numVal = Number.parseFloat(value);
    if (value !== "" && (Number.isNaN(numVal) || numVal < 0)) {
      toast.error("Price must be a positive number");
      // Reset to previous value
      setEditableItems((prev) =>
        prev.map((item) =>
          item.variantId === variantId
            ? { ...item, editPrice: item.price.toString() }
            : item,
        ),
      );
      return;
    }
    setEditableItems((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, editPrice: value } : item,
      ),
    );
  };

  const removeItem = (variantId: bigint) => {
    const updated = editableItems.filter((i) => i.variantId !== variantId);
    setEditableItems(updated);
    // Release the lock on the backend
    releaseVariant.mutate(variantId);
    // Sync back to cart state
    setCartItems(updated.map(({ editPrice: _, ...rest }) => rest));
  };

  const grandTotal = editableItems.reduce((sum, item) => {
    const price = Number.parseFloat(item.editPrice) || 0;
    return sum + price * item.quantity;
  }, 0);

  const handleConfirm = async () => {
    if (!businessId || editableItems.length === 0) return;

    // Validate prices
    for (const item of editableItems) {
      const price = Number.parseFloat(item.editPrice) || 0;
      if (price <= 0) {
        toast.error(`Please enter a valid price for ${item.variantName}`);
        return;
      }
    }

    // Save variant names to localStorage cache before confirming
    const variantMap: Record<
      string,
      { productName: string; variantName: string }
    > = {};
    for (const item of editableItems) {
      variantMap[item.variantId.toString()] = {
        productName: item.productName,
        variantName: item.variantName,
      };
    }
    mergeVariantNameCache(businessId.toString(), variantMap);

    const items = editableItems.map((item) => ({
      variantId: item.variantId,
      quantity: BigInt(item.quantity),
      priceAtSale: BigInt(
        Math.round((Number.parseFloat(item.editPrice) || 0) * 100),
      ),
    }));

    const totalAmount = BigInt(Math.round(grandTotal * 100));

    try {
      await createBill.mutateAsync({ businessId, items, totalAmount });
      setCartItems([]);
      onClose();
    } catch {
      // error toast shown by useCreateBillToken
    }
  };

  const handleClose = () => {
    if (editableItems.length > 0) {
      toast.info("Cart preserved — tap Review Bill to continue");
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="bottom"
        className="h-[90vh] flex flex-col p-0 border-border/50 bg-background"
        data-ocid="bill_review.sheet"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-lg flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(0.72 0.18 155 / 0.15)" }}
              >
                <ShoppingBag
                  className="h-4 w-4"
                  style={{ color: "oklch(0.72 0.18 155)" }}
                />
              </div>
              Review Bill
            </SheetTitle>
            <span className="text-sm text-muted-foreground">
              {editableItems.length} item{editableItems.length !== 1 ? "s" : ""}
            </span>
          </div>
        </SheetHeader>

        {/* Scrollable item list */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {editableItems.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 gap-4"
                data-ocid="bill_review.empty_state"
              >
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-muted">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground mb-1">
                    Cart is empty
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Go back to the catalog to add products
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={onClose}
                  data-ocid="bill_review.secondary_button"
                >
                  Go to Catalog
                </Button>
              </motion.div>
            ) : (
              <div className="p-4 space-y-3 pb-32">
                {editableItems.map((item, idx) => {
                  const linePrice =
                    (Number.parseFloat(item.editPrice) || 0) * item.quantity;
                  return (
                    <motion.div
                      key={item.variantId.toString()}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="rounded-2xl p-4 border border-border/40 bg-card/50"
                      data-ocid={`bill_review.item.${idx + 1}`}
                    >
                      {/* Top row: name + remove */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm leading-tight truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.variantName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/20 transition-colors text-destructive"
                          data-ocid={`bill_review.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Bottom row: qty stepper + price + line total */}
                      <div className="flex items-center gap-3">
                        {/* Quantity stepper */}
                        <div className="flex items-center rounded-xl border border-border/50 overflow-hidden bg-muted/30">
                          <button
                            type="button"
                            onClick={() => updateQty(item.variantId, -1)}
                            className="h-8 w-8 flex items-center justify-center hover:bg-accent/40 transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.variantId, 1)}
                            className="h-8 w-8 flex items-center justify-center hover:bg-accent/40 transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Price input */}
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            ₹
                          </span>
                          <Input
                            type="number"
                            className="pl-6 h-8 text-sm bg-input/30 border-border/40"
                            placeholder="0"
                            value={item.editPrice}
                            onChange={(e) =>
                              updatePrice(item.variantId, e.target.value)
                            }
                            min={0}
                            step={1}
                            data-ocid="bill_review.input"
                          />
                        </div>

                        {/* Line total */}
                        <div className="text-right shrink-0 min-w-[60px]">
                          <p
                            className="text-sm font-bold"
                            style={{ color: "oklch(0.72 0.18 155)" }}
                          >
                            ₹{Math.round(linePrice).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            subtotal
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky bottom bar */}
        {editableItems.length > 0 && (
          <div
            className="shrink-0 border-t border-border/40 p-4 space-y-3 bg-background/90"
            style={{ backdropFilter: "blur(8px)" }}
          >
            {/* Grand total */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Grand Total</span>
              <span
                className="text-xl font-bold"
                style={{ color: "oklch(0.72 0.18 155)" }}
              >
                ₹{Math.round(grandTotal).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-border/50"
                onClick={handleClose}
                data-ocid="bill_review.cancel_button"
              >
                Add More Products
              </Button>
              <Button
                className="flex-1 h-11 font-semibold shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.18 155), oklch(0.68 0.18 170))",
                  color: "oklch(0.08 0.01 50)",
                }}
                disabled={createBill.isPending}
                onClick={() => void handleConfirm()}
                data-ocid="bill_review.confirm_button"
              >
                {createBill.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {createBill.isPending ? "Generating..." : "Confirm & Generate"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
