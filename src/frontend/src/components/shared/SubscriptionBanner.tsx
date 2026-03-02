import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SubscriptionStatus } from "../../backend.d";
import type { Business } from "../../backend.d";
import { useActor } from "../../hooks/useActor";

interface Props {
  business: Business | null;
}

export function SubscriptionBanner({ business }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();

  const upgrade = useMutation({
    mutationFn: async () => {
      if (!actor || !business) return;
      await actor.updateSubscription(business.id, SubscriptionStatus.active);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["business"] });
      toast.success("Subscription upgraded!");
    },
    onError: () => {
      toast.error("Failed to upgrade subscription");
    },
  });

  if (!business) return null;

  if (business.subscriptionStatus === SubscriptionStatus.grace) {
    const trialEnd = Number(business.trialEndDate / BigInt(1_000_000));
    const daysLeft = Math.max(
      0,
      Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24)),
    );
    return (
      <div
        className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
        style={{
          background: "oklch(0.35 0.12 73 / 0.9)",
          color: "oklch(0.97 0.02 73)",
        }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Your trial has ended. You have <strong>{daysLeft} days</strong>{" "}
            remaining before full lockout.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-current text-current hover:bg-current/10 h-7 px-3"
          onClick={() => upgrade.mutate()}
          disabled={upgrade.isPending}
        >
          Upgrade Now
        </Button>
      </div>
    );
  }

  if (business.subscriptionStatus === SubscriptionStatus.expired) {
    return (
      <div
        className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
        style={{
          background: "oklch(0.45 0.18 25 / 0.9)",
          color: "oklch(0.97 0 0)",
        }}
      >
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>
            Subscription expired. Salesmen can still operate for a limited grace
            period. Upgrade now.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-current text-current hover:bg-current/10 h-7 px-3"
          onClick={() => upgrade.mutate()}
          disabled={upgrade.isPending}
        >
          Upgrade Now
        </Button>
      </div>
    );
  }

  return null;
}
