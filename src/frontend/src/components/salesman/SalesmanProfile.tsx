import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isToday } from "date-fns";
import {
  Calendar,
  LogOut,
  Mail,
  Moon,
  Phone,
  Receipt,
  Sun,
  TrendingUp,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { BillStatus } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useBillsForBusiness } from "../../hooks/useQueries";

export function SalesmanProfile() {
  const { userProfile, theme, setTheme } = useAppContext();
  const { clear } = useInternetIdentity();
  const { data: bills } = useBillsForBusiness(userProfile?.businessId);

  const myBills = (bills ?? []).filter(
    (b) => b.salesmanId === userProfile?.userId,
  );

  const todayBills = myBills.filter((b) =>
    isToday(new Date(Number(b.createdAt) / 1_000_000)),
  );

  const totalRevenue = myBills
    .filter((b) => b.status === BillStatus.finalized)
    .reduce((acc, b) => acc + b.totalAmount, BigInt(0));

  const initials = userProfile?.name
    ? userProfile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SM";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg space-y-5"
    >
      {/* Avatar + name */}
      <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback
            className="text-xl font-bold"
            style={{
              background: "oklch(0.72 0.18 155 / 0.2)",
              color: "oklch(0.72 0.18 155)",
            }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-display font-bold">
            {userProfile?.name ?? "Salesman"}
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
              Salesman
            </Badge>
            {userProfile?.isActive && (
              <div
                className="flex items-center gap-1 text-xs"
                style={{ color: "oklch(0.72 0.18 155)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Account Active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Bills Today"
          value={todayBills.length}
          icon={<Calendar className="h-4 w-4" />}
          color="oklch(0.72 0.14 195)"
        />
        <StatCard
          label="Total Bills"
          value={myBills.length}
          icon={<Receipt className="h-4 w-4" />}
          color="oklch(0.78 0.17 73)"
        />
        <StatCard
          label="Revenue Generated"
          value={`₹${Math.round(Number(totalRevenue) / 100).toLocaleString("en-IN")}`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="oklch(0.72 0.18 155)"
        />
      </div>

      {/* Theme toggle */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground" />
            )}
            <h3 className="text-sm font-semibold">Theme</h3>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              data-ocid="profile.toggle"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === "dark"
                  ? ""
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
              style={
                theme === "dark"
                  ? {
                      background: "oklch(0.72 0.14 195)",
                      color: "oklch(0.08 0.01 264)",
                    }
                  : {}
              }
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              data-ocid="profile.toggle"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === "light"
                  ? ""
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
              style={
                theme === "light"
                  ? {
                      background: "oklch(0.72 0.14 195)",
                      color: "oklch(0.08 0.01 264)",
                    }
                  : {}
              }
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Contact Information</h3>
        <Separator className="bg-border/50" />
        {userProfile?.email && (
          <InfoRow
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={userProfile.email}
          />
        )}
        {userProfile?.phone && (
          <InfoRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={userProfile.phone}
          />
        )}
        {!userProfile?.email && !userProfile?.phone && (
          <p className="text-sm text-muted-foreground">
            No contact info on file
          </p>
        )}
      </div>

      {/* Account info */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Account</h3>
        <Separator className="bg-border/50" />
        <InfoRow
          icon={<User className="h-4 w-4" />}
          label="User ID"
          value={`#${userProfile?.userId?.toString().slice(-8).padStart(8, "0") ?? "—"}`}
          mono
        />
      </div>

      {/* Sign out */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Account Actions</h3>
        <Separator className="bg-border/50" />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={clear}
          data-ocid="profile.delete_button"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="stat-card rounded-xl p-3 text-center">
      <div className="flex justify-center mb-1" style={{ color }}>
        {icon}
      </div>
      <p className="text-xl font-display font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
