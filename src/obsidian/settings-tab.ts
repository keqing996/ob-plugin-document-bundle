import { App, PluginSettingTab, Setting } from "obsidian";
import DocumentsBundlePlugin from "../main";

export class DocumentsBundleSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: DocumentsBundlePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: this.plugin.t("settings.title") });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.defaultAttachmentFolderName.name"))
      .setDesc(this.plugin.t("settings.defaultAttachmentFolderName.desc"))
      .addText((text) => {
        text
          .setPlaceholder("assets")
          .setValue(this.plugin.settings.attachmentFolderName)
          .onChange(async (value) => {
            this.plugin.settings.attachmentFolderName = value.trim() || "assets";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.pasteIntoNormalNote.name"))
      .setDesc(this.plugin.t("settings.pasteIntoNormalNote.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ask", this.plugin.t("settings.pasteIntoNormalNote.ask"))
          .addOption("auto-convert", this.plugin.t("settings.pasteIntoNormalNote.autoConvert"))
          .addOption("default", this.plugin.t("settings.pasteIntoNormalNote.default"))
          .setValue(this.plugin.settings.pasteIntoNormalNoteBehavior)
          .onChange(async (value) => {
            this.plugin.settings.pasteIntoNormalNoteBehavior = value as "ask" | "auto-convert" | "default";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.handlePastedAttachments.name"))
      .setDesc(this.plugin.t("settings.handlePastedAttachments.desc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.handlePastedAttachments)
          .onChange(async (value) => {
            this.plugin.settings.handlePastedAttachments = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.handleDroppedAttachments.name"))
      .setDesc(this.plugin.t("settings.handleDroppedAttachments.desc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.handleDroppedAttachments)
          .onChange(async (value) => {
            this.plugin.settings.handleDroppedAttachments = value;
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
  }
}
