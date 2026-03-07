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
// Import the concrete ExternalBlob class for static methods (fromBytes, etc.)
import { ExternalBlob as ExternalBlobImpl } from "../../backend";
import type { ExternalBlob, Product } from "../../backend.d";

/** Safely get a display URL from an ExternalBlob that may be a plain object after cache rehydration */
function safeGetURL(blob: ExternalBlob): string {
  try {
    if (typeof blob.getDirectURL === "function") return blob.getDirectURL();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = blob as any;
    if (typeof raw.url === "string") return raw.url;
    return "";
  } catch {
    return "";
  }
}
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
  const editVariant = useEditVariant();

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

  const handleCloseAddProduct = () => {
    setShowAddProduct(false);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input/50"
          />
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          style={{
            background: "oklch(0.72 0.14 195)",
            color: "oklch(0.08 0.01 264)",
          }}
          onClick={handleOpenAddProduct}
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{(products ?? []).length} products</span>
        <span>•</span>
        <span>{(products ?? []).filter((p) => p.isActive).length} active</span>
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

      {/* Add Product Dialog — key forces remount on each open, resetting all state */}
      <ProductFormDialog
        key={`add-${addProductKey}`}
        open={showAddProduct}
        onClose={handleCloseAddProduct}
        onSubmit={async (data) => {
          if (!business?.id) return;
          const productId = await addProduct.mutateAsync({
            ...data,
            imageUrls: data.imageUrls,
            businessId: business.id,
            basePrice: BigInt(
              Math.round(Number.parseFloat(data.basePrice || "0") * 100),
            ),
          });
          // Add inline variants sequentially
          for (const v of data.variants) {
            if (v.variantName.trim()) {
              await addVariant.mutateAsync({
                productId,
                variantName: v.variantName.trim(),
                stockCount: BigInt(v.stockCount || "0"),
                price: BigInt(
                  Math.round(Number.parseFloat(v.price || "0") * 100),
                ),
              });
            }
          }
          setShowAddProduct(false);
        }}
        isPending={addProduct.isPending || addVariant.isPending}
      />

      {/* Edit Product Dialog */}
      {editingProduct && (
        <ProductFormDialog
          key={`edit-${editingProduct.id.toString()}`}
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          initialData={editingProduct}
          onSubmit={async (data) => {
            await editProduct.mutateAsync({
              ...data,
              imageUrls: data.imageUrls,
              productId: editingProduct.id,
              basePrice: BigInt(
                Math.round(Number.parseFloat(data.basePrice || "0") * 100),
              ),
            });
            setEditingProduct(null);
          }}
          isPending={editProduct.isPending}
        />
      )}

      {/* Variant Manager Dialog */}
      {managingVariants && (
        <VariantManagerDialog
          product={managingVariants}
          open={!!managingVariants}
          onClose={() => setManagingVariants(null)}
          onAddVariant={async (data) => {
            await addVariant.mutateAsync({
              productId: managingVariants.id,
              variantName: data.variantName,
              stockCount: data.stockCount,
              price: data.price,
            });
          }}
          onEditVariant={async (data) => {
            await editVariant.mutateAsync(data);
          }}
          addPending={addVariant.isPending}
          editPending={editVariant.isPending}
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`glass-card rounded-xl overflow-hidden group relative transition-all duration-200 ${!product.isActive ? "opacity-50" : ""}`}
    >
      {/* Image placeholder */}
      <div
        className="aspect-square flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, oklch(0.22 0.02 ${200 + (index % 5) * 20}) 0%, oklch(0.18 0.02 ${220 + (index % 5) * 15}) 100%)`,
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
          <Package className="h-10 w-10 text-muted-foreground/30" />
        )}
        {!product.isActive && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground truncate mb-2">
          {product.category}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground/70">
          SKU: {product.sku}
        </p>
      </div>

      {/* Action overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
        <Button
          size="sm"
          className="w-full gap-1.5 h-8 text-xs"
          style={{
            background: "oklch(0.72 0.14 195)",
            color: "oklch(0.08 0.01 264)",
          }}
          onClick={onEdit}
        >
          <Edit className="h-3.5 w-3.5" />
          Edit Product
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 h-8 text-xs"
          onClick={onManageVariants}
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
  /** Only used on Add (not Edit) */
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
  open,
  onClose,
  initialData,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Product;
  onSubmit: (data: ProductFormData) => Promise<void>;
  isPending: boolean;
}) {
  const { actor } = useActor();

  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name ?? "",
    sku: initialData?.sku ?? "",
    category: initialData?.category ?? "",
    description: initialData?.description ?? "",
    imageUrls: initialData?.imageUrls ?? [],
    isActive: initialData?.isActive ?? true,
    basePrice:
      initialData?.basePrice && initialData.basePrice > 0n
        ? (Number(initialData.basePrice) / 100).toString()
        : "",
    variants: [],
  });
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<string[]>(
    initialData?.imageUrls?.map((img) => safeGetURL(img)).filter(Boolean) ?? [],
  );

  // New variant input state
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [newVariantStock, setNewVariantStock] = useState("");

  // Reset form when dialog re-opens (key prop on parent handles add-mode resets;
  // this handles the case where the same dialog instance becomes visible again)
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (open && !wasOpen && !initialData) {
      setForm(DEFAULT_FORM);
      setLocalPreviews([]);
      setIsReadingFiles(false);
      setNewVariantName("");
      setNewVariantPrice("");
      setNewVariantStock("");
    }
  }, [open, initialData]);

  const set =
    (
      key: keyof Pick<
        ProductFormData,
        "name" | "sku" | "category" | "description" | "basePrice"
      >,
    ) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    // Suppress actor unused warning — actor may be needed for future blob ops
    void actor;
    setIsReadingFiles(true);
    try {
      const newBlobs: ExternalBlob[] = [];
      const newPreviews: string[] = [];
      for (const file of files) {
        // Create a local object URL for immediate visual preview
        const previewUrl = URL.createObjectURL(file);
        const bytes = new Uint8Array(await file.arrayBuffer());
        // ExternalBlob.fromBytes creates a lazy blob — it will be uploaded
        // to the backend when passed to actor.addProduct / actor.editProduct.
        // We do NOT call withUploadProgress here because the upload happens
        // during form submit (isPending on the submit button covers that UX).
        const blob = ExternalBlobImpl.fromBytes(bytes);
        newBlobs.push(blob);
        newPreviews.push(previewUrl);
      }
      // Batch-update state once after reading all files
      setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ...newBlobs] }));
      setLocalPreviews((prev) => [...prev, ...newPreviews]);
    } catch (err) {
      console.error("Image read error:", err);
      toast.error("Failed to read image file. Please try again.");
    } finally {
      setIsReadingFiles(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory if it's a local preview
    const preview = localPreviews[index];
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setForm((f) => ({
      ...f,
      imageUrls: f.imageUrls.filter((_, i) => i !== index),
    }));
    setLocalPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addInlineVariant = () => {
    if (!newVariantName.trim()) return;
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        {
          variantName: newVariantName.trim(),
          stockCount: newVariantStock,
          price: newVariantPrice,
        },
      ],
    }));
    setNewVariantName("");
    setNewVariantPrice("");
    setNewVariantStock("");
  };

  const removeInlineVariant = (index: number) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }));
  };

  const handleCancel = () => {
    // Revoke all local object URLs to free memory
    for (const url of localPreviews) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
    setForm(DEFAULT_FORM);
    setLocalPreviews([]);
    setIsReadingFiles(false);
    setNewVariantName("");
    setNewVariantPrice("");
    setNewVariantStock("");
    onClose();
  };

  const isAddMode = !initialData;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="font-display">
            {initialData ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-3 py-2 pr-1">
            <Field label="Product Name">
              <Input
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Classic Denim Jacket"
                className="bg-input/50"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU">
                <Input
                  value={form.sku}
                  onChange={set("sku")}
                  placeholder="SKU-001"
                  className="bg-input/50 font-mono"
                />
              </Field>
              <Field label="Category">
                <Input
                  value={form.category}
                  onChange={set("category")}
                  placeholder="Jackets"
                  className="bg-input/50"
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={set("description")}
                placeholder="Product description for salesmen to reference..."
                className="bg-input/50 resize-none h-24"
              />
            </Field>

            <Field label="Base Price (₹)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ₹
                </span>
                <Input
                  type="number"
                  value={form.basePrice}
                  onChange={set("basePrice")}
                  placeholder="e.g. 499"
                  className="pl-7 bg-input/50"
                  min={0}
                  step={1}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Default price shown to salesmen. You can override per variant.
              </p>
            </Field>

            {/* Image upload */}
            <Field label="Product Photos">
              <div className="space-y-2">
                {localPreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {localPreviews.map((preview, i) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                        key={i}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-border/50"
                      >
                        <img
                          src={preview}
                          alt={`Uploaded ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-0.5 right-0.5 bg-destructive/80 rounded-full p-0.5 text-white hover:bg-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label
                  className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-border/50 hover:border-primary/50 transition-colors text-sm text-muted-foreground hover:text-foreground ${isReadingFiles ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {isReadingFiles ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reading photo…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4" />
                      Add Photos
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleImageUpload(e)}
                    disabled={isReadingFiles}
                  />
                </label>
              </div>
            </Field>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Active</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>

            {/* Inline Variants — only shown in Add mode */}
            {isAddMode && (
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Variants &amp; Stock
                </p>

                {/* Existing inline variants */}
                {form.variants.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {form.variants.map((v, i) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                        key={i}
                        className="flex items-center gap-2 bg-input/30 rounded-lg px-3 py-1.5"
                      >
                        <span className="flex-1 text-sm font-medium truncate">
                          {v.variantName}
                        </span>
                        {v.price ? (
                          <span
                            className="text-xs font-semibold shrink-0"
                            style={{ color: "oklch(0.72 0.18 155)" }}
                          >
                            ₹{v.price}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 shrink-0 italic">
                            ₹ Base
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground shrink-0">
                          Qty: {v.stockCount || "0"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeInlineVariant(i)}
                          className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new variant row */}
                <div className="flex gap-2 items-center flex-wrap">
                  <Input
                    placeholder="Variant (e.g. Size M)"
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    className="h-8 text-sm bg-input/50 flex-1 min-w-28"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInlineVariant();
                      }
                    }}
                  />
                  <div className="relative w-24 shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newVariantPrice}
                      onChange={(e) => setNewVariantPrice(e.target.value)}
                      className="h-8 text-sm bg-input/50 pl-5"
                      min={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addInlineVariant();
                        }
                      }}
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={newVariantStock}
                    onChange={(e) => setNewVariantStock(e.target.value)}
                    className="h-8 text-sm bg-input/50 w-16 shrink-0"
                    min={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInlineVariant();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 shrink-0"
                    disabled={!newVariantName.trim()}
                    onClick={addInlineVariant}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                  Leave price blank to use the base price for that variant. Add
                  all sizes/colours before saving.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!form.name || !form.sku || isPending || isReadingFiles}
            onClick={() => void onSubmit(form)}
            style={{
              background: "oklch(0.72 0.14 195)",
              color: "oklch(0.08 0.01 264)",
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                {isAddMode ? "Adding..." : "Saving…"}
              </>
            ) : isReadingFiles ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Reading…
              </>
            ) : initialData ? (
              "Save Changes"
            ) : (
              "Add Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VariantManagerDialog({
  product,
  open,
  onClose,
  onAddVariant,
  onEditVariant,
  addPending,
  editPending,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
  onAddVariant: (data: {
    variantName: string;
    stockCount: bigint;
    price: bigint;
  }) => Promise<void>;
  onEditVariant: (data: {
    variantId: bigint;
    variantName: string;
    stockCount: bigint;
    price: bigint;
  }) => Promise<void>;
  addPending: boolean;
  editPending: boolean;
}) {
  const { data: variants, isLoading } = useProductVariants(product.id);
  const resetVariant = useResetVariantToAvailable();
  const [newVariant, setNewVariant] = useState({
    name: "",
    stock: "",
    price: "",
  });
  const [editingVariant, setEditingVariant] = useState<{
    id: bigint;
    name: string;
    stock: string;
    price: string;
  } | null>(null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="font-display">Manage Variants</DialogTitle>
          <p className="text-sm text-muted-foreground">{product.name}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing variants */}
          <ScrollArea className="max-h-64">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="skeleton h-12 rounded-lg" />
                ))}
              </div>
            ) : (variants ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No variants yet
              </p>
            ) : (
              <div className="space-y-2 pr-2">
                {(variants ?? []).map((v) =>
                  editingVariant?.id === v.id ? (
                    <div
                      key={v.id.toString()}
                      className="glass-card rounded-lg p-3 space-y-2"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={editingVariant.name}
                          onChange={(e) =>
                            setEditingVariant(
                              (ev) => ev && { ...ev, name: e.target.value },
                            )
                          }
                          className="h-8 text-sm bg-input/50"
                          placeholder="Variant name"
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            ₹
                          </span>
                          <Input
                            type="number"
                            value={editingVariant.price}
                            onChange={(e) =>
                              setEditingVariant(
                                (ev) => ev && { ...ev, price: e.target.value },
                              )
                            }
                            className="h-8 text-sm bg-input/50 pl-5"
                            placeholder="Price"
                            min={0}
                          />
                        </div>
                        <Input
                          type="number"
                          value={editingVariant.stock}
                          onChange={(e) =>
                            setEditingVariant(
                              (ev) => ev && { ...ev, stock: e.target.value },
                            )
                          }
                          className="h-8 text-sm bg-input/50"
                          placeholder="Stock"
                          min={0}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={editPending}
                          onClick={() =>
                            void onEditVariant({
                              variantId: v.id,
                              variantName: editingVariant.name,
                              stockCount: BigInt(editingVariant.stock || "0"),
                              price: BigInt(
                                Math.round(
                                  Number.parseFloat(
                                    editingVariant.price || "0",
                                  ) * 100,
                                ),
                              ),
                            }).then(() => setEditingVariant(null))
                          }
                          style={{
                            background: "oklch(0.72 0.14 195)",
                            color: "oklch(0.08 0.01 264)",
                          }}
                        >
                          {editPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setEditingVariant(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={v.id.toString()}
                      className="glass-card rounded-lg p-3 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {v.variantName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            Stock: {v.stockCount.toString()}
                          </span>
                          {v.price > 0n ? (
                            <span
                              className="text-xs font-semibold"
                              style={{ color: "oklch(0.72 0.18 155)" }}
                            >
                              ₹{(Number(v.price) / 100).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">
                              ₹ Base
                            </span>
                          )}
                          <ProductStateBadge
                            state={v.state}
                            stockCount={v.stockCount}
                            className="text-[10px] py-0 h-4"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Reset to Available — only shown for locked or sold variants */}
                        {v.state !== "available" && (
                          <button
                            type="button"
                            title="Reset to Available"
                            onClick={() => void resetVariant.mutate(v.id)}
                            disabled={resetVariant.isPending}
                            className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-emerald-400 transition-colors"
                          >
                            {resetVariant.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          title="Edit variant"
                          onClick={() =>
                            setEditingVariant({
                              id: v.id,
                              name: v.variantName,
                              stock: v.stockCount.toString(),
                              price:
                                v.price > 0n
                                  ? (Number(v.price) / 100).toString()
                                  : "",
                            })
                          }
                          className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </ScrollArea>

          {/* Add new variant */}
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Add New Variant
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="e.g. Size M"
                value={newVariant.name}
                onChange={(e) =>
                  setNewVariant((v) => ({ ...v, name: e.target.value }))
                }
                className="h-8 text-sm bg-input/50"
              />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  placeholder="Price"
                  value={newVariant.price}
                  onChange={(e) =>
                    setNewVariant((v) => ({ ...v, price: e.target.value }))
                  }
                  className="h-8 text-sm bg-input/50 pl-5"
                  min={0}
                />
              </div>
              <Input
                type="number"
                placeholder="Stock qty"
                value={newVariant.stock}
                onChange={(e) =>
                  setNewVariant((v) => ({ ...v, stock: e.target.value }))
                }
                className="h-8 text-sm bg-input/50"
                min={0}
              />
            </div>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Leave price blank to use the product&apos;s base price.
            </p>
            <Button
              size="sm"
              className="mt-2 w-full h-8 text-xs gap-1.5"
              disabled={!newVariant.name || addPending}
              onClick={() =>
                void onAddVariant({
                  variantName: newVariant.name,
                  stockCount: BigInt(newVariant.stock || "0"),
                  price: BigInt(
                    Math.round(
                      Number.parseFloat(newVariant.price || "0") * 100,
                    ),
                  ),
                }).then(() => setNewVariant({ name: "", stock: "", price: "" }))
              }
              style={{
                background: "oklch(0.72 0.14 195)",
                color: "oklch(0.08 0.01 264)",
              }}
            >
              {addPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add Variant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-16 text-center">
      <div
        className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4"
        style={{ background: "oklch(0.72 0.14 195 / 0.1)" }}
      >
        <Package
          className="h-8 w-8"
          style={{ color: "oklch(0.72 0.14 195)" }}
        />
      </div>
      <p className="font-semibold text-foreground mb-1">No products yet</p>
      <p className="text-sm text-muted-foreground mb-4">
        Start building your catalog
      </p>
      <Button
        size="sm"
        onClick={onAdd}
        style={{
          background: "oklch(0.72 0.14 195)",
          color: "oklch(0.08 0.01 264)",
        }}
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add First Product
      </Button>
    </div>
  );
}
