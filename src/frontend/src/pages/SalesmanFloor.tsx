import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, LogOut, ShoppingBag, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Product } from "../backend.d";
import { ProductDetailPage } from "../components/salesman/ProductDetailPage";
import { SalesmanBills } from "../components/salesman/SalesmanBills";
import { SalesmanCatalog } from "../components/salesman/SalesmanCatalog";
import { SalesmanProfile } from "../components/salesman/SalesmanProfile";
import { OfflineBanner } from "../components/shared/OfflineBanner";
import { SyncraLogo } from "../components/shared/SyncraLogo";
import { useAppContext } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type Tab = "catalog" | "bills" | "profile";

export function SalesmanFloor() {
  const { clear } = useInternetIdentity();
  const { userProfile } = useAppContext();
  const [tab, setTab] = useState<Tab>("catalog");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const initials = userProfile?.name
    ? userProfile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SM";

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "catalog",
      label: "Catalog",
      icon: <LayoutGrid className="h-5 w-5" />,
    },
    {
      id: "bills",
      label: "My Bills",
      icon: <ShoppingBag className="h-5 w-5" />,
    },
    { id: "profile", label: "Profile", icon: <User className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <OfflineBanner />

      {/* Top header */}
      <header className="glass-sidebar border-b border-border/50 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <SyncraLogo size="sm" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: "oklch(0.72 0.18 155 / 0.2)",
                    color: "oklch(0.72 0.18 155)",
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">
                {userProfile?.name}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      </header>

      {/* Product detail overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full p-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "catalog" && (
              <SalesmanCatalog onSelectProduct={setSelectedProduct} />
            )}
            {tab === "bills" && <SalesmanBills />}
            {tab === "profile" && <SalesmanProfile />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-sidebar border-t border-border/50">
        <div className="flex items-center justify-around max-w-screen-xl mx-auto px-4 py-2">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSelectedProduct(null);
              }}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-150 ${
                tab === t.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={tab === t.id ? { color: "oklch(0.72 0.18 155)" } : {}}
            >
              {t.icon}
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="h-20" />
      <footer className="border-t border-border/30 py-3 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
