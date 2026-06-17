import type { BundleInfo } from "../types";
import type { Translate, TranslationKey } from "../i18n";
import { basename, dirname, extname, joinVaultPath, normalizeVaultPath } from "./path";

export interface AttachmentMigrationInput {
  bundle: BundleInfo;
  notePath: string;
  content: string;
  existingTargetPaths?: Set<string>;
}

export interface AttachmentMigrationItem {
  sourcePath: string;
  targetPath: string;
  originalTarget: string;
  rewrittenTarget: string;
}

export interface AttachmentMigrationPlan {
  items: AttachmentMigrationItem[];
  updatedContent: string;
}

export interface BundleAttachmentMigrationReport {
  bundle: BundleInfo;
  notePath: string;
  plan: AttachmentMigrationPlan;
}

export interface VaultAttachmentMigrationReport {
  bundlesScanned: number;
  bundlesWithMigrations: number;
  attachmentsToMove: number;
  reports: BundleAttachmentMigrationReport[];
}

export interface VaultAttachmentMigrationValidation {
  errors: string[];
  sharedSourcePaths: string[];
  duplicateTargetPaths: string[];
}

interface RenderVaultAttachmentMigrationReportOptions {
  validation?: VaultAttachmentMigrationValidation;
  t?: Translate;
}

const DEFAULT_REPORT_TRANSLATIONS: Partial<Record<TranslationKey, string>> = {
  "report.title": "Documents Bundle Attachment Migration Report",
  "report.summary": "Summary",
  "report.bundlesScanned": "Bundles scanned",
  "report.bundlesWithMigrations": "Bundles with migrations",
  "report.attachmentReferencesToMigrate": "Attachment references to migrate",
  "report.sharedSourceAttachments": "Shared source attachments",
  "report.blockingIssues": "Blocking issues",
  "report.blockingIssuesHeading": "Blocking Issues",
  "report.sharedSourcesHeading": "Shared Sources",
  "report.sharedSourcesDescription": "These source files are referenced by multiple bundle migrations. They will be copied into each target bundle instead of moved.",
  "report.plannedMovesHeading": "Planned Moves",
  "report.noAttachmentMigrations": "No attachment migrations are planned.",
  "report.table.bundle": "Bundle",
  "report.table.source": "Source",
  "report.table.target": "Target",
  "report.table.rewrittenLink": "Rewritten link"
};

const englishReportText: Translate = (key) => DEFAULT_REPORT_TRANSLATIONS[key] ?? key;

type LinkKind = "markdown" | "wiki";

interface ParsedLink {
  kind: LinkKind;
  start: number;
  end: number;
  target: string;
  label: string;
  prefix: string;
  suffix: string;
  embed: boolean;
}

const ATTACHMENT_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".csv",
  ".doc",
  ".docx",
  ".gif",
  ".jpeg",
  ".jpg",
  ".json",
  ".m4a",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".rar",
  ".svg",
  ".txt",
  ".wav",
  ".webp",
  ".xls",
  ".xlsx",
  ".zip",
  ".7z"
]);

export function planAttachmentMigration(input: AttachmentMigrationInput): AttachmentMigrationPlan {
  const existingTargetPaths = new Set(input.existingTargetPaths ?? []);
  const noteDir = dirname(input.notePath);
  const links = parseLocalAttachmentLinks(input.content);
  const sourceToTarget = new Map<string, string>();
  const items: AttachmentMigrationItem[] = [];
  const replacements: Array<{ start: number; end: number; value: string }> = [];

  for (const link of links) {
    const sourcePath = resolveVaultLinkTarget(noteDir, link);
    if (isInsideAssetsFolder(sourcePath, input.bundle.assetsFolderPath)) {
      continue;
    }

    let targetPath = sourceToTarget.get(sourcePath);

    if (!targetPath) {
      targetPath = getAvailableMigrationTarget(input.bundle.assetsFolderPath, basename(sourcePath), existingTargetPaths);
      sourceToTarget.set(sourcePath, targetPath);
      existingTargetPaths.add(targetPath);
      items.push({
        sourcePath,
        targetPath,
        originalTarget: link.target,
        rewrittenTarget: toBundleAssetTarget(targetPath, input.bundle.assetsFolderPath)
      });
    }

    const rewrittenTarget = toBundleAssetTarget(targetPath, input.bundle.assetsFolderPath);
    replacements.push({
      start: link.start,
      end: link.end,
      value: renderReplacement(link, rewrittenTarget)
    });
  }

  return {
    items,
    updatedContent: applyReplacements(input.content, replacements)
  };
}

