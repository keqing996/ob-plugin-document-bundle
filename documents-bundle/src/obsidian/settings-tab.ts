import { App, PluginSettingTab, Setting } from "obsidian";
import DocumentsBundlePlugin from "../main";

export class DocumentsBundleSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: DocumentsBundlePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Documents Bundle" });

    new Setting(containerEl)
      .setName("Default attachment folder name")
      .setDesc("Attachments pasted or dropped into bundle documents are stored here.")
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
      .setName("Paste into normal note")
      .setDesc("Choose what happens when attachments are pasted into a note that is not already a bundle.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ask", "Ask to convert")
          .addOption("auto-convert", "Auto convert")
          .addOption("default", "Use Obsidian default")
          .setValue(this.plugin.settings.pasteIntoNormalNoteBehavior)
          .onChange(async (value) => {
            this.plugin.settings.pasteIntoNormalNoteBehavior = value as "ask" | "auto-convert" | "default";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Handle pasted attachments")
      .setDesc("Store pasted files in the active bundle assets folder.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.handlePastedAttachments)
          .onChange(async (value) => {
            this.plugin.settings.handlePastedAttachments = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Handle dropped attachments")
      .setDesc("Store files dropped into the editor in the active bundle assets folder.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.handleDroppedAttachments)
          .onChange(async (value) => {
            this.plugin.settings.handleDroppedAttachments = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Enhance native File Explorer")
      .setDesc("Mark Document Bundle folders in Obsidian's native Files pane.")
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
