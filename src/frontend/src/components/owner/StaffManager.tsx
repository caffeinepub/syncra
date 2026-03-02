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
import { Loader2, Mail, Phone, Plus, UserX, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
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

  const activeInvites = (invites ?? []).filter(
    (i) => i.status !== InviteStatus.revoked,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold">Staff Management</h2>
          <p className="text-sm text-muted-foreground">
            {
              (invites ?? []).filter((i) => i.status === InviteStatus.accepted)
                .length
            }{" "}
            active salesmen
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          style={{
            background: "oklch(0.72 0.14 195)",
            color: "oklch(0.08 0.01 264)",
          }}
          onClick={() => setShowInvite(true)}
        >
          <Plus className="h-4 w-4" />
          Invite Salesman
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          label="Total Invites"
          value={(invites ?? []).length}
          color="oklch(0.72 0.14 195)"
        />
        <MiniStat
          label="Active"
          value={
            (invites ?? []).filter((i) => i.status === InviteStatus.accepted)
              .length
          }
          color="oklch(0.72 0.18 155)"
        />
        <MiniStat
          label="Pending"
          value={
            (invites ?? []).filter((i) => i.status === InviteStatus.pending)
              .length
          }
          color="oklch(0.78 0.17 73)"
        />
      </div>

      {/* Invite list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : (invites ?? []).length === 0 ? (
        <EmptyState onInvite={() => setShowInvite(true)} />
      ) : (
        <div className="space-y-4">
          {activeInvites.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Active Invites
              </p>
              <ScrollArea className="max-h-80">
                <div className="space-y-2 pr-2">
                  {activeInvites.map((invite, i) => (
                    <InviteRow
                      key={invite.id.toString()}
                      invite={invite}
                      index={i}
                      onRevoke={() => revokeMutation.mutate(invite.id)}
                      revoking={revokeMutation.isPending}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {revokedInvites.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Revoked ({revokedInvites.length})
              </p>
              <div className="space-y-2 opacity-50">
                {revokedInvites.slice(0, 3).map((invite, i) => (
                  <InviteRow
                    key={invite.id.toString()}
                    invite={invite}
                    index={i}
                    onRevoke={() => {}}
                    revoking={false}
                    readOnly
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Invite Salesman</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Email or Phone Number
              </Label>
              <Input
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="sarah@store.com or +1 555 000 0000"
                className="bg-input/50"
                onKeyDown={(e) => e.key === "Enter" && void handleInvite()}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The salesman will receive an invitation and can activate their
              account using this contact info.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInvite(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!contactInfo.trim() || inviteMutation.isPending}
              onClick={() => void handleInvite()}
              style={{
                background: "oklch(0.72 0.14 195)",
                color: "oklch(0.08 0.01 264)",
              }}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import type { SalesmanInvite } from "../../backend.d";

function InviteRow({
  invite,
  index,
  onRevoke,
  revoking,
  readOnly,
}: {
  invite: SalesmanInvite;
  index: number;
  onRevoke: () => void;
  revoking: boolean;
  readOnly?: boolean;
}) {
  const isEmail = invite.contactInfo.includes("@");
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card rounded-xl p-4 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "oklch(0.72 0.14 195 / 0.1)",
            color: "oklch(0.72 0.14 195)",
          }}
        >
          {isEmail ? (
            <Mail className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{invite.contactInfo}</p>
          <p className="text-xs text-muted-foreground">
            Invited{" "}
            {format(
              new Date(Number(invite.invitedAt / BigInt(1_000_000))),
              "MMM d, yyyy",
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <InviteStatusBadge status={invite.status} />
        {!readOnly && invite.status !== InviteStatus.revoked && (
          <button
            type="button"
            onClick={onRevoke}
            disabled={revoking}
            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Revoke invite"
          >
            {revoking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserX className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: { label: string; value: number; color: string }) {
  return (
    <div className="stat-card rounded-xl p-3 text-center">
      <p className="text-2xl font-display font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-12 text-center">
      <div
        className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4"
        style={{ background: "oklch(0.72 0.14 195 / 0.1)" }}
      >
        <Users className="h-7 w-7" style={{ color: "oklch(0.72 0.14 195)" }} />
      </div>
      <p className="font-semibold text-foreground mb-1">No staff yet</p>
      <p className="text-sm text-muted-foreground mb-4">
        Invite your salesmen to get started
      </p>
      <Button
        size="sm"
        onClick={onInvite}
        style={{
          background: "oklch(0.72 0.14 195)",
          color: "oklch(0.08 0.01 264)",
        }}
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Invite Salesman
      </Button>
    </div>
  );
}
