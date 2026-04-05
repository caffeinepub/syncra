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

/** Serialize cart to JSON — BigInt values are converted to strings with a __bigint__ marker */
function serializeCart(items: CartItem[]): string {
  return JSON.stringify(items, (_key, value) =>
    typeof value === "bigint" ? { __bigint__: value.toString() } : value,
  );
}

/** Deserialize cart from JSON — restores BigInt markers back to bigint */
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

/** Load persisted cart from localStorage */
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

  // Shared cart state — persisted to localStorage so it survives page closes/refreshes
  const [cartItems, setCartItemsRaw] = useState<CartItem[]>(() =>
    loadCartFromStorage(),
  );
  const [showBillReview, setShowBillReview] = useState(false);

  /** Wrap setCartItems to also persist to localStorage */
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
      icon: <ShoppingBag className="h-5 w-5" />,
    },
    { id: "profile", label: "Profile", icon: <User className="h-5 w-5" /> },
  ];

  // Total cart quantity across all items
  const cartTotalQty = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const cartTotalPrice = cartItems.reduce(
    (sum, ci) => sum + ci.price * ci.quantity,
    0,
  );

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
            cartItems={cartItems}
            setCartItems={setCartItems}
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

      {/* Floating Cart Bar — shown above bottom nav when there are items and not in product detail */}
      <AnimatePresence>
        {tab === "catalog" && cartItems.length > 0 && !selectedProduct && (
          <motion.div
            key="floating-cart"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-0 right-0 z-40 px-4"
            style={{ bottom: "72px" }}
          >
            <div className="max-w-screen-xl mx-auto">
              <button
                type="button"
                onClick={() => setShowBillReview(true)}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5 shadow-2xl border border-border/40"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.20 0.03 155 / 0.95), oklch(0.18 0.025 170 / 0.95))",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
                data-ocid="cart.open_modal_button"
              >
                {/* Left: cart info */}
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center relative"
                    style={{
                      background: "oklch(0.72 0.18 155 / 0.2)",
                    }}
                  >
                    <ShoppingBag
                      className="h-4 w-4"
                      style={{ color: "oklch(0.72 0.18 155)" }}
                    />
                    {/* item count badge */}
                    <span
                      className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{
                        background: "oklch(0.72 0.18 155)",
                        color: "oklch(0.08 0.01 50)",
                      }}
                    >
                      {cartTotalQty}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {cartTotalQty} item{cartTotalQty !== 1 ? "s" : ""}
                    </p>
                    <p
                      className="text-xs font-bold"
                      style={{ color: "oklch(0.72 0.18 155)" }}
                    >
                      ₹{Math.round(cartTotalPrice).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Right: review button */}
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.72 0.18 155), oklch(0.68 0.18 170))",
                    color: "oklch(0.08 0.01 50)",
                  }}
                >
                  Review Bill
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill Review Sheet */}
      <BillReviewSheet
        open={showBillReview}
        onClose={() => setShowBillReview(false)}
        cartItems={cartItems}
        setCartItems={setCartItems}
        businessId={userProfile?.businessId}
      />

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
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-150 relative ${
                tab === t.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={tab === t.id ? { color: "oklch(0.72 0.18 155)" } : {}}
              data-ocid={`nav.${t.id}.tab`}
            >
              {t.icon}
              <span className="text-[10px] font-medium">{t.label}</span>
              {/* Cart badge on catalog tab */}
              {t.id === "catalog" && cartItems.length > 0 && (
                <span
                  className="absolute top-1 right-3 h-3.5 min-w-3.5 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{
                    background: "oklch(0.72 0.18 155)",
                    color: "oklch(0.08 0.01 50)",
                  }}
                >
                  {cartTotalQty}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="h-20" />
    </div>
  );
}
