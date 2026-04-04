# Syncra

## Current State

Syncra is a full-stack Indian retail management web app with Owner and Salesman roles. The frontend is React + TypeScript + Tailwind with a Motoko ICP backend. The app has:
- SplashPage (role selection + Internet Identity login)
- OwnerDashboard (Live Ops, Analytics, Catalog Manager, Staff Manager, Settings)
- SalesmanFloor (Catalog, Bills, Profile tabs with persistent cart)
- Shared components: OfflineBanner, SubscriptionBanner, StatusBadge, SkeletonCard, SyncraLogo
- Dark/Light theme toggle persisted via localStorage
- Persistent cart saved to localStorage with BigInt serialization

## Requested Changes (Diff)

### Add
- `src/frontend/src/utils/blob.ts` — shared `safeGetURL(image)` utility used across CatalogManager, SalesmanCatalog, ProductDetailPage
- Logout button to OwnerSettings (in Security section or as a dedicated section at the bottom)
- Logout button to SalesmanProfile (in Account section or bottom)
- Clear (X) button inside search input in SalesmanCatalog when query is non-empty
- Stock availability hint badge on SalesmanCatalog product tiles ("All sold out" if all variants are sold out)
- Scroll event listener / IntersectionObserver in ProductDetailPage to track the active carousel image index and update dot indicators
- Per-bill/per-invite pending state tracking (using a Set<string> of IDs currently being acted upon)
- "Add chart visualization" — simple recharts BarChart in Analytics showing revenue by day (use the chart colors already defined in index.css)
- "Last updated" timestamp in LiveOperations
- Proactive "X days left in trial" soft warning in SubscriptionBanner when ≤7 days remain in trial

### Modify

#### ProductDetailPage.tsx
- **CRITICAL**: Fix `totalAmount` calculation: `priceAtSale * quantity` (not just `priceAtSale`) when building bill items array. Both the UI display total and the backend-submitted `totalAmount` must multiply price × quantity.
- Fix carousel dot indicator: add a `currentImageIndex` state, update it via an `onScroll` listener on the carousel container, use it to highlight the correct dot.
- Only show "Tap to expand" hint when the product has more than 1 image.
- Fix the `biome-ignore` on `useEffect` deps for `itemPrices` — add `myLockedVariants` and `basePrice` to the deps array.

#### BillReviewSheet.tsx  
- Add quantity upper bound check using the stock count from `CartItem` (add `maxStock?: number` field to `CartItem` type in SalesmanFloor.tsx or a shared types file).
- Validate price on blur/submit — reject zero or negative values with a toast.
- When `removeItem` is called, also call `releaseVariantLock` via the backend actor so the lock is released server-side.
- Update all hardcoded dark background colors (`oklch(0.16 0.02 264)` etc.) to use CSS variables so the sheet adapts to light mode.

#### LiveOperations.tsx
- Fix per-bill pending state: replace `isFinalizePending` / `isCancelPending` boolean with a `Set<string>` of bill IDs currently being acted on. Each bill card button should check whether its own ID is in that set.
- Fix amount display: change `Number(bill.totalAmount / BigInt(100))` → `Number(bill.totalAmount) / 100`.
- Show a "Last updated" timestamp (updated on each auto-refresh interval trigger).
- Expand the "Live Activity" stat card to show actual count of currently locked items or active salesmen rather than hardcoded "Active".
- Add a collapsible item list inside each bill card showing variant names and quantities.

