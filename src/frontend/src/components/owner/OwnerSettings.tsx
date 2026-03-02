import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  CreditCard,
  Crown,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { BusinessType, SubscriptionStatus } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import { useActor } from "../../hooks/useActor";
import { SubStatusBadge } from "../shared/StatusBadge";

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  [BusinessType.clothing]: "👗 Clothing",
  [BusinessType.electronics]: "📱 Electronics",
  [BusinessType.groceries]: "🛒 Groceries",
  [BusinessType.general]: "🏪 General",
};

export function OwnerSettings() {
  const { business, userProfile } = useAppContext();
  const { actor } = useActor();
  const qc = useQueryClient();

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !business) throw new Error("No business");
      await actor.updateSubscription(business.id, SubscriptionStatus.active);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["business"] });
      toast.success("Subscription upgraded to Active!");
    },
    onError: () => toast.error("Upgrade failed"),
  });

  const trialEndDate = business
    ? new Date(Number(business.trialEndDate / BigInt(1_000_000)))
    : null;
  const trialStartDate = business
    ? new Date(Number(business.trialStartDate / BigInt(1_000_000)))
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold mb-1">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your business and subscription
        </p>
      </div>

      {/* Business Info */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              background: "oklch(0.72 0.14 195 / 0.15)",
              color: "oklch(0.72 0.14 195)",
            }}
          >
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{business?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">
              {business ? BUSINESS_TYPE_LABELS[business.businessType] : "—"}
            </p>
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow
            label="Business ID"
            value={`#${business?.id?.toString().slice(-8) ?? "—"}`}
            mono
          />
          <InfoRow label="Owner" value={userProfile?.name ?? "—"} />
          <InfoRow label="Email" value={userProfile?.email || "—"} />
          <InfoRow label="Phone" value={userProfile?.phone || "—"} />
        </div>
      </div>

      {/* Subscription */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{
                background: "oklch(0.78 0.17 73 / 0.15)",
                color: "oklch(0.78 0.17 73)",
              }}
            >
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Subscription</p>
              <p className="text-sm text-muted-foreground">Manage your plan</p>
            </div>
          </div>
          {business && <SubStatusBadge status={business.subscriptionStatus} />}
        </div>

        <Separator className="bg-border/50" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          {trialStartDate && (
            <InfoRow
              label="Trial Started"
              value={format(trialStartDate, "MMM d, yyyy")}
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
          )}
          {trialEndDate && (
            <InfoRow
              label="Trial Ends"
              value={format(trialEndDate, "MMM d, yyyy")}
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
          )}
        </div>

        {business &&
          (business.subscriptionStatus === SubscriptionStatus.trial ||
            business.subscriptionStatus === SubscriptionStatus.grace ||
            business.subscriptionStatus === SubscriptionStatus.expired) && (
            <div className="flex flex-col gap-2">
              {business.subscriptionStatus !== SubscriptionStatus.expired && (
                <p className="text-xs text-muted-foreground">
                  Upgrade to unlock unlimited products, salesmen, and priority
                  support.
                </p>
              )}
              <Button
                size="sm"
                className="w-fit gap-1.5"
                style={{
                  background: "oklch(0.72 0.18 155)",
                  color: "oklch(0.08 0.01 264)",
                }}
                onClick={() => upgradeMutation.mutate()}
                disabled={upgradeMutation.isPending}
              >
                {upgradeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Upgrade to Active Plan
              </Button>
            </div>
          )}
      </div>

      {/* Security */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              background: "oklch(0.72 0.18 155 / 0.15)",
              color: "oklch(0.72 0.18 155)",
            }}
          >
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Security</p>
            <p className="text-sm text-muted-foreground">
              Internet Computer Identity
            </p>
          </div>
        </div>
        <Separator className="bg-border/50" />
        <InfoRow
          label="Principal"
          value={
            userProfile?.principal
              ? `${userProfile.principal.toString().slice(0, 20)}...`
              : "—"
          }
          mono
        />
        <p className="text-xs text-muted-foreground">
          Your identity is secured by the Internet Computer's decentralized
          infrastructure. No passwords needed.
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
        {icon}
        {label}
      </p>
      <p className={`font-medium text-sm ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
