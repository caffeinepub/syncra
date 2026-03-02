import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Receipt } from "lucide-react";
import { motion } from "motion/react";
import { useAppContext } from "../../context/AppContext";
import { useBillsForBusiness } from "../../hooks/useQueries";
import { SkeletonCard } from "../shared/SkeletonCard";
import { BillStatusBadge } from "../shared/StatusBadge";

export function SalesmanBills() {
  const { userProfile } = useAppContext();
  const { data: bills, isLoading } = useBillsForBusiness(
    userProfile?.businessId,
  );

  // Filter to only this salesman's bills
  const myBills = (bills ?? []).filter(
    (b) => b.salesmanId === userProfile?.userId,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold mb-1">My Bills</h2>
        <p className="text-sm text-muted-foreground">
          {myBills.length} bill tokens generated
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : myBills.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-3 pr-2">
            {myBills
              .slice()
              .sort((a, b) => Number(b.createdAt - a.createdAt))
              .map((bill, i) => (
                <motion.div
                  key={bill.id.toString()}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-xl p-4"
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
                          <p className="text-xs text-muted-foreground">
                            Amount
                          </p>
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
                          <p className="font-medium">{bill.items.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Created
                          </p>
                          <p className="font-medium text-xs">
                            {format(
                              new Date(
                                Number(bill.createdAt / BigInt(1_000_000)),
                              ),
                              "MMM d, HH:mm",
                            )}
                          </p>
                        </div>
                      </div>
                      {bill.finalizedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Finalized:{" "}
                          {format(
                            new Date(
                              Number(bill.finalizedAt / BigInt(1_000_000)),
                            ),
                            "MMM d, HH:mm",
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card rounded-2xl p-16 text-center">
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
