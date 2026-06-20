import type { Editor, MarkdownView, TFile, Vault } from "obsidian";
import type DocumentsBundlePlugin from "../main";
import { createAttachmentMarkdownLink } from "../core/links";
import { getAvailableFilename } from "../core/naming";
import { formatTimestamp, isImageFilename, joinVaultPath } from "../core/path";
import { BUNDLE_ASSETS_FOLDER_NAME } from "../settings";
import { ObsidianBundleFileSystem } from "./fs";

export interface IncomingAttachmentTarget {
  assetsFolderPath: string;
  files: File[];
}

export async function handlePaste(plugin: DocumentsBundlePlugin, event: ClipboardEvent, editor: Editor, view: MarkdownView): Promise<void> {
  if (event.defaultPrevented) {
    return;
  }

  const target = getPasteAttachmentTarget(plugin, event, view);
  if (!target) {
    return;
  }

  event.preventDefault();
  await handleIncomingAttachments(plugin, target, editor);
}

export async function handleDrop(plugin: DocumentsBundlePlugin, event: DragEvent, editor: Editor, view: MarkdownView): Promise<void> {
  if (event.defaultPrevented) {
    return;
  }

  const target = getDropAttachmentTarget(plugin, event, view);
  if (!target) {
    return;
  }

  event.preventDefault();
  await handleIncomingAttachments(plugin, target, editor);
}

export function getPasteAttachmentTarget(plugin: DocumentsBundlePlugin, event: ClipboardEvent, view: MarkdownView): IncomingAttachmentTarget | null {
  return getIncomingAttachmentTarget(plugin, Array.from(event.clipboardData?.files ?? []), view);
}

export function getDropAttachmentTarget(plugin: DocumentsBundlePlugin, event: DragEvent, view: MarkdownView): IncomingAttachmentTarget | null {
  return getIncomingAttachmentTarget(plugin, Array.from(event.dataTransfer?.files ?? []), view);
}

function getIncomingAttachmentTarget(plugin: DocumentsBundlePlugin, files: File[], view: MarkdownView): IncomingAttachmentTarget | null {
  if (!plugin.settings.handleBundleAttachments || files.length === 0) {
    return null;
  }

  const currentFile = view.file;
  if (!currentFile) {
    return null;
  }

  const bundle = plugin.getBundleInfoForFile(currentFile);
  if (!bundle) {
    return null;
  }

  return {
    assetsFolderPath: bundle.assetsFolderPath,
    files
  };
}

export async function handleIncomingAttachments(plugin: DocumentsBundlePlugin, target: IncomingAttachmentTarget, editor: Editor): Promise<void> {
  await plugin.ensureFolder(target.assetsFolderPath);
  const links: string[] = [];
  for (const file of target.files) {
    const filename = await writeIncomingFile(plugin.app.vault, target.assetsFolderPath, file);
    links.push(createAttachmentMarkdownLink({
      attachmentFolderName: BUNDLE_ASSETS_FOLDER_NAME,
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
