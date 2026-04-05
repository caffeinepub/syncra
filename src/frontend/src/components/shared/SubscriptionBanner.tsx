import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, X, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Business } from "../../backend.d";
import { SubscriptionStatus } from "../../backend.d";
import { useActor } from "../../hooks/useActor";

interface Props {
  business: Business | null;
}

export function SubscriptionBanner({ business }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

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

  if (!business || dismissed) return null;

  // Trial expiry warning — show yellow slim banner when <= 7 days left
  if (business.subscriptionStatus === SubscriptionStatus.trial) {
    const trialEndMs = Number(business.trialEndDate) / 1_000_000;
    const daysUntilEnd = Math.max(
      0,
      Math.round((trialEndMs - Date.now()) / (1000 * 60 * 60 * 24)),
    );
    if (daysUntilEnd <= 7) {
      return (
        <div
          className="flex items-center justify-between gap-4 px-4 py-2 text-xs"
          style={{
            background: "oklch(0.42 0.14 75 / 0.9)",
            color: "oklch(0.97 0.02 75)",
          }}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              Your trial expires in{" "}
              <strong>
                {daysUntilEnd} day{daysUntilEnd !== 1 ? "s" : ""}
              </strong>{" "}
              — Upgrade to keep access.
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-current text-current hover:bg-current/10 h-6 px-2 text-xs"
              onClick={() => upgrade.mutate()}
              disabled={upgrade.isPending}
            >
              Upgrade
            </Button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="ml-1 p-0.5 rounded hover:bg-current/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  if (business.subscriptionStatus === SubscriptionStatus.grace) {
    const trialEndMs = Number(business.trialEndDate) / 1_000_000;
    const graceEndMs = trialEndMs + 7 * 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(
      0,
      Math.round((graceEndMs - Date.now()) / (1000 * 60 * 60 * 24)),
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
            Your trial has ended. You have{" "}
            <strong>
              {daysLeft} day{daysLeft !== 1 ? "s" : ""}
            </strong>{" "}
            remaining before full lockout.
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-current text-current hover:bg-current/10 h-7 px-3"
            onClick={() => upgrade.mutate()}
            disabled={upgrade.isPending}
          >
            Upgrade Now
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ml-1 p-0.5 rounded hover:bg-current/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-current text-current hover:bg-current/10 h-7 px-3"
            onClick={() => upgrade.mutate()}
            disabled={upgrade.isPending}
          >
            Upgrade Now
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ml-1 p-0.5 rounded hover:bg-current/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
