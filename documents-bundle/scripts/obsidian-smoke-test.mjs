import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const vaultRoot = resolve(projectRoot, "test-vault");
const userDataDir = resolve(projectRoot, `.tmp-obsidian-user-data-${process.pid}`);
const vaultId = "documentsbundleuitest";
const port = Number(process.env.OBSIDIAN_REMOTE_DEBUGGING_PORT ?? String(9300 + process.pid % 1000));
const obsidianApp = process.env.OBSIDIAN_APP_PATH ?? "/Applications/Obsidian.app";
const obsidianExecutable = process.env.OBSIDIAN_EXECUTABLE ?? "/Applications/Obsidian.app/Contents/MacOS/Obsidian";

if (typeof WebSocket !== "function") {
  throw new Error("This smoke test requires a Node.js runtime with global WebSocket support.");
}

await terminateTestObsidian();
await prepareIsolatedUserData();

try {
  await launchObsidian();
  const page = await waitForObsidianPage();
  const client = await connectDevTools(page.webSocketDebuggerUrl);

  try {
    await client.send("Runtime.enable");
    await waitForPluginCommand(client);
    const result = await verifyPlugin(client);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    client.ws.close();
  }
} finally {
  await terminateTestObsidian();
}

async function prepareIsolatedUserData() {
  await removeWithRetry(userDataDir);
  await mkdir(userDataDir, { recursive: true });
  await writeFile(
    resolve(userDataDir, "obsidian.json"),
    JSON.stringify({
      vaults: {
        [vaultId]: {
          path: vaultRoot,
          ts: Date.now(),
          open: true
        }
      }
    }, null, 2)
  );
  await writeFile(resolve(userDataDir, `${vaultId}.json`), JSON.stringify({}, null, 2));
}

async function launchObsidian() {
  const args = [
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
    "--disable-gpu"
  ];

  if (obsidianExecutable && existsSync(obsidianExecutable)) {
    spawn(obsidianExecutable, args, {
      detached: true,
      stdio: "ignore"
    }).unref();
    return;
  }

  if (!existsSync(obsidianApp)) {
    throw new Error(`Obsidian app not found: ${obsidianApp}. Set OBSIDIAN_APP_PATH or OBSIDIAN_EXECUTABLE.`);
  }

  spawnSync("open", ["-na", obsidianApp, "--args", ...args], {
    stdio: "ignore"
  });
}

async function waitForObsidianPage() {
  for (let index = 0; index < 160; index += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = pages.find((entry) => entry.type === "page" && entry.url.startsWith("app://obsidian.md"));
      if (page) {
        return page;
      }
    } catch {
      // DevTools endpoint is not available until Electron finishes booting.
    }
    await sleep(500);
  }

  throw new Error("Obsidian DevTools page not found.");
}

function connectDevTools(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) {
      return;
    }

    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      callbacks.reject(new Error(JSON.stringify(message.error)));
    } else {
      callbacks.resolve(message.result);
    }
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        ws,
        send(method, params = {}) {
          const id = nextId;
          nextId += 1;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
        }
      });
    }, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }

  return result.result.value;
}

async function waitForPluginCommand(client) {
  let lastState = null;
  for (let index = 0; index < 80; index += 1) {
    const state = await evaluate(client, `(() => {
      const trustButton = [...document.querySelectorAll('button')]
        .find((element) => element.innerText.includes('Trust author and enable plugins'));
      if (trustButton) trustButton.click();
      return {
        clickedTrustButton: !!trustButton,
        loaded: !!window.app?.plugins?.plugins?.['documents-bundle'],
        enabledPlugins: Array.from(window.app?.plugins?.enabledPlugins || []),
        loadedPlugins: Object.keys(window.app?.plugins?.plugins || {}),
        hasCoreCommand: !!window.app?.commands?.commands?.['documents-bundle:new-bundle-document'],
        hasDeletedExplorerCommand: !!window.app?.commands?.commands?.['documents-bundle:open-documents-bundle-explorer'],
        bodyText: document.body.innerText.slice(0, 500)
      };
    })()`);
    lastState = state;

    if (state.loaded && state.hasCoreCommand && !state.hasDeletedExplorerCommand) {
      return;
    }

    await sleep(500);
  }

  throw new Error(`Documents Bundle plugin did not load cleanly. Last state: ${JSON.stringify(lastState)}`);
}

