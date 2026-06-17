import type { BundleInfo } from "../types";

export type OpenAssetsFolderResult =
  | { status: "opened"; fullPath: string }
  | { status: "fallback"; path: string; reason: "not-desktop" | "missing-full-path" | "missing-open-path" }
  | { status: "open-error"; fullPath: string; message: string };

export interface OpenAssetsFolderContext {
  ensureFolder(path: string): Promise<void>;
  adapter: unknown;
  isDesktopApp: boolean;
  notify(message: string): void;
  formatAssetsFolderMessage?: (path: string) => string;
  openPath?: (path: string) => Promise<string>;
}

export async function openAssetsFolderWithFallback(
  context: OpenAssetsFolderContext,
  bundle: BundleInfo
): Promise<OpenAssetsFolderResult> {
  await context.ensureFolder(bundle.assetsFolderPath);
  const fallbackMessage = context.formatAssetsFolderMessage?.(bundle.assetsFolderPath) ?? `Assets folder: ${bundle.assetsFolderPath}`;

  if (!context.isDesktopApp) {
    context.notify(fallbackMessage);
    return { status: "fallback", path: bundle.assetsFolderPath, reason: "not-desktop" };
  }

  if (!hasFullPathAdapter(context.adapter)) {
    context.notify(fallbackMessage);
    return { status: "fallback", path: bundle.assetsFolderPath, reason: "missing-full-path" };
  }

  if (!context.openPath) {
    context.notify(fallbackMessage);
    return { status: "fallback", path: bundle.assetsFolderPath, reason: "missing-open-path" };
  }

  const fullPath = context.adapter.getFullPath(bundle.assetsFolderPath);
  const errorMessage = await context.openPath(fullPath);
  if (errorMessage) {
    context.notify(errorMessage);
    return { status: "open-error", fullPath, message: errorMessage };
  }

  return { status: "opened", fullPath };
}

function hasFullPathAdapter(adapter: unknown): adapter is { getFullPath(path: string): string } {
  return Boolean(
    adapter
      && typeof adapter === "object"
      && "getFullPath" in adapter
      && typeof adapter.getFullPath === "function"
  );
}
