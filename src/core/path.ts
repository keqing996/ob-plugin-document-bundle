export function normalizeVaultPath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function joinVaultPath(...parts: string[]): string {
  return normalizeVaultPath(parts.filter((part) => part.length > 0).join("/"));
}

export function dirname(path: string): string {
  const normalized = normalizeVaultPath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

export function basename(path: string): string {
  const normalized = normalizeVaultPath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? normalized : normalized.slice(index + 1);
}

export function extname(path: string): string {
  const name = basename(path);
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index).toLowerCase();
}

export function stripExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index <= 0 ? filename : filename.slice(0, index);
}

export function stripMarkdownExtension(filename: string): string {
  return filename.toLowerCase().endsWith(".md") ? filename.slice(0, -3) : filename;
}

export function sanitizeDocumentName(name: string): string {
  return name.trim().replace(/[/:\\]/g, "-").replace(/\s+/g, " ");
}

export function assertValidDocumentName(name: string): void {
  const sanitized = sanitizeDocumentName(name);
  if (sanitized.length === 0) {
    throw new Error("Document name cannot be empty.");
  }
}

export function incrementName(name: string, index: number): string {
  return index === 0 ? name : `${name} ${index}`;
}

export function incrementFilename(filename: string, index: number): string {
  if (index === 0) {
    return filename;
  }

  const extension = extname(filename);
  if (extension.length === 0) {
    return `${filename}-${index}`;
  }

  return `${filename.slice(0, -extension.length)}-${index}${extension}`;
}

export function isImageFilename(filename: string): boolean {
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"].includes(extname(filename));
}

export function formatTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("") + "-" + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

