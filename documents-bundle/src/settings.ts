import type { DocumentsBundleSettings } from "./types";

export const DEFAULT_SETTINGS: DocumentsBundleSettings = {
  attachmentFolderName: "assets",
  handlePastedAttachments: true,
  handleDroppedAttachments: true,
  pasteIntoNormalNoteBehavior: "ask",
  enhanceNativeFileExplorer: true,
  imageFilenamePattern: "image-YYYYMMDD-HHmmss",
  useRelativeMarkdownLinks: true
};
