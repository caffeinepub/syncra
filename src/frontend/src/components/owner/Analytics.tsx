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

type Period = "today" | "month" | "year";

function buildChartData(bills: BillToken[], period: Period) {
  const finalized = bills.filter((b) => b.status === BillStatus.finalized);
  if (period === "today") {
    const hours: Record<number, number> = {};
    for (const b of finalized) {
      const h = new Date(Number(b.createdAt) / 1_000_000).getHours();
      hours[h] = (hours[h] ?? 0) + Math.round(Number(b.totalAmount) / 100);
    }
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${h}:00`,
      value: hours[h] ?? 0,
    })).filter((d) => d.value > 0);
  }
  if (period === "month") {
    const days: Record<number, number> = {};
    for (const b of finalized) {
      const d = new Date(Number(b.createdAt) / 1_000_000).getDate();
      days[d] = (days[d] ?? 0) + Math.round(Number(b.totalAmount) / 100);
    }
    return Object.entries(days)
      .map(([d, v]) => ({ label: `Day ${d}`, value: v }))
      .sort(
        (a, b) => Number(a.label.split(" ")[1]) - Number(b.label.split(" ")[1]),
      );
  }
  const months: Record<number, number> = {};
  for (const b of finalized) {
    const m = new Date(Number(b.createdAt) / 1_000_000).getMonth();
    months[m] = (months[m] ?? 0) + Math.round(Number(b.totalAmount) / 100);
  }
  const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return Object.entries(months)
    .map(([m, v]) => ({ label: MONTH_LABELS[Number(m)], value: v }))
    .sort(
      (a, b) => MONTH_LABELS.indexOf(a.label) - MONTH_LABELS.indexOf(b.label),
    );
}

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

  const [filter, setFilter] = useState<Period>("today");

  const filteredBills = (bills ?? []).filter((b) => {
    const d = new Date(Number(b.createdAt) / 1_000_000);
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
  const chartData = buildChartData(filteredBills, filter);

  const filteredLogs = (logs ?? []).filter((log) => {
    const d = new Date(Number(log.timestamp) / 1_000_000);
    if (filter === "today") return isToday(d);
    if (filter === "month") return isThisMonth(d);
    return isThisYear(d);
  });

  const PERIOD_LABELS: Record<Period, string> = {
    today: "Today",
    month: "This Month",
    year: "This Year",
  };

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex items-center gap-2">
        {(["today", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setFilter(p)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background:
                filter === p
                  ? "oklch(0.78 0.19 72 / 0.15)"
                  : "oklch(0.17 0.016 45 / 0.6)",
              color:
                filter === p ? "oklch(0.78 0.19 72)" : "oklch(0.52 0.016 75)",
              border: `1px solid ${
                filter === p
                  ? "oklch(0.78 0.19 72 / 0.3)"
                  : "oklch(0.22 0.018 45 / 0.5)"
              }`,
            }}
            data-ocid={`analytics.${p}.tab`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Summary stat cards — 2 cols on mobile, 4 on sm+ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={
            salesLoading
              ? null
              : `\u20b9${Math.round(Number(totalSales ?? BigInt(0)) / 100).toLocaleString("en-IN")}`
          }
          icon={<IndianRupee className="h-5 w-5" />}
          color="oklch(0.72 0.18 155)"
          sub="All time"
        />
        <StatCard
          label="Total Bills"
          value={billsLoading ? null : (totalBills ?? BigInt(0)).toString()}
          icon={<Receipt className="h-5 w-5" />}
          color="oklch(0.78 0.19 72)"
          sub="All time"
        />
        <StatCard
          label="Period Revenue"
          value={`\u20b9${Math.round(Number(filteredTotal) / 100).toLocaleString("en-IN")}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="oklch(0.78 0.17 68)"
          sub={PERIOD_LABELS[filter]}
        />
        <StatCard
          label="Finalized"
          value={finalizedBillsCount.toString()}
          icon={<Clock className="h-5 w-5" />}
          color="oklch(0.62 0.18 280)"
          sub={PERIOD_LABELS[filter]}
        />
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5"
        >
          <p className="text-sm font-semibold mb-4">
            Revenue Trend — {PERIOD_LABELS[filter]}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={20}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "oklch(0.52 0.016 75)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "oklch(0.52 0.016 75)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  `\u20b9${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`
                }
              />
              <Tooltip
                formatter={(v: number) => [
                  `\u20b9${v.toLocaleString("en-IN")}`,
                  "Revenue",
                ]}
                contentStyle={{
                  background: "oklch(0.14 0.016 45)",
                  border: "1px solid oklch(0.22 0.018 45)",
                  borderRadius: "10px",
                  color: "oklch(0.96 0.008 75)",
                  fontSize: 12,
                }}
                cursor={{ fill: "oklch(0.78 0.19 72 / 0.05)" }}
              />
              <Bar
                dataKey="value"
                fill="oklch(0.78 0.19 72)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Bills and Activity tabs */}
      <Tabs defaultValue="bills">
        <TabsList className="mb-4">
          <TabsTrigger value="bills" data-ocid="analytics.bills.tab">
            Bill History
          </TabsTrigger>
          <TabsTrigger value="activity" data-ocid="analytics.activity.tab">
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills">
          {billHistoryLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredBills.length === 0 ? (
            <EmptyState
              label={`No bills for ${PERIOD_LABELS[filter].toLowerCase()}`}
              data-ocid="analytics.bills.empty_state"
            />
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2.5 pr-1">
                {filteredBills
                  .slice()
                  .sort((a, b) => Number(b.createdAt - a.createdAt))
                  .map((bill, i) => (
                    <BillRow
                      key={bill.id.toString()}
                      bill={bill}
                      index={i + 1}
                    />
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
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              label={`No activity for ${PERIOD_LABELS[filter].toLowerCase()}`}
              data-ocid="analytics.activity.empty_state"
            />
          ) : (
            <ScrollArea className="max-h-96">
              <div className="divide-y divide-border/40">
                {filteredLogs
                  .slice()
                  .sort((a, b) => Number(b.timestamp - a.timestamp))
                  .map((log) => (
                    <ActivityRow key={log.timestamp.toString()} log={log} />
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
          style={{ background: `${color.replace(")", " / 0.15)")}`, color }}
        >
          {icon}
        </div>
      </div>
      {value === null ? (
        <div className="skeleton h-7 w-20 rounded mt-1" />
      ) : (
        <p
          className="text-2xl font-display font-bold truncate"
          style={{ color }}
        >
          {value}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </motion.div>
  );
}

function BillRow({ bill, index }: { bill: BillToken; index: number }) {
  const ts = Number(bill.createdAt) / 1_000_000;
  return (
    <div
      className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3"
      data-ocid={`analytics.item.${index}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
          style={{
            background: "oklch(0.78 0.19 72 / 0.12)",
            color: "oklch(0.78 0.19 72)",
          }}
        >
          #{index}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            Bill #{bill.id.toString().slice(-6)}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(ts), "MMM d, h:mm a")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <p className="font-semibold text-sm">
          \u20b9
          {Math.round(Number(bill.totalAmount) / 100).toLocaleString("en-IN")}
        </p>
        <BillStatusBadge status={bill.status} />
      </div>
    </div>
  );
}

function ActivityRow({ log }: { log: SalesmanActivityLog }) {
  const ts = Number(log.timestamp) / 1_000_000;
  const { data: user } = useGetUserById(log.salesmanId);
  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: "oklch(0.72 0.18 155 / 0.15)",
          color: "oklch(0.72 0.18 155)",
        }}
      >
        {user?.name ? user.name.slice(0, 2).toUpperCase() : "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{log.action}</p>
        <p className="text-xs text-muted-foreground">
          {user?.name ?? "Unknown"} \u2022{" "}
          {format(new Date(ts), "MMM d, h:mm a")}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  label,
  "data-ocid": dataOcid,
}: { label: string; "data-ocid"?: string }) {
  return (
    <div
      className="glass-card rounded-2xl p-10 text-center"
      data-ocid={dataOcid}
    >
      <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
