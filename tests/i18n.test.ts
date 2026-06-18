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
});
