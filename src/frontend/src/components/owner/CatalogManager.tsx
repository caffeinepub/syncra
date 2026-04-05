import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  Edit,
  ImagePlus,
  Layers,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob as ExternalBlobImpl } from "../../backend";
import type { ExternalBlob, Product } from "../../backend.d";
import { safeGetURL } from "../../utils/blob";

import { useAppContext } from "../../context/AppContext";
import { useActor } from "../../hooks/useActor";
import {
  useAddProduct,
  useAddVariant,
  useEditProduct,
  useEditVariant,
  useProductVariants,
  useProducts,
  useResetVariantToAvailable,
} from "../../hooks/useQueries";
import { SkeletonGrid } from "../shared/SkeletonCard";
import { ProductStateBadge } from "../shared/StatusBadge";

export function CatalogManager() {
  const { business } = useAppContext();
  const { data: products, isLoading } = useProducts(business?.id);
  const addProduct = useAddProduct();
  const editProduct = useEditProduct();
  const addVariant = useAddVariant();

  const [search, setSearch] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductKey, setAddProductKey] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [managingVariants, setManagingVariants] = useState<Product | null>(
    null,
  );

  const filtered = (products ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenAddProduct = () => {
    setAddProductKey((k) => k + 1);
    setShowAddProduct(true);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-input/60 border-border/50"
            data-ocid="catalog.search_input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0 h-10 btn-amber"
          onClick={handleOpenAddProduct}
          data-ocid="catalog.open_modal_button"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: "oklch(0.78 0.19 72 / 0.1)",
            color: "oklch(0.78 0.19 72)",
          }}
        >
          {(products ?? []).length} products
        </span>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: "oklch(0.72 0.18 155 / 0.1)",
            color: "oklch(0.72 0.18 155)",
          }}
        >
          {(products ?? []).filter((p) => p.isActive).length} active
        </span>
        {search && filtered.length !== (products ?? []).length && (
          <span className="text-muted-foreground text-xs">
            {filtered.length} matching
          </span>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={handleOpenAddProduct} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((product, i) => (
            <ProductCard
              key={product.id.toString()}
              product={product}
              index={i}
              onEdit={() => setEditingProduct(product)}
              onManageVariants={() => setManagingVariants(product)}
            />
          ))}
        </div>
      )}

      {/* Add product dialog */}
      {showAddProduct && (
        <ProductFormDialog
          key={addProductKey}
          mode="add"
          onClose={() => setShowAddProduct(false)}
          onSave={async (data) => {
            if (!business?.id) return;
            try {
              const productId = await addProduct.mutateAsync({
                businessId: business.id,
                name: data.name,
                sku: data.sku,
                category: data.category,
                description: data.description,
                imageUrls: data.imageUrls,
                isActive: data.isActive,
                basePrice: BigInt(
                  Math.round(Number.parseFloat(data.basePrice || "0") * 100),
                ),
              });
              if (productId && data.variants && data.variants.length > 0) {
                for (const v of data.variants) {
                  if (!v.variantName.trim()) continue;
                  await addVariant.mutateAsync({
                    productId,
                    variantName: v.variantName.trim(),
                    stockCount: BigInt(
                      Number.parseInt(v.stockCount || "0", 10),
                    ),
                    price: v.price
                      ? BigInt(Math.round(Number.parseFloat(v.price) * 100))
                      : BigInt(
                          Math.round(
                            Number.parseFloat(data.basePrice || "0") * 100,
                          ),
                        ),
                  });
                }
              }
              setShowAddProduct(false);
              toast.success(`${data.name} added successfully!`);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              toast.error(`Failed to add product: ${msg}`);
            }
          }}
        />
      )}

      {/* Edit product dialog */}
      {editingProduct && (
        <ProductFormDialog
          mode="edit"
          initialData={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={async (data) => {
            try {
              await editProduct.mutateAsync({
                productId: editingProduct.id,
                name: data.name,
                sku: data.sku,
                category: data.category,
                description: data.description,
                imageUrls: data.imageUrls,
                isActive: data.isActive,
                basePrice: BigInt(
                  Math.round(Number.parseFloat(data.basePrice || "0") * 100),
                ),
              });
              setEditingProduct(null);
              toast.success(`${data.name} updated!`);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              toast.error(`Failed to update product: ${msg}`);
            }
          }}
        />
      )}

      {/* Variant manager dialog */}
      {managingVariants && (
        <VariantManagerDialog
          product={managingVariants}
          onClose={() => setManagingVariants(null)}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  index,
  onEdit,
  onManageVariants,
}: {
  product: Product;
  index: number;
  onEdit: () => void;
  onManageVariants: () => void;
}) {
  const hues = [72, 155, 280, 68, 25];
  const hue = hues[index % hues.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.3 }}
      className={`glass-card rounded-2xl overflow-hidden group relative flex flex-col transition-all duration-200 hover:shadow-glow-sm ${
        !product.isActive ? "opacity-50" : ""
      }`}
      data-ocid={`catalog.item.${index + 1}`}
    >
      {/* Image */}
      <div
        className="aspect-square flex items-center justify-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, oklch(0.20 0.025 ${hue}) 0%, oklch(0.16 0.018 ${hue + 20}) 100%)`,
        }}
      >
        {product.imageUrls.length > 0 && safeGetURL(product.imageUrls[0]) ? (
          <img
            src={safeGetURL(product.imageUrls[0])}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Package
            className="h-10 w-10 opacity-20"
            style={{ color: `oklch(0.78 0.19 ${hue})` }}
          />
        )}
        {!product.isActive && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          </div>
        )}
        {/* Base price chip */}
        <div
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg text-xs font-bold"
          style={{
            background: "oklch(0.08 0.012 45 / 0.75)",
            color: "oklch(0.88 0.16 72)",
            backdropFilter: "blur(8px)",
          }}
        >
          \u20b9
          {Math.round(Number(product.basePrice) / 100).toLocaleString("en-IN")}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex-1">
        <p className="text-sm font-semibold truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {product.category}
        </p>
      </div>

      {/* Action overlay */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-2 p-3">
        <Button
          size="sm"
          className="w-full gap-1.5 h-9 text-xs btn-amber"
          onClick={onEdit}
          data-ocid={`catalog.edit_button.${index + 1}`}
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 h-9 text-xs"
          onClick={onManageVariants}
          data-ocid={`catalog.secondary_button.${index + 1}`}
        >
          <Layers className="h-3.5 w-3.5" />
          Variants
        </Button>
      </div>
    </motion.div>
  );
}

