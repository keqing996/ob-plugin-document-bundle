import { App, Modal, Setting } from "obsidian";

export class PromptModal extends Modal {
  private value = "";

  constructor(
    app: App,
    private readonly title: string,
    private readonly placeholder: string,
    private readonly submitLabel: string,
    private readonly onSubmit: (value: string) => void | Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.title });

    new Setting(contentEl)
      .setName(this.placeholder)
      .addText((text) => {
        text.inputEl.focus();
        text
          .setPlaceholder(this.placeholder)
          .onChange((value) => {
            this.value = value;
          });

        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            void this.submit();
          }
        });
      });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.submitLabel)
          .setCta()
          .onClick(() => {
            void this.submit();
          });
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async submit(): Promise<void> {
    const value = this.value.trim();
    if (value.length === 0) {
      return;
    }

    this.close();
    await this.onSubmit(value);
  }
}

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