async function verifyPlugin(client) {
  const result = await evaluate(client, `(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const assert = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const plugin = window.app.plugins.plugins['documents-bundle'];
    const vault = window.app.vault;
    const pathExists = (path) => vault.getAbstractFileByPath(path) !== null;
    const readText = async (path) => {
      const file = vault.getAbstractFileByPath(path);
      assert(file, 'Missing file: ' + path);
      return vault.read(file);
    };
    const folder = (path) => {
      const entry = vault.getAbstractFileByPath(path);
      assert(entry && 'children' in entry, 'Missing folder: ' + path);
      return entry;
    };
    const file = (path) => {
      const entry = vault.getAbstractFileByPath(path);
      assert(entry && 'extension' in entry, 'Missing file: ' + path);
      return entry;
    };
    const commandExists = (id) => !!window.app.commands.commands[id];
    const makeIncomingEvent = (propertyName, files) => ({
      [propertyName]: { files },
      prevented: false,
      preventDefault() {
        this.prevented = true;
      }
    });

    assert(!commandExists('documents-bundle:open-documents-bundle-explorer'), 'Deleted custom explorer command is still registered.');
    assert(window.app.workspace.getLeavesOfType('documents-bundle-explorer').length === 0, 'Deleted custom explorer view still has leaves.');
    assert(plugin.settings.enhanceNativeFileExplorer === true, 'Native File Explorer enhancement should default to enabled.');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    window.app.workspace.leftSplit?.expand?.();
    if (commandExists('file-explorer:open')) {
      window.app.commands.executeCommandById('file-explorer:open');
    }
    await sleep(1000);
    plugin.refreshNativeFileExplorerPatch?.();
    await sleep(500);

    const nativeBundleTitles = [...document.querySelectorAll('.documents-bundle-native-bundle-title')]
      .map((title) => ({
        text: (title.querySelector('.nav-folder-title-content')?.innerText || title.innerText || '').trim(),
        path: title.dataset.documentsBundlePath || '',
        fontWeight: getComputedStyle(title).fontWeight
      }))
      .filter((entry) => entry.text.length > 0 || entry.path.length > 0);
    const markedBundlePaths = nativeBundleTitles.map((entry) => entry.path).filter(Boolean);
    const existingNativeTitle = [...document.querySelectorAll('.documents-bundle-native-bundle-title')]
      .find((title) => title.dataset.documentsBundlePath === 'Existing Bundle' || title.innerText.includes('Existing Bundle'));
    const regularFolderMarked = [...document.querySelectorAll('.documents-bundle-native-bundle-title')]
      .some((title) => title.dataset.documentsBundlePath === 'Regular Folder' || title.innerText.trim() === 'Regular Folder');

    assert(existingNativeTitle, 'Existing Bundle was not marked in the native Files pane.');
    assert(!regularFolderMarked, 'Regular Folder was incorrectly marked as a Bundle.');
    existingNativeTitle.querySelector('.collapse-icon')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(500);
    plugin.refreshNativeFileExplorerPatch?.();
    await sleep(250);

    const existingNativeTitleAfterExpand = [...document.querySelectorAll('.documents-bundle-native-bundle-title')]
      .find((title) => title.dataset.documentsBundlePath === 'Existing Bundle' || title.innerText.includes('Existing Bundle'));
    const existingBundleNode = existingNativeTitleAfterExpand?.closest('.nav-folder');
    const existingBundleChildren = existingBundleNode?.querySelector(':scope > .nav-folder-children, :scope > .tree-item-children')
      || existingBundleNode?.querySelector('.nav-folder-children, .tree-item-children');
    const existingBundleInternalsHidden = !!existingBundleChildren
      && existingBundleChildren.classList.contains('documents-bundle-native-bundle-children')
      && getComputedStyle(existingBundleChildren).display === 'none';
    const regularFolderNode = [...document.querySelectorAll('.nav-folder')]
      .find((node) => node.querySelector('.nav-folder-title-content')?.innerText?.trim() === 'Regular Folder');
    const regularFolderChildrenHidden = !!regularFolderNode?.querySelector('.documents-bundle-native-bundle-children');
    const existingBundleChildrenDiagnostic = {
      nodeClass: existingBundleNode?.className || '',
      childClass: existingBundleChildren?.className || '',
      childDisplay: existingBundleChildren ? getComputedStyle(existingBundleChildren).display : '',
      childText: existingBundleChildren?.innerText?.slice(0, 200) || '',
      html: existingBundleNode?.outerHTML?.slice(0, 1000) || ''
    };
    assert(existingBundleInternalsHidden, 'Existing Bundle internals were not hidden in the native Files pane: ' + JSON.stringify(existingBundleChildrenDiagnostic));
    assert(!regularFolderChildrenHidden, 'Regular Folder children were incorrectly hidden.');

    const titleForOpen = existingNativeTitleAfterExpand || existingNativeTitle;
    titleForOpen.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(750);
    const clickOpenedExisting = window.app.workspace.getActiveFile()?.path === 'Existing Bundle/Existing Bundle.md';
    assert(clickOpenedExisting, 'Clicking a marked native Bundle title did not open its main Markdown file.');

    const scan = plugin.scanBundles();

    window.app.commands.executeCommandById('documents-bundle:preview-vault-attachment-migration');
    await sleep(1500);

    const reportFiles = window.app.vault.getMarkdownFiles()
      .map((file) => file.path)
      .filter((path) => path.startsWith('Documents Bundle Reports/'));

    const openBundleCommandExists = commandExists('documents-bundle:open-bundle-document');
    const bundleSuggestionItems = plugin.getAllBundleInfos().map((bundle) => bundle.folderPath);
    window.app.commands.executeCommandById('documents-bundle:open-bundle-document');
    await sleep(500);
    const bundleQuickSwitcherSuggestions = [...document.querySelectorAll('.suggestion-item')]
      .map((item) => item.innerText.trim())
      .filter(Boolean);
    const bundleQuickSwitcherModalVisible = bundleQuickSwitcherSuggestions.length > 0;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(100);
    await plugin.openBundle('Shared Attachment/Alpha');
    await sleep(500);
    const bundleQuickSwitcherOpenedAlpha = window.app.workspace.getActiveFile()?.path === 'Shared Attachment/Alpha/Alpha.md';

    const editorLeaf = window.app.workspace.getLeaf('tab');
    await editorLeaf.openFile(file('Existing Bundle/Existing Bundle.md'));
    await sleep(500);
    const markdownView = editorLeaf.view;
    assert(markdownView?.editor && markdownView?.file?.path === 'Existing Bundle/Existing Bundle.md', 'Could not open Existing Bundle in a Markdown editor.');

    const pasteEvent = makeIncomingEvent('clipboardData', [
      new File(['paste image'], 'lifecycle-paste.png', { type: 'image/png' })
    ]);
    window.app.workspace.trigger('editor-paste', pasteEvent, markdownView.editor, markdownView);
    await sleep(750);
    assert(pasteEvent.prevented, 'editor-paste lifecycle event was not prevented by the plugin.');
    assert(pathExists('Existing Bundle/assets/lifecycle-paste.png'), 'editor-paste did not create pasted image in bundle assets.');
    assert(markdownView.editor.getValue().includes('![](./assets/lifecycle-paste.png)'), 'editor-paste did not insert the image Markdown link.');

    const dropEvent = makeIncomingEvent('dataTransfer', [
      new File(['drop pdf'], 'lifecycle-drop.pdf', { type: 'application/pdf' })
    ]);
    window.app.workspace.trigger('editor-drop', dropEvent, markdownView.editor, markdownView);
    await sleep(750);
    assert(dropEvent.prevented, 'editor-drop lifecycle event was not prevented by the plugin.');
    assert(pathExists('Existing Bundle/assets/lifecycle-drop.pdf'), 'editor-drop did not create dropped file in bundle assets.');
    assert(markdownView.editor.getValue().includes('[lifecycle-drop.pdf](./assets/lifecycle-drop.pdf)'), 'editor-drop did not insert the attachment Markdown link.');

    const normalNoteLeaf = window.app.workspace.getLeaf('tab');
    await normalNoteLeaf.openFile(file('Standalone.md'));
    await sleep(500);
    const normalNoteView = normalNoteLeaf.view;
    assert(normalNoteView?.editor && normalNoteView?.file?.path === 'Standalone.md', 'Could not open Standalone.md in a Markdown editor.');
    const previousPasteBehavior = plugin.settings.pasteIntoNormalNoteBehavior;
    plugin.settings.pasteIntoNormalNoteBehavior = 'auto-convert';
    const normalPasteEvent = makeIncomingEvent('clipboardData', [
      new File(['normal note paste image'], 'standalone-lifecycle.png', { type: 'image/png' })
    ]);
    try {
      window.app.workspace.trigger('editor-paste', normalPasteEvent, normalNoteView.editor, normalNoteView);
      await sleep(1000);
    } finally {
      plugin.settings.pasteIntoNormalNoteBehavior = previousPasteBehavior;
    }
    assert(normalPasteEvent.prevented, 'Normal-note editor-paste auto-convert event was not prevented by the plugin.');
    assert(pathExists('Standalone/Standalone.md'), 'Normal-note editor-paste did not convert the note into a bundle.');
    assert(pathExists('Standalone/assets/standalone-lifecycle.png'), 'Normal-note editor-paste did not create attachment in converted bundle assets.');
    assert(!pathExists('Standalone.md'), 'Normal-note editor-paste left the original standalone markdown at root.');

    const askNoteLeaf = window.app.workspace.getLeaf('tab');
    await askNoteLeaf.openFile(file('Regular Folder/Loose Note.md'));
    await sleep(500);
    const askNoteView = askNoteLeaf.view;
    assert(askNoteView?.editor && askNoteView?.file?.path === 'Regular Folder/Loose Note.md', 'Could not open Loose Note.md in a Markdown editor.');
    const askCancelEvent = makeIncomingEvent('clipboardData', [
      new File(['ask cancel image'], 'ask-cancel.png', { type: 'image/png' })
    ]);
    const previousConfirmForAsk = window.confirm;
    let askPromptCount = 0;
    window.confirm = () => {
      askPromptCount += 1;
      return false;
    };
    try {
      window.app.workspace.trigger('editor-paste', askCancelEvent, askNoteView.editor, askNoteView);
      await sleep(500);
    } finally {
      window.confirm = previousConfirmForAsk;
    }
    assert(askPromptCount === 1, 'Normal-note ask cancel did not show a confirmation prompt.');
    assert(!askCancelEvent.prevented, 'Normal-note ask cancel should not prevent Obsidian default paste.');
    assert(pathExists('Regular Folder/Loose Note.md'), 'Normal-note ask cancel unexpectedly converted the note.');
    assert(!pathExists('Regular Folder/Loose Note/assets/ask-cancel.png'), 'Normal-note ask cancel unexpectedly wrote an attachment.');

    const askConfirmEvent = makeIncomingEvent('clipboardData', [
      new File(['ask confirm image'], 'ask-confirm.png', { type: 'image/png' })
    ]);
    window.confirm = () => {
      askPromptCount += 1;
      return true;
    };
    try {
      window.app.workspace.trigger('editor-paste', askConfirmEvent, askNoteView.editor, askNoteView);
      await sleep(1000);
    } finally {
      window.confirm = previousConfirmForAsk;
    }
    assert(askPromptCount === 2, 'Normal-note ask confirm did not show a second confirmation prompt.');
    assert(askConfirmEvent.prevented, 'Normal-note ask confirm event was not prevented by the plugin.');
    assert(pathExists('Regular Folder/Loose Note/Loose Note.md'), 'Normal-note ask confirm did not convert the note into a bundle.');
    assert(pathExists('Regular Folder/Loose Note/assets/ask-confirm.png'), 'Normal-note ask confirm did not write attachment into converted bundle assets.');
    assert(!pathExists('Regular Folder/Loose Note.md'), 'Normal-note ask confirm left the original markdown in place.');

    await plugin.duplicateBundle('Existing Bundle');
    await sleep(250);
    assert(pathExists('Existing Bundle copy/Existing Bundle copy.md'), 'Duplicated bundle main file was not created.');
    assert(pathExists('Existing Bundle copy/assets'), 'Duplicated bundle assets folder was not created.');

    await plugin.moveBundleToParent('Existing Bundle copy', 'Regular Folder');
    await sleep(250);
    assert(!pathExists('Existing Bundle copy'), 'Moved bundle still exists at old root path.');
    assert(pathExists('Regular Folder/Existing Bundle copy/Existing Bundle copy.md'), 'Moved bundle main file missing.');

    const previousConfirm = window.confirm;
    window.confirm = () => true;
    try {
      await plugin.deleteBundleWithConfirm('Regular Folder/Existing Bundle copy');
    } finally {
      window.confirm = previousConfirm;
    }
    await sleep(250);
    assert(!pathExists('Regular Folder/Existing Bundle copy'), 'Deleted bundle still exists.');

    await plugin.repairBundleFolder(folder('Repair Cases/Missing Assets'));
    await plugin.repairBundleFolder(folder('Repair Cases/Index Named'));
    await plugin.repairBundleFolder(folder('Repair Cases/Empty Candidate'));
    await sleep(500);
    assert(pathExists('Repair Cases/Missing Assets/assets'), 'Missing Assets repair did not create assets folder.');
    assert((await readText('Repair Cases/Missing Assets/Missing Assets.md')).includes('  - "Missing Assets"'), 'Missing Assets repair did not add a bundle alias.');
    assert(pathExists('Repair Cases/Index Named/Index Named.md'), 'Index Named repair did not rename main file.');
    assert(!pathExists('Repair Cases/Index Named/index.md'), 'Index Named old index.md still exists.');
    assert((await readText('Repair Cases/Index Named/Index Named.md')).includes('  - "Index Named"'), 'Index Named repair did not add a bundle alias.');
    assert(pathExists('Repair Cases/Empty Candidate/Empty Candidate.md'), 'Empty Candidate repair did not create main file.');
    assert(pathExists('Repair Cases/Empty Candidate/assets'), 'Empty Candidate repair did not create assets folder.');
    assert((await readText('Repair Cases/Empty Candidate/Empty Candidate.md')).includes('  - "Empty Candidate"'), 'Empty Candidate repair did not add a bundle alias.');

    await plugin.convertFileToBundle(file('Conversion Links/Plan.md'));
    await sleep(500);
    assert(pathExists('Conversion Links/Plan/Plan.md'), 'Converted bundle main file missing.');
    assert(pathExists('Conversion Links/Plan/assets'), 'Converted bundle assets folder missing.');
    assert(!pathExists('Conversion Links/Plan.md'), 'Original converted markdown file still exists.');
    assert((await readText('Conversion Links/Plan/Plan.md')).includes('  - "Plan"'), 'Converted bundle did not add a bundle alias.');
    const indexContent = await readText('Conversion Links/Index.md');
    assert(indexContent.includes('[Plan](./Plan/Plan.md)'), 'Markdown document link was not rewritten after conversion.');
    assert(indexContent.includes('[[Conversion Links/Plan/Plan|Plan wiki link]]'), 'Wiki document link was not rewritten after conversion.');

    window.confirm = () => true;
    try {
      await plugin.migrateCurrentBundleAttachments(file('Legacy Attachments/Project/Project.md'));
    } finally {
      window.confirm = previousConfirm;
    }
    await sleep(500);
    assert(pathExists('Legacy Attachments/Project/assets/diagram.png'), 'Current migration did not move diagram.png.');
    assert(pathExists('Legacy Attachments/Project/assets/brief.pdf'), 'Current migration did not move brief.pdf.');
    assert(pathExists('Legacy Attachments/Project/assets/chart.png'), 'Current migration did not move chart.png.');
    assert(!pathExists('Legacy Attachments/External/diagram.png'), 'Current migration left diagram.png at source.');
    assert(!pathExists('Legacy Attachments/External/brief.pdf'), 'Current migration left brief.pdf at source.');
    assert(!pathExists('Legacy Attachments/External/chart.png'), 'Current migration left chart.png at source.');
    const projectContent = await readText('Legacy Attachments/Project/Project.md');
    assert(projectContent.includes('![Diagram](./assets/diagram.png)'), 'Current migration did not rewrite image markdown link.');
    assert(projectContent.includes('[Brief](./assets/brief.pdf)'), 'Current migration did not rewrite document markdown link.');
    assert(projectContent.includes('![Chart](./assets/chart.png)'), 'Current migration did not rewrite wiki image link.');

    const beforeVaultMigration = await plugin.buildVaultAttachmentMigrationReport();
    assert(beforeVaultMigration.attachmentsToMove === 2, 'Expected 2 shared attachments left before vault migration, got ' + beforeVaultMigration.attachmentsToMove + '.');
    window.confirm = () => true;
    try {
      await plugin.migrateVaultAttachments();
    } finally {
      window.confirm = previousConfirm;
    }
    await sleep(750);
    assert(pathExists('Shared Attachment/External/shared.png'), 'Shared source attachment should be preserved.');
    assert(pathExists('Shared Attachment/Alpha/assets/shared.png'), 'Vault migration did not copy shared attachment to Alpha.');
    assert(pathExists('Shared Attachment/Beta/assets/shared.png'), 'Vault migration did not copy shared attachment to Beta.');
    assert((await readText('Shared Attachment/Alpha/Alpha.md')).includes('![Shared](./assets/shared.png)'), 'Vault migration did not rewrite Alpha.');
    assert((await readText('Shared Attachment/Beta/Beta.md')).includes('![Shared](./assets/shared.png)'), 'Vault migration did not rewrite Beta.');
    const afterVaultMigration = await plugin.buildVaultAttachmentMigrationReport();
    assert(afterVaultMigration.attachmentsToMove === 0, 'Vault migration left pending attachments: ' + afterVaultMigration.attachmentsToMove + '.');

    plugin.refreshNativeFileExplorerPatch?.();
    await sleep(500);
    const postMutationScan = plugin.scanBundles();
    const postMutationMarkedBundles = [...document.querySelectorAll('.documents-bundle-native-bundle-title')]
      .map((title) => title.dataset.documentsBundlePath || '')
      .filter(Boolean);

    return {
      nativeFileExplorer: {
        deletedCommandAbsent: !commandExists('documents-bundle:open-documents-bundle-explorer'),
        markedBundlePaths,
        nativeBundleTitles,
        postMutationMarkedBundles,
        regularFolderMarked,
        existingBundleInternalsHidden,
        regularFolderChildrenHidden,
        clickOpenedExisting
      },
      scan,
      reportFiles,
      bundleQuickSwitcher: {
        commandExists: openBundleCommandExists,
        items: bundleSuggestionItems,
        modalVisible: bundleQuickSwitcherModalVisible,
        suggestions: bundleQuickSwitcherSuggestions,
        openedAlpha: bundleQuickSwitcherOpenedAlpha
      },
      operations: {
        editorPasteLifecycle: true,
        editorDropLifecycle: true,
        normalNoteAutoConvertLifecycle: true,
        normalNoteAskCancelLifecycle: true,
        normalNoteAskConfirmLifecycle: true,
        repairedBundles: 3,
        convertedPlan: true,
        currentBundleMigrationMoved: 3,
        vaultMigrationMovedOrCopied: 2,
        postMutationScan
      }
    };
  })()`);
  assert(result.nativeFileExplorer.deletedCommandAbsent, "Deleted custom explorer command is still present.");
  assert(result.nativeFileExplorer.markedBundlePaths.includes("Existing Bundle"), "Native Files pane did not mark Existing Bundle.");
  assert(!result.nativeFileExplorer.regularFolderMarked, "Native Files pane incorrectly marked Regular Folder.");
  assert(result.nativeFileExplorer.existingBundleInternalsHidden, "Native Files pane did not hide Bundle internals.");
  assert(!result.nativeFileExplorer.regularFolderChildrenHidden, "Native Files pane incorrectly hid normal folder children.");
  assert(result.nativeFileExplorer.clickOpenedExisting, "Native Files pane Bundle title click did not open the main Markdown file.");
  assert(result.scan.bundles === 4, `Expected 4 bundles, got ${result.scan.bundles}.`);
  assert(result.scan.incompleteCandidates === 2, `Expected 2 incomplete bundle candidates, got ${result.scan.incompleteCandidates}.`);
  assert(result.reportFiles.length > 0, "Vault attachment migration dry-run did not create a report.");
  assert(result.bundleQuickSwitcher.commandExists, "Open bundle document command was not registered.");
  assert(result.bundleQuickSwitcher.items.includes("Existing Bundle"), "Bundle quick switcher list did not include Existing Bundle.");
  assert(result.bundleQuickSwitcher.items.includes("Shared Attachment/Alpha"), "Bundle quick switcher list did not include nested Alpha bundle.");
  assert(result.bundleQuickSwitcher.modalVisible, "Open bundle document command did not show bundle suggestions.");
  assert(result.bundleQuickSwitcher.suggestions.some((text) => text.includes("Existing Bundle")), "Bundle quick switcher modal did not render Existing Bundle.");
  assert(!result.bundleQuickSwitcher.suggestions.some((text) => text.includes("assets")), "Bundle quick switcher modal exposed assets folders.");
  assert(result.bundleQuickSwitcher.openedAlpha, "Bundle quick switcher open path did not open Alpha bundle main file.");
  assert(result.operations.postMutationScan.bundles === 10, `Expected 10 bundles after normal-note conversions, repair, and conversion operations, got ${result.operations.postMutationScan.bundles}.`);
  assert(result.operations.postMutationScan.markdownFiles === 2, `Expected 2 normal markdown files after normal-note conversions, got ${result.operations.postMutationScan.markdownFiles}.`);
  assert(result.operations.postMutationScan.incompleteCandidates === 0, `Expected 0 incomplete candidates after repairs, got ${result.operations.postMutationScan.incompleteCandidates}.`);

  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function terminateTestObsidian() {
  spawnSync("pkill", ["-f", `remote-debugging-port=${port}`], {
    stdio: "ignore"
  });
  spawnSync("pkill", ["-f", userDataDir], {
    stdio: "ignore"
  });
  await sleep(1500);
  await removeWithRetry(userDataDir);
}

async function removeWithRetry(path) {
  for (let index = 0; index < 20; index += 1) {
    try {
      await rm(path, { force: true, recursive: true });
      return;
    } catch (error) {
      if (index === 19) {
        throw error;
      }
      await sleep(250);
    }
  }
}
