import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  UserCheck,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SyncraLogo } from "../components/shared/SyncraLogo";
import { useAppContext } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type RoleChoice = "owner" | "salesman" | null;

const ROLE_STORAGE_KEY = "syncra_role";

const FEATURES = [
  { icon: <Zap className="h-4 w-4" />, text: "Real-time inventory sync" },
  { icon: <ShieldCheck className="h-4 w-4" />, text: "Secure on-chain data" },
  {
    icon: <UserCheck className="h-4 w-4" />,
    text: "Role-based access control",
  },
];

export function SplashPage() {
  const { login, isLoggingIn, isInitializing, identity } =
    useInternetIdentity();
  const { isLoadingProfile, setView, userProfile } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<RoleChoice>(() => {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    if (saved === "owner" || saved === "salesman") return saved;
    return null;
  });

  const [authTimedOut, setAuthTimedOut] = useState(false);
  const timerScheduledRef = useRef(false);

  useEffect(() => {
    if (timerScheduledRef.current) return;
    timerScheduledRef.current = true;
    const t = setTimeout(() => setAuthTimedOut(true), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleSelect = (role: RoleChoice) => {
    setSelectedRole(role);
    if (role) {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  };

  const handleConnect = () => {
    if (!identity) {
      login();
      return;
    }
    if (isLoadingProfile) return;
    if (userProfile) {
      if (userProfile.role === "owner") {
        setView("owner-dashboard");
      } else {
        setView("salesman-floor");
      }
    } else {
      if (selectedRole === "owner") {
        setView("owner-onboarding");
      } else if (selectedRole === "salesman") {
        setView("salesman-activation");
      }
    }
  };

  const isLoading =
    isLoggingIn ||
    (!authTimedOut && isInitializing) ||
    (!!identity && isLoadingProfile);

  const isReturningUser = !!(identity && userProfile);

  return (
    <div className="mesh-bg min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
      {/* Decorative elements */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 70% 30%, oklch(0.78 0.19 72 / 0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 30% 70%, oklch(0.62 0.18 280 / 0.1) 0%, transparent 60%)",
        }}
      />
      {/* Floating background grid dots */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.78 0.19 72) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10 flex flex-col gap-8"
      >
        {/* Logo & brand */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <div
                className="absolute inset-0 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.78 0.19 72 / 0.3) 0%, transparent 70%)",
                }}
              />
              <SyncraLogo size="lg" />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display font-bold text-4xl tracking-tight mb-3"
          >
            Retail, Reimagined
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-base leading-relaxed"
          >
            Powerful inventory & billing for Indian retail businesses
          </motion.p>
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="glass-card rounded-3xl p-6"
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
                data-ocid="splash.loading_state"
              >
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Connecting to Internet Identity…
                </p>
              </motion.div>
            ) : isReturningUser ? (
              <motion.div
                key="returning"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{
                    background: "oklch(0.78 0.19 72 / 0.08)",
                    border: "1px solid oklch(0.78 0.19 72 / 0.15)",
                  }}
                >
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "oklch(0.78 0.19 72 / 0.15)",
                      color: "oklch(0.78 0.19 72)",
                    }}
                  >
                    {userProfile?.role === "owner" ? (
                      <Building2 className="h-5 w-5" />
                    ) : (
                      <UserCheck className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">Welcome back</p>
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">
                      {userProfile?.name ?? "User"} •{" "}
                      {userProfile?.role === "owner" ? "Owner" : "Salesman"}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base font-semibold gap-2 rounded-2xl btn-amber"
                  onClick={handleConnect}
                  data-ocid="splash.primary_button"
                >
                  Continue to Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="fresh"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <div>
                  <p className="text-sm font-semibold mb-3 text-foreground/90">
                    I am a…
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        {
                          id: "owner" as RoleChoice,
                          icon: <Building2 className="h-6 w-6" />,
                          label: "Business Owner",
                          desc: "Manage catalog, staff & analytics",
                        },
                        {
                          id: "salesman" as RoleChoice,
                          icon: <UserCheck className="h-6 w-6" />,
                          label: "Salesman",
                          desc: "Browse products & create bills",
                        },
                      ] as const
                    ).map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleSelect(role.id)}
                        data-ocid={`splash.${role.id}.button`}
                        className="relative flex flex-col items-start gap-3 p-4 rounded-2xl transition-all duration-200 text-left"
                        style={{
                          background:
                            selectedRole === role.id
                              ? "oklch(0.78 0.19 72 / 0.12)"
                              : "oklch(0.16 0.016 45 / 0.6)",
                          border:
                            selectedRole === role.id
                              ? "1.5px solid oklch(0.78 0.19 72 / 0.45)"
                              : "1.5px solid oklch(0.28 0.018 45 / 0.5)",
                        }}
                      >
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center"
                          style={{
                            background:
                              selectedRole === role.id
                                ? "oklch(0.78 0.19 72 / 0.18)"
                                : "oklch(0.22 0.018 45 / 0.8)",
                            color:
                              selectedRole === role.id
                                ? "oklch(0.78 0.19 72)"
                                : "oklch(0.55 0.016 75)",
                          }}
                        >
                          {role.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{role.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {role.desc}
                          </p>
                        </div>
                        {selectedRole === role.id && (
                          <motion.div
                            layoutId="role-check"
                            className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center"
                            style={{
                              background: "oklch(0.78 0.19 72)",
                              color: "oklch(0.08 0.01 45)",
                            }}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M2 5l2.5 2.5L8 2"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold gap-2 rounded-2xl btn-amber"
                  onClick={handleConnect}
                  disabled={!selectedRole}
                  data-ocid="splash.primary_button"
                >
                  {identity ? "Continue" : "Connect with Internet Identity"}
                  <ArrowRight className="h-5 w-5" />
                </Button>

                {selectedRole && !identity && (
                  <p className="text-xs text-center text-muted-foreground">
                    You'll be taken to Internet Identity to sign in securely
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 flex-wrap"
        >
          {FEATURES.map((f, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static feature list
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground"
              style={{
                background: "oklch(0.14 0.016 45 / 0.6)",
                border: "1px solid oklch(0.22 0.018 45 / 0.5)",
              }}
            >
              <span style={{ color: "oklch(0.78 0.19 72)" }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
