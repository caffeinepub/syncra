// Profile photo storage (by principal ID)
const PHOTO_PREFIX = "syncra_photo_";
const VARIANT_NAMES_PREFIX = "syncra_variantnames_";

export function getProfilePhoto(principalStr: string): string | null {
  try {
    return localStorage.getItem(`${PHOTO_PREFIX}${principalStr}`);
  } catch {
    return null;
  }
}

export function setProfilePhoto(principalStr: string, dataUrl: string): void {
  try {
    localStorage.setItem(`${PHOTO_PREFIX}${principalStr}`, dataUrl);
  } catch {
    // ignore storage errors (quota exceeded, etc.)
  }
}

export function removeProfilePhoto(principalStr: string): void {
  try {
    localStorage.removeItem(`${PHOTO_PREFIX}${principalStr}`);
  } catch {
    // ignore
  }
}

// Variant name cache (by businessId)
export interface VariantNameEntry {
  productName: string;
  variantName: string;
}

export function saveVariantNameCache(
  businessId: string,
  map: Record<string, VariantNameEntry>,
): void {
  try {
    localStorage.setItem(
      `${VARIANT_NAMES_PREFIX}${businessId}`,
      JSON.stringify(map),
    );
  } catch {
    // ignore
  }
}

export function getVariantNameCache(
  businessId: string,
): Record<string, VariantNameEntry> {
  try {
    const raw = localStorage.getItem(`${VARIANT_NAMES_PREFIX}${businessId}`);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, VariantNameEntry>;
  } catch {
    return {};
  }
}

export function mergeVariantNameCache(
  businessId: string,
  newEntries: Record<string, VariantNameEntry>,
): void {
  const existing = getVariantNameCache(businessId);
  saveVariantNameCache(businessId, { ...existing, ...newEntries });
}

export function lookupVariantName(
  businessId: string,
  variantId: string,
): VariantNameEntry | null {
  const cache = getVariantNameCache(businessId);
  return cache[variantId] ?? null;
}
