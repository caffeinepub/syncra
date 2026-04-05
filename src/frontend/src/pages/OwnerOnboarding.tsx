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
    price: "₹2,499",
    period: "/mo",
    description: "For small retailers",
    features: [
      "Up to 5 salesmen",
      "500 products",
      "Basic analytics",
      "Email support",
    ],
    icon: <Zap className="h-5 w-5" />,
    color: "oklch(0.78 0.18 75)",
    borderColor: "oklch(0.78 0.18 75 / 0.4)",
    bgColor: "oklch(0.78 0.18 75 / 0.06)",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹6,499",
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
    price: "₹16,499",
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
    if (step === 0) return businessName.trim() && businessType;
    if (step === 1) return ownerName.trim() && isValidEmail(email);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!actor) {
      toast.error(
        "Still connecting to the network. Please wait a moment and try again.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const now = BigInt(Date.now() * 1_000_000);
      const trialEnd = BigInt(
        (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1_000_000,
      );
      const businessId = await actor.registerBusiness(
        businessName,
        businessType as BusinessType,
        SubscriptionStatus.trial,
        now,
        trialEnd,
      );
      await actor.saveCallerUserProfile(
        ownerName,
        email,
        phone,
        businessId,
        Role.owner,
        true,
      );
      toast.success("Business registered! Welcome to Syncra.");
      refetchProfile();
      setView("owner-dashboard");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Registration failed: ${msg}`);
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
            <p className="text-sm text-muted-foreground">Owner Setup</p>
          </div>
          <div className="glass-card rounded-2xl p-8 text-center space-y-5">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{
                background: "oklch(0.78 0.18 75 / 0.15)",
                color: "oklch(0.78 0.18 75)",
              }}
            >
              <LogIn className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold mb-2">
                Sign In Required
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect with Internet Identity to create your business account.
                Your identity is secured by the Internet Computer.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full gap-2"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.18 75), oklch(0.65 0.18 75))",
                color: "oklch(0.08 0.01 50)",
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

  // Actor still initializing — wait
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
        {/* Header */}
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
          <p className="text-sm text-muted-foreground">Owner Setup</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? "bg-success text-success-foreground"
                    : i === step
                      ? "text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
                style={
                  i === step
                    ? {
                        background: "oklch(0.78 0.18 75)",
                        color: "oklch(0.08 0.01 50)",
                      }
                    : {}
                }
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  i === step ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 min-w-8 mx-2 transition-colors ${
                    i < step ? "bg-success/40" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="glass-card rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepWrapper key="step0">
                <h2 className="text-xl font-display font-bold mb-1">
                  Business Details
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Tell us about your business
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="bname"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      Business Name
                    </Label>
                    <Input
                      id="bname"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Apex Fashion Store"
                      className="bg-input/50 border-border/50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      Business Type
                    </Label>
                    <Select
                      value={businessType}
                      onValueChange={(v) => setBusinessType(v as BusinessType)}
                    >
                      <SelectTrigger className="bg-input/50 border-border/50">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={BusinessType.clothing}>
                          👗 Clothing
                        </SelectItem>
                        <SelectItem value={BusinessType.electronics}>
                          📱 Electronics
                        </SelectItem>
                        <SelectItem value={BusinessType.groceries}>
                          🛒 Groceries
                        </SelectItem>
                        <SelectItem value={BusinessType.general}>
                          🏪 General
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </StepWrapper>
            )}
            {step === 1 && (
              <StepWrapper key="step1">
                <h2 className="text-xl font-display font-bold mb-1">
                  Admin Details
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Your contact information
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="oname"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="oname"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="John Doe"
                      className="bg-input/50 border-border/50"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@business.com"
                      className="bg-input/50 border-border/50"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="phone"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      Phone Number{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="bg-input/50 border-border/50"
                    />
                  </div>
                </div>
              </StepWrapper>
            )}
            {step === 2 && (
              <StepWrapper key="step2">
                <h2 className="text-xl font-display font-bold mb-1">
                  Choose Your Plan
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  All plans start with a 1-month free trial
                </p>
                <div className="space-y-3">
                  {PLANS.map((plan) => (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        selectedPlan === plan.id
                          ? ""
                          : "border-border/50 hover:border-border glass-card"
                      }`}
                      style={
                        selectedPlan === plan.id
                          ? {
                              borderColor: plan.borderColor,
                              background: plan.bgColor,
                            }
                          : {}
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              background: plan.bgColor,
                              color: plan.color,
                            }}
                          >
                            {plan.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">
                                {plan.name}
                              </p>
                              {plan.highlighted && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
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
                        <div className="text-right">
                          <span className="font-bold text-sm">
                            {plan.price}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {plan.period}
                          </span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {plan.features.slice(0, 3).map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <Check className="h-3 w-3 text-success shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-4">
                  🎉 First 30 days completely free — no credit card required
                </p>
              </StepWrapper>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
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
                className="gap-1.5"
                style={{
                  background: "oklch(0.78 0.18 75)",
                  color: "oklch(0.08 0.01 50)",
                }}
                onClick={handleNext}
                disabled={!canNext()}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5"
                style={{
                  background: "oklch(0.72 0.18 155)",
                  color: "oklch(0.08 0.01 50)",
                }}
                onClick={handleSubmit}
                disabled={isSubmitting || !actor}
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
