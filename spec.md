# Syncra

## Current State
- OwnerSettings shows business info, appearance, subscription, security sections — no profile photo
- SalesmanProfile shows identity card with initials avatar, stats, appearance, sign out — no profile photo
- BillItem type only stores variantId, quantity, priceAtSale — no product/variant name
- Bill history in SalesmanBills shows `item.variantId.toString().slice(-8)` instead of product name
- Bill expanded view in LiveOperations also shows variantId slice
- Bill card in LiveOperations uses `\u2022` separator between Bill # and time — can appear on its own line if layout breaks
- UserProfile type has no photoUrl field (cannot change backend schema)

## Requested Changes (Diff)

### Add
- Profile photo upload section in OwnerSettings — upload photo via blob storage or base64 stored in localStorage keyed by principal ID
- Profile photo upload section in SalesmanProfile — same approach
- Avatar with photo preview in both profile screens (replace initials fallback with actual photo when set)
- localStorage-based variant name cache: when creating a bill, save a map of variantId -> {productName, variantName} to localStorage
- Helper to look up variant/product name from localStorage cache when displaying historical bills

### Modify
- OwnerSettings: add "Profile Photo" section at top with photo upload and preview
- SalesmanProfile: replace initials-only avatar with photo-capable avatar; add edit button for photo upload
- SalesmanBills detail sheet: use cached variant name map to display product + variant name instead of variantId
- LiveOperations expanded bill items: use cached variant name map to display product + variant name
- BillReviewSheet: save variantId -> {productName, variantName} map to localStorage on bill confirm

### Remove
- Nothing removed

## Implementation Plan
1. Create `utils/profilePhoto.ts` — helpers to get/set profile photo in localStorage by principal, and get/set variant name cache
2. Update `OwnerSettings.tsx` — add Profile section with photo upload (file input -> base64 -> localStorage)
3. Update `SalesmanProfile.tsx` — add photo to avatar, add edit button for photo upload
4. Update `BillReviewSheet.tsx` — on confirm, save variantId -> {productName, variantName} to localStorage
5. Update `SalesmanBills.tsx` — look up cached name for each bill item variantId
6. Update `LiveOperations.tsx` — look up cached name for each bill item variantId
7. Validate and deploy
