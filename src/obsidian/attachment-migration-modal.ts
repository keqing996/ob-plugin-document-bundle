import { App, Modal, Setting } from "obsidian";
import type { AttachmentMigrationItem } from "../core/migration";

interface AttachmentMigrationModalOptions {
  title: string;
  description: string;
  sourceLabel: string;
  targetLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  items: AttachmentMigrationItem[];
}

export class AttachmentMigrationModal extends Modal {
  private resolve: ((confirmed: boolean) => void) | null = null;
  private resolved = false;

  constructor(
    app: App,
    private readonly options: AttachmentMigrationModalOptions
  ) {
    super(app);
  }

  openAndGetConfirmation(): Promise<boolean> {
    this.open();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("documents-bundle-migration-modal");

    contentEl.createEl("h2", { text: this.options.title });
    contentEl.createEl("p", {
      cls: "documents-bundle-migration-description",
      text: this.options.description
    });

    const list = contentEl.createDiv({ cls: "documents-bundle-migration-list" });
    for (const item of this.options.items) {
      const row = list.createDiv({ cls: "documents-bundle-migration-row" });
      this.createPathBlock(row, this.options.sourceLabel, item.sourcePath);
      this.createPathBlock(row, this.options.targetLabel, item.targetPath);
    }

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.options.cancelLabel)
          .onClick(() => {
            this.finish(false);
          });
      })
      .addButton((button) => {
        button
          .setButtonText(this.options.confirmLabel)
          .setCta()
          .onClick(() => {
            this.finish(true);
          });
      });
  }

  onClose(): void {
    this.contentEl.empty();
    this.finish(false);
  }

  private createPathBlock(parent: HTMLElement, label: string, path: string): void {
    const block = parent.createDiv({ cls: "documents-bundle-migration-path" });
    block.createDiv({
      cls: "documents-bundle-migration-path-label",
      text: label
    });
    block.createEl("code", {
      cls: "documents-bundle-migration-path-value",
      text: path
    });
  }

  private finish(confirmed: boolean): void {
    if (this.resolved) {
      return;
    }

    this.resolved = true;
    this.resolve?.(confirmed);
    this.close();
  }
}
