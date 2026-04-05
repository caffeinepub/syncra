import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  BarChart3,
  Building2,
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

  const sectionTitles: Record<Section, string> = {
    live: "Live Operations",
    analytics: "Analytics",
    catalog: "Catalog",
    staff: "Staff",
    settings: "Settings",
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <OfflineBanner />
      <SubscriptionBanner business={business} />

      {/* Sticky top header */}
      <header
        className="glass-sidebar sticky top-0 z-40"
        data-ocid="dashboard.panel"
      >
        {/* Main header row */}
        <div className="flex items-center justify-between px-4 md:px-6 h-14 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <SyncraLogo size="sm" />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 pl-3 border-l border-border/30">
              {NAV_ITEMS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  data-ocid={`nav.${item.id}.tab`}
                  className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    color:
                      section === item.id
                        ? "oklch(0.78 0.19 72)"
                        : "oklch(0.52 0.016 75)",
                    background:
                      section === item.id
                        ? "oklch(0.78 0.19 72 / 0.1)"
                        : "transparent",
                  }}
                >
                  {item.icon}
                  {item.label}
                  {section === item.id && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: "oklch(0.78 0.19 72 / 0.08)",
                        border: "1px solid oklch(0.78 0.19 72 / 0.18)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: business name + avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-accent/40 transition-colors"
              data-ocid="nav.dropdown_menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: "oklch(0.78 0.19 72 / 0.18)",
                    color: "oklch(0.78 0.19 72)",
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold leading-none">
                  {userProfile?.name ?? "Owner"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">
                  {business?.name ?? "Business"}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold">{userProfile?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {userProfile?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-muted-foreground"
                onClick={() => setSection("settings")}
              >
                <Building2 className="h-3.5 w-3.5" />
                Business Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={clear}
                data-ocid="nav.delete_button"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile nav — scrollable tab bar */}
        <div className="flex md:hidden overflow-x-auto border-t border-border/30 scrollbar-thin">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSection(item.id)}
              data-ocid={`nav.${item.id}.tab`}
              className="flex shrink-0 flex-col items-center gap-1 px-5 py-2.5 text-[11px] font-medium transition-colors relative"
              style={{
                color:
                  section === item.id
                    ? "oklch(0.78 0.19 72)"
                    : "oklch(0.52 0.016 75)",
              }}
            >
              {item.icon}
              {item.label}
              {section === item.id && (
                <div
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                  style={{ background: "oklch(0.78 0.19 72)" }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 px-4 md:px-6 pt-6 pb-10 max-w-screen-2xl mx-auto w-full">
        {/* Section title */}
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl">
            {sectionTitles[section]}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
