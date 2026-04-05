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

  const filtered = (products ?? [])
    .filter((p) => p.isActive)
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()),
    );

  const categories = [
    ...new Set(
      (products ?? []).filter((p) => p.isActive).map((p) => p.category),
    ),
  ];
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
          className="pl-9 pr-9 bg-input/50 h-11"
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

      {/* Category filters with right-side overflow fade */}
      {categories.length > 0 && (
        <div className="relative">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === null
                  ? "text-primary-foreground"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
              style={
                activeCategory === null
                  ? {
                      background: "oklch(0.78 0.18 75)",
                      color: "oklch(0.08 0.01 50)",
                    }
                  : {}
              }
              data-ocid="catalog.tab"
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() =>
                  setActiveCategory(cat === activeCategory ? null : cat)
                }
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? "text-primary-foreground"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
                style={
                  activeCategory === cat
                    ? {
                        background: "oklch(0.78 0.18 75)",
                        color: "oklch(0.08 0.01 50)",
                      }
                    : {}
                }
                data-ocid="catalog.tab"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
        <p className="text-xs text-muted-foreground">
          {displayProducts.length} products
          {activeCategory && ` in ${activeCategory}`}
        </p>
        <p className="hidden sm:block text-xs text-muted-foreground/60 italic">
          Product catalog managed by your store owner
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : displayProducts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayProducts.map((product, i) => (
            <ProductTile
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

function ProductTile({
  product,
  index,
  onClick,
}: {
  product: Product;
  index: number;
  onClick: () => void;
}) {
  const hues = [75, 155, 280, 25, 120];
  const hue = hues[index % hues.length];

  const imgUrl =
    product.imageUrls.length > 0 ? safeGetURL(product.imageUrls[0]) : "";

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="glass-card rounded-xl overflow-hidden text-left group w-full flex flex-col"
      data-ocid={`catalog.item.${index + 1}`}
    >
      {/* Image */}
      <div
        className="aspect-[4/3] relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, oklch(0.22 0.03 ${hue}) 0%, oklch(0.18 0.025 ${hue + 20}) 100%)`,
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package
              className="h-10 w-10"
              style={{ color: `oklch(0.6 0.08 ${hue})` }}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5">
        <p className="text-sm font-semibold line-clamp-1 leading-tight">
          {product.name}
        </p>
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4"
            style={{
              borderColor: `oklch(0.5 0.06 ${hue} / 0.4)`,
              color: `oklch(0.65 0.1 ${hue})`,
              background: `oklch(0.22 0.03 ${hue} / 0.5)`,
            }}
          >
            {product.category}
          </Badge>
          {product.basePrice > 0n && (
            <span
              className="text-xs font-semibold"
              style={{ color: "oklch(0.72 0.18 155)" }}
            >
              ₹{(Number(product.basePrice) / 100).toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function EmptyState() {
  return (
    <div
      className="glass-card rounded-2xl p-16 text-center"
      data-ocid="catalog.empty_state"
    >
      <div
        className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4"
        style={{ background: "oklch(0.78 0.18 75 / 0.1)" }}
      >
        <Package className="h-7 w-7" style={{ color: "oklch(0.78 0.18 75)" }} />
      </div>
      <p className="font-semibold text-foreground mb-1">Catalog is empty</p>
      <p className="text-sm text-muted-foreground">
        Products added by the owner will appear here
      </p>
    </div>
  );
}
