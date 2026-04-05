import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Package,
  User,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { BillToken } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import {
  useCancelBill,
  useFinalizeBill,
  useGetUserById,
  usePendingBills,
} from "../../hooks/useQueries";
import { lookupVariantName } from "../../utils/profilePhoto";
import { SkeletonCard } from "../shared/SkeletonCard";
import { BillStatusBadge } from "../shared/StatusBadge";

export function LiveOperations() {
  const { business } = useAppContext();
  const { data: bills, isLoading } = usePendingBills(business?.id);
  const finalizeMutation = useFinalizeBill();
  const cancelMutation = useCancelBill();

  const [finalizingIds, setFinalizingIds] = useState<Set<string>>(new Set());
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  const pendingBills = bills?.filter((b) => b.status === "pending") ?? [];
  const lockedItemCount = pendingBills.reduce(
    (acc, b) => acc + b.items.length,
    0,
  );
  const activeSalesmenCount = new Set(
    pendingBills.map((b) => b.salesmanId.toString()),
  ).size;

  const handleFinalize = async (billId: bigint) => {
    const idStr = billId.toString();
    setFinalizingIds((prev) => new Set(prev).add(idStr));
    try {
      await finalizeMutation.mutateAsync(billId);
    } finally {
      setFinalizingIds((prev) => {
        const s = new Set(prev);
        s.delete(idStr);
        return s;
      });
    }
  };

  const handleCancel = async (billId: bigint) => {
    const idStr = billId.toString();
    setCancellingIds((prev) => new Set(prev).add(idStr));
    try {
      await cancelMutation.mutateAsync(billId);
    } finally {
      setCancellingIds((prev) => {
        const s = new Set(prev);
        s.delete(idStr);
        return s;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Pending Bills"
          value={pendingBills.length}
          color="oklch(0.78 0.17 68)"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Locked Items"
          value={lockedItemCount}
          color="oklch(0.78 0.19 72)"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Active Salesmen"
          value={activeSalesmenCount}
          color="oklch(0.72 0.18 155)"
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      {/* Pending bills section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            Pending Bills
            {pendingBills.length > 0 && (
              <span
                className="h-5 min-w-5 px-1.5 text-xs font-bold rounded-full flex items-center justify-center"
                style={{
                  background: "oklch(0.78 0.17 68 / 0.2)",
                  color: "oklch(0.78 0.17 68)",
                }}
              >
                {pendingBills.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Auto-refreshes every 10s
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <SkeletonCard key={i} lines={3} />
            ))}
          </div>
        ) : pendingBills.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-3 pr-1">
              {pendingBills.map((bill, i) => (
                <BillCard
                  key={bill.id.toString()}
                  bill={bill}
                  index={i + 1}
                  businessId={business?.id?.toString() ?? ""}
                  isFinalizing={finalizingIds.has(bill.id.toString())}
                  isCancelling={cancellingIds.has(bill.id.toString())}
                  onFinalize={() => handleFinalize(bill.id)}
                  onCancel={() => handleCancel(bill.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium leading-tight">
          {label}
        </p>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `${color.replace(")", " / 0.15)")}`,
            color,
          }}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-display font-bold" style={{ color }}>
        {value}
      </p>
    </motion.div>
  );
}

function BillCard({
  bill,
  index,
  businessId,
  isFinalizing,
  isCancelling,
  onFinalize,
  onCancel,
}: {
  bill: BillToken;
  index: number;
  businessId: string;
  isFinalizing: boolean;
  isCancelling: boolean;
  onFinalize: () => void;
  onCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: salesman } = useGetUserById(bill.salesmanId);
  const ts = Number(bill.createdAt) / 1_000_000;
  const salesmanName =
    salesman?.name ?? `SM#${bill.salesmanId.toString().slice(-4)}`;
  const initials = salesmanName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Build always-visible item summary
  const itemSummary = bill.items
    .map((item) => {
      const info = lookupVariantName(businessId, item.variantId.toString());
      return info
        ? `${info.productName} — ${info.variantName}`
        : `Item #${item.variantId.toString().slice(-6)}`;
    })
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl overflow-hidden"
      data-ocid={`operations.item.${index}`}
    >
      {/* Bill header */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
              style={{
                background: "oklch(0.78 0.19 72 / 0.15)",
                color: "oklch(0.78 0.19 72)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{salesmanName}</p>
              <p className="text-xs text-muted-foreground">
                Bill #{bill.id.toString().slice(-6)} &middot;{" "}
                {format(new Date(ts), "h:mm a")}
              </p>
              {/* Always-visible item summary */}
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: "oklch(0.78 0.17 68)" }}
                title={itemSummary}
              >
                {itemSummary}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="font-bold text-sm">
                ₹
                {Math.round(Number(bill.totalAmount) / 100).toLocaleString(
                  "en-IN",
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {bill.items.length} item{bill.items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              data-ocid={`operations.toggle.${index}`}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            className="flex-1 gap-1.5 h-9 text-xs"
            style={{
              background: "oklch(0.72 0.18 155)",
              color: "oklch(0.08 0.01 45)",
            }}
            onClick={onFinalize}
            disabled={isFinalizing || isCancelling}
            data-ocid={`operations.confirm_button.${index}`}
          >
            {isFinalizing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onCancel}
            disabled={isFinalizing || isCancelling}
            data-ocid={`operations.delete_button.${index}`}
          >
            {isCancelling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Decline
          </Button>
        </div>
      </div>

      {/* Expandable items */}
      {expanded && (
        <div className="border-t border-border/40 px-4 py-3 space-y-2.5">
          {bill.items.map((item, i) => {
            const info = lookupVariantName(
              businessId,
              item.variantId.toString(),
            );
            const label = info
              ? `${info.productName} — ${info.variantName}`
              : `Item #${item.variantId.toString().slice(-6)}`;
            return (
              <div
                key={`${bill.id.toString()}-item-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      background: "oklch(0.22 0.018 45)",
                      color: "oklch(0.52 0.016 75)",
                    }}
                  >
                    {item.quantity.toString()}
                  </div>
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className="font-medium">
                  ₹
                  {Math.round(
                    Number(item.priceAtSale ?? BigInt(0)) / 100,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div
      className="glass-card rounded-2xl p-12 text-center"
      data-ocid="operations.empty_state"
    >
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: "oklch(0.72 0.18 155 / 0.1)",
          color: "oklch(0.72 0.18 155)",
        }}
      >
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h3 className="font-display font-semibold mb-1">All Clear</h3>
      <p className="text-muted-foreground text-sm">
        No pending bills at the moment
      </p>
    </div>
  );
}
