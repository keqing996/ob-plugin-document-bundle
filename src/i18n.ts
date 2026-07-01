export type Locale = "en" | "zh";
export type TranslationVars = Record<string, string | number>;
export type TranslationKey = keyof typeof EN_TRANSLATIONS;

const EN_TRANSLATIONS = {
  "badge.bundle": "Bundle",
  "button.cancel": "Cancel",
  "button.confirm": "Confirm",

  "menu.openBundleAssets": "Open bundle assets",
  "menu.migrateAttachments": "Migrate attachments to bundle",
  "menu.renameBundle": "Rename bundle",
  "menu.newBundleDocumentHere": "New bundle document here",
  "menu.convertToBundle": "Convert to bundle",

  "modal.migrateAttachments.title": "Migrate attachments to bundle",
  "modal.migrateAttachments.description": "Review {count} attachment(s) that will be moved into this bundle. Links in the bundle document will be rewritten.",
  "modal.migrateAttachments.source": "From",
  "modal.migrateAttachments.target": "To",
  "modal.convertToBundleAttachments.title": "Convert to bundle",
  "modal.convertToBundleAttachments.description": "Review {count} attachment(s) that will be moved into the new bundle. Links in the converted document will be rewritten.",

  "settings.title": "Documents Bundle",
  "settings.bundleStructure.name": "Bundle structure",
  "settings.bundleStructure.desc": "Bundles use a simple structure: a same-name Markdown file, with an assets folder created when attachments are added. Folders with only the same-name Markdown file are also recognized as bundles.",
  "settings.handleBundleAttachments.name": "Handle pasted and dropped attachments in bundles",
  "settings.handleBundleAttachments.desc": "When enabled, pasted or dropped files in a bundle's main document are saved to that bundle's assets folder and inserted as relative links. When disabled, paste and drop handling is left entirely to Obsidian. Normal notes are never intercepted.",
  "settings.enhanceNativeFileExplorer.name": "Enhance native File Explorer",
  "settings.enhanceNativeFileExplorer.desc": "Show bundle folders as single document objects in Obsidian's Files pane by hiding the internal main document and assets folder, marking the bundle title, and opening the main document when the title is clicked.",
  "settings.bundleBadgeMode.name": "Bundle marker style",
  "settings.bundleBadgeMode.desc": "Choose whether bundle folders use no marker, a small package icon, a bold title, or the text badge in Obsidian's Files pane. This only changes the visual marker; bundle behavior stays the same.",
  "settings.bundleBadgeMode.none": "No marker",
  "settings.bundleBadgeMode.icon": "Small icon badge",
  "settings.bundleBadgeMode.bold": "Bold title",
  "settings.bundleBadgeMode.text": "Text badge",

  "confirm.migrateVaultAttachments": "Migrate {attachments} attachment reference(s) across {bundles} bundle(s) and rewrite their main documents? Shared source files will be copied.",
  "confirm.deleteBundle": "Delete \"{name}\" and all bundled assets?",

  "notice.assetsFolder": "Assets folder: {path}",
  "notice.scanBundles": "Bundles: {bundles}, normal Markdown files: {markdownFiles}, incomplete candidates: {incompleteCandidates}",
  "notice.convertedToBundle": "Converted to bundle: {name}. Migrated {count} attachment(s).",
  "notice.bundleMainFileNotFound": "Bundle main file not found: {path}",
  "notice.duplicatedBundle": "Duplicated bundle: {name}",
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
  "error.documentNameInvalid": "Document name contains unsupported characters.",
  "error.cannotHandleIncomingAttachment": "Could not save the attachment into the bundle assets folder.",
  "error.onlyMarkdownFilesCanConvert": "Only Markdown files can be converted to bundles.",
  "error.cannotRenameBundleTargetExists": "Cannot rename bundle: target folder \"{name}\" already exists.",
  "error.copiedBundleMainFileMissing": "Copied bundle main file missing: {path}",
  "error.cannotMoveBundleTargetExists": "Cannot move bundle: target folder \"{name}\" already exists.",
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

  "menu.openBundleAssets": "打开文档包附件",
  "menu.migrateAttachments": "迁移附件到文档包",
  "menu.renameBundle": "重命名文档包",
  "menu.newBundleDocumentHere": "在此处新建文档包",
  "menu.convertToBundle": "转换为文档包",

  "modal.migrateAttachments.title": "迁移附件到文档包",
  "modal.migrateAttachments.description": "以下 {count} 个附件会移动到当前文档包中，文档里的链接会同步重写。",
  "modal.migrateAttachments.source": "来源",
  "modal.migrateAttachments.target": "目标",
  "modal.convertToBundleAttachments.title": "转换为文档包",
  "modal.convertToBundleAttachments.description": "以下 {count} 个附件会移动到新文档包中，转换后的文档链接会同步重写。",

  "settings.title": "Documents Bundle",
  "settings.bundleStructure.name": "文档包结构",
  "settings.bundleStructure.desc": "文档包使用简单结构：同名 Markdown 文件，添加附件时会创建 assets 文件夹。只有同名 Markdown 文件的文件夹也会被识别为文档包。",
  "settings.handleBundleAttachments.name": "接管文档包内的附件粘贴与拖入",
  "settings.handleBundleAttachments.desc": "开启后，在文档包主文档中粘贴或拖入文件时，插件会将附件保存到该文档包的 assets 文件夹并插入相对链接。关闭后，粘贴和拖入行为完全交给 Obsidian 处理。普通笔记始终不受影响。",
  "settings.enhanceNativeFileExplorer.name": "增强原生文件列表",
  "settings.enhanceNativeFileExplorer.desc": "开启后，Obsidian 文件列表会将文档包显示为一个整体：隐藏内部主文档和 assets 文件夹、标记文档包标题，并允许点击文档包标题打开主文档。",
  "settings.bundleBadgeMode.name": "文档包标记样式",
  "settings.bundleBadgeMode.desc": "选择文档包在 Obsidian 文件列表中的提示方式：不展示、小包裹图标、加粗标题，或文字 Badge。这里只改变视觉提示，不影响文档包行为。",
  "settings.bundleBadgeMode.none": "不展示",
  "settings.bundleBadgeMode.icon": "小图标 Badge",
  "settings.bundleBadgeMode.bold": "加粗标题",
  "settings.bundleBadgeMode.text": "文字 Badge",

  "confirm.migrateVaultAttachments": "是否迁移 {bundles} 个文档包中的 {attachments} 个附件引用，并重写主文档？被多个文档包引用的源文件会复制到各目标文档包。",
  "confirm.deleteBundle": "是否删除“{name}”及其所有附件？",

  "notice.assetsFolder": "附件文件夹：{path}",
  "notice.scanBundles": "文档包：{bundles}，普通 Markdown 文件：{markdownFiles}，不完整候选项：{incompleteCandidates}",
  "notice.convertedToBundle": "已转换为文档包：{name}。已迁移 {count} 个附件。",
  "notice.bundleMainFileNotFound": "找不到文档包主文件：{path}",
  "notice.duplicatedBundle": "已复制文档包：{name}",
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
  "error.documentNameInvalid": "文档名称包含不支持的字符。",
  "error.cannotHandleIncomingAttachment": "无法将附件保存到文档包附件文件夹。",
  "error.onlyMarkdownFilesCanConvert": "只能将 Markdown 文件转换为文档包。",
  "error.cannotRenameBundleTargetExists": "无法重命名文档包：目标文件夹“{name}”已存在。",
  "error.copiedBundleMainFileMissing": "复制后的文档包主文件缺失：{path}",
  "error.cannotMoveBundleTargetExists": "无法移动文档包：目标文件夹“{name}”已存在。",
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
