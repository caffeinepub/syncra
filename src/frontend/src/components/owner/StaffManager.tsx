import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Loader2, Mail, Phone, Plus, UserMinus, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { SalesmanInvite } from "../../backend.d";
import { InviteStatus } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import {
  useInviteSalesman,
  useInvites,
  useRevokeInvite,
} from "../../hooks/useQueries";
import { SkeletonRow } from "../shared/SkeletonCard";
import { InviteStatusBadge } from "../shared/StatusBadge";

export function StaffManager() {
  const { business } = useAppContext();
  const { data: invites, isLoading } = useInvites(business?.id);
  const inviteMutation = useInviteSalesman();
  const revokeMutation = useRevokeInvite();
  const [showInvite, setShowInvite] = useState(false);
  const [contactInfo, setContactInfo] = useState("");
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());
  const [deactivatingIds, setDeactivatingIds] = useState<Set<string>>(
    new Set(),
  );
  const [showAllRevoked, setShowAllRevoked] = useState(false);

  const acceptedInvites = (invites ?? []).filter(
    (i) => i.status === InviteStatus.accepted,
  );
  const pendingInvites = (invites ?? []).filter(
    (i) => i.status === InviteStatus.pending,
  );
  const revokedInvites = (invites ?? []).filter(
    (i) => i.status === InviteStatus.revoked,
  );

  const handleInvite = async () => {
    if (!business?.id || !contactInfo.trim()) return;
    await inviteMutation.mutateAsync({ businessId: business.id, contactInfo });
    setContactInfo("");
    setShowInvite(false);
  };

  const handleRevoke = async (invite: SalesmanInvite) => {
    const idStr = invite.id.toString();
    setRevokingIds((prev) => new Set(prev).add(idStr));
    try {
      await revokeMutation.mutateAsync(invite.id);
    } finally {
      setRevokingIds((prev) => {
        const s = new Set(prev);
        s.delete(idStr);
        return s;
      });
    }
  };

  const handleDeactivate = async (invite: SalesmanInvite) => {
    const idStr = invite.id.toString();
    setDeactivatingIds((prev) => new Set(prev).add(idStr));
    try {
      await revokeMutation.mutateAsync(invite.id);
    } finally {
      setDeactivatingIds((prev) => {
        const s = new Set(prev);
        s.delete(idStr);
        return s;
      });
    }
  };

  const displayedRevoked = showAllRevoked
    ? revokedInvites
    : revokedInvites.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg">Staff Management</h2>
          <p className="text-sm text-muted-foreground">
            {acceptedInvites.length} active salesman
            {acceptedInvites.length !== 1 ? "en" : ""}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 btn-amber h-9 shrink-0"
          onClick={() => setShowInvite(true)}
          data-ocid="staff.open_modal_button"
        >
          <Plus className="h-4 w-4" />
          Invite Salesman
        </Button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          label="Total Invites"
          value={(invites ?? []).length}
          color="oklch(0.78 0.19 72)"
        />
        <MiniStat
          label="Active"
          value={acceptedInvites.length}
          color="oklch(0.72 0.18 155)"
        />
        <MiniStat
          label="Pending"
          value={pendingInvites.length}
          color="oklch(0.62 0.18 280)"
        />
      </div>

      {/* Active salesmen */}
      {acceptedInvites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Active Salesmen
          </p>
          <div className="space-y-2">
            {isLoading
              ? [1, 2].map((i) => <SkeletonRow key={i} />)
              : acceptedInvites.map((invite, i) => (
                  <StaffCard
                    key={invite.id.toString()}
                    invite={invite}
                    index={i + 1}
                    isDeactivating={deactivatingIds.has(invite.id.toString())}
                    onDeactivate={() => handleDeactivate(invite)}
                  />
                ))}
          </div>
        </div>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pending Invites
          </p>
          <div className="space-y-2">
            {pendingInvites.map((invite, i) => (
              <InviteCard
                key={invite.id.toString()}
                invite={invite}
                index={i + 1}
                isRevoking={revokingIds.has(invite.id.toString())}
                onRevoke={() => handleRevoke(invite)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Revoked */}
      {revokedInvites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Revoked
          </p>
          <div className="space-y-2 opacity-60">
            {displayedRevoked.map((invite, i) => (
              <InviteCard
                key={invite.id.toString()}
                invite={invite}
                index={i + 1}
                isRevoking={false}
                onRevoke={() => {}}
              />
            ))}
          </div>
          {revokedInvites.length > 3 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
              onClick={() => setShowAllRevoked((v) => !v)}
            >
              {showAllRevoked
                ? "Show less"
                : `Show ${revokedInvites.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (invites ?? []).length === 0 && (
        <div
          className="glass-card rounded-2xl p-12 text-center"
          data-ocid="staff.empty_state"
        >
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "oklch(0.78 0.19 72 / 0.1)",
              color: "oklch(0.78 0.19 72)",
            }}
          >
            <Users className="h-7 w-7" />
          </div>
          <h3 className="font-display font-semibold mb-1">No staff yet</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Invite your first salesman to get started
          </p>
          <Button
            size="sm"
            className="gap-1.5 btn-amber"
            onClick={() => setShowInvite(true)}
          >
            <Plus className="h-4 w-4" /> Invite Salesman
          </Button>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog
        open={showInvite}
        onOpenChange={(o) => {
          if (!o) setShowInvite(false);
        }}
      >
        <DialogContent data-ocid="staff.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Invite Salesman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the salesman's email or phone number. They'll use this to
              activate their account.
            </p>
            <div>
              <Label
                htmlFor="contact"
                className="text-sm font-medium mb-2 block"
              >
                Email or Phone
              </Label>
              <Input
                id="contact"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="salesman@email.com or +91 98765 43210"
                className="h-11 bg-input/60 border-border/50"
                data-ocid="staff.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInvite(false)}
              data-ocid="staff.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!contactInfo.trim() || inviteMutation.isPending}
              className="gap-1.5 btn-amber"
              data-ocid="staff.submit_button"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StaffCard({
  invite,
  index,
  isDeactivating,
  onDeactivate,
}: {
  invite: SalesmanInvite;
  index: number;
  isDeactivating: boolean;
  onDeactivate: () => void;
}) {
  const name = invite.contactInfo ?? `Salesman ${index}`;
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3"
      data-ocid={`staff.item.${index}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
          style={{
            background: "oklch(0.72 0.18 155 / 0.15)",
            color: "oklch(0.72 0.18 155)",
          }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {invite.contactInfo}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <InviteStatusBadge status={invite.status} />
        <button
          type="button"
          onClick={onDeactivate}
          disabled={isDeactivating}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Deactivate"
          data-ocid={`staff.delete_button.${index}`}
        >
          {isDeactivating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserMinus className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

function InviteCard({
  invite,
  index,
  isRevoking,
  onRevoke,
}: {
  invite: SalesmanInvite;
  index: number;
  isRevoking: boolean;
  onRevoke: () => void;
}) {
  const isContact = invite.contactInfo?.includes("@");

  return (
    <div
      className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3"
      data-ocid={`staff.item.${index}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "oklch(0.22 0.018 45 / 0.8)",
            color: "oklch(0.52 0.016 75)",
          }}
        >
          {isContact ? (
            <Mail className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{invite.contactInfo}</p>
          <p className="text-xs text-muted-foreground">
            {format(
              new Date(Number(invite.invitedAt) / 1_000_000),
              "MMM d, yyyy",
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <InviteStatusBadge status={invite.status} />
        {invite.status === InviteStatus.pending && (
          <button
            type="button"
            onClick={onRevoke}
            disabled={isRevoking}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            data-ocid={`staff.delete_button.${index}`}
          >
            {isRevoking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserMinus className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: { label: string; value: number; color: string }) {
  return (
    <div
      className="glass-card rounded-xl p-4 text-center"
      style={{ borderColor: `${color.replace(")", " / 0.15)")}` }}
    >
      <p className="text-2xl font-display font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
