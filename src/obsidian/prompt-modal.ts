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

        text.inputEl.addEventListener("keydown", async (event) => {
          if (event.key === "Enter") {
            await this.submit();
          }
        });
      });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.submitLabel)
          .setCta()
          .onClick(async () => {
            await this.submit();
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

