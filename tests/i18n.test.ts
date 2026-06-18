import { getCurrentLocale, translate } from "../src/i18n";

describe("i18n", () => {
  it("uses Chinese for zh language codes", () => {
    expect(getCurrentLocale("zh")).toBe("zh");
    expect(getCurrentLocale("zh-cn")).toBe("zh");
    expect(getCurrentLocale("zh-TW")).toBe("zh");
    expect(getCurrentLocale("en")).toBe("en");
  });

  it("interpolates English and Chinese messages", () => {
    expect(translate("en", "notice.assetsFolder", { path: "Project/assets" }))
      .toBe("Assets folder: Project/assets");
    expect(translate("zh", "notice.assetsFolder", { path: "Project/assets" }))
      .toBe("附件文件夹：Project/assets");
  });

  it("keeps the native file explorer badge untranslated", () => {
    expect(translate("en", "badge.bundle")).toBe("Bundle");
    expect(translate("zh", "badge.bundle")).toBe("Bundle");
  });

  it("translates the active settings labels and descriptions", () => {
    expect(translate("en", "settings.bundleStructure.name")).toBe("Bundle structure");
    expect(translate("zh", "settings.bundleStructure.name")).toBe("文档包结构");
    expect(translate("en", "settings.handleBundleAttachments.name")).toBe("Handle pasted and dropped attachments in bundles");
    expect(translate("zh", "settings.handleBundleAttachments.name")).toBe("接管文档包内的附件粘贴与拖入");
    expect(translate("en", "settings.enhanceNativeFileExplorer.desc")).toContain("marking the bundle title");
    expect(translate("zh", "settings.enhanceNativeFileExplorer.desc")).toContain("标记文档包标题");
    expect(translate("en", "settings.bundleBadgeMode.name")).toBe("Bundle marker style");
    expect(translate("zh", "settings.bundleBadgeMode.name")).toBe("文档包标记样式");
    expect(translate("en", "settings.bundleBadgeMode.none")).toBe("No marker");
    expect(translate("zh", "settings.bundleBadgeMode.icon")).toBe("小图标 Badge");
    expect(translate("en", "settings.bundleBadgeMode.bold")).toBe("Bold title");
    expect(translate("zh", "settings.bundleBadgeMode.bold")).toBe("加粗标题");
    expect(translate("en", "settings.bundleBadgeMode.text")).toBe("Text badge");
  });
});
