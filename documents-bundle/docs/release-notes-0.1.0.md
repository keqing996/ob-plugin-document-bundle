# Documents Bundle 0.1.0 Release Notes

Status: release candidate.

## Included

1. Bundle model: `Document/Document.md + Document/assets/`.
2. Native File Explorer enhancement that marks recognized Bundle folders in place and hides their internals.
3. Create, convert, repair, rename, duplicate, move, and delete Bundle operations.
4. Bundle-local paste/drop attachment handling.
5. Current-Bundle and vault attachment migration commands.
6. Bundle-aware quick open command.
7. Native Obsidian file-menu entries.
8. Bundle-name aliases on main Markdown files.
9. Mobile-safe fallback for opening `assets/`.

## Verification

Run:

```bash
npm run verify
```

Expanded gate:

```bash
npm test
npm run smoke:obsidian
npm run validate:release
npm run validate:mobile-safety
npm run validate:docs
npm audit --audit-level=high
npm run package:release
```

## Known Limits

1. Native File Explorer enhancement is intentionally lightweight in 0.1.0: native drag/drop, rename, and delete interception are not replaced.
2. Real macOS OS-level mouse/keyboard QA requires Accessibility permission.
3. Real iOS/Android Obsidian validation has not been run.
4. Deep Quick Switcher, Graph, and Backlinks patching is out of scope.

## Release Artifact

`npm run package:release` writes:

```text
dist/documents-bundle-0.1.0.zip
```

The archive contains only:

```text
main.js
manifest.json
styles.css
```
