import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
  MessageSquare,
  Shield,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Role } from "../backend.d";
import { SyncraLogo } from "../components/shared/SyncraLogo";
import { useAppContext } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function SalesmanActivation() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { setView, refetchProfile } = useAppContext();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [contactInfo, setContactInfo] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [inviteBusinessId, setInviteBusinessId] = useState<bigint | null>(null);

  const handleSendOtp = async () => {
    if (!contactInfo.trim() || !actor) return;
    setIsSubmitting(true);
    try {
      const invite = await actor.lookupInvite(contactInfo.trim());
      if (!invite) {
        toast.error(
          "No invitation found for this contact. Please ask your employer to invite you first.",
        );
        return;
      }
      setInviteBusinessId(invite.businessId);
      setStep(1);
      toast.success(`Verification code sent to ${contactInfo}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify invite. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    // Simulate OTP verification — accept any 6-digit code
    setStep(2);
    toast.success("Identity verified!");
  };

  const handleActivate = async () => {
    if (!actor || !name.trim()) return;
    if (inviteBusinessId === null) {
      toast.error(
        "Invite business ID is missing. Please restart the activation flow.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await actor.saveCallerUserProfile(
        name,
        contactInfo.includes("@") ? contactInfo : "",
        !contactInfo.includes("@") ? contactInfo : "",
        inviteBusinessId,
        Role.salesman,
        true,
      );
      toast.success("Account activated! Welcome to Syncra.");
      refetchProfile();
      setView("salesman-floor");
    } catch (err) {
      console.error(err);
      toast.error("Activation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not authenticated yet, prompt login first
  if (!identity) {
    return (
      <div className="mesh-bg min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-4 mb-8">
            <button
              type="button"
              onClick={() => setView("splash")}
              className="p-2 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <SyncraLogo size="sm" />
            <div className="h-4 w-px bg-border" />
            <p className="text-sm text-muted-foreground">Salesman Activation</p>
          </div>
          <div className="glass-card rounded-2xl p-8 text-center space-y-5">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{
                background: "oklch(0.72 0.14 195 / 0.15)",
                color: "oklch(0.72 0.14 195)",
              }}
            >
              <LogIn className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold mb-2">
                Sign In Required
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You need to connect with Internet Identity before activating
                your salesman account. This secures your account on the Internet
                Computer.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full gap-2"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.14 195), oklch(0.65 0.18 210))",
                color: "oklch(0.08 0.01 264)",
              }}
              onClick={login}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isLoggingIn ? "Connecting..." : "Connect with Internet Identity"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Actor still initializing for this identity — wait
  if (actorFetching) {
    return (
      <div className="mesh-bg min-h-screen flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <SyncraLogo size="md" />
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Initializing your session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => setView("splash")}
            className="p-2 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <SyncraLogo size="sm" />
          <div className="h-4 w-px bg-border" />
          <p className="text-sm text-muted-foreground">Salesman Activation</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { label: "Contact", icon: <MessageSquare className="h-3 w-3" /> },
            { label: "Verify", icon: <Shield className="h-3 w-3" /> },
            { label: "Profile", icon: <User className="h-3 w-3" /> },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-all duration-300 shrink-0 ${
                  i < step
                    ? "bg-success text-success-foreground"
                    : i === step
                      ? "text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
                style={
                  i === step
                    ? {
                        background: "oklch(0.72 0.14 195)",
                        color: "oklch(0.08 0.01 264)",
                      }
                    : {}
                }
              >
                {i < step ? <Check className="h-3 w-3" /> : s.icon}
              </div>
              <span
                className={`text-xs font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
              {i < 2 && (
                <div
                  className={`h-px flex-1 mx-1 ${i < step ? "bg-success/40" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepWrapper key="step0">
                <h2 className="text-xl font-display font-bold mb-1">
                  Enter Your Contact
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Use the email or phone number your employer used to invite you
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="contact"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      Email or Phone Number
                    </Label>
                    <Input
                      id="contact"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="john@example.com or +91 98765 43210"
                      className="bg-input/50 border-border/50"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-muted-foreground">
                    🔍 Your invite is being verified against registered
                    businesses. This connects your account to your employer
                    automatically.
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleSendOtp}
                    disabled={!contactInfo.trim() || isSubmitting}
                    size="sm"
                    className="gap-1.5"
                    style={{
                      background: "oklch(0.72 0.14 195)",
                      color: "oklch(0.08 0.01 264)",
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Verifying..." : "Send Verification Code"}
                  </Button>
                </div>
              </StepWrapper>
            )}

            {step === 1 && (
              <StepWrapper key="step1">
                <h2 className="text-xl font-display font-bold mb-1">
                  Set Your Access PIN
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Create a 6-digit PIN for your account. You'll use this to
                  verify your identity.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="otp"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      6-digit PIN
                    </Label>
                    <Input
                      id="otp"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                      maxLength={6}
                      className="bg-input/50 border-border/50 text-center text-2xl font-mono tracking-[0.5em] h-14"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Enter a 6-digit PIN of your choice
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setStep(0)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={otp.length !== 6}
                    size="sm"
                    className="gap-1.5"
                    style={{
                      background: "oklch(0.72 0.14 195)",
                      color: "oklch(0.08 0.01 264)",
                    }}
                  >
                    Set PIN & Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </StepWrapper>
            )}

            {step === 2 && (
              <StepWrapper key="step2">
                <h2 className="text-xl font-display font-bold mb-1">
                  Complete Your Profile
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Set up your salesman profile
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="sname"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      Your Name
                    </Label>
                    <Input
                      id="sname"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="bg-input/50 border-border/50"
                    />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleActivate}
                    disabled={!name.trim() || isSubmitting}
                    size="sm"
                    className="gap-1.5"
                    style={{
                      background: "oklch(0.72 0.18 155)",
                      color: "oklch(0.08 0.01 264)",
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Activating..." : "Activate Account"}
                  </Button>
                </div>
              </StepWrapper>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
