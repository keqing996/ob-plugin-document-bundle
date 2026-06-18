import { App, Modal, Setting } from "obsidian";

export class ConfirmModal extends Modal {
  private resolve: ((confirmed: boolean) => void) | null = null;
  private resolved = false;

  constructor(
    app: App,
    private readonly message: string,
    private readonly confirmLabel: string,
    private readonly cancelLabel: string
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
    contentEl.createEl("p", { text: this.message });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.cancelLabel)
          .onClick(() => {
            this.finish(false);
          });
      })
      .addButton((button) => {
        button
          .setButtonText(this.confirmLabel)
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

  private finish(confirmed: boolean): void {
    if (this.resolved) {
      return;
    }

    this.resolved = true;
    this.resolve?.(confirmed);
    this.close();
  }
}
