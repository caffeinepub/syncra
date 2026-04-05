import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  BarChart3,
  ChevronDown,
  LogOut,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Analytics } from "../components/owner/Analytics";
import { CatalogManager } from "../components/owner/CatalogManager";
import { LiveOperations } from "../components/owner/LiveOperations";
import { OwnerSettings } from "../components/owner/OwnerSettings";
import { StaffManager } from "../components/owner/StaffManager";
import { OfflineBanner } from "../components/shared/OfflineBanner";
import { SubscriptionBanner } from "../components/shared/SubscriptionBanner";
import { SyncraLogo } from "../components/shared/SyncraLogo";
import { useAppContext } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type Section = "live" | "analytics" | "catalog" | "staff" | "settings";

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "live", label: "Live Ops", icon: <Activity className="h-4 w-4" /> },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  { id: "catalog", label: "Catalog", icon: <Package className="h-4 w-4" /> },
  { id: "staff", label: "Staff", icon: <Users className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export function OwnerDashboard() {
  const { clear } = useInternetIdentity();
  const { userProfile, business } = useAppContext();
  const [section, setSection] = useState<Section>("live");

  const initials = userProfile?.name
    ? userProfile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OW";

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <OfflineBanner />
      <SubscriptionBanner business={business} />

      {/* Top header bar */}
      <header className="glass-sidebar border-b border-border/50 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 max-w-screen-2xl mx-auto">
          <SyncraLogo size="sm" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  section === item.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
                style={
                  section === item.id
                    ? {
                        color: "oklch(0.78 0.18 75)",
                        background: "oklch(0.78 0.18 75 / 0.1)",
                      }
                    : {}
                }
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: "oklch(0.78 0.18 75 / 0.2)",
                    color: "oklch(0.78 0.18 75)",
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold leading-tight">
                  {userProfile?.name || "Owner"}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {business?.name || "Business"}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={clear}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 px-2 pb-2 overflow-x-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                section === item.id
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              }`}
              style={
                section === item.id
                  ? {
                      background: "oklch(0.78 0.18 75)",
                      color: "oklch(0.08 0.01 50)",
                    }
                  : {}
              }
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {section === "live" && <LiveOperations />}
            {section === "analytics" && <Analytics />}
            {section === "catalog" && <CatalogManager />}
            {section === "staff" && <StaffManager />}
            {section === "settings" && <OwnerSettings />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
