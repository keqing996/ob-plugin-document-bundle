import { FuzzySuggestModal } from "obsidian";
import type DocumentsBundlePlugin from "../main";
import { dirname } from "../core/path";
import type { BundleInfo } from "../types";

export class BundleSuggestModal extends FuzzySuggestModal<BundleInfo> {
  constructor(private readonly plugin: DocumentsBundlePlugin) {
    super(plugin.app);
    this.setPlaceholder("Open bundle document...");
  }

  getItems(): BundleInfo[] {
    return this.plugin.getAllBundleInfos();
  }

  getItemText(bundle: BundleInfo): string {
    const parentPath = dirname(bundle.folderPath);
    return parentPath ? `${bundle.folderName} - ${parentPath}` : bundle.folderName;
  }

  onChooseItem(bundle: BundleInfo): void {
    void this.plugin.openBundle(bundle.folderPath);
  }
}