#### Analytics.tsx
- Fix `filteredTotal` BigInt division: `Number(totalSales ?? BigInt(0)) / 100` (not `/ BigInt(100)`).
- Fix period bills count to be consistent — filter to `status === "finalized"` OR rename the label to "All Bills".
- Apply period filter to Activity Log tab as well (filter activity log entries by the selected period's date range).
- Add a simple recharts `BarChart` below the stat cards showing revenue per day for the selected period ("Today" → hourly, "Month" → daily, "Year" → monthly). Use the chart color tokens already defined in `index.css`.

#### OwnerSettings.tsx
- Remove unused `Palette` import.
- Add logout button (call `clear` from `useInternetIdentity`) in a dedicated "Account" section or at the bottom of the Security panel.
- Give each theme toggle button a unique `data-ocid` (`settings.toggle.dark`, `settings.toggle.light`).
- Phone placeholder: change from US format to `+91 98765 43210`.

#### StaffManager.tsx
- Fix per-invite revoke pending state: use a `Set<string>` of invite IDs being revoked.
- Add salesman name display: after invite is accepted, fetch the salesman's name via `useGetUserById` and show it in the invite row.
- Wire `useDeactivateSalesman` hook to add a "Deactivate" button for accepted/active salesmen.
- Add "Show all revoked" toggle to remove the hard `slice(0, 3)` cap.
- Move the `SalesmanInvite` type import to the top of the file with all other imports.
- Visually separate "Active Salesmen" (accepted) from "Pending Invites" in the active invites list.

#### SalesmanCatalog.tsx
- Add clear (X) button inside the search input that appears when `searchQuery.length > 0`.
- Add stock availability badge on tiles: if all variants of a product have `stockCount === 0`, show a "Sold Out" overlay badge on the product card.
- Add a right-side fade gradient on the category scroll container to indicate overflow.

#### SalesmanProfile.tsx
- Fix earnings calculation: `Number(totalEarnings) / 100` not `Number(totalEarnings / BigInt(100))`.
- Add logout button in the Account section.
- Rename "Active" status pulse to "Account Active" (remove the pulsing animation from the status dot since it's not a live-presence indicator).
- Rename "Earnings" to "Revenue Generated".

#### SalesmanBills.tsx
- In `BillDetailSheet`, replace raw variant ID display with variant name where possible: try loading the product from the existing products cache and find the matching variant. If not found, fall back to showing a shortened variant ID.
- Fix BigInt sort comparator: replace `Number(b.createdAt - a.createdAt)` with a direct BigInt ternary comparison.
- Replace the fixed `calc(100vh - 220px)` scroll area with a flex-based layout.
- Add a status filter row (All / Pending / Finalized / Cancelled) above the bill list.

#### useQueries.ts
- Fix offline product cache deserialization: store `basePrice` as a string in localStorage cache (e.g. `"basePrice_str": "500"`) and restore it as `BigInt(v.basePrice_str)` on hydration.
- Add `staleTime: 5_000` to `usePendingBills`.
- Wire `useDeactivateSalesman` — it's defined but never exported/used (it IS exported, just not consumed in StaffManager).

#### index.css
- Move `html.light .glass`, `html.light .glass-card`, `html.light .mesh-bg` overrides inside `@layer components`.
- Add light-mode values for `--success` and `--warning` inside `html.light`.
- Make the `animate-shimmer` gradient use CSS variable-friendly colors.
- Add `.stat-card` definition if missing (check if it exists, and if not define it as a glass card variant with consistent padding).

#### OwnerOnboarding.tsx  
- Fix plan card highlight inline style: `borderColor: \`oklch(0.72 0.14 195 / 0.5)\`` and `background: \`oklch(0.72 0.14 195 / 0.08)\`` — the current syntax `\`${plan.color} / 0.5\`` is invalid CSS.
- Update phone placeholder to Indian format `+91 98765 43210`.
- Add basic email format validation before allowing Step 1 → Step 2 transition.

#### SubscriptionBanner.tsx
- Fix `daysLeft` for grace period: the current code subtracts from `trialEndDate` which is already past. Add a grace period duration (e.g. 7 days after trial end) and calculate from that.
- Add a soft proactive warning variant: when subscription status is `trial` and `trialEndDate` is within 7 days, show a yellow "X days left in your trial" slim banner.

#### StatusBadge.tsx  
- Fix `oklch(var(--success))` syntax — use direct `oklch(0.72 0.18 155)` values or define `--success` as the full color string.
- Add dot indicator to `BillStatusBadge` for visual consistency with `ProductStateBadge`.

### Remove
- Hardcoded dark `oklch` values in inline styles in `BillReviewSheet.tsx` (replace with CSS variable tokens).
- Unused `Palette` import from `OwnerSettings.tsx`.
- Unused `import.ts` placeholder (if exists).

## Implementation Plan

1. **Create shared utility** `src/frontend/src/utils/blob.ts` with `safeGetURL`.
2. **Fix bill total calculation** in `ProductDetailPage.tsx` — multiply `priceAtSale × quantity` in both display and submission.
3. **Fix all BigInt division** across `LiveOperations`, `Analytics`, `SalesmanProfile`, `SalesmanBills` — convert to Number first.
4. **Fix per-item pending state** in `LiveOperations` and `StaffManager` using `Set<string>` of active IDs.
5. **Fix carousel dot indicator** in `ProductDetailPage` using scroll tracking.
6. **Fix BillDetailSheet variant names** in `SalesmanBills` by looking up from products cache.
7. **Add logout buttons** to `OwnerSettings` and `SalesmanProfile`.
8. **Add clear search button** to `SalesmanCatalog`.
9. **Fix Analytics**: period filter on activity log, period bills count consistency, BigInt division, add bar chart.
10. **Fix StaffManager**: per-revoke pending state, salesman name resolution, deactivate button, show-all revoked.
11. **Fix BillReviewSheet**: call `releaseVariantLock` on item removal, validate price, fix light mode colors.
12. **Fix light mode**: `index.css` layer moves, `--success`/`--warning` light values, `animate-shimmer` tokens, `.stat-card` definition.
13. **Fix OwnerOnboarding**: plan card CSS syntax, phone placeholder, email validation.
14. **Fix SubscriptionBanner**: grace period date calc, trial expiry warning.
15. **Fix StatusBadge**: CSS syntax, dot on BillStatusBadge.
16. **Fix OwnerSettings**: remove Palette import, add logout, fix data-ocid, phone placeholder.
17. **Fix SalesmanProfile**: BigInt fix, logout, rename fields, fix active status label.
18. **Fix SalesmanBills**: variant name lookup, BigInt sort, flex layout, status filter.
19. **Fix SalesmanCatalog**: sold-out overlay, category overflow fade, extract safeGetURL.
20. **Fix useQueries**: offline cache BigInt restoration, staleTime for usePendingBills.
