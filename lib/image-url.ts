export function getImageUrl(src: string | null | undefined, cacheVersion?: string): string {
  if (!src) return "";
  if (!cacheVersion || src.includes("cv=")) return src;

  // Don't append cache version parameters to standard public SVG/asset paths to prevent hydration mismatches
  if (src.startsWith("/assets/") && (src.endsWith(".svg") || src.endsWith(".webp") || src.endsWith(".png"))) {
    return src;
  }

  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}cv=${cacheVersion}`;
}
