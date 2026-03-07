# Syncra

## Current State
Syncra is a full-stack retail management app with Owner and Salesman roles. Products are stored with name, SKU, category, description, images, and isActive flag. ProductVariants have variantName, stockCount, state, and lockedBy. There is no price stored on products or variants — salesmen currently type in the price manually when generating a bill token.

## Requested Changes (Diff)

### Add
- `basePrice: Nat` field on the `Product` type (stored in paise, e.g. ₹150 = 15000). This is the default/fallback price for all variants of that product.
- `price: Nat` field on the `ProductVariant` type (also in paise). If 0 or not explicitly set by owner, the variant uses the product's `basePrice`.
- Base price input in the Add Product and Edit Product form (owner only).
- Per-variant price input in both the inline variant section (Add Product form) and the Variant Manager dialog.
- If a variant price field is left blank/0 by owner, auto-fill it with the product's base price on save.
- Price displayed on catalog tiles (salesman view) — show the lowest variant price or base price.
- Bill modal pre-fills each variant's price from the stored variant price (or product base price as fallback), so salesman doesn't need to manually enter the price.

### Modify
- `addProduct` backend function: accept `basePrice: Nat` parameter.
- `editProduct` backend function: accept `basePrice: Nat` parameter.
- `addProductVariant` backend function: accept `price: Nat` parameter. If 0, store 0 (frontend will display basePrice as fallback).
- `editProductVariant` backend function: accept `price: Nat` parameter.
- `ProductFormData` interface in CatalogManager: add `basePrice: string` field.
- `InlineVariant` interface: add `price: string` field.
- CatalogManager Add/Edit Product form: add "Base Price (₹)" input field after Description.
- Inline variant rows: add price input alongside name and qty.
- VariantManagerDialog: add price input to both add-new and edit-existing variant rows.
- SalesmanCatalog `ProductTile`: display base price below the category badge.
- ProductDetailPage bill modal: pre-fill each variant's price input from `variant.price` (if > 0) else from `product.basePrice`. If still 0, leave blank.

### Remove
- Nothing removed.

## Implementation Plan
1. Regenerate backend (main.mo) with `basePrice` on Product and `price` on ProductVariant, and updated function signatures for addProduct, editProduct, addProductVariant, editProductVariant.
2. Update CatalogManager.tsx:
   - Add `basePrice: string` to `ProductFormData` and `DEFAULT_FORM`.
   - Add `price: string` to `InlineVariant`.
   - Add Base Price input field in `ProductFormDialog`.
   - Add price input to inline variant rows (Add mode).
   - Add price input to VariantManagerDialog add/edit rows.
   - Pass basePrice and variant prices through to mutations.
3. Update useQueries.ts:
   - `useAddProduct`: include `basePrice` param.
   - `useEditProduct`: include `basePrice` param.
   - `useAddVariant`: include `price` param.
   - `useEditVariant`: include `price` param.
4. Update SalesmanCatalog.tsx `ProductTile`: show `₹{basePrice/100}` below category badge.
5. Update ProductDetailPage.tsx bill modal: pre-fill `itemPrices` from `variant.price > 0 ? variant.price : product.basePrice`.
