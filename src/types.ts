export interface DocumentsBundleSettings {
  attachmentFolderName: string;
  handlePastedAttachments: boolean;
  handleDroppedAttachments: boolean;
  pasteIntoNormalNoteBehavior: "ask" | "auto-convert" | "default";
  enhanceNativeFileExplorer: boolean;
  imageFilenamePattern: string;
  useRelativeMarkdownLinks: boolean;
}

export interface BundleInfo {
  folderPath: string;
  folderName: string;
  mainFilePath: string;
  assetsFolderPath: string;
}

export interface BundlePaths {
  folderPath: string;
  mainFilePath: string;
  assetsFolderPath: string;
}

export interface AttachmentLinkOptions {
  filename: string;
  attachmentFolderName: string;
  isImage?: boolean;
  altText?: string;
}
