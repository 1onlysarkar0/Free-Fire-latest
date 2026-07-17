export function getImageUrl(src: string | null | undefined, cacheVersion?: string): string {
  if (!src) return "";
  if (!cacheVersion) return src;

  const separator = src.includes("?") ? "&" : "?";
  const versioned = `${src}${separator}cv=${cacheVersion}`;

  return versioned;
}
