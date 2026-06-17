# Documents Bundle

Documents Bundle is an Obsidian plugin that treats one Markdown document as a self-contained folder:

```text
Document/
  Document.md
  assets/
```

When the active editor is a Bundle main document, pasted and dropped attachments are written to that document's `assets/` folder and inserted as relative Markdown links:

```markdown
![](./assets/image-20260617-143012.png)
[brief.pdf](./assets/brief.pdf)
```

## Features

1. Create and convert Bundle documents.
2. Mark Bundle folders directly in Obsidian's native Files pane.
3. Hide Bundle internals in the native Files pane so each Bundle reads as one document object.
4. Rename, duplicate, move, delete, and repair Bundles as whole folders.
5. Keep pasted/dropped attachments inside the current Bundle.
6. Migrate existing local attachments into Bundle `assets/`.
7. Maintain Bundle-name aliases on main Markdown files.
8. Provide native Obsidian file-menu entries for common Bundle actions.
9. Open Bundle documents through the quick picker.

## Development

```bash
npm install
npm test
npm run build
```

Main validation:

```bash
npm run verify
```

`verify` runs unit tests, the isolated Obsidian smoke test, release/mobile validation, high-severity audit, and release packaging.

Useful individual commands:

```bash
npm run smoke:obsidian
npm run validate:release
npm run validate:mobile-safety
npm run package:release
```

## Build Artifacts

Obsidian installs these files:

```text
main.js
manifest.json
styles.css
```

Create a release zip:

```bash
npm run package:release
```

The zip is written to:

```text
dist/documents-bundle-0.1.0.zip
```

## Install Manually

Copy the three build artifacts into a vault:

```text
<vault>/.obsidian/plugins/documents-bundle/
  main.js
  manifest.json
  styles.css
```

Then enable `Documents Bundle` from Obsidian's Community plugins settings.

## Notes

The plugin intentionally does not ship a separate file-browser tab. The native Files pane is the product surface: recognized Bundle folders are marked in place, their internal `Document.md` and `assets/` entries are hidden visually, and the rest of the Bundle behavior stays in normal Obsidian commands, menus, and editor events.
