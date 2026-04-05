import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, LogOut, ReceiptText, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Product } from "../backend.d";
import type { CartItem } from "../components/salesman/BillReviewSheet";
import { BillReviewSheet } from "../components/salesman/BillReviewSheet";
import { ProductDetailPage } from "../components/salesman/ProductDetailPage";
import { SalesmanBills } from "../components/salesman/SalesmanBills";
import { SalesmanCatalog } from "../components/salesman/SalesmanCatalog";
import { SalesmanProfile } from "../components/salesman/SalesmanProfile";
import { OfflineBanner } from "../components/shared/OfflineBanner";
import { SyncraLogo } from "../components/shared/SyncraLogo";
import { useAppContext } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type Tab = "catalog" | "bills" | "profile";

const CART_STORAGE_KEY = "syncra_cart";

function serializeCart(items: CartItem[]): string {
  return JSON.stringify(items, (_key, value) =>
    typeof value === "bigint" ? { __bigint__: value.toString() } : value,
  );
}

function deserializeCart(raw: string): CartItem[] {
  try {
    return JSON.parse(raw, (_key, value) => {
      if (value && typeof value === "object" && "__bigint__" in value) {
        return BigInt(value.__bigint__);
      }
      return value;
    }) as CartItem[];
  } catch {
    return [];
  }
}

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return deserializeCart(raw);
  } catch {
    return [];
  }
}

export function SalesmanFloor() {
  const { clear } = useInternetIdentity();
  const { userProfile } = useAppContext();
  const [tab, setTab] = useState<Tab>("catalog");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [cartItems, setCartItemsRaw] = useState<CartItem[]>(() =>
    loadCartFromStorage(),
  );
  const [showBillReview, setShowBillReview] = useState(false);

  const setCartItems = (items: CartItem[]) => {
    setCartItemsRaw(items);
    if (items.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
    } else {
      localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
    }
  };

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
      icon: <ReceiptText className="h-5 w-5" />,
    },
    { id: "profile", label: "Profile", icon: <User className="h-5 w-5" /> },
  ];

  const cartTotalQty = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const cartTotalPrice = cartItems.reduce(
    (sum, ci) => sum + ci.price * ci.quantity,
    0,
  );

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <OfflineBanner />

      {/* Top header */}
      <header className="glass-sidebar sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">
          <SyncraLogo size="sm" />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent/40 transition-colors"
              data-ocid="nav.dropdown_menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: "oklch(0.72 0.18 155 / 0.18)",
                    color: "oklch(0.72 0.18 155)",
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium truncate max-w-[120px]">
                {userProfile?.name}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={clear}
                data-ocid="nav.delete_button"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content — pb-24 clears bottom nav, pb-36 when cart bar is visible */}
      <main
        className="flex-1 px-4 py-5 max-w-screen-lg mx-auto w-full"
        style={{
          paddingBottom:
            cartItems.length > 0
              ? "calc(9rem + env(safe-area-inset-bottom, 0px))"
              : "calc(5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <AnimatePresence mode="wait">
          {selectedProduct ? (
            <motion.div
              key="product-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProductDetailPage
                product={selectedProduct}
                onBack={() => setSelectedProduct(null)}
                cartItems={cartItems}
                setCartItems={setCartItems}
              />
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === "catalog" && (
                <SalesmanCatalog
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />
              )}
              {tab === "bills" && <SalesmanBills />}
              {tab === "profile" && <SalesmanProfile />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating review bill bar — sits above bottom nav */}
      <AnimatePresence>
        {cartItems.length > 0 && !showBillReview && (
          <motion.div
            key="review-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-4 right-4 z-30"
            style={{
              bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 10px)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowBillReview(true)}
              data-ocid="cart.open_modal_button"
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all max-w-screen-lg mx-auto"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.80 0.19 72) 0%, oklch(0.70 0.19 68) 100%)",
                color: "oklch(0.08 0.01 45)",
                boxShadow:
                  "0 4px 20px oklch(0.78 0.19 72 / 0.45), 0 1px 3px oklch(0 0 0 / 0.2)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-sm"
                  style={{ background: "oklch(0.08 0.01 45 / 0.25)" }}
                >
                  {cartTotalQty}
                </div>
                <span className="font-semibold text-sm">Review Bill</span>
              </div>
              <div className="font-bold text-base">
                \u20b9{cartTotalPrice.toLocaleString("en-IN")}
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 glass-sidebar border-t border-border/30"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center max-w-screen-lg mx-auto">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSelectedProduct(null);
              }}
              data-ocid={`nav.${t.id}.tab`}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative min-h-[56px]"
              style={{
                color:
                  tab === t.id ? "oklch(0.78 0.19 72)" : "oklch(0.45 0.014 72)",
              }}
            >
              {/* Active top indicator */}
              {tab === t.id && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: "oklch(0.78 0.19 72)" }}
                />
              )}
              <div className="relative mt-1">
                {t.icon}
                {t.id === "bills" && cartItems.length > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{
                      background: "oklch(0.78 0.19 72)",
                      color: "oklch(0.08 0.01 45)",
                    }}
                  >
                    {cartTotalQty}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Bill review sheet */}
      <BillReviewSheet
        open={showBillReview}
        onClose={() => setShowBillReview(false)}
        cartItems={cartItems}
        setCartItems={setCartItems}
        businessId={userProfile?.businessId}
      />
    </div>
  );
}
