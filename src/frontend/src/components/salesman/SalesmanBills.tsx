import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { ChevronRight, Receipt } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { BillToken } from "../../backend.d";
import { BillStatus } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import { useBillsForBusiness } from "../../hooks/useQueries";
import { getVariantNameCache } from "../../utils/profilePhoto";
import { SkeletonCard } from "../shared/SkeletonCard";
import { BillStatusBadge } from "../shared/StatusBadge";

type StatusFilter = "all" | "pending" | "finalized" | "cancelled";

export function SalesmanBills() {
  const { userProfile } = useAppContext();
  const { data: bills, isLoading } = useBillsForBusiness(
    userProfile?.businessId,
  );
  const [selectedBill, setSelectedBill] = useState<BillToken | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const businessIdStr = userProfile?.businessId?.toString() ?? "";

  const nameCache = useMemo(
    () => getVariantNameCache(businessIdStr),
    [businessIdStr],
  );

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

  const statusFilters: StatusFilter[] = [
    "all",
    "pending",
    "finalized",
    "cancelled",
  ];

  const totalEarnings = myBills
    .filter((b) => b.status === BillStatus.finalized)
    .reduce((acc, b) => acc + b.totalAmount, BigInt(0));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg">My Bills</h2>
          <p className="text-sm text-muted-foreground">
            {myBills.length} bill{myBills.length !== 1 ? "s" : ""} generated
          </p>
        </div>
        <div
          className="px-3 py-2 rounded-xl text-sm font-bold shrink-0"
          style={{
            background: "oklch(0.72 0.18 155 / 0.12)",
            color: "oklch(0.72 0.18 155)",
          }}
        >
          \u20b9
          {Math.round(Number(totalEarnings) / 100).toLocaleString("en-IN")}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => setStatusFilter(f)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize"
            style={{
              background:
                statusFilter === f
                  ? "oklch(0.78 0.19 72 / 0.15)"
                  : "oklch(0.17 0.016 45 / 0.6)",
              color:
                statusFilter === f
                  ? "oklch(0.78 0.19 72)"
                  : "oklch(0.52 0.016 75)",
              border: `1px solid ${
                statusFilter === f
                  ? "oklch(0.78 0.19 72 / 0.3)"
                  : "oklch(0.22 0.018 45 / 0.5)"
              }`,
            }}
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
        <div
          className="glass-card rounded-2xl p-12 text-center"
          data-ocid="bills.empty_state"
        >
          <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold mb-1">No bills yet</p>
          <p className="text-muted-foreground text-sm">
            Bills you generate will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedBills.map((bill, i) => (
            <motion.button
              type="button"
              key={bill.id.toString()}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedBill(bill)}
              className="w-full glass-card rounded-xl px-4 py-3.5 flex items-center justify-between transition-all hover:shadow-glow-sm text-left active:scale-[0.98]"
              data-ocid={`bills.item.${i + 1}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "oklch(0.78 0.19 72 / 0.12)",
                    color: "oklch(0.78 0.19 72)",
                  }}
                >
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-semibold text-sm truncate">
                    Bill #{bill.id.toString().slice(-6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(
                      new Date(Number(bill.createdAt) / 1_000_000),
                      "MMM d, h:mm a",
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-right">
                  <p className="font-bold text-sm">
                    \u20b9
                    {Math.round(Number(bill.totalAmount) / 100).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {bill.items.length} items
                  </p>
                </div>
                <BillStatusBadge status={bill.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Bill detail sheet */}
      <Sheet
        open={!!selectedBill}
        onOpenChange={(o) => {
          if (!o) setSelectedBill(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[85vh]"
          data-ocid="bills.sheet"
        >
          <SheetHeader className="mb-5">
            <SheetTitle className="font-display">
              Bill #{selectedBill?.id.toString().slice(-6)}
            </SheetTitle>
          </SheetHeader>

          {selectedBill && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <BillStatusBadge status={selectedBill.status} />
                <p className="text-xs text-muted-foreground">
                  {format(
                    new Date(Number(selectedBill.createdAt) / 1_000_000),
                    "MMM d, yyyy, h:mm a",
                  )}
                </p>
              </div>

              <div className="space-y-1">
                {selectedBill.items.map((item, i) => {
                  const cached = nameCache[item.variantId.toString()];
                  const displayName = cached
                    ? `${cached.productName} \u2014 ${cached.variantName}`
                    : `Item #${item.variantId.toString().slice(-6)}`;
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: bill items have no unique id
                      key={i}
                      className="flex items-center justify-between py-3 border-b border-border/40"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: "oklch(0.22 0.018 45 / 0.8)",
                            color: "oklch(0.78 0.19 72)",
                          }}
                        >
                          {item.quantity.toString()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            \u20b9
                            {Math.round(
                              Number(item.priceAtSale ?? 0) / 100,
                            ).toLocaleString("en-IN")}{" "}
                            each
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-sm">
                        \u20b9
                        {Math.round(
                          Number(
                            (item.priceAtSale ?? BigInt(0)) *
                              BigInt(item.quantity),
                          ) / 100,
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div
                className="flex items-center justify-between p-4 rounded-2xl"
                style={{
                  background: "oklch(0.78 0.19 72 / 0.08)",
                  border: "1px solid oklch(0.78 0.19 72 / 0.15)",
                }}
              >
                <span className="font-semibold">Total</span>
                <span
                  className="font-bold text-xl"
                  style={{ color: "oklch(0.78 0.19 72)" }}
                >
                  \u20b9
                  {Math.round(
                    Number(selectedBill.totalAmount) / 100,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
