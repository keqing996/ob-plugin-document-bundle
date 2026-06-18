import type { Editor, MarkdownView, TFile, Vault } from "obsidian";
import type DocumentsBundlePlugin from "../main";
import { getBundleInfoFromMainFilePath } from "../core/bundle";
import { createAttachmentMarkdownLink } from "../core/links";
import { getAvailableFilename } from "../core/naming";
import { formatTimestamp, isImageFilename, joinVaultPath } from "../core/path";
import { ObsidianBundleFileSystem } from "./fs";

export async function handlePaste(plugin: DocumentsBundlePlugin, event: ClipboardEvent, editor: Editor, view: MarkdownView): Promise<void> {
  if (!plugin.settings.handlePastedAttachments) {
    return;
  }

  if (event.defaultPrevented) {
    return;
  }

  const files = Array.from(event.clipboardData?.files ?? []);
  if (files.length === 0) {
    return;
  }

  await handleIncomingFiles(plugin, event, files, editor, view);
}

export async function handleDrop(plugin: DocumentsBundlePlugin, event: DragEvent, editor: Editor, view: MarkdownView): Promise<void> {
  if (!plugin.settings.handleDroppedAttachments) {
    return;
  }

  if (event.defaultPrevented) {
    return;
  }

  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length === 0) {
    return;
  }

  await handleIncomingFiles(plugin, event, files, editor, view);
}

async function handleIncomingFiles(
  plugin: DocumentsBundlePlugin,
  event: ClipboardEvent | DragEvent,
  files: File[],
  editor: Editor,
  view: MarkdownView
): Promise<void> {
  const currentFile = view.file;
  if (!currentFile) {
    return;
  }

  let bundle = getBundleInfoFromMainFilePath(currentFile.path, plugin.settings.attachmentFolderName);

  if (bundle) {
    event.preventDefault();
    await plugin.ensureFolder(bundle.assetsFolderPath);
  } else {
    if (plugin.settings.pasteIntoNormalNoteBehavior === "default") {
      return;
    }

    if (
      plugin.settings.pasteIntoNormalNoteBehavior === "auto-convert" ||
      await plugin.confirm(plugin.t("confirm.convertNoteToBundle"))
    ) {
      event.preventDefault();
      bundle = await plugin.convertFileToBundle(currentFile);
    } else {
      return;
    }
  }

  const links: string[] = [];
  for (const file of files) {
    const filename = await writeIncomingFile(plugin.app.vault, bundle.assetsFolderPath, file);
    links.push(createAttachmentMarkdownLink({
      attachmentFolderName: plugin.settings.attachmentFolderName,
      filename,
      isImage: isImageFilename(filename)
    }));
  }

  editor.replaceSelection(links.join("\n"));
}

async function writeIncomingFile(vault: Vault, assetsFolderPath: string, file: File): Promise<string> {
  const fs = new ObsidianBundleFileSystem(vault);
  const originalName = file.name?.trim();
  const fallbackName = isImageFile(file) ? `image-${formatTimestamp(new Date())}.png` : `attachment-${formatTimestamp(new Date())}`;
  const preferredFilename = originalName && originalName.length > 0 ? originalName : fallbackName;
  const filename = await getAvailableFilename(fs, assetsFolderPath, preferredFilename);
  const targetPath = joinVaultPath(assetsFolderPath, filename);
  await vault.createBinary(targetPath, await file.arrayBuffer());
  return filename;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || isImageFilename(file.name);
}

export function getActiveMarkdownFile(view: MarkdownView): TFile | null {
  return view.file ?? null;
}
