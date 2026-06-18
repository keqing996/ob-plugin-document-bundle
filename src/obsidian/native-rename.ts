import type { App, TAbstractFile } from "obsidian";

interface FileManagerWithInlineRename {
  promptForFileRename?(file: TAbstractFile): unknown;
}

export async function promptForNativeRename(app: App, file: TAbstractFile): Promise<boolean> {
  const fileManager = app.fileManager as typeof app.fileManager & FileManagerWithInlineRename;
  if (typeof fileManager.promptForFileRename !== "function") {
    return false;
  }

  await fileManager.promptForFileRename(file);
  return true;
}
