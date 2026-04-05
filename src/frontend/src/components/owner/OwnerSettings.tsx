import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  Camera,
  CreditCard,
  Crown,
  Loader2,
  LogOut,
  Moon,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BusinessType, SubscriptionStatus } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import {
  getProfilePhoto,
  removeProfilePhoto,
  setProfilePhoto,
} from "../../utils/profilePhoto";
import { SubStatusBadge } from "../shared/StatusBadge";

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  [BusinessType.clothing]: "\ud83d\udc57 Clothing",
  [BusinessType.electronics]: "\ud83d\udcf1 Electronics",
  [BusinessType.groceries]: "\ud83d\uded2 Groceries",
  [BusinessType.general]: "\ud83c\udfea General",
};

export function OwnerSettings() {
  const { business, userProfile, theme, setTheme } = useAppContext();
  const { actor } = useActor();
  const { clear } = useInternetIdentity();
  const qc = useQueryClient();

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
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    if (principalStr) removeProfilePhoto(principalStr);
    setPhoto(null);
    toast.success("Profile photo removed");
  };

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
    ? new Date(Number(business.trialEndDate) / 1_000_000)
    : null;
  const trialStartDate = business
    ? new Date(Number(business.trialStartDate) / 1_000_000)
    : null;

  const initials = userProfile?.name
    ? userProfile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OW";

  return (
    <div className="max-w-2xl space-y-4">
      {/* Profile Photo */}
      <SettingsSection
        icon={<User className="h-5 w-5" />}
        iconColor="oklch(0.78 0.19 72)"
        title="Profile Photo"
        subtitle="Personalise your account"
        data-ocid="settings.panel"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-ocid="settings.upload_button"
        />
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20">
              {photo && <AvatarImage src={photo} alt="Profile" />}
              <AvatarFallback
                className="text-2xl font-bold"
                style={{
                  background: "oklch(0.78 0.19 72 / 0.15)",
                  color: "oklch(0.78 0.19 72)",
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
              data-ocid="settings.edit_button"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">
              {userProfile?.name ?? "Owner"}
            </p>
            <p className="text-xs text-muted-foreground">
              {photo ? "Photo set" : "No photo added yet"}
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                style={{
                  background: "oklch(0.78 0.19 72)",
                  color: "oklch(0.08 0.01 45)",
                }}
                onClick={() => fileInputRef.current?.click()}
                data-ocid="settings.secondary_button"
              >
                <Camera className="h-3.5 w-3.5" />
                {photo ? "Change Photo" : "Add Photo"}
              </Button>
              {photo && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={handleRemovePhoto}
                  data-ocid="settings.delete_button"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Business Info */}
      <SettingsSection
        icon={<Building2 className="h-5 w-5" />}
        iconColor="oklch(0.78 0.19 72)"
        title="Business Info"
        subtitle="Your registered business details"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Business Name" value={business?.name ?? "\u2014"} />
          <InfoRow
            label="Type"
            value={
              business?.businessType
                ? (BUSINESS_TYPE_LABELS[business.businessType] ??
                  String(business.businessType))
                : "\u2014"
            }
          />
          <InfoRow label="Owner" value={userProfile?.name ?? "\u2014"} />
          <InfoRow label="Email" value={userProfile?.email || "\u2014"} />
          {userProfile?.phone && (
            <InfoRow label="Phone" value={userProfile.phone} />
          )}
        </div>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection
        icon={
          theme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )
        }
        iconColor="oklch(0.78 0.19 72)"
        title="Appearance"
        subtitle="Choose your display theme"
      >
        <div className="flex gap-3">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              data-ocid="settings.toggle"
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
      </SettingsSection>

      {/* Subscription */}
      <SettingsSection
        icon={<Crown className="h-5 w-5" />}
        iconColor="oklch(0.78 0.17 68)"
        title="Subscription"
        subtitle="Manage your plan"
        headerExtra={
          business && <SubStatusBadge status={business.subscriptionStatus} />
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="flex flex-col gap-3 pt-3">
              <p className="text-xs text-muted-foreground">
                Upgrade to unlock unlimited products, salesmen, and priority
                support.
              </p>
              <Button
                size="sm"
                className="w-fit gap-1.5 h-9"
                style={{
                  background: "oklch(0.72 0.18 155)",
                  color: "oklch(0.08 0.01 45)",
                }}
                onClick={() => upgradeMutation.mutate()}
                disabled={upgradeMutation.isPending}
                data-ocid="settings.primary_button"
              >
                {upgradeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Upgrade to Active
              </Button>
            </div>
          )}
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        icon={<Shield className="h-5 w-5" />}
        iconColor="oklch(0.72 0.18 155)"
        title="Security"
        subtitle="Internet Computer Identity"
      >
        <InfoRow
          label="Principal ID"
          value={
            userProfile?.principal
              ? `${userProfile.principal.toString().slice(0, 22)}...`
              : "\u2014"
          }
          mono
        />
        <p className="text-xs text-muted-foreground mt-3">
          Your identity is secured by the Internet Computer\u2019s decentralized
          infrastructure.
        </p>
      </SettingsSection>

      {/* Sign out */}
      <SettingsSection
        icon={<LogOut className="h-5 w-5" />}
        iconColor="oklch(0.55 0.22 25)"
        title="Sign Out"
        subtitle="End your session"
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={clear}
          data-ocid="settings.delete_button"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  icon,
  iconColor,
  title,
  subtitle,
  headerExtra,
  children,
  "data-ocid": dataOcid,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  "data-ocid"?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4" data-ocid={dataOcid}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `${iconColor.replace(")", " / 0.15)")}`,
              color: iconColor,
            }}
          >
            {icon}
          </div>
          <div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {headerExtra}
      </div>
      <Separator className="bg-border/40" />
      {children}
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
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
        {icon}
        {label}
      </p>
      <p
        className={`font-medium text-sm truncate ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
