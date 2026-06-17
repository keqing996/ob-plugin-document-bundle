# Manual QA

This file intentionally stays short. Routine confidence should come from `npm run verify`.

## Standard Gate

Run:

```bash
npm run verify
```

Expected:

1. Unit tests pass.
2. The isolated Obsidian smoke test passes.
3. Release artifacts validate.
4. Mobile safety checks pass.
5. Docs validation passes.
6. Release packaging succeeds.

## Focused Manual Checks

Use only `documents-bundle/test-vault` or another disposable vault.

1. Enable the plugin in Obsidian.
2. Open Obsidian's native Files pane.
3. Create a Bundle named `Manual Check`.
4. Confirm `Manual Check/Manual Check.md` and `Manual Check/assets/` exist.
5. Confirm the `Manual Check` folder is marked as a Bundle in the native Files pane.
6. Confirm `Manual Check/Manual Check.md` and `Manual Check/assets/` are hidden under the Bundle in the native Files pane.
7. Click the `Manual Check` folder title and confirm `Manual Check/Manual Check.md` opens.
8. Paste an image into the Bundle main document.
9. Confirm the image lands in `Manual Check/assets/` and the Markdown link is relative.
10. Drop a PDF or text file into the Bundle main document.
11. Confirm the file lands in `Manual Check/assets/` and the Markdown link is relative.
12. Duplicate, move, rename, and delete a throwaway Bundle.
13. Confirm operations affect the whole Bundle folder.

## External Gaps

These are not part of the lean routine gate:

1. OS-level macOS mouse/keyboard QA requires Accessibility permission.
2. Real iOS/Android Obsidian validation still needs a device or simulator.
3. Real native File Explorer DOM compatibility across older Obsidian versions still needs broader manual coverage.
4. Deep native drag/drop, rename, and delete interception is not part of the first native Files pane version.
