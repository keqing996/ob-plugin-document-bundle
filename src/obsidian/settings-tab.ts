import { App, PluginSettingTab, Setting } from "obsidian";
import DocumentsBundlePlugin from "../main";
import type { BundleBadgeMode } from "../types";

export class DocumentsBundleSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: DocumentsBundlePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(this.plugin.t("settings.title"))
      .setHeading();

    new Setting(containerEl)
      .setName(this.plugin.t("settings.bundleStructure.name"))
      .setDesc(this.plugin.t("settings.bundleStructure.desc"));

    new Setting(containerEl)
      .setName(this.plugin.t("settings.handleBundleAttachments.name"))
      .setDesc(this.plugin.t("settings.handleBundleAttachments.desc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.handleBundleAttachments)
          .onChange(async (value) => {
            this.plugin.settings.handleBundleAttachments = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.enhanceNativeFileExplorer.name"))
      .setDesc(this.plugin.t("settings.enhanceNativeFileExplorer.desc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enhanceNativeFileExplorer)
          .onChange(async (value) => {
            this.plugin.settings.enhanceNativeFileExplorer = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.bundleBadgeMode.name"))
      .setDesc(this.plugin.t("settings.bundleBadgeMode.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("none", this.plugin.t("settings.bundleBadgeMode.none"))
          .addOption("icon", this.plugin.t("settings.bundleBadgeMode.icon"))
          .addOption("bold", this.plugin.t("settings.bundleBadgeMode.bold"))
          .addOption("text", this.plugin.t("settings.bundleBadgeMode.text"))
          .setValue(this.plugin.settings.bundleBadgeMode)
          .onChange(async (value) => {
            this.plugin.settings.bundleBadgeMode = value as BundleBadgeMode;
            await this.plugin.saveSettings();
          });
      });
  }
}
