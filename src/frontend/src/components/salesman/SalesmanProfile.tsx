import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isToday } from "date-fns";
import { Camera, LogOut, Moon, Receipt, Sun, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BillStatus } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useBillsForBusiness } from "../../hooks/useQueries";
import {
  getProfilePhoto,
  removeProfilePhoto,
  setProfilePhoto,
} from "../../utils/profilePhoto";

export function SalesmanProfile() {
  const { userProfile, theme, setTheme } = useAppContext();
  const { clear } = useInternetIdentity();
  const { data: bills } = useBillsForBusiness(userProfile?.businessId);

  const principalStr = userProfile?.principal?.toString() ?? "";
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (principalStr) {
      setPhoto(getProfilePhoto(principalStr));
    }
  }, [principalStr]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (principalStr) {
        setProfilePhoto(principalStr, dataUrl);
      }
      setPhoto(dataUrl);
      toast.success("Profile photo updated");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
      className="max-w-lg space-y-4"
    >
      {/* Identity card */}
      <div
        className="glass-card rounded-2xl p-5"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.13 0.016 45 / 0.9) 0%, oklch(0.72 0.18 155 / 0.08) 100%)",
          border: "1px solid oklch(0.72 0.18 155 / 0.15)",
        }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar with edit button */}
          <div className="relative shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              data-ocid="profile.upload_button"
            />
            <Avatar className="h-16 w-16">
              {photo && <AvatarImage src={photo} alt="Profile" />}
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110"
              style={{
                background: "oklch(0.78 0.19 72)",
                color: "oklch(0.08 0.01 45)",
              }}
              data-ocid="profile.edit_button"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg truncate">
              {userProfile?.name ?? "Salesman"}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: "oklch(0.78 0.19 72 / 0.4)",
                  color: "oklch(0.78 0.19 72)",
                  background: "oklch(0.78 0.19 72 / 0.1)",
                }}
              >
                Salesman
              </Badge>
              {userProfile?.isActive && (
                <div
                  className="flex items-center gap-1 text-xs"
                  style={{ color: "oklch(0.72 0.18 155)" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-ring" />
                  Active
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tap the camera icon to update your photo
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Bills Today"
          value={todayBills.length.toString()}
          color="oklch(0.78 0.19 72)"
        />
        <StatCard
          label="Total Bills"
          value={myBills.length.toString()}
          color="oklch(0.62 0.18 280)"
        />
        <StatCard
          label="Earnings"
          value={`₹${Math.round(Number(totalRevenue) / 100).toLocaleString("en-IN")}`}
          color="oklch(0.72 0.18 155)"
        />
      </div>

      {/* Appearance */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.78 0.19 72 / 0.12)",
              color: "oklch(0.78 0.19 72)",
            }}
          >
            {theme === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">Appearance</p>
            <p className="text-xs text-muted-foreground">Choose your theme</p>
          </div>
        </div>
        <Separator className="bg-border/40" />
        <div className="flex gap-3">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              data-ocid="profile.toggle"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background:
                  theme === t
                    ? "oklch(0.78 0.19 72)"
                    : "oklch(0.18 0.018 45 / 0.7)",
                color:
                  theme === t ? "oklch(0.08 0.01 45)" : "oklch(0.52 0.016 75)",
                border: `1px solid ${
                  theme === t
                    ? "oklch(0.78 0.19 72 / 0.5)"
                    : "oklch(0.22 0.018 45 / 0.5)"
                }`,
              }}
            >
              {t === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              {t === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.55 0.22 25 / 0.12)",
              color: "oklch(0.55 0.22 25)",
            }}
          >
            <LogOut className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Sign Out</p>
            <p className="text-xs text-muted-foreground">End your session</p>
          </div>
        </div>
        <Separator className="bg-border/40" />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
  color,
}: { label: string; value: string; color: string }) {
  return (
    <div className="glass-card rounded-xl p-4 text-center">
      <p
        className="font-display font-bold text-xl leading-tight truncate"
        style={{ color }}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1 leading-tight">
        {label}
      </p>
    </div>
  );
}
