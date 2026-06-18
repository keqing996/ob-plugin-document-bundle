export type Locale = "en" | "zh";
export type TranslationVars = Record<string, string | number>;
export type TranslationKey = keyof typeof EN_TRANSLATIONS;

const EN_TRANSLATIONS = {
  "badge.bundle": "Bundle",
  "button.cancel": "Cancel",
  "button.confirm": "Confirm",

  "command.newBundleDocument": "New bundle document",
  "command.openBundleDocument": "Open bundle document",
  "command.convertCurrentNoteToBundle": "Convert current note to bundle",
  "command.openCurrentBundleAssetsFolder": "Open current bundle assets folder",
  "command.repairCurrentBundleStructure": "Repair current bundle structure",
  "command.previewCurrentBundleAttachmentMigration": "Preview current bundle attachment migration",
  "command.migrateCurrentBundleAttachments": "Migrate current bundle attachments",
  "command.previewVaultAttachmentMigration": "Preview vault attachment migration",
  "command.migrateVaultAttachments": "Migrate vault attachments",
  "command.scanBundles": "Scan bundles",

  "menu.openBundle": "Open bundle",
  "menu.openBundleAssets": "Open bundle assets",
  "menu.repairBundle": "Repair bundle",
  "menu.previewAttachmentMigration": "Preview attachment migration",
  "menu.migrateAttachments": "Migrate attachments",
  "menu.renameBundle": "Rename bundle",
  "menu.newBundleDocumentHere": "New bundle document here",
  "menu.repairFolderAsBundle": "Repair folder as bundle",
  "menu.convertToBundle": "Convert to bundle",

  "settings.title": "Documents Bundle",
  "settings.defaultAttachmentFolderName.name": "Default attachment folder name",
  "settings.defaultAttachmentFolderName.desc": "Attachments pasted or dropped into bundle documents are stored here.",
  "settings.pasteIntoNormalNote.name": "Paste into normal note",
  "settings.pasteIntoNormalNote.desc": "Choose what happens when attachments are pasted into a note that is not already a bundle.",
  "settings.pasteIntoNormalNote.ask": "Ask to convert",
  "settings.pasteIntoNormalNote.autoConvert": "Auto convert",
  "settings.pasteIntoNormalNote.default": "Use Obsidian default",
  "settings.handlePastedAttachments.name": "Handle pasted attachments",
  "settings.handlePastedAttachments.desc": "Store pasted files in the active bundle assets folder.",
  "settings.handleDroppedAttachments.name": "Handle dropped attachments",
  "settings.handleDroppedAttachments.desc": "Store files dropped into the editor in the active bundle assets folder.",
  "settings.enhanceNativeFileExplorer.name": "Enhance native File Explorer",
  "settings.enhanceNativeFileExplorer.desc": "Mark Document Bundle folders in Obsidian's native Files pane.",

  "suggest.openBundleDocument.placeholder": "Open bundle document...",

  "confirm.convertNoteToBundle": "Convert this note to a Documents Bundle before adding attachments?",
  "confirm.migrateCurrentBundleAttachments": "Move {count} attachment(s) into this bundle's assets folder and rewrite links?",
  "confirm.migrateVaultAttachments": "Migrate {attachments} attachment reference(s) across {bundles} bundle(s) and rewrite their main documents? Shared source files will be copied.",
  "confirm.deleteBundle": "Delete \"{name}\" and all bundled assets?",

  "notice.assetsFolder": "Assets folder: {path}",
  "notice.scanBundles": "Bundles: {bundles}, normal Markdown files: {markdownFiles}, incomplete candidates: {incompleteCandidates}",
  "notice.convertedToBundle": "Converted to bundle: {name}. Rewrote {count} linked document(s).",
  "notice.bundleMainFileNotFound": "Bundle main file not found: {path}",
  "notice.duplicatedBundle": "Duplicated bundle: {name}",
  "notice.bundleAlreadyValid": "Bundle is already valid: {name}",
  "notice.repairedBundle": "Repaired bundle: {name}",
  "notice.attachmentMigrationDryRun": "Attachment migration dry-run: {count} file(s). Details are in the developer console.",
  "notice.noAttachmentsNeedMigration": "No attachments need migration.",
  "notice.migratedCurrentBundleAttachments": "Migrated {count} attachment(s) into bundle assets.",
  "notice.vaultMigrationDryRun": "Vault migration dry-run: {count} attachment(s). Report: {path}",
  "notice.noVaultAttachmentsNeedMigration": "No vault attachments need migration.",
  "notice.vaultMigrationBlocked": "Vault migration blocked: {count} issue(s). Details are in the developer console.",
  "notice.migratedVaultAttachments": "Migrated {attachments} attachment reference(s) across {bundles} bundle(s).",
  "notice.movedBundle": "Moved bundle: {name}",
  "notice.deletedBundle": "Deleted bundle: {name}",
  "notice.nativeRenameUnavailable": "Obsidian inline rename is unavailable. Use the Files pane rename action.",

  "error.cannotMigrateMissingAttachment": "Cannot migrate missing attachment: {path}",
  "error.cannotMigrateAttachmentTargetExists": "Cannot migrate attachment: target already exists: {path}",
  "error.cannotUpdateMissingBundleMainFile": "Cannot update missing bundle main file: {path}",
  "error.cannotCopyMissingAttachment": "Cannot copy missing attachment: {path}",
  "error.cannotMoveBundleIntoItself": "Cannot move a bundle into itself.",
  "error.currentFileNotBundleMain": "The current file is not a bundle main document.",
  "error.documentNameEmpty": "Document name cannot be empty.",
  "error.onlyMarkdownFilesCanConvert": "Only Markdown files can be converted to bundles.",
  "error.cannotRenameBundleTargetExists": "Cannot rename bundle: target folder \"{name}\" already exists.",
  "error.copiedBundleMainFileMissing": "Copied bundle main file missing: {path}",
  "error.cannotMoveBundleTargetExists": "Cannot move bundle: target folder \"{name}\" already exists.",
  "error.cannotRepairBundleMultipleMarkdown": "Cannot repair bundle \"{name}\": multiple Markdown files found.",
  "error.attachmentTargetUnavailable": "Could not find an available attachment target for \"{name}\".",

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
} as const;

