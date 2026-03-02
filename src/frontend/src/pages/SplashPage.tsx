import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Loader2, UserCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { SyncraLogo } from "../components/shared/SyncraLogo";
import { useAppContext } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type RoleChoice = "owner" | "salesman" | null;

const ROLE_STORAGE_KEY = "syncra_role";

export function SplashPage() {
  const { login, isLoggingIn, isInitializing, identity } =
    useInternetIdentity();
  const { isLoadingProfile, setView, userProfile } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<RoleChoice>(() => {
    // Restore role hint from localStorage
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    if (saved === "owner" || saved === "salesman") return saved;
    return null;
  });

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
    } else {
      // Already authenticated
      if (userProfile) {
        // Returning user — go straight to their dashboard
        if (userProfile.role === "owner") {
          setView("owner-dashboard");
        } else {
          setView("salesman-floor");
        }
      } else {
        // New user — go to onboarding/activation
        if (selectedRole === "owner") {
          setView("owner-onboarding");
        } else if (selectedRole === "salesman") {
          setView("salesman-activation");
        }
      }
    }
  };

  // Auto-navigate only if authenticated but has NO profile yet (new user)
  // Do NOT auto-navigate if userProfile already exists — AppContext handles routing for returning users
  useEffect(() => {
    if (
      identity &&
      !isInitializing &&
      !isLoadingProfile &&
      selectedRole &&
      !userProfile
    ) {
      if (selectedRole === "owner") {
        setView("owner-onboarding");
      } else if (selectedRole === "salesman") {
        setView("salesman-activation");
      }
    }
  }, [
    identity,
    isInitializing,
    isLoadingProfile,
    selectedRole,
    userProfile,
    setView,
  ]);

  const isLoading = isLoggingIn || isInitializing || isLoadingProfile;

  return (
    <div className="mesh-bg min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.14 195), transparent)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.18 270), transparent)",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.9 0.01 264) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0.01 264) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo + tagline */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <SyncraLogo size="lg" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-muted-foreground text-base leading-relaxed"
          >
            Retail management built for speed.
            <br />
            Real-time inventory. Instant insights.
          </motion.p>
        </div>

        {/* Role selection */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <p className="text-sm font-medium text-muted-foreground mb-3 text-center tracking-wide uppercase text-xs">
            I am a...
          </p>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              icon={<Building2 className="h-6 w-6" />}
              title="Business Owner"
              description="Manage catalog, staff & analytics"
              selected={selectedRole === "owner"}
              onClick={() => handleRoleSelect("owner")}
            />
            <RoleCard
              icon={<UserCheck className="h-6 w-6" />}
              title="Salesman"
              description="Browse catalog & generate bills"
              selected={selectedRole === "salesman"}
              onClick={() => handleRoleSelect("salesman")}
            />
          </div>
        </motion.div>

        {/* Connect button */}
        <AnimatePresence>
          {selectedRole && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                size="lg"
                className="w-full gap-2 h-12 text-base font-semibold glow-cyan"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.14 195), oklch(0.65 0.18 210))",
                  color: "oklch(0.08 0.01 264)",
                }}
                onClick={handleConnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {isLoading
                  ? "Connecting..."
                  : identity
                    ? "Continue →"
                    : "Connect with Internet Identity"}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                {identity
                  ? "You're signed in — tap to continue"
                  : "Secured by Internet Computer's decentralized identity"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature callouts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 grid grid-cols-3 gap-4"
        >
          {[
            { label: "Real-time Sync", icon: "⚡" },
            { label: "Offline Ready", icon: "📡" },
            { label: "Role-Based", icon: "🔐" },
          ].map((f) => (
            <div key={f.label} className="text-center glass rounded-xl p-3">
              <div className="text-xl mb-1">{f.icon}</div>
              <p className="text-xs text-muted-foreground font-medium">
                {f.label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-6 text-xs text-muted-foreground text-center"
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </motion.footer>
    </div>
  );
}

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function RoleCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left p-4 rounded-xl border transition-all duration-200 ${
        selected
          ? "border-primary/50 bg-primary/10 shadow-glow"
          : "glass-card hover:border-border hover:bg-accent/30"
      }`}
      style={selected ? { borderColor: "oklch(0.72 0.14 195 / 0.5)" } : {}}
    >
      <div
        className={`mb-3 transition-colors ${
          selected ? "text-primary" : "text-muted-foreground"
        }`}
        style={selected ? { color: "oklch(0.72 0.14 195)" } : {}}
      >
        {icon}
      </div>
      <p className="font-semibold text-sm text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground leading-snug">
        {description}
      </p>
      {selected && (
        <div
          className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full animate-pulse-ring"
          style={{ background: "oklch(0.72 0.18 155)" }}
        />
      )}
    </button>
  );
}
