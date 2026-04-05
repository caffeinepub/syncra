import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { BusinessType, Role, SubscriptionStatus } from "../backend.d";
import { SyncraLogo } from "../components/shared/SyncraLogo";
import { useAppContext } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const STEPS = ["Business", "Admin", "Subscription"];

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "\u20b92,499",
    period: "/mo",
    description: "For small retailers",
    features: [
      "Up to 5 salesmen",
      "500 products",
      "Basic analytics",
      "Email support",
    ],
    icon: <Zap className="h-5 w-5" />,
    color: "oklch(0.78 0.19 72)",
    borderColor: "oklch(0.78 0.19 72 / 0.4)",
    bgColor: "oklch(0.78 0.19 72 / 0.06)",
  },
  {
    id: "pro",
    name: "Pro",
    price: "\u20b96,499",
    period: "/mo",
    description: "For growing businesses",
    features: [
      "Up to 20 salesmen",
      "5,000 products",
      "Advanced analytics",
      "Priority support",
      "API access",
    ],
    icon: <BarChart3 className="h-5 w-5" />,
    color: "oklch(0.72 0.18 155)",
    borderColor: "oklch(0.72 0.18 155 / 0.4)",
    bgColor: "oklch(0.72 0.18 155 / 0.06)",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "\u20b916,499",
    period: "/mo",
    description: "For large operations",
    features: [
      "Unlimited salesmen",
      "Unlimited products",
      "Custom analytics",
      "24/7 support",
      "Dedicated manager",
    ],
    icon: <Users className="h-5 w-5" />,
    color: "oklch(0.62 0.18 280)",
    borderColor: "oklch(0.62 0.18 280 / 0.4)",
    bgColor: "oklch(0.62 0.18 280 / 0.06)",
  },
];

