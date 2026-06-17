# documents-bundle PRD

## 1. Direction Change

The project direction is now aggressive and focused:

**Remove the custom Documents Bundle file tree completely, then build only on top of Obsidian's native File Explorer.**

The previous implementation created a separate `Documents Bundle explorer` tab. That proved the Bundle model and file operations, but it is not the desired product shape. The target user experience is that Obsidian's normal Files pane itself understands Document Bundles.

The plugin should not ask users to switch to a separate file browser. The native File Explorer should show recognized Bundle folders as document-like objects.

## 2. Product Goal

`documents-bundle` makes one Markdown document behave like a self-contained folder package:

```text
Document/
  Document.md
  assets/
```

The user-facing goal is:

1. Keep documents and attachments as normal local files.
2. Make each Bundle feel like a single document in Obsidian.
3. Use the native File Explorer as the primary UI.
4. Store pasted/dropped attachments inside the active Bundle's `assets/`.

## 3. Core Model

### 3.1 Bundle Document

A folder is a Document Bundle when:

1. The folder is named `xxx`.
2. It contains `xxx.md`.
3. It contains `assets/`.

Example:

```text
Project Plan/
  Project Plan.md
  assets/
```

`Project Plan.md` is the main document. `assets/` is the local attachment folder.

### 3.2 Normal Folder

Any folder that does not match `xxx/xxx.md + assets/` remains a normal folder.

Examples that are not Bundles:

```text
Draft/
  Draft.md
```

```text
Meeting/
  index.md
  assets/
```

`index.md` support is out of scope for the first native File Explorer version.

## 4. Required Cleanup First

Before implementing the native File Explorer enhancement, remove the custom file tree completely.

Delete or remove all logic related to:

1. `src/views/bundle-explorer.ts`
2. `src/views/bundle-menu.ts`
3. `BUNDLE_EXPLORER_VIEW_TYPE`
4. `BundleExplorerView`
5. `registerView(...)` for the custom explorer
6. Ribbon icon for opening the custom explorer
7. Command `documents-bundle:open-documents-bundle-explorer`
8. Methods that only exist to open, reveal, or refresh custom explorer leaves
9. Settings that only affect the custom explorer:
   - `showNormalMarkdownFiles`
   - `showAssetsFolders`
10. Tests that only verify custom explorer menus or custom explorer UI
11. Smoke assertions that require opening the custom explorer

The cleanup must leave intact:

1. Bundle recognition.
2. Bundle create/convert/repair/rename/copy/move/delete operations.
3. Paste/drop attachment handling.
4. Bundle-aware quick open command.
5. Native Obsidian file-menu entries.
6. Migration commands.
7. Release/mobile/docs validation.

After cleanup, the plugin should still build and pass the lean release gate.

## 5. Native File Explorer DOM Patch

The new UI strategy is **Strategy B: DOM patch Obsidian's native File Explorer**.

Obsidian does not expose a stable public API for replacing File Explorer rendering. The plugin will therefore patch the rendered DOM conservatively.

### 5.1 First Version Goal

When the native File Explorer renders a folder that matches:

```text
xxx/
  xxx.md
  assets/
```

the plugin should mark that folder as a Document Bundle.

The first visual treatment can be lightweight:

1. Add a CSS class to the native folder node.
2. Make the folder title bold.
3. Add a small `Bundle` badge.
4. Hide the Bundle's direct internals in the native Files pane so `xxx.md` and `assets/` do not visually compete with the Bundle object.

The first version does not need a large custom UI. The point is to prove that Bundle folders can be recognized, styled, and visually packaged inside the native Files pane.

### 5.2 Click Behavior

After a folder is recognized as a Document Bundle:

1. Clicking the Bundle folder title should open `xxx/xxx.md`.
2. Normal folders should keep normal expand/collapse behavior.
3. The first version may keep folder expand/collapse on the native disclosure icon.
4. If click interception is unstable, ship visual marking first and make click-to-open the next step.

### 5.3 Attachment Behavior

Attachment behavior remains editor-based:

1. If the active file is a Bundle main document, pasted files go to `assets/`.
2. Dropped files go to `assets/`.
3. Inserted Markdown links use `./assets/...`.

This is independent from the File Explorer patch and must continue to work after deleting the custom explorer.

### 5.4 Native File Explorer Patch Scope

First version:

1. Desktop only.
2. Patch native File Explorer DOM after it renders.
3. Re-run patching when the file tree changes.
4. Mark recognized Bundle folders with a CSS class.
5. Apply lightweight style, initially bold text.
6. Hide recognized Bundle internals in the native Files pane by styling the native child container.
7. Fail safely if the expected DOM shape is not found.

Out of scope for first version:

1. Full native drag/drop replacement.
2. Full native rename/delete override.
3. Full multi-select behavior.
4. Deep Quick Switcher, Graph, or Backlinks patching.
5. Mobile native File Explorer patching.
6. Native-level virtualization replacement.

## 6. User-Facing Behavior

### 6.1 Create

Creating `Project Plan` creates:

```text
Project Plan/
  Project Plan.md
  assets/
```

The new main Markdown file opens after creation.