interface InlineVariant {
  variantName: string;
  stockCount: string;
  price: string;
}

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  description: string;
  imageUrls: ExternalBlob[];
  isActive: boolean;
  basePrice: string;
  variants: InlineVariant[];
}

const DEFAULT_FORM: ProductFormData = {
  name: "",
  sku: "",
  category: "",
  description: "",
  imageUrls: [],
  isActive: true,
  basePrice: "",
  variants: [],
};

function ProductFormDialog({
  mode,
  initialData,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initialData?: Product;
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
}) {
  const { actor } = useActor();
  const [isSaving, setIsSaving] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductFormData>(() => {
    if (mode === "edit" && initialData) {
      return {
        name: initialData.name,
        sku: initialData.sku,
        category: initialData.category,
        description: initialData.description,
        imageUrls: initialData.imageUrls,
        isActive: initialData.isActive,
        basePrice: initialData.basePrice
          ? String(Math.round(Number(initialData.basePrice) / 100))
          : "",
        variants: [],
      };
    }
    return DEFAULT_FORM;
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        setLocalPreviews((prev) => [...prev, preview]);
        const blob = ExternalBlobImpl.fromURL(preview);
        setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, blob] }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setLocalPreviews((prev) => prev.filter((_, i) => i !== index));
    setForm((f) => ({
      ...f,
      imageUrls: f.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const addVariantRow = () => {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { variantName: "", stockCount: "", price: "" }],
    }));
  };

  const updateVariant = (
    i: number,
    field: keyof InlineVariant,
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, idx) =>
        idx === i ? { ...v, [field]: value } : v,
      ),
    }));
  };

  const removeVariant = (i: number) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, idx) => idx !== i),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!form.sku.trim()) {
      toast.error("SKU is required");
      return;
    }
    if (!form.basePrice || Number.isNaN(Number.parseFloat(form.basePrice))) {
      toast.error("Base price is required");
      return;
    }
    setIsSaving(true);
    try {
      const uploaded: ExternalBlob[] = [];
      for (const img of form.imageUrls) {
        const url = safeGetURL(img);
        if (url && !url.startsWith("data:")) {
          uploaded.push(img);
        } else if (url?.startsWith("data:") && actor) {
          try {
            const resp = await fetch(url);
            const buffer = await resp.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const stored = ExternalBlobImpl.fromBytes(bytes);
            uploaded.push(stored);
          } catch {
            uploaded.push(img);
          }
        }
      }
      await onSave({ ...form, imageUrls: uploaded });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="catalog.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "add" ? "Add New Product" : "Edit Product"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Photos */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Photos</Label>
            <div className="flex gap-2 flex-wrap">
              {localPreviews.map((preview) => (
                <div
                  key={preview.slice(-40)}
                  className="relative h-16 w-16 rounded-xl overflow-hidden"
                >
                  <img
                    src={preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(localPreviews.indexOf(preview))}
                    className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive/90 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              {mode === "edit" &&
                form.imageUrls
                  .filter((u) => {
                    const url = safeGetURL(u);
                    return url && !url.startsWith("data:");
                  })
                  .map((img) => (
                    <div
                      key={`existing-${safeGetURL(img) ?? Math.random()}`}
                      className="h-16 w-16 rounded-xl overflow-hidden"
                    >
                      <img
                        src={safeGetURL(img) ?? ""}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                data-ocid="catalog.upload_button"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-[9px]">Add</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
          </div>

          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label
                htmlFor="pname"
                className="text-sm font-medium mb-1.5 block"
              >
                Name
              </Label>
              <Input
                id="pname"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Premium Denim Jeans"
                className="bg-input/60 border-border/50"
                data-ocid="catalog.input"
              />
            </div>
            <div>
              <Label
                htmlFor="psku"
                className="text-sm font-medium mb-1.5 block"
              >
                SKU
              </Label>
              <Input
                id="psku"
                value={form.sku}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sku: e.target.value }))
                }
                placeholder="DNM-001"
                className="bg-input/60 border-border/50"
              />
            </div>
            <div>
              <Label
                htmlFor="pcat"
                className="text-sm font-medium mb-1.5 block"
              >
                Category
              </Label>
              <Input
                id="pcat"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="Bottoms"
                className="bg-input/60 border-border/50"
              />
            </div>
            <div className="col-span-2">
              <Label
                htmlFor="pprice"
                className="text-sm font-medium mb-1.5 block"
              >
                Base Price (\u20b9)
              </Label>
              <Input
                id="pprice"
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, basePrice: e.target.value }))
                }
                placeholder="1499"
                className="bg-input/60 border-border/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variants can override this price
              </p>
            </div>
            <div className="col-span-2">
              <Label
                htmlFor="pdesc"
                className="text-sm font-medium mb-1.5 block"
              >
                Description
              </Label>
              <Textarea
                id="pdesc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Product details..."
                className="bg-input/60 border-border/50 resize-none"
                rows={2}
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                data-ocid="catalog.switch"
              />
              <Label className="text-sm">Active (visible to salesmen)</Label>
            </div>
          </div>

          {/* Variants (add mode only) */}
          {mode === "add" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Variants & Stock</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={addVariantRow}
                  data-ocid="catalog.secondary_button"
                >
                  <Plus className="h-3 w-3" /> Add Variant
                </Button>
              </div>
              {form.variants.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No variants — you can add them after saving the product.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.variants.map((v, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: variant form rows
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        {i === 0 && (
                          <p className="text-[10px] text-muted-foreground mb-1">
                            Name
                          </p>
                        )}
                        <Input
                          value={v.variantName}
                          onChange={(e) =>
                            updateVariant(i, "variantName", e.target.value)
                          }
                          placeholder="e.g. Size M"
                          className="bg-input/60 border-border/50 h-8 text-sm"
                        />
                      </div>
                      <div className="w-20">
                        {i === 0 && (
                          <p className="text-[10px] text-muted-foreground mb-1">
                            Stock
                          </p>
                        )}
                        <Input
                          value={v.stockCount}
                          onChange={(e) =>
                            updateVariant(i, "stockCount", e.target.value)
                          }
                          placeholder="0"
                          type="number"
                          min="0"
                          className="bg-input/60 border-border/50 h-8 text-sm"
                        />
                      </div>
                      <div className="w-24">
                        {i === 0 && (
                          <p className="text-[10px] text-muted-foreground mb-1">
                            Price (\u20b9)
                          </p>
                        )}
                        <Input
                          value={v.price}
                          onChange={(e) =>
                            updateVariant(i, "price", e.target.value)
                          }
                          placeholder="base"
                          type="number"
                          min="0"
                          className="bg-input/60 border-border/50 h-8 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors mb-0.5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="catalog.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 btn-amber"
            data-ocid="catalog.submit_button"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving
              ? "Saving..."
              : mode === "add"
                ? "Add Product"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VariantManagerDialog({
  product,
  onClose,
}: { product: Product; onClose: () => void }) {
  const { data: variants, isLoading } = useProductVariants(product.id);
  const addVariant = useAddVariant();
  const resetVariant = useResetVariantToAvailable();

  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantStock, setNewVariantStock] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [resettingIds, setResettingIds] = useState<Set<string>>(new Set());

  const handleAddVariant = async () => {
    if (!newVariantName.trim()) return;
    setIsAdding(true);
    try {
      await addVariant.mutateAsync({
        productId: product.id,
        variantName: newVariantName.trim(),
        stockCount: BigInt(Number.parseInt(newVariantStock || "0", 10)),
        price: newVariantPrice
          ? BigInt(Math.round(Number.parseFloat(newVariantPrice) * 100))
          : product.basePrice,
      });
      setNewVariantName("");
      setNewVariantStock("");
      setNewVariantPrice("");
      toast.success("Variant added!");
    } catch (e: unknown) {
      toast.error(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleReset = async (variantId: bigint) => {
    const idStr = variantId.toString();
    setResettingIds((prev) => new Set(prev).add(idStr));
    try {
      await resetVariant.mutateAsync(variantId);
      toast.success("Variant reset to Available");
    } catch {
      toast.error("Failed to reset variant");
    } finally {
      setResettingIds((prev) => {
        const s = new Set(prev);
        s.delete(idStr);
        return s;
      });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" data-ocid="catalog.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">
            <span className="flex items-center gap-2">
              <Layers
                className="h-5 w-5"
                style={{ color: "oklch(0.78 0.19 72)" }}
              />
              {product.name} — Variants
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : (variants ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No variants yet
            </p>
          ) : (
            <div className="space-y-2">
              {(variants ?? []).map((v, i) => (
                <div
                  key={v.id.toString()}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    background: "oklch(0.16 0.016 45 / 0.6)",
                    border: "1px solid oklch(0.22 0.018 45 / 0.5)",
                  }}
                  data-ocid={`catalog.row.${i + 1}`}
                >
                  <div>
                    <p className="text-sm font-medium">{v.variantName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        Stock: {v.stockCount.toString()}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "oklch(0.78 0.19 72)" }}
                      >
                        \u20b9
                        {Math.round(Number(v.price) / 100).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProductStateBadge
                      state={v.state}
                      stockCount={v.stockCount}
                    />
                    {(v.state === "locked" || v.state === "sold") && (
                      <button
                        type="button"
                        onClick={() => handleReset(v.id)}
                        disabled={resettingIds.has(v.id.toString())}
                        className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-accent"
                        title="Reset to Available"
                        data-ocid={`catalog.edit_button.${i + 1}`}
                      >
                        {resettingIds.has(v.id.toString()) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw
                            className="h-3.5 w-3.5"
                            style={{ color: "oklch(0.72 0.18 155)" }}
                          />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Add variant row */}
        <div
          className="pt-4 border-t border-border/40 space-y-3"
          data-ocid="catalog.panel"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Add Variant
          </p>
          <div className="flex gap-2">
            <Input
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="e.g. Size L"
              className="bg-input/60 border-border/50 h-9 text-sm flex-1"
              data-ocid="catalog.input"
            />
            <Input
              value={newVariantStock}
              onChange={(e) => setNewVariantStock(e.target.value)}
              placeholder="Stock"
              type="number"
              min="0"
              className="bg-input/60 border-border/50 h-9 text-sm w-20"
            />
            <Input
              value={newVariantPrice}
              onChange={(e) => setNewVariantPrice(e.target.value)}
              placeholder="Price"
              type="number"
              min="0"
              className="bg-input/60 border-border/50 h-9 text-sm w-24"
            />
            <Button
              size="sm"
              className="h-9 gap-1 btn-amber shrink-0"
              onClick={handleAddVariant}
              disabled={!newVariantName.trim() || isAdding}
              data-ocid="catalog.submit_button"
            >
              {isAdding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="catalog.close_button"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="glass-card rounded-2xl p-12 text-center"
      data-ocid="catalog.empty_state"
    >
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: "oklch(0.78 0.19 72 / 0.1)",
          color: "oklch(0.78 0.19 72)",
        }}
      >
        <Package className="h-8 w-8" />
      </div>
      <h3 className="font-display font-bold text-lg mb-2">No products yet</h3>
      <p className="text-muted-foreground text-sm mb-5">
        Add your first product to start managing inventory
      </p>
      <Button
        className="gap-1.5 btn-amber"
        onClick={onAdd}
        data-ocid="catalog.primary_button"
      >
        <Plus className="h-4 w-4" />
        Add First Product
      </Button>
    </div>
  );
}
