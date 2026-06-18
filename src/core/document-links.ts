import { dirname, extname, joinVaultPath, normalizeVaultPath } from "./path";

export interface DocumentLinkRewriteResult {
  updatedContent: string;
  replacements: number;
}

export interface MovedFileAttachmentLinkRewriteInput {
  oldNotePath: string;
  newNotePath: string;
  content: string;
}

interface ParsedMarkdownLink {
  start: number;
  end: number;
  target: string;
  prefix: string;
  suffix: string;
}

export function rewriteAttachmentLinksForMovedFile(input: MovedFileAttachmentLinkRewriteInput): DocumentLinkRewriteResult {
  const oldNoteDir = dirname(input.oldNotePath);
  const newNoteDir = dirname(input.newNotePath);
  const replacements: Array<{ start: number; end: number; value: string }> = [];

  for (const link of parseMarkdownLinks(input.content)) {
    const reference = splitTargetReference(link.target);
    if (!isLocalRelativeTarget(reference.path) || !isAttachmentTarget(reference.path)) {
      continue;
    }

    const resolvedTarget = resolveMarkdownPath(oldNoteDir, reference.path);
    const nextTarget = `${toRelativeMarkdownTarget(newNoteDir, resolvedTarget)}${reference.reference}`;
    if (nextTarget === link.target) {
      continue;
    }

    replacements.push({
      start: link.start,
      end: link.end,
      value: `${link.prefix}${nextTarget}${link.suffix}`
    });
  }

  return {
    updatedContent: applyReplacements(input.content, replacements),
    replacements: replacements.length
  };
}

function parseMarkdownLinks(content: string): ParsedMarkdownLink[] {
  const links: ParsedMarkdownLink[] = [];
  const regex = /(!?)\[([^\]\n]*)\]\(([^)\n]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const full = match[0];
    const rawTarget = match[3].trim();
    const targetStart = full.indexOf(rawTarget);
    const targetEnd = targetStart + rawTarget.length;
    links.push({
      start: match.index,
      end: match.index + full.length,
      target: rawTarget,
      prefix: full.slice(0, targetStart),
      suffix: full.slice(targetEnd)
    });
  }

  return links;
}

function resolveMarkdownPath(noteDir: string, path: string): string {
  const decoded = decodeLinkTarget(path);
  if (decoded.startsWith("./") || decoded.startsWith("../")) {
    return normalizeDotSegments(joinVaultPath(noteDir, decoded));
  }

  return normalizeDotSegments(joinVaultPath(noteDir, decoded));
}

function toRelativeMarkdownTarget(noteDir: string, targetPath: string): string {
  const fromParts = normalizeVaultPath(noteDir).split("/").filter(Boolean);
  const toParts = normalizeVaultPath(targetPath).split("/").filter(Boolean);

  while (fromParts.length > 0 && toParts.length > 0 && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }

  const relativeParts = [...fromParts.map(() => ".."), ...toParts];
  const relativePath = relativeParts.join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function applyReplacements(content: string, replacements: Array<{ start: number; end: number; value: string }>): string {
  let updated = content;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    updated = `${updated.slice(0, replacement.start)}${replacement.value}${updated.slice(replacement.end)}`;
  }

  return updated;
}

function splitTargetReference(target: string): { path: string; reference: string } {
  const headingIndex = target.indexOf("#");
  const blockIndex = target.indexOf("^");
  const indexes = [headingIndex, blockIndex].filter((index) => index > -1);
  if (indexes.length === 0) {
    return { path: target, reference: "" };
  }

  const index = Math.min(...indexes);
  return {
    path: target.slice(0, index),
    reference: target.slice(index)
  };
}

function isLocalRelativeTarget(path: string): boolean {
  const trimmed = path.trim();
  return trimmed.length > 0
    && !trimmed.startsWith("/")
    && !/^[a-z][a-z0-9+.-]*:/i.test(trimmed);
}

function isAttachmentTarget(path: string): boolean {
  const extension = extname(path);
  return extension.length > 0 && extension !== ".md";
}

function decodeLinkTarget(target: string): string {
  try {
    return decodeURI(target);
  } catch {
    return target;
  }
}

function normalizeDotSegments(path: string): string {
  const segments: string[] = [];
  for (const segment of normalizeVaultPath(path).split("/")) {
    if (segment.length === 0 || segment === ".") {
      continue;
    }
    if (segment === "..") {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }

  return segments.join("/");
}
