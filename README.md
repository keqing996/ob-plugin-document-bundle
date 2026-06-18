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
4. Rename, duplicate, move, and delete bundles as whole folders.
5. Migrate existing local attachments into bundle `assets/` folders and rewrite links.
6. Open bundle documents from a quick picker.
7. Add native Obsidian file-menu actions for common bundle operations.
8. Mark bundle folders in Obsidian's native Files pane.

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

To convert an existing note, open the note and run **Convert current note to bundle**. The plugin moves the note into a same-named folder, creates the assets folder, and updates local attachment links inside the moved note when needed.

## Settings

Documents Bundle uses a fixed bundle structure: a same-name Markdown file plus an `assets/` folder. Only folders with this exact structure are recognized as bundles.

- **Handle pasted and dropped attachments in bundles** saves files pasted or dropped into a bundle's main document to that bundle's `assets/` folder and inserts relative links. Normal notes are never intercepted.
- **Enhance native File Explorer** marks bundle folders in Obsidian's Files pane, hides bundle internals, and opens the main document when the bundle title is clicked.
- **Bundle marker style** chooses whether bundle folders show no marker, a small icon badge (default), a bold title, or the text `Bundle` badge in Obsidian's Files pane.

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
