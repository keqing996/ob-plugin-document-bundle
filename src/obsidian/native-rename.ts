import type { App, TFile } from "obsidian";

interface FileManagerWithInlineRename {
  promptForFileRename?(file: TFile): unknown;
}

export async function promptForNativeRename(app: App, file: TFile): Promise<boolean> {
  const fileManager = app.fileManager as typeof app.fileManager & FileManagerWithInlineRename;
  if (typeof fileManager.promptForFileRename !== "function") {
    return false;
  }

  await fileManager.promptForFileRename(file);
  return true;
}
