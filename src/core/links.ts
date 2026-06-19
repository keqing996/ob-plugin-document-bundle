import type { AttachmentLinkOptions } from "../types";
import { encodeMarkdownPath, isImageFilename } from "./path";

export function createAttachmentMarkdownLink(options: AttachmentLinkOptions): string {
  const path = `./${encodeMarkdownPath(options.attachmentFolderName)}/${encodeMarkdownPath(options.filename)}`;
  const isImage = options.isImage ?? isImageFilename(options.filename);

  if (isImage) {
    return `![${options.altText ?? ""}](${path})`;
  }

  return `[${options.altText ?? options.filename}](${path})`;
}