export function OwnerOnboarding() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { setView, refetchProfile } = useAppContext();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("pro");

  const isValidEmail = (e: string) =>
    e.trim() !== "" && e.includes("@") && e.includes(".");

  const canNext = () => {
    if (step === 0)
      return businessName.trim().length >= 2 && businessType !== "";
    if (step === 1) return ownerName.trim().length >= 2 && isValidEmail(email);
    return true;
  };

  const handleNext = () => {
    if (!canNext()) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!actor || !identity) {
      toast.error("Not connected. Please refresh and try again.");
      return;
    }
    setIsSubmitting(true);
    try {
      const planMap: Record<string, SubscriptionStatus> = {
        basic: SubscriptionStatus.trial,
        pro: SubscriptionStatus.trial,
        enterprise: SubscriptionStatus.trial,
      };
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const trialEndDate =
        now +
        BigInt(30) *
          BigInt(24) *
          BigInt(60) *
          BigInt(60) *
          BigInt(1_000_000_000);
      const businessId = await actor.registerBusiness(
        businessName.trim(),
        businessType as BusinessType,
        planMap[selectedPlan] ?? SubscriptionStatus.trial,
        now,
        trialEndDate,
      );
      await actor.saveCallerUserProfile(
        ownerName.trim(),
        email.trim(),
        phone.trim(),
        businessId,
        Role.owner,
        true,
      );
      toast.success("Business registered! Welcome to Syncra.");
      await refetchProfile();
      setView("owner-dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("IC0508") || msg.includes("stopped")) {
        toast.error(
          "Server temporarily unavailable. Please wait a moment and try again.",
        );
      } else if (msg.includes("IC0537") || msg.includes("no wasm")) {
        toast.error("Service is starting up. Please try again in 30 seconds.");
      } else {
        toast.error(`Registration failed: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!identity) {
    return (
      <div className="mesh-bg min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <button
              type="button"
              onClick={() => setView("splash")}
              className="p-2 rounded-xl hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <SyncraLogo size="sm" />
          </div>
          <div className="glass-card rounded-3xl p-8 text-center space-y-6">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{
                background: "oklch(0.78 0.19 72 / 0.15)",
                color: "oklch(0.78 0.19 72)",
              }}
            >
              <LogIn className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-bold">
                Sign In Required
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect with Internet Identity to create your business account.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full gap-2 btn-amber rounded-2xl h-12"
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
      <div className="w-full max-w-lg">
        {/* Back button + logo */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() =>
              step > 0 ? setStep((s) => s - 1) : setView("splash")
            }
            className="p-2 rounded-xl hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <SyncraLogo size="sm" />
          <div className="h-4 w-px bg-border" />
          <p className="text-sm text-muted-foreground">Owner Setup</p>
        </div>

        {/* Step progress */}
        <div className="mb-8">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all duration-300 shrink-0"
                    style={{
                      background:
                        i < step
                          ? "oklch(0.72 0.18 155)"
                          : i === step
                            ? "oklch(0.78 0.19 72)"
                            : "oklch(0.22 0.018 45)",
                      color:
                        i < step || i === step
                          ? "oklch(0.08 0.01 45)"
                          : "oklch(0.52 0.016 75)",
                    }}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className="text-[11px] font-medium whitespace-nowrap"
                    style={{
                      color:
                        i === step
                          ? "oklch(0.96 0.008 75)"
                          : "oklch(0.52 0.016 75)",
                    }}
                  >
                    {s}
                  </span>
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="h-px flex-1 mx-3 mt-[-12px] transition-all duration-500"
                    style={{
                      background:
                        i < step
                          ? "oklch(0.72 0.18 155 / 0.5)"
                          : "oklch(0.22 0.018 45)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="glass-card rounded-3xl p-7">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepWrapper key="step0">
                <h2 className="text-2xl font-display font-bold mb-1">
                  Business Details
                </h2>
                <p className="text-muted-foreground text-sm mb-7">
                  Tell us about your business
                </p>
                <div className="space-y-5">
                  <div>
                    <Label
                      htmlFor="bname"
                      className="text-sm font-medium mb-2 block"
                    >
                      Business Name
                    </Label>
                    <Input
                      id="bname"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Apex Fashion Store"
                      className="h-11 bg-input/60 border-border/60"
                      data-ocid="onboarding.input"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Business Type
                    </Label>
                    <Select
                      value={businessType}
                      onValueChange={(v) => setBusinessType(v as BusinessType)}
                    >
                      <SelectTrigger
                        className="h-11 bg-input/60 border-border/60"
                        data-ocid="onboarding.select"
                      >
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={BusinessType.clothing}>
                          \ud83d\udc57 Clothing
                        </SelectItem>
                        <SelectItem value={BusinessType.electronics}>
                          \ud83d\udcf1 Electronics
                        </SelectItem>
                        <SelectItem value={BusinessType.groceries}>
                          \ud83d\uded2 Groceries
                        </SelectItem>
                        <SelectItem value={BusinessType.general}>
                          \ud83c\udfea General
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </StepWrapper>
            )}
            {step === 1 && (
              <StepWrapper key="step1">
                <h2 className="text-2xl font-display font-bold mb-1">
                  Admin Details
                </h2>
                <p className="text-muted-foreground text-sm mb-7">
                  Your contact information
                </p>
                <div className="space-y-5">
                  <div>
                    <Label
                      htmlFor="oname"
                      className="text-sm font-medium mb-2 block"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="oname"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Raj Kumar"
                      className="h-11 bg-input/60 border-border/60"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium mb-2 block"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="raj@business.com"
                      className="h-11 bg-input/60 border-border/60"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="phone"
                      className="text-sm font-medium mb-2 block"
                    >
                      Phone Number{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-11 bg-input/60 border-border/60"
                    />
                  </div>
                </div>
              </StepWrapper>
            )}
            {step === 2 && (
              <StepWrapper key="step2">
                <h2 className="text-2xl font-display font-bold mb-1">
                  Choose Your Plan
                </h2>
                <p className="text-muted-foreground text-sm mb-7">
                  All plans start with a 1-month free trial
                </p>
                <div className="space-y-3">
                  {PLANS.map((plan) => (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className="w-full text-left p-4 rounded-2xl border transition-all duration-200"
                      style={{
                        background:
                          selectedPlan === plan.id
                            ? plan.bgColor
                            : "oklch(0.16 0.016 45 / 0.5)",
                        borderColor:
                          selectedPlan === plan.id
                            ? plan.borderColor
                            : "oklch(0.22 0.018 45 / 0.6)",
                      }}
                      data-ocid="onboarding.radio"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="p-2 rounded-xl shrink-0"
                            style={{
                              background: plan.bgColor,
                              color: plan.color,
                            }}
                          >
                            {plan.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">
                                {plan.name}
                              </p>
                              {plan.highlighted && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
                                  style={{
                                    background: "oklch(0.72 0.18 155 / 0.2)",
                                    color: "oklch(0.72 0.18 155)",
                                  }}
                                >
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {plan.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm">
                            {plan.price}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {plan.period}
                          </span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.slice(0, 3).map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <Check
                              className="h-3 w-3 shrink-0"
                              style={{ color: "oklch(0.72 0.18 155)" }}
                            />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-5">
                  \ud83c\udf89 First 30 days completely free \u2014 no credit
                  card required
                </p>
              </StepWrapper>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-7 pt-5 border-t border-border/40">
            {step > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-10 px-4"
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <Button
                size="sm"
                className="gap-1.5 h-10 px-5 btn-amber"
                onClick={handleNext}
                disabled={!canNext()}
                data-ocid="onboarding.primary_button"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 h-10 px-5"
                style={{
                  background: "oklch(0.72 0.18 155)",
                  color: "oklch(0.08 0.01 45)",
                }}
                onClick={handleSubmit}
                disabled={isSubmitting || !actor}
                data-ocid="onboarding.submit_button"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSubmitting ? "Setting up..." : "Start Free Trial"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