### 6.2 Open

Opening a Bundle opens its main Markdown file:

```text
Project Plan/Project Plan.md
```

Native File Explorer target behavior:

1. `Project Plan` appears as a marked Document Bundle folder.
2. Clicking its title opens `Project Plan/Project Plan.md`.
3. The native Files pane hides `Project Plan/Project Plan.md` and `Project Plan/assets/` under the Bundle node.

### 6.3 Paste and Drop Attachments

When the active editor is a Bundle main document:

1. Pasted images are written to `assets/`.
2. Dropped files are written to `assets/`.
3. Markdown links use document-local relative paths.
4. The plugin prevents Obsidian's default attachment handler from duplicating the attachment.

Examples:

```markdown
![](./assets/image-20260617-143012.png)
[brief.pdf](./assets/brief.pdf)
```

### 6.4 Bundle Operations

Bundle operations continue to treat the folder as the document:

1. Rename Bundle: rename folder and main Markdown together.
2. Copy Bundle: copy folder, main Markdown, and assets.
3. Move Bundle: move the whole folder.
4. Delete Bundle: delete/trash the whole folder.
5. Repair Bundle: create missing `assets/` or align main Markdown naming when safe.

Native File Explorer operations may initially use Obsidian's normal behavior. Deeper operation interception is a later milestone.

## 7. Code Structure Target

Target structure:

```text
documents-bundle/
  src/
    main.ts
    core/
    obsidian/
      native-file-explorer-patch.ts
      attachments.ts
      file-menu.ts
      ...
    settings.ts
    types.ts
  tests/
  scripts/
  docs/
```

`src/views/` should disappear unless a future non-file-tree view is introduced for a separate reason.

Important future files:

1. `src/obsidian/native-file-explorer-patch.ts`: DOM patch for native File Explorer.
2. `styles.css`: native Bundle marker styles.
3. `tests/native-file-explorer-patch.test.ts`: DOM helper tests.
4. `scripts/obsidian-smoke-test.mjs`: focused real Obsidian smoke coverage.

## 8. Settings

Keep settings that affect core behavior:

```text
attachmentFolderName: assets
pasteIntoNormalNoteBehavior: ask | auto-convert | default
handlePastedAttachments: boolean
handleDroppedAttachments: boolean
attachmentImageFilenamePattern: image-YYYYMMDD-HHmmss
useRelativeMarkdownLinks: boolean
```

Remove settings that only affect the deleted custom explorer:

```text
showNormalMarkdownFiles
showAssetsFolders
```

Native File Explorer setting:

```text
enhanceNativeFileExplorer: boolean
```

Default is `true`, because the native File Explorer is now the intended UI. If a future Obsidian release changes the DOM shape and smoke coverage fails, this setting can be temporarily disabled while the patch is adjusted.

## 9. Verification

Keep the repository lean.

Primary commands:

```bash
npm test
npm run build
npm run smoke:obsidian
npm run validate:release
npm run validate:mobile-safety
npm run validate:docs
npm run package:release
npm run verify
```

`npm run verify` is the standard local gate.

New native File Explorer smoke coverage should verify:

1. The custom explorer command/view no longer exists.
2. A standard Bundle folder in the native File Explorer receives the Bundle CSS class.
3. The first visual marker is applied, initially bold styling.
4. Normal folders are not marked.
5. Bundle internals are hidden in the native File Explorer.
6. If click-to-open is implemented, clicking the Bundle title opens `xxx/xxx.md`.

## 10. Acceptance Criteria

Cleanup acceptance:

1. No custom Bundle Explorer view is registered.
2. No `src/views/bundle-explorer.ts` or `src/views/bundle-menu.ts` remains.
3. No command opens a separate Bundle explorer tab.
4. Explorer-only settings are removed.
5. Existing core operations and attachment handling still pass tests.

Native File Explorer first-version acceptance:

1. Standard Bundle folders are recognized in the native File Explorer.
2. Recognized Bundle folders receive a DocumentBundle visual marker.
3. The first visual marker can be lightweight, such as bold folder text.
4. Normal folders are not marked.
5. Recognized Bundle internals are hidden in the native File Explorer.
6. Normal folder children are not hidden.
7. The DOM patch fails safely if Obsidian's File Explorer structure changes.
8. Existing paste/drop-to-assets behavior still works when a Bundle main Markdown file is active.

## 11. Current Status

Current version: `0.1.0`

Current branch: `codex/documents-bundle`

Current implementation target:

1. The custom `Documents Bundle explorer` must be removed and must not return as the primary UI.
2. Native File Explorer enhancement is the active UI direction.
3. First marker is intentionally lightweight: recognized Bundle folder titles become bold and receive the Bundle CSS class and badge.
4. Click-to-open should open the internal main Markdown file when the native title can be resolved to a unique Bundle path.
5. Bundle internals should be visually hidden in the native Files pane while remaining normal files on disk.

Known external validation gaps:

1. Native File Explorer DOM assumptions need focused Obsidian smoke testing.
2. Real macOS OS-level mouse/keyboard QA requires Accessibility permission.
3. Real iOS/Android Obsidian validation has not been run.
