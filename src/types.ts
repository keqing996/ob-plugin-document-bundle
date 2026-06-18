export type BundleBadgeMode = "none" | "icon" | "bold" | "text";

export interface DocumentsBundleSettings {
  handleBundleAttachments: boolean;
  enhanceNativeFileExplorer: boolean;
  bundleBadgeMode: BundleBadgeMode;
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
