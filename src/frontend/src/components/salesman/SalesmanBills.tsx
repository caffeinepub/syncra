import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { ChevronRight, Receipt, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { BillToken } from "../../backend.d";
import { BillStatus } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import { useBillsForBusiness } from "../../hooks/useQueries";
import { SkeletonCard } from "../shared/SkeletonCard";
import { BillStatusBadge } from "../shared/StatusBadge";

export function SalesmanBills() {
  const { userProfile } = useAppContext();
  const { data: bills, isLoading } = useBillsForBusiness(
    userProfile?.businessId,
  );
  const [selectedBill, setSelectedBill] = useState<BillToken | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "finalized" | "cancelled"
  >("all");

  // Filter to only this salesman's bills
  const myBills = (bills ?? []).filter(
    (b) => b.salesmanId === userProfile?.userId,
  );

  const filteredBills = myBills.filter((b) => {
    if (statusFilter === "all") return true;
    return b.status === statusFilter;
  });

  const sortedBills = filteredBills.slice().sort((a, b) => {
    if (b.createdAt > a.createdAt) return 1;
    if (b.createdAt < a.createdAt) return -1;
    return 0;
  });

  const statusFilters: Array<"all" | "pending" | "finalized" | "cancelled"> = [
    "all",
    "pending",
    "finalized",
    "cancelled",
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold mb-1">My Bills</h2>
        <p className="text-sm text-muted-foreground">
          {myBills.length} bill token{myBills.length !== 1 ? "s" : ""} generated
        </p>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all capitalize ${
              statusFilter === f
                ? "text-primary-foreground"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
            style={
              statusFilter === f
                ? {
                    background: "oklch(0.72 0.14 195)",
                    color: "oklch(0.08 0.01 264)",
                  }
                : {}
            }
            data-ocid={`bills.${f}.tab`}
          >
            {f === "all" ? `All (${myBills.length})` : f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sortedBills.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="space-y-3 pr-2 pb-4">
            {sortedBills.map((bill, i) => (
              <motion.button
                type="button"
                key={bill.id.toString()}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card rounded-xl p-4 w-full text-left hover:border-border/60 transition-all active:scale-[0.99]"
                onClick={() => setSelectedBill(bill)}
                data-ocid={`bills.item.${i + 1}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{bill.id.toString().slice(-8).padStart(8, "0")}
                      </span>
                      <BillStatusBadge status={bill.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p
                          className="font-bold"
                          style={{ color: "oklch(0.72 0.18 155)" }}
                        >
                          ₹
                          {Math.round(
                            Number(bill.totalAmount) / 100,
                          ).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Items</p>
                        <p className="font-medium">{bill.items.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="font-medium text-xs">
                          {format(
                            new Date(Number(bill.createdAt) / 1_000_000),
                            "MMM d, HH:mm",
                          )}
                        </p>
                      </div>
                    </div>
                    {bill.finalizedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Finalized:{" "}
                        {format(
                          new Date(Number(bill.finalizedAt) / 1_000_000),
                          "MMM d, HH:mm",
                        )}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Bill detail sheet */}
      <BillDetailSheet
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
      />
    </div>
  );
}

function BillDetailSheet({
  bill,
  onClose,
}: {
  bill: BillToken | null;
  onClose: () => void;
}) {
  if (!bill) return null;

  const grandTotal = Number(bill.totalAmount) / 100;

  const getVariantName = (variantId: bigint): string => {
    return `Variant #${variantId.toString().slice(-4)}`;
  };

  return (
    <Sheet open={!!bill} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col p-0 border-border/50 bg-background"
        data-ocid="bill_detail.sheet"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="font-display text-base flex items-center gap-2">
                <Receipt
                  className="h-4 w-4"
                  style={{ color: "oklch(0.72 0.14 195)" }}
                />
                Bill #{bill.id.toString().slice(-8).padStart(8, "0")}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <BillStatusBadge status={bill.status} />
                <span className="text-xs text-muted-foreground">
                  {format(
                    new Date(Number(bill.createdAt) / 1_000_000),
                    "MMM d, yyyy \u00b7 HH:mm",
                  )}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
              data-ocid="bill_detail.close_button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
          {bill.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No items in this bill
            </p>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center text-xs text-muted-foreground px-1 mb-1">
                <span className="flex-1">Item</span>
                <span className="w-12 text-center">Qty</span>
                <span className="w-20 text-right">Price</span>
                <span className="w-20 text-right">Total</span>
              </div>

              {bill.items.map((item, idx) => {
                const priceEach = Number(item.priceAtSale) / 100;
                const qty = Number(item.quantity);
                const lineTotal = priceEach * qty;
                const variantLabel = getVariantName(item.variantId);
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: bill items are positionally stable
                    key={idx}
                    className="rounded-xl p-3 border border-border/40 bg-card/50"
                    data-ocid={`bill_detail.item.${idx + 1}`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          Item #{(idx + 1).toString().padStart(2, "0")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {variantLabel}
                        </p>
                      </div>

                      {/* Qty */}
                      <div className="w-12 text-center">
                        <span
                          className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-lg text-xs font-bold"
                          style={{
                            background: "oklch(0.72 0.14 195 / 0.15)",
                            color: "oklch(0.72 0.14 195)",
                          }}
                        >
                          ×{qty}
                        </span>
                      </div>

                      {/* Price each */}
                      <div className="w-20 text-right">
                        <p className="text-xs text-muted-foreground">each</p>
                        <p className="text-sm font-medium">
                          ₹{priceEach.toLocaleString("en-IN")}
                        </p>
                      </div>

                      {/* Line total */}
                      <div className="w-20 text-right">
                        <p className="text-xs text-muted-foreground">total</p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "oklch(0.72 0.18 155)" }}
                        >
                          ₹{Math.round(lineTotal).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer total */}
        <div
          className="shrink-0 border-t border-border/40 px-4 py-4 bg-background/90"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {bill.items.length} item{bill.items.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Grand Total:
              </span>
              <span
                className="text-xl font-bold"
                style={{ color: "oklch(0.72 0.18 155)" }}
              >
                ₹{Math.round(grandTotal).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {bill.status === BillStatus.finalized && bill.finalizedAt && (
            <div
              className="rounded-lg px-3 py-2 text-xs text-center"
              style={{
                background: "oklch(0.72 0.18 155 / 0.1)",
                color: "oklch(0.72 0.18 155)",
              }}
            >
              ✓ Payment confirmed &amp; finalized on{" "}
              {format(
                new Date(Number(bill.finalizedAt) / 1_000_000),
                "MMM d, yyyy",
              )}
            </div>
          )}

          {bill.status === BillStatus.cancelled && (
            <div
              className="rounded-lg px-3 py-2 text-xs text-center"
              style={{
                background: "oklch(0.65 0.22 25 / 0.1)",
                color: "oklch(0.65 0.22 25)",
              }}
            >
              ✕ This bill was cancelled
            </div>
          )}

          {bill.status === BillStatus.pending && (
            <Badge
              className="w-full justify-center py-2 text-xs"
              style={{
                background: "oklch(0.78 0.17 73 / 0.15)",
                color: "oklch(0.78 0.17 73)",
                border: "1px solid oklch(0.78 0.17 73 / 0.3)",
              }}
            >
              Awaiting owner confirmation
            </Badge>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState() {
  return (
    <div
      className="glass-card rounded-2xl p-16 text-center"
      data-ocid="bills.empty_state"
    >
      <div
        className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4"
        style={{ background: "oklch(0.72 0.14 195 / 0.1)" }}
      >
        <Receipt
          className="h-7 w-7"
          style={{ color: "oklch(0.72 0.14 195)" }}
        />
      </div>
      <p className="font-semibold text-foreground mb-1">No bills yet</p>
      <p className="text-sm text-muted-foreground">
        Bills you generate from the catalog will appear here
      </p>
    </div>
  );
}