const ZH_TRANSLATIONS: Record<TranslationKey, string> = {
  "badge.bundle": "Bundle",
  "button.cancel": "取消",
  "button.confirm": "确认",

  "command.newBundleDocument": "新建文档包",
  "command.openBundleDocument": "打开文档包",
  "command.convertCurrentNoteToBundle": "将当前笔记转换为文档包",
  "command.openCurrentBundleAssetsFolder": "打开当前文档包附件文件夹",
  "command.repairCurrentBundleStructure": "修复当前文档包结构",
  "command.previewCurrentBundleAttachmentMigration": "预览当前文档包附件迁移",
  "command.migrateCurrentBundleAttachments": "迁移当前文档包附件",
  "command.previewVaultAttachmentMigration": "预览库附件迁移",
  "command.migrateVaultAttachments": "迁移库附件",
  "command.scanBundles": "扫描文档包",

  "menu.openBundle": "打开文档包",
  "menu.openBundleAssets": "打开文档包附件",
  "menu.repairBundle": "修复文档包",
  "menu.previewAttachmentMigration": "预览附件迁移",
  "menu.migrateAttachments": "迁移附件",
  "menu.renameBundle": "重命名文档包",
  "menu.newBundleDocumentHere": "在此处新建文档包",
  "menu.repairFolderAsBundle": "将文件夹修复为文档包",
  "menu.convertToBundle": "转换为文档包",

  "settings.title": "Documents Bundle",
  "settings.defaultAttachmentFolderName.name": "默认附件文件夹名称",
  "settings.defaultAttachmentFolderName.desc": "粘贴或拖入文档包的附件会存放在这里。",
  "settings.pasteIntoNormalNote.name": "粘贴到普通笔记",
  "settings.pasteIntoNormalNote.desc": "选择附件粘贴到尚未成为文档包的笔记时如何处理。",
  "settings.pasteIntoNormalNote.ask": "询问是否转换",
  "settings.pasteIntoNormalNote.autoConvert": "自动转换",
  "settings.pasteIntoNormalNote.default": "使用 Obsidian 默认行为",
  "settings.handlePastedAttachments.name": "处理粘贴的附件",
  "settings.handlePastedAttachments.desc": "将粘贴的文件存入当前文档包的附件文件夹。",
  "settings.handleDroppedAttachments.name": "处理拖入的附件",
  "settings.handleDroppedAttachments.desc": "将拖入编辑器的文件存入当前文档包的附件文件夹。",
  "settings.enhanceNativeFileExplorer.name": "增强原生文件列表",
  "settings.enhanceNativeFileExplorer.desc": "在 Obsidian 原生文件列表中标记 Document Bundle 文件夹。",

  "suggest.openBundleDocument.placeholder": "打开文档包...",

  "confirm.convertNoteToBundle": "添加附件前，是否将当前笔记转换为 Documents Bundle？",
  "confirm.migrateCurrentBundleAttachments": "是否将 {count} 个附件移动到当前文档包的附件文件夹并重写链接？",
  "confirm.migrateVaultAttachments": "是否迁移 {bundles} 个文档包中的 {attachments} 个附件引用，并重写主文档？被多个文档包引用的源文件会复制到各目标文档包。",
  "confirm.deleteBundle": "是否删除“{name}”及其所有附件？",

  "notice.assetsFolder": "附件文件夹：{path}",
  "notice.scanBundles": "文档包：{bundles}，普通 Markdown 文件：{markdownFiles}，不完整候选项：{incompleteCandidates}",
  "notice.convertedToBundle": "已转换为文档包：{name}。已重写 {count} 个关联文档。",
  "notice.bundleMainFileNotFound": "找不到文档包主文件：{path}",
  "notice.duplicatedBundle": "已复制文档包：{name}",
  "notice.bundleAlreadyValid": "文档包结构已有效：{name}",
  "notice.repairedBundle": "已修复文档包：{name}",
  "notice.attachmentMigrationDryRun": "附件迁移预览：{count} 个文件。详情见开发者控制台。",
  "notice.noAttachmentsNeedMigration": "没有需要迁移的附件。",
  "notice.migratedCurrentBundleAttachments": "已将 {count} 个附件迁移到文档包附件文件夹。",
  "notice.vaultMigrationDryRun": "库附件迁移预览：{count} 个附件。报告：{path}",
  "notice.noVaultAttachmentsNeedMigration": "没有需要迁移的库附件。",
  "notice.vaultMigrationBlocked": "库附件迁移被阻止：{count} 个问题。详情见开发者控制台。",
  "notice.migratedVaultAttachments": "已迁移 {bundles} 个文档包中的 {attachments} 个附件引用。",
  "notice.movedBundle": "已移动文档包：{name}",
  "notice.deletedBundle": "已删除文档包：{name}",
  "notice.nativeRenameUnavailable": "Obsidian 内联重命名不可用。请使用文件列表的重命名操作。",

  "error.cannotMigrateMissingAttachment": "无法迁移缺失的附件：{path}",
  "error.cannotMigrateAttachmentTargetExists": "无法迁移附件：目标已存在：{path}",
  "error.cannotUpdateMissingBundleMainFile": "无法更新缺失的文档包主文件：{path}",
  "error.cannotCopyMissingAttachment": "无法复制缺失的附件：{path}",
  "error.cannotMoveBundleIntoItself": "不能将文档包移动到自身内部。",
  "error.currentFileNotBundleMain": "当前文件不是文档包主文档。",
  "error.documentNameEmpty": "文档名称不能为空。",
  "error.onlyMarkdownFilesCanConvert": "只能将 Markdown 文件转换为文档包。",
  "error.cannotRenameBundleTargetExists": "无法重命名文档包：目标文件夹“{name}”已存在。",
  "error.copiedBundleMainFileMissing": "复制后的文档包主文件缺失：{path}",
  "error.cannotMoveBundleTargetExists": "无法移动文档包：目标文件夹“{name}”已存在。",
  "error.cannotRepairBundleMultipleMarkdown": "无法修复文档包“{name}”：发现多个 Markdown 文件。",
  "error.attachmentTargetUnavailable": "无法为“{name}”找到可用的附件目标。",

  "report.title": "Documents Bundle 附件迁移报告",
  "report.summary": "摘要",
  "report.bundlesScanned": "已扫描文档包",
  "report.bundlesWithMigrations": "包含迁移项的文档包",
  "report.attachmentReferencesToMigrate": "待迁移附件引用",
  "report.sharedSourceAttachments": "共享源附件",
  "report.blockingIssues": "阻止问题",
  "report.blockingIssuesHeading": "阻止问题",
  "report.sharedSourcesHeading": "共享源文件",
  "report.sharedSourcesDescription": "这些源文件被多个文档包迁移引用。它们会复制到每个目标文档包，而不是从原位置移动。",
  "report.plannedMovesHeading": "计划移动",
  "report.noAttachmentMigrations": "没有计划迁移的附件。",
  "report.table.bundle": "文档包",
  "report.table.source": "源文件",
  "report.table.target": "目标文件",
  "report.table.rewrittenLink": "重写后的链接"
};

export type Translate = (key: TranslationKey, vars?: TranslationVars) => string;

export function getCurrentLocale(language = "en"): Locale {
  return language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function translate(locale: Locale, key: TranslationKey, vars: TranslationVars = {}): string {
  const template = locale === "zh" ? ZH_TRANSLATIONS[key] : EN_TRANSLATIONS[key];
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export function createTranslator(locale: Locale = "en"): Translate {
  return (key, vars) => translate(locale, key, vars);
}