export function summarizeVaultAttachmentMigration(reports: BundleAttachmentMigrationReport[]): VaultAttachmentMigrationReport {
  const reportsWithMigrations = reports.filter((report) => report.plan.items.length > 0);

  return {
    bundlesScanned: reports.length,
    bundlesWithMigrations: reportsWithMigrations.length,
    attachmentsToMove: reportsWithMigrations.reduce((sum, report) => sum + report.plan.items.length, 0),
    reports
  };
}

export function validateVaultAttachmentMigration(summary: VaultAttachmentMigrationReport): VaultAttachmentMigrationValidation {
  const sourceCounts = new Map<string, number>();
  const targetCounts = new Map<string, number>();

  for (const report of summary.reports) {
    for (const item of report.plan.items) {
      sourceCounts.set(item.sourcePath, (sourceCounts.get(item.sourcePath) ?? 0) + 1);
      targetCounts.set(item.targetPath, (targetCounts.get(item.targetPath) ?? 0) + 1);
    }
  }

  const sharedSourcePaths = [...sourceCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([path]) => path);
  const duplicateTargetPaths = [...targetCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([path]) => path);
  const errors = duplicateTargetPaths.map((path) => `Multiple attachments would be moved to the same target: ${path}`);

  return {
    errors,
    sharedSourcePaths,
    duplicateTargetPaths
  };
}

