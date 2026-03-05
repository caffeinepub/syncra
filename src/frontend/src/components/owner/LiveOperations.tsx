import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  Activity,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  User,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import type { BillToken } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import {
  useCancelBill,
  useFinalizeBill,
  useGetUserById,
  usePendingBills,
} from "../../hooks/useQueries";
import { SkeletonCard } from "../shared/SkeletonCard";
import { BillStatusBadge } from "../shared/StatusBadge";

export function LiveOperations() {
  const { business } = useAppContext();
  const { data: bills, isLoading } = usePendingBills(business?.id);
  const finalize = useFinalizeBill();
  const cancel = useCancelBill();

  const pendingBills = bills?.filter((b) => b.status === "pending") ?? [];
  const lockedItemCount = pendingBills.reduce(
    (acc, b) => acc + b.items.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Bills"
          value={pendingBills.length}
          color="oklch(0.78 0.17 73)"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Locked Items"
          value={lockedItemCount}
          color="oklch(0.72 0.14 195)"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Live Activity"
          value="Active"
          color="oklch(0.72 0.18 155)"
          icon={<Activity className="h-5 w-5" />}
          pulse
        />
      </div>

      {/* Pending bills */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            Pending Bills
            {pendingBills.length > 0 && (
              <Badge
                className="h-5 min-w-5 text-xs font-bold rounded-full"
                style={{
                  background: "oklch(0.78 0.17 73 / 0.2)",
                  color: "oklch(0.78 0.17 73)",
                  border: "1px solid oklch(0.78 0.17 73 / 0.3)",
                }}
              >
                {pendingBills.length}
              </Badge>
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
                <motion.div
                  key={bill.id.toString()}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <BillCard
                    bill={bill}
                    onFinalize={() => finalize.mutate(bill.id)}
                    onCancel={() => cancel.mutate(bill.id)}
                    isFinalizePending={finalize.isPending}
                    isCancelPending={cancel.isPending}
                  />
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// ─── Inner component: resolves salesman name per bill ──────────────────────

function BillCard({
  bill,
  onFinalize,
  onCancel,
  isFinalizePending,
  isCancelPending,
}: {
  bill: BillToken;
  onFinalize: () => void;
  onCancel: () => void;
  isFinalizePending: boolean;
  isCancelPending: boolean;
}) {
  const { data: salesman } = useGetUserById(bill.salesmanId);

  const salesmanName = salesman?.name ?? "Unknown salesman";
  const initials = salesmanName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div className="glass-card rounded-xl p-4" data-ocid="live.bill.card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Bill header: ID + status + salesman attribution */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">
              #{bill.id.toString().slice(-6).padStart(6, "0")}
            </span>
            <BillStatusBadge status={bill.status} />

            {/* Salesman attribution pill */}
            <div
              className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: "oklch(0.72 0.14 195 / 0.12)",
                border: "1px solid oklch(0.72 0.14 195 / 0.25)",
                color: "oklch(0.72 0.14 195)",
              }}
            >
              {/* Avatar circle with initials */}
              <span
                className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold shrink-0"
                style={{
                  background: "oklch(0.72 0.14 195 / 0.3)",
                  color: "oklch(0.92 0.04 195)",
                }}
              >
                {initials || <User className="h-2.5 w-2.5" />}
              </span>
              <span>{salesmanName}</span>
            </div>
          </div>

          {/* Bill details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p
                className="font-bold"
                style={{ color: "oklch(0.72 0.18 155)" }}
              >
                ₹
                {Math.round(
                  Number(bill.totalAmount / BigInt(100)),
                ).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Items</p>
              <p className="font-medium">
                {bill.items.length} item
                {bill.items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium text-xs">
                {format(
                  new Date(Number(bill.createdAt / BigInt(1_000_000))),
                  "HH:mm",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5 h-8"
          style={{
            background: "oklch(0.72 0.18 155 / 0.15)",
            color: "oklch(0.72 0.18 155)",
            border: "1px solid oklch(0.72 0.18 155 / 0.3)",
          }}
          variant="outline"
          onClick={onFinalize}
          disabled={isFinalizePending}
          data-ocid="live.bill.confirm_button"
        >
          {isFinalizePending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Finalize
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-destructive border-destructive/20 hover:bg-destructive/10"
          onClick={onCancel}
          disabled={isCancelPending}
          data-ocid="live.bill.cancel_button"
        >
          {isCancelPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Cancel
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  pulse,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div className="stat-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="relative" style={{ color }}>
          {icon}
          {pulse && (
            <span
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse-ring"
              style={{ background: color }}
            />
          )}
        </div>
      </div>
      <p className="text-2xl font-display font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="glass-card rounded-xl p-12 text-center"
      data-ocid="live.bill.empty_state"
    >
      <div
        className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4"
        style={{ background: "oklch(0.72 0.18 155 / 0.1)" }}
      >
        <CheckCircle2
          className="h-7 w-7"
          style={{ color: "oklch(0.72 0.18 155)" }}
        />
      </div>
      <p className="font-semibold text-foreground mb-1">All clear!</p>
      <p className="text-sm text-muted-foreground">
        No pending bills right now. Salesmen are on the floor.
      </p>
    </div>
  );
}
