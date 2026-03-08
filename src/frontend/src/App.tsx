import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SyncraLogo } from "./components/shared/SyncraLogo";
import { AppProvider, useAppContext } from "./context/AppContext";
import { OwnerDashboard } from "./pages/OwnerDashboard";
import { OwnerOnboarding } from "./pages/OwnerOnboarding";
import { SalesmanActivation } from "./pages/SalesmanActivation";
import { SalesmanFloor } from "./pages/SalesmanFloor";
import { SplashPage } from "./pages/SplashPage";

function AppRoutes() {
  const { view, isLoadingProfile } = useAppContext();
  // Hard 3-second timeout from mount — never resets, never allows infinite loading
  const [timedOut, setTimedOut] = useState(false);
  const timeoutFiredRef = useRef(false);

  useEffect(() => {
    if (timeoutFiredRef.current) return;
    timeoutFiredRef.current = true;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global loading state — but never block forever
  if (!timedOut && isLoadingProfile) {
    return (
      <div className="mesh-bg min-h-screen flex flex-col items-center justify-center gap-6">
        <SyncraLogo size="md" />
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {view === "splash" && <SplashPage key="splash" />}
      {view === "owner-onboarding" && (
        <OwnerOnboarding key="owner-onboarding" />
      )}
      {view === "salesman-activation" && (
        <SalesmanActivation key="salesman-activation" />
      )}
      {view === "owner-dashboard" && <OwnerDashboard key="owner-dashboard" />}
      {view === "salesman-floor" && <SalesmanFloor key="salesman-floor" />}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "oklch(0.18 0.015 264)",
            border: "1px solid oklch(0.28 0.02 264)",
            color: "oklch(0.96 0.005 264)",
          },
        }}
      />
    </AppProvider>
  );
}
