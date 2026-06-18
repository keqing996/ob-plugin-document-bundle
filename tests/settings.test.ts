import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("settings", () => {
  it("defaults to only active settings", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      handleBundleAttachments: true,
      enhanceNativeFileExplorer: true,
      bundleBadgeMode: "icon"
    });
  });

  it("ignores obsolete settings fields", () => {
    expect(normalizeSettings({
      attachmentFolderName: "attachments",
      pasteIntoNormalNoteBehavior: "auto-convert",
      imageFilenamePattern: "custom",
      useRelativeMarkdownLinks: false,
      handleBundleAttachments: true,
      enhanceNativeFileExplorer: false,
      bundleBadgeMode: "bold"
    })).toEqual({
      handleBundleAttachments: true,
      enhanceNativeFileExplorer: false,
      bundleBadgeMode: "bold"
    });
  });

  it("preserves an explicit unified attachment handling setting", () => {
    expect(normalizeSettings({
      handleBundleAttachments: false,
      handlePastedAttachments: true,
      handleDroppedAttachments: true,
      enhanceNativeFileExplorer: true,
      bundleBadgeMode: "none"
    })).toEqual({
      handleBundleAttachments: false,
      enhanceNativeFileExplorer: true,
      bundleBadgeMode: "none"
    });
  });

  it("migrates old disabled paste or drop handling to disabled unified handling", () => {
    expect(normalizeSettings({ handlePastedAttachments: false })).toEqual({
      handleBundleAttachments: false,
      enhanceNativeFileExplorer: true,
      bundleBadgeMode: "icon"
    });
    expect(normalizeSettings({ handleDroppedAttachments: false })).toEqual({
      handleBundleAttachments: false,
      enhanceNativeFileExplorer: true,
      bundleBadgeMode: "icon"
    });
  });

  it("falls back to the default badge mode when a saved value is invalid", () => {
    expect(normalizeSettings({ bundleBadgeMode: "localized-badge" })).toEqual({
      handleBundleAttachments: true,
      enhanceNativeFileExplorer: true,
      bundleBadgeMode: "icon"
    });
  });
});
