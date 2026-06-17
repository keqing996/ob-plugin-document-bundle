import type { AttachmentLinkOptions } from "../types";
import { isImageFilename } from "./path";

export function createAttachmentMarkdownLink(options: AttachmentLinkOptions): string {
  const path = `./${options.attachmentFolderName}/${options.filename}`;
  const isImage = options.isImage ?? isImageFilename(options.filename);

  if (isImage) {
    return `![${options.altText ?? ""}](${path})`;
  }

  return `[${options.altText ?? options.filename}](${path})`;
}