export function renderVaultAttachmentMigrationReport(
  summary: VaultAttachmentMigrationReport,
  options: RenderVaultAttachmentMigrationReportOptions = {}
): string {
  const validation = options.validation ?? validateVaultAttachmentMigration(summary);
  const t = options.t ?? englishReportText;
  const lines = [
    `# ${t("report.title")}`,
    "",
    `## ${t("report.summary")}`,
    "",
    `- ${t("report.bundlesScanned")}: ${summary.bundlesScanned}`,
    `- ${t("report.bundlesWithMigrations")}: ${summary.bundlesWithMigrations}`,
    `- ${t("report.attachmentReferencesToMigrate")}: ${summary.attachmentsToMove}`,
    `- ${t("report.sharedSourceAttachments")}: ${validation.sharedSourcePaths.length}`,
    `- ${t("report.blockingIssues")}: ${validation.errors.length}`,
    ""
  ];

  if (validation.errors.length > 0) {
    lines.push(`## ${t("report.blockingIssuesHeading")}`, "");
    for (const error of validation.errors) {
      lines.push(`- ${error}`);
    }
    lines.push("");
  }

  if (validation.sharedSourcePaths.length > 0) {
    lines.push(`## ${t("report.sharedSourcesHeading")}`, "");
    lines.push(t("report.sharedSourcesDescription"));
    lines.push("");
    for (const path of validation.sharedSourcePaths) {
      lines.push(`- ${path}`);
    }
    lines.push("");
  }

  lines.push(`## ${t("report.plannedMovesHeading")}`, "");
  const rows = summary.reports.flatMap((report) => report.plan.items.map((item) => ({
    bundle: report.bundle.folderPath,
    source: item.sourcePath,
    target: item.targetPath,
    link: item.rewrittenTarget
  })));

  if (rows.length === 0) {
    lines.push(t("report.noAttachmentMigrations"), "");
  } else {
    lines.push(`| ${t("report.table.bundle")} | ${t("report.table.source")} | ${t("report.table.target")} | ${t("report.table.rewrittenLink")} |`);
    lines.push("| --- | --- | --- | --- |");
    for (const row of rows) {
      lines.push(`| ${escapeTableCell(row.bundle)} | ${escapeTableCell(row.source)} | ${escapeTableCell(row.target)} | ${escapeTableCell(row.link)} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function parseLocalAttachmentLinks(content: string): ParsedLink[] {
  return [...parseMarkdownLinks(content), ...parseWikiLinks(content)]
    .filter((link) => isMigratableTarget(link.target))
    .sort((a, b) => a.start - b.start);
}

export function resolveVaultLinkTarget(noteDir: string, link: Pick<ParsedLink, "kind" | "target">): string {
  const withoutAnchor = stripAnchor(link.target);
  const decoded = decodeLinkTarget(withoutAnchor);
  if (link.kind === "markdown" || decoded.startsWith("./") || decoded.startsWith("../")) {
    return normalizeDotSegments(joinVaultPath(noteDir, decoded));
  }

  return normalizeDotSegments(decoded);
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function parseMarkdownLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  const regex = /(!?)\[([^\]\n]*)\]\(([^)\n]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const full = match[0];
    const embed = match[1] === "!";
    const label = match[2];
    const rawTarget = match[3].trim();
    const start = match.index;
    const targetStart = full.indexOf(rawTarget);
    const targetEnd = targetStart + rawTarget.length;

    links.push({
      kind: "markdown",
      start,
      end: start + full.length,
      target: rawTarget,
      label,
      prefix: full.slice(0, targetStart),
      suffix: full.slice(targetEnd),
      embed
    });
  }

  return links;
}

function parseWikiLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  const regex = /(!?)\[\[([^\]\n]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const full = match[0];
    const embed = match[1] === "!";
    const body = match[2];
    const [rawTarget, label = ""] = body.split("|");

    links.push({
      kind: "wiki",
      start: match.index,
      end: match.index + full.length,
      target: rawTarget.trim(),
      label: label.trim(),
      prefix: "",
      suffix: "",
      embed
    });
  }

  return links;
}

function isInsideAssetsFolder(path: string, assetsFolderPath: string): boolean {
  const normalizedPath = normalizeVaultPath(path);
  const normalizedAssets = normalizeVaultPath(assetsFolderPath);

  return normalizedPath === normalizedAssets || normalizedPath.startsWith(`${normalizedAssets}/`);
}

function isMigratableTarget(target: string): boolean {
  const stripped = stripAnchor(target).trim();
  if (
    stripped.length === 0 ||
    stripped.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(stripped)
  ) {
    return false;
  }

  return ATTACHMENT_EXTENSIONS.has(extname(stripped));
}

function getAvailableMigrationTarget(assetsFolderPath: string, filename: string, existingTargetPaths: Set<string>): string {
  const extension = extname(filename);
  const stem = extension.length > 0 ? filename.slice(0, -extension.length) : filename;

  for (let index = 0; index < 1000; index += 1) {
    const candidateName = index === 0 ? filename : `${stem}-${index}${extension}`;
    const candidatePath = joinVaultPath(assetsFolderPath, candidateName);
    if (!existingTargetPaths.has(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(`Could not find an available attachment target for "${filename}".`);
}

function toBundleAssetTarget(targetPath: string, assetsFolderPath: string): string {
  const filename = targetPath.slice(normalizeVaultPath(assetsFolderPath).length + 1);
  return `./assets/${filename}`;
}

function renderReplacement(link: ParsedLink, rewrittenTarget: string): string {
  if (link.kind === "markdown") {
    return `${link.prefix}${rewrittenTarget}${link.suffix}`;
  }

  const label = link.label || basename(stripAnchor(link.target));
  if (link.embed) {
    return `![${label}](${rewrittenTarget})`;
  }

  return `[${label}](${rewrittenTarget})`;
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
