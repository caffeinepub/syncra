import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BillStatus,
  InviteStatus,
  ProductState,
  SubscriptionStatus,
} from "../../backend.d";

interface ProductStateBadgeProps {
  state: ProductState;
  className?: string;
}

export function ProductStateBadge({
  state,
  className,
}: ProductStateBadgeProps) {
  const config = {
    [ProductState.available]: {
      label: "Available",
      className: "bg-success/15 text-success border-success/20",
    },
    [ProductState.locked]: {
      label: "Locked",
      className: "bg-warning/15 text-warning border-warning/20",
    },
    [ProductState.sold]: {
      label: "Sold",
      className: "bg-destructive/15 text-destructive border-destructive/20",
    },
  };
  const { label, className: stateClass } = config[state];
  return (
    <Badge
      variant="outline"
      className={cn(stateClass, "font-medium text-xs", className)}
    >
      <span
        className="mr-1.5 h-1.5 w-1.5 rounded-full inline-block"
        style={{
          background:
            state === ProductState.available
              ? "oklch(var(--success))"
              : state === ProductState.locked
                ? "oklch(var(--warning))"
                : "oklch(var(--destructive))",
        }}
      />
      {label}
    </Badge>
  );
}

interface BillStatusBadgeProps {
  status: BillStatus;
  className?: string;
}

export function BillStatusBadge({ status, className }: BillStatusBadgeProps) {
  const config = {
    [BillStatus.pending]: {
      label: "Pending",
      className: "bg-warning/15 text-warning border-warning/20",
    },
    [BillStatus.finalized]: {
      label: "Finalized",
      className: "bg-success/15 text-success border-success/20",
    },
    [BillStatus.cancelled]: {
      label: "Cancelled",
      className: "bg-muted/50 text-muted-foreground border-border",
    },
  };
  const { label, className: statusClass } = config[status];
  return (
    <Badge
      variant="outline"
      className={cn(statusClass, "font-medium text-xs", className)}
    >
      {label}
    </Badge>
  );
}

interface InviteStatusBadgeProps {
  status: InviteStatus;
}

export function InviteStatusBadge({ status }: InviteStatusBadgeProps) {
  const config = {
    [InviteStatus.pending]: {
      label: "Pending",
      className: "bg-warning/15 text-warning border-warning/20",
    },
    [InviteStatus.accepted]: {
      label: "Accepted",
      className: "bg-success/15 text-success border-success/20",
    },
    [InviteStatus.revoked]: {
      label: "Revoked",
      className: "bg-muted/50 text-muted-foreground border-border",
    },
  };
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn(className, "font-medium text-xs")}>
      {label}
    </Badge>
  );
}

interface SubStatusBadgeProps {
  status: SubscriptionStatus;
}

export function SubStatusBadge({ status }: SubStatusBadgeProps) {
  const config = {
    [SubscriptionStatus.trial]: {
      label: "Free Trial",
      className: "bg-primary/15 text-primary border-primary/20",
    },
    [SubscriptionStatus.active]: {
      label: "Active",
      className: "bg-success/15 text-success border-success/20",
    },
    [SubscriptionStatus.grace]: {
      label: "Grace Period",
      className: "bg-warning/15 text-warning border-warning/20",
    },
    [SubscriptionStatus.expired]: {
      label: "Expired",
      className: "bg-destructive/15 text-destructive border-destructive/20",
    },
  };
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn(className, "font-medium text-xs")}>
      {label}
    </Badge>
  );
}
