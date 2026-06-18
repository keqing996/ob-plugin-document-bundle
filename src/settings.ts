import type { BundleBadgeMode, DocumentsBundleSettings } from "./types";

export const BUNDLE_ASSETS_FOLDER_NAME = "assets";
export const DEFAULT_BUNDLE_BADGE_MODE: BundleBadgeMode = "icon";

export const DEFAULT_SETTINGS: DocumentsBundleSettings = {
  handleBundleAttachments: true,
  enhanceNativeFileExplorer: true,
  bundleBadgeMode: DEFAULT_BUNDLE_BADGE_MODE
};

export function normalizeSettings(savedSettings: unknown): DocumentsBundleSettings {
  const data = isRecord(savedSettings) ? savedSettings : {};
  const legacyPasted = data.handlePastedAttachments;
  const legacyDropped = data.handleDroppedAttachments;

  return {
    handleBundleAttachments: typeof data.handleBundleAttachments === "boolean"
      ? data.handleBundleAttachments
      : legacyPasted === false || legacyDropped === false
        ? false
        : DEFAULT_SETTINGS.handleBundleAttachments,
    enhanceNativeFileExplorer: typeof data.enhanceNativeFileExplorer === "boolean"
      ? data.enhanceNativeFileExplorer
      : DEFAULT_SETTINGS.enhanceNativeFileExplorer,
    bundleBadgeMode: isBundleBadgeMode(data.bundleBadgeMode)
      ? data.bundleBadgeMode
      : DEFAULT_SETTINGS.bundleBadgeMode
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBundleBadgeMode(value: unknown): value is BundleBadgeMode {
  return value === "none" || value === "icon" || value === "bold" || value === "text";
}
