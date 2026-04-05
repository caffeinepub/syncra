import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Product } from "../../backend.d";
import { useAppContext } from "../../context/AppContext";
import { useProducts } from "../../hooks/useQueries";
import { safeGetURL } from "../../utils/blob";
import { SkeletonGrid } from "../shared/SkeletonCard";

interface Props {
  onSelectProduct: (product: Product) => void;
}

export function SalesmanCatalog({ onSelectProduct }: Props) {
  const { userProfile } = useAppContext();
  const { data: products, isLoading } = useProducts(userProfile?.businessId);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const allActive = (products ?? []).filter((p) => p.isActive);

  const filtered = allActive.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [...new Set(allActive.map((p) => p.category))];

  const displayProducts = activeCategory
    ? filtered.filter((p) => p.category === activeCategory)
    : filtered;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products, SKU, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9 h-11 bg-input/60 border-border/50"
          data-ocid="catalog.search_input"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="relative">
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background:
                  activeCategory === null
                    ? "oklch(0.78 0.19 72 / 0.15)"
                    : "oklch(0.17 0.016 45 / 0.6)",
                color:
                  activeCategory === null
                    ? "oklch(0.78 0.19 72)"
                    : "oklch(0.52 0.016 75)",
                border: `1px solid ${activeCategory === null ? "oklch(0.78 0.19 72 / 0.3)" : "oklch(0.22 0.018 45 / 0.5)"}`,
              }}
              data-ocid="catalog.tab"
            >
              All ({allActive.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? null : cat)
                }
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background:
                    activeCategory === cat
                      ? "oklch(0.78 0.19 72 / 0.15)"
                      : "oklch(0.17 0.016 45 / 0.6)",
                  color:
                    activeCategory === cat
                      ? "oklch(0.78 0.19 72)"
                      : "oklch(0.52 0.016 75)",
                  border: `1px solid ${activeCategory === cat ? "oklch(0.78 0.19 72 / 0.3)" : "oklch(0.22 0.018 45 / 0.5)"}`,
                }}
                data-ocid="catalog.tab"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {displayProducts.length} product
          {displayProducts.length !== 1 ? "s" : ""}
          {activeCategory ? ` in ${activeCategory}` : ""}
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : displayProducts.length === 0 ? (
        <div
          className="glass-card rounded-2xl p-10 text-center"
          data-ocid="catalog.empty_state"
        >
          <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold mb-1">
            {search ? "No products found" : "No products available"}
          </p>
          <p className="text-muted-foreground text-sm">
            {search ? "Try a different search term" : "Check back later"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayProducts.map((product, i) => (
            <CatalogCard
              key={product.id.toString()}
              product={product}
              index={i}
              onClick={() => onSelectProduct(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogCard({
  product,
  index,
  onClick,
}: {
  product: Product;
  index: number;
  onClick: () => void;
}) {
  const hues = [72, 155, 280, 68, 25];
  const hue = hues[index % hues.length];

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.28 }}
      onClick={onClick}
      className="glass-card rounded-2xl overflow-hidden text-left group transition-all duration-200 hover:shadow-glow-sm active:scale-[0.97] w-full flex flex-col"
      data-ocid={`catalog.item.${index + 1}`}
    >
      {/* Image */}
      <div
        className="aspect-[4/3] flex items-center justify-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, oklch(0.20 0.025 ${hue}) 0%, oklch(0.16 0.018 ${hue + 15}) 100%)`,
        }}
      >
        {product.imageUrls.length > 0 && safeGetURL(product.imageUrls[0]) ? (
          <img
            src={safeGetURL(product.imageUrls[0])}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <Package
            className="h-8 w-8 opacity-20"
            style={{ color: `oklch(0.78 0.19 ${hue})` }}
          />
        )}
        {/* Price overlay */}
        <div
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg text-xs font-bold"
          style={{
            background: "oklch(0.08 0.012 45 / 0.7)",
            color: "oklch(0.88 0.16 72)",
            backdropFilter: "blur(8px)",
          }}
        >
          ₹{Math.round(Number(product.basePrice) / 100).toLocaleString("en-IN")}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {product.category}
        </p>
      </div>
    </motion.button>
  );
}
