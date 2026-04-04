/** Safely get a display URL from an ExternalBlob or plain URL string.
 * Use this everywhere instead of the copy-pasted safeGetURL helpers.
 */
export function safeGetURL(image: unknown): string {
  if (!image) return "";
  if (typeof image === "string") return image;
  // ExternalBlob object from blob-storage component
  if (typeof image === "object" && image !== null) {
    // Live ExternalBlob instance with getDirectURL method
    if (
      typeof (image as { getDirectURL?: () => string }).getDirectURL ===
      "function"
    ) {
      try {
        return (image as { getDirectURL: () => string }).getDirectURL();
      } catch {
        return "";
      }
    }
    // Cache-rehydrated plain object with a url field
    if ("url" in image) {
      return (image as { url: string }).url ?? "";
    }
  }
  return "";
}
