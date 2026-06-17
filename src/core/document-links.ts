import { basename, dirname, extname, joinVaultPath, normalizeVaultPath, stripMarkdownExtension } from "./path";

export interface DocumentLinkMove {
  oldPath: string;
  newPath: string;
}

export interface DocumentLinkRewriteInput {
  notePath: string;
  content: string;
  moves: DocumentLinkMove[];
}

export interface DocumentLinkRewriteResult {
  updatedContent: string;
  replacements: number;
}

type ParsedDocumentLink =
  | {
      kind: "markdown";
      start: number;
      end: number;
      target: string;
      prefix: string;
      suffix: string;
    }
  | {
      kind: "wiki";
      start: number;
      end: number;
      target: string;
      alias: string;
      embed: boolean;
    };

export function rewriteDocumentLinks(input: DocumentLinkRewriteInput): DocumentLinkRewriteResult {
  const noteDir = dirname(input.notePath);
  const moves = input.moves.map((move) => ({
    oldPath: normalizeVaultPath(move.oldPath),
    newPath: normalizeVaultPath(move.newPath),
    oldWikiPath: stripMarkdownExtension(normalizeVaultPath(move.oldPath)),
    newWikiPath: stripMarkdownExtension(normalizeVaultPath(move.newPath)),
    oldBasename: stripMarkdownExtension(basename(move.oldPath))
  }));
  const replacements: Array<{ start: number; end: number; value: string }> = [];

  for (const link of parseDocumentLinks(input.content)) {
    const matchedMove = moves.find((move) => linkMatchesMove(link, noteDir, move));
    if (!matchedMove) {
      continue;
    }

    replacements.push({
      start: link.start,
      end: link.end,
      value: renderDocumentLinkReplacement(link, noteDir, matchedMove.newPath, matchedMove.newWikiPath)
    });
  }

  return {
    updatedContent: applyReplacements(input.content, replacements),
    replacements: replacements.length
  };
}

function parseDocumentLinks(content: string): ParsedDocumentLink[] {
  return [...parseMarkdownDocumentLinks(content), ...parseWikiDocumentLinks(content)]
    .sort((a, b) => a.start - b.start);
}

function parseMarkdownDocumentLinks(content: string): ParsedDocumentLink[] {
  const links: ParsedDocumentLink[] = [];
  const regex = /(!?)\[([^\]\n]*)\]\(([^)\n]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match[1] === "!") {
      continue;
    }

    const full = match[0];
    const rawTarget = match[3].trim();
    if (!isDocumentTarget(rawTarget)) {
      continue;
    }

    const targetStart = full.indexOf(rawTarget);
    const targetEnd = targetStart + rawTarget.length;
    links.push({
      kind: "markdown",
      start: match.index,
      end: match.index + full.length,
      target: rawTarget,
      prefix: full.slice(0, targetStart),
      suffix: full.slice(targetEnd)
    });
  }

  return links;
}

function parseWikiDocumentLinks(content: string): ParsedDocumentLink[] {
  const links: ParsedDocumentLink[] = [];
  const regex = /(!?)\[\[([^\]\n]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match[1] === "!") {
      continue;
    }

    const body = match[2];
    const [rawTarget, alias = ""] = body.split("|");
    const target = rawTarget.trim();
    if (!target || target.startsWith("#") || hasKnownNonDocumentExtension(target)) {
      continue;
    }

    links.push({
      kind: "wiki",
      start: match.index,
      end: match.index + match[0].length,
      target,
      alias: alias.trim(),
      embed: false
    });
  }

  return links;
}

function linkMatchesMove(
  link: ParsedDocumentLink,
  noteDir: string,
  move: { oldPath: string; oldWikiPath: string; oldBasename: string }
): boolean {
  if (link.kind === "markdown") {
    return resolveMarkdownTarget(noteDir, link.target) === move.oldPath;
  }

  const target = stripAnchor(link.target);
  const normalizedTarget = normalizeDotSegments(target);
  return normalizedTarget === move.oldWikiPath || normalizedTarget === move.oldPath || normalizedTarget === move.oldBasename;
}

function renderDocumentLinkReplacement(
  link: ParsedDocumentLink,
  noteDir: string,
  newPath: string,
  newWikiPath: string
): string {
  if (link.kind === "markdown") {
    return `${link.prefix}${toRelativeMarkdownTarget(noteDir, newPath)}${link.suffix}`;
  }

  const alias = link.alias ? `|${link.alias}` : "";
  return `[[${newWikiPath}${alias}]]`;
}

function resolveMarkdownTarget(noteDir: string, target: string): string {
  const stripped = stripAnchor(target);
  const decoded = decodeLinkTarget(stripped);
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

function isDocumentTarget(target: string): boolean {
  const stripped = stripAnchor(target).trim();
  return stripped.length > 0 && !/^[a-z][a-z0-9+.-]*:/i.test(stripped) && extname(stripped) === ".md";
}

function hasKnownNonDocumentExtension(target: string): boolean {
  const extension = extname(stripAnchor(target));
  return extension.length > 0 && extension !== ".md";
}

function applyReplacements(content: string, replacements: Array<{ start: number; end: number; value: string }>): string {
  let updated = content;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    updated = `${updated.slice(0, replacement.start)}${replacement.value}${updated.slice(replacement.end)}`;
  }

  return updated;
}

function stripAnchor(target: string): string {
  return target.split("#")[0].split("^")[0];
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

