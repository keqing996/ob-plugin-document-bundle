# Documents Bundle

Documents Bundle is an Obsidian plugin for keeping each Markdown document together with its local assets.

```text
Document/
  Document.md
  assets/
```

When the active editor is a bundle main document, pasted and dropped attachments are written to that document's `assets/` folder and inserted as relative Markdown links:

```markdown
![](./assets/image-20260617-143012.png)
[brief.pdf](./assets/brief.pdf)
```

## Overview

Documents Bundle keeps document-specific images, PDFs, and other attachments next to the note that owns them. A bundle is still a normal vault folder, so your files remain portable and can be edited without this plugin.

The plugin also enhances Obsidian's native Files pane. Recognized bundle folders are marked and their internal main Markdown file and `assets/` folder are visually hidden so the bundle reads like one document object. This enhancement is optional and can be disabled in settings.

## Features

1. Create new bundle documents.
2. Convert existing Markdown notes into bundle documents.
3. Keep pasted and dropped attachments inside the current bundle.
4. Rename, duplicate, move, delete, and repair bundles as whole folders.
5. Migrate existing local attachments into bundle `assets/` folders and rewrite links.
6. Preserve a bundle-name alias on each main Markdown file.
7. Open bundle documents from a quick picker.
8. Add native Obsidian file-menu actions for common bundle operations.
9. Mark bundle folders in Obsidian's native Files pane.

## Usage

Use **New bundle document** to create an untitled bundle, then rename it directly in Obsidian's Files pane. For example, renaming it to `Project Brief` creates:

```text
Project Brief/
  Project Brief.md
  assets/
```

When you paste or drop files into `Project Brief.md`, Documents Bundle saves them into `Project Brief/assets/` and inserts links such as:

```markdown
![](./assets/sketch.png)
[contract.pdf](./assets/contract.pdf)
```

To convert an existing note, open the note and run **Convert current note to bundle**. The plugin moves the note into a same-named folder, creates the assets folder, and rewrites links from other Markdown files that pointed to the old note path.

## Commands

- **New bundle document** creates a bundle in the current context.
- **Open bundle document** opens a quick picker for all bundles in the vault.
- **Convert current note to bundle** converts the active Markdown note.
- **Open current bundle assets folder** opens the assets folder on desktop, or shows the vault path when a system file browser is not available.
- **Repair current bundle structure** repairs an incomplete bundle folder.
- **Preview current bundle attachment migration** previews attachment moves for the active bundle.
- **Migrate current bundle attachments** moves local attachments into the active bundle.
- **Preview vault attachment migration** creates a migration report for all bundles.
- **Migrate vault attachments** migrates attachment references across the vault.
- **Scan bundles** shows a summary of bundles, normal Markdown files, and incomplete candidates.

## Settings

- **Default attachment folder name** controls the folder used inside each bundle. The default is `assets`.
- **Paste into normal note** chooses whether pasted attachments should ask to convert the note, auto-convert the note, or use Obsidian's default behavior.
- **Handle pasted attachments** enables or disables bundle handling for paste events.
- **Handle dropped attachments** enables or disables bundle handling for editor drop events.
- **Enhance native File Explorer** marks bundle folders in Obsidian's Files pane and visually hides bundle internals.

## Mobile support

Documents Bundle is not desktop-only. Core bundle operations and attachment handling use Obsidian vault APIs and are available on mobile.

Opening an assets folder in the operating system file browser is desktop-only. On mobile, or in any environment without a system file-browser API, the plugin shows the vault path of the assets folder instead.

## Limitations

- The native File Explorer enhancement is visual only. It does not modify Obsidian core files or change the underlying vault structure.
- Bundle internals are ordinary files. Other plugins, sync tools, and file managers can still see and edit them.
- The Files pane enhancement depends on Obsidian's current file-explorer DOM structure. If Obsidian changes that structure, disable **Enhance native File Explorer** until the plugin is updated.
- Attachment migration only rewrites links it can safely resolve to local vault files.

## Manual install

Copy the release artifacts into a vault:

```text
<vault>/.obsidian/plugins/documents-bundle/
  main.js
  manifest.json
  styles.css
```

Then enable **Documents Bundle** from Obsidian's Community plugins settings.

## Release artifacts

Obsidian installs these files from each GitHub release:

```text
main.js
manifest.json
styles.css
```

Create the local release zip:

```bash
npm run package:release
```

The zip is written to:

```text
dist/documents-bundle-1.0.0.zip
```

For a GitHub release, use the exact tag `1.0.0` with no `v` prefix. Upload `main.js`, `manifest.json`, and `styles.css` as release assets. The zip can be attached as an extra convenience artifact, but it does not replace the three files Obsidian downloads.

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

Main validation:

```bash
npm run verify
```

`verify` runs lint, unit tests, the isolated Obsidian smoke test, release and mobile-safety validation, high-severity audit, and release packaging.

Useful individual commands:

```bash
npm run smoke:obsidian
npm run validate:release
npm run validate:mobile-safety
npm run package:release
```
