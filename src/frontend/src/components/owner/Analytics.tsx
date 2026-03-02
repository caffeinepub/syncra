import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isThisMonth, isThisYear, isToday } from "date-fns";
import { Clock, IndianRupee, Receipt, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  useActivityLogs,
  useBillsForBusiness,
  useTotalBillsCount,
  useTotalSales,
} from "../../hooks/useQueries";
import { SkeletonCard, SkeletonRow } from "../shared/SkeletonCard";
import { BillStatusBadge } from "../shared/StatusBadge";

export function Analytics() {
  const { business } = useAppContext();
  const { data: totalSales, isLoading: salesLoading } = useTotalSales(
    business?.id,
  );
  const { data: totalBills, isLoading: billsLoading } = useTotalBillsCount(
    business?.id,
  );
  const { data: bills, isLoading: billHistoryLoading } = useBillsForBusiness(
    business?.id,
  );
  const { data: logs, isLoading: logsLoading } = useActivityLogs(business?.id);

  const [filter, setFilter] = useState<"today" | "month" | "year">("today");

  const filteredBills = (bills ?? []).filter((b) => {
    const ts = Number(b.createdAt / BigInt(1_000_000));
    const d = new Date(ts);
    if (filter === "today") return isToday(d);
    if (filter === "month") return isThisMonth(d);
    return isThisYear(d);
  });

  const filteredTotal = filteredBills
    .filter((b) => b.status === "finalized")
    .reduce((acc, b) => acc + b.totalAmount, BigInt(0));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={
            salesLoading
              ? null
              : `₹${Math.round(Number((totalSales ?? BigInt(0)) / BigInt(100))).toLocaleString("en-IN")}`
          }
          icon={<IndianRupee className="h-5 w-5" />}
          color="oklch(0.72 0.18 155)"
          sub="All time"
        />
        <StatCard
          label="Total Bills"
          value={billsLoading ? null : (totalBills ?? BigInt(0)).toString()}
          icon={<Receipt className="h-5 w-5" />}
          color="oklch(0.72 0.14 195)"
          sub="All time"
        />
        <StatCard
          label="Period Revenue"
          value={`₹${Math.round(Number(filteredTotal / BigInt(100))).toLocaleString("en-IN")}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="oklch(0.78 0.17 73)"
          sub={
            filter === "today"
              ? "Today"
              : filter === "month"
                ? "This month"
                : "This year"
          }
        />
        <StatCard
          label="Period Bills"
          value={filteredBills.length.toString()}
          icon={<Clock className="h-5 w-5" />}
          color="oklch(0.68 0.18 285)"
          sub={
            filter === "today"
              ? "Today"
              : filter === "month"
                ? "This month"
                : "This year"
          }
        />
      </div>

      {/* Tabs for filter + lists */}
      <Tabs defaultValue="bills" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-muted/50 h-8">
            <TabsTrigger value="bills" className="text-xs h-6">
              Bill History
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs h-6">
              Activity Log
            </TabsTrigger>
          </TabsList>

          {/* Period filter */}
          <div className="flex gap-1">
            {(["today", "month", "year"] as const).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
                style={
                  filter === f
                    ? {
                        background: "oklch(0.72 0.14 195)",
                        color: "oklch(0.08 0.01 264)",
                      }
                    : {}
                }
              >
                {f === "today" ? "Today" : f === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </div>

        <TabsContent value="bills">
          {billHistoryLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : filteredBills.length === 0 ? (
            <EmptyState label="No bills in this period" />
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {filteredBills.map((bill, i) => (
                  <motion.div
                    key={bill.id.toString()}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-xl p-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-mono text-xs text-muted-foreground mb-1">
                        #{bill.id.toString().slice(-8).padStart(8, "0")}
                      </p>
                      <p className="text-sm font-medium">
                        ₹
                        {Math.round(
                          Number(bill.totalAmount / BigInt(100)),
                        ).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(Number(bill.createdAt / BigInt(1_000_000))),
                          "MMM d, HH:mm",
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <BillStatusBadge status={bill.status} />
                      <p className="text-xs text-muted-foreground">
                        {bill.items.length} items
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="activity">
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : (logs ?? []).length === 0 ? (
            <EmptyState label="No activity logs yet" />
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {(logs ?? [])
                  .slice()
                  .reverse()
                  .map((log, i) => (
                    <motion.div
                      key={log.logId.toString()}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="glass-card rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{log.action}</p>
                          {log.metadata && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {log.metadata}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">
                          {format(
                            new Date(Number(log.timestamp / BigInt(1_000_000))),
                            "HH:mm",
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  color: string;
  sub: string;
}) {
  return (
    <div className="stat-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div style={{ color }}>{icon}</div>
      </div>
      {value === null ? (
        <div className="skeleton h-7 w-20 rounded mt-1" />
      ) : (
        <p className="text-2xl font-display font-bold" style={{ color }}>
          {value}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="glass-card rounded-xl p-10 text-center">
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
