import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isThisMonth, isThisYear, isToday } from "date-fns";
import { Clock, IndianRupee, Receipt, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BillToken, SalesmanActivityLog } from "../../backend.d";
import { BillStatus } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import {
  useActivityLogs,
  useBillsForBusiness,
  useGetUserById,
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
    const ts = Number(b.createdAt) / 1_000_000;
    const d = new Date(ts);
    if (filter === "today") return isToday(d);
    if (filter === "month") return isThisMonth(d);
    return isThisYear(d);
  });

  const filteredTotal = filteredBills
    .filter((b) => b.status === BillStatus.finalized)
    .reduce((acc, b) => acc + b.totalAmount, BigInt(0));

  const finalizedBillsCount = filteredBills.filter(
    (b) => b.status === BillStatus.finalized,
  ).length;

  // Build chart data grouped by day/month
  const chartData = buildChartData(filteredBills, filter);

  // Filter activity logs by same period
  const filteredLogs = (logs ?? []).filter((log) => {
    const ts = Number(log.timestamp) / 1_000_000;
    const d = new Date(ts);
    if (filter === "today") return isToday(d);
    if (filter === "month") return isThisMonth(d);
    return isThisYear(d);
  });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={
            salesLoading
              ? null
              : `₹${Math.round(Number(totalSales ?? BigInt(0)) / 100).toLocaleString("en-IN")}`
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
          value={`₹${Math.round(Number(filteredTotal) / 100).toLocaleString("en-IN")}`}
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
          label="Finalized Bills"
          value={finalizedBillsCount.toString()}
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

      {/* Revenue trend bar chart */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-2xl p-4 mt-2">
          <p className="text-sm font-semibold mb-3">Revenue Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "oklch(0.58 0.015 264)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "oklch(0.58 0.015 264)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [
                  `₹${Math.round(value).toLocaleString("en-IN")}`,
                  "Revenue",
                ]}
                contentStyle={{
                  background: "oklch(0.15 0.015 264)",
                  border: "1px solid oklch(0.28 0.02 264)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "oklch(0.72 0.14 195)" }}
              />
              <Bar
                dataKey="revenue"
                fill="oklch(0.72 0.14 195)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs for filter + lists */}
      <Tabs defaultValue="bills" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-muted/50 h-8">
            <TabsTrigger
              value="bills"
              className="text-xs h-6"
              data-ocid="analytics.bills.tab"
            >
              Bill History
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="text-xs h-6"
              data-ocid="analytics.activity.tab"
            >
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
                data-ocid={`analytics.${f}.toggle`}
              >
                {f === "today" ? "Today" : f === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Bill History Tab ─── */}
        <TabsContent value="bills">
          {billHistoryLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : filteredBills.length === 0 ? (
            <EmptyState
              label="No bills in this period"
              data-ocid="analytics.bills.empty_state"
            />
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {filteredBills.map((bill, i) => (
                  <motion.div
                    key={bill.id.toString()}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <BillHistoryRow bill={bill} index={i + 1} />
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ─── Activity Log Tab ─── */}
        <TabsContent value="activity">
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              label="No activity logs in this period"
              data-ocid="analytics.activity.empty_state"
            />
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {filteredLogs
                  .slice()
                  .reverse()
                  .map((log, i) => (
                    <motion.div
                      key={log.logId.toString()}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <ActivityLogRow log={log} index={i + 1} />
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

// ─── Chart data builder ────────────────────────────────────────────────

function buildChartData(
  bills: BillToken[],
  filter: "today" | "month" | "year",
): Array<{ label: string; revenue: number }> {
  const finalizedBills = bills.filter((b) => b.status === BillStatus.finalized);
  const buckets = new Map<string, number>();

  for (const bill of finalizedBills) {
    const ts = Number(bill.createdAt) / 1_000_000;
    const d = new Date(ts);
    let key: string;
    if (filter === "today") {
      key = format(d, "HH:00");
    } else if (filter === "month") {
      key = format(d, "MMM d");
    } else {
      key = format(d, "MMM");
    }
    const prev = buckets.get(key) ?? 0;
    buckets.set(key, prev + Number(bill.totalAmount) / 100);
  }

  return Array.from(buckets.entries()).map(([label, revenue]) => ({
    label,
    revenue,
  }));
}

// ─── Inner component: bill history row with salesman name ──────────────────

function BillHistoryRow({
  bill,
  index,
}: {
  bill: BillToken;
  index: number;
}) {
  const { data: salesman } = useGetUserById(bill.salesmanId);
  const salesmanName = salesman?.name ?? "Unknown";
  const initials = salesmanName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div
      className="glass-card rounded-xl p-3 flex items-center justify-between gap-4"
      data-ocid={`analytics.bill.item.${index}`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-muted-foreground mb-1">
          #{bill.id.toString().slice(-8).padStart(8, "0")}
        </p>
        <p className="text-sm font-bold">
          ₹{Math.round(Number(bill.totalAmount) / 100).toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(Number(bill.createdAt) / 1_000_000), "MMM d, HH:mm")}
        </p>

        {/* Salesman attribution */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span
            className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold shrink-0"
            style={{
              background: "oklch(0.72 0.14 195 / 0.25)",
              color: "oklch(0.72 0.14 195)",
            }}
          >
            {initials}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: "oklch(0.72 0.14 195)" }}
          >
            {salesmanName}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <BillStatusBadge status={bill.status} />
        <p className="text-xs text-muted-foreground">
          {bill.items.length} items
        </p>
      </div>
    </div>
  );
}

// ─── Inner component: activity log row with salesman avatar + name ──────────

function ActivityLogRow({
  log,
  index,
}: {
  log: SalesmanActivityLog;
  index: number;
}) {
  const { data: salesman } = useGetUserById(log.salesmanId);
  const salesmanName = salesman?.name ?? "Unknown salesman";
  const initials = salesmanName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div
      className="glass-card rounded-xl p-3"
      data-ocid={`analytics.activity.item.${index}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with initials */}
        <div
          className="flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold"
          style={{
            background: "oklch(0.72 0.14 195 / 0.18)",
            color: "oklch(0.72 0.14 195)",
            border: "1px solid oklch(0.72 0.14 195 / 0.3)",
          }}
        >
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Salesman name label */}
          <p
            className="text-xs font-semibold mb-0.5"
            style={{ color: "oklch(0.72 0.14 195)" }}
          >
            {salesmanName}
          </p>
          {/* Action */}
          <p className="text-sm font-medium text-foreground">{log.action}</p>
          {log.metadata && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {log.metadata}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground shrink-0 pt-0.5">
          {format(new Date(Number(log.timestamp) / 1_000_000), "HH:mm")}
        </p>
      </div>
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

function EmptyState({
  label,
  "data-ocid": dataOcid,
}: {
  label: string;
  "data-ocid"?: string;
}) {
  return (
    <div
      className="glass-card rounded-xl p-10 text-center"
      data-ocid={dataOcid}
    >
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
