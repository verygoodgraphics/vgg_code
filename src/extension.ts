import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { template } from "./res/main.html";

let host = "https://verygoodgraphics.com";

host = "http://manjaro:8000";

class VGGCode implements vscode.FileStat {
  type: vscode.FileType;
  ctime: number;
  mtime: number;
  size: number;

  name: string;
  data?: Uint8Array;
  saveFunc!: (content: Uint8Array) => void;

  constructor(name: string) {
    this.type = vscode.FileType.File;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.size = 0;
    this.name = name;
  }
}

class VGGFS implements vscode.FileSystemProvider {
  private emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.emitter.event;

  openedFiles: Map<string, VGGCode> = new Map<string, VGGCode>();

  watch(
    uri: vscode.Uri,
    options: { recursive: boolean; excludes: string[] }
  ): vscode.Disposable {
    // ignore, fires for all changes...
    return new vscode.Disposable(() => {});
  }
  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    const fs = this.openedFiles.get(uri.path);
    if (fs) {
      return fs;
    } else {
      throw vscode.FileSystemError.FileNotFound();
    }
  }
  readDirectory(
    uri: vscode.Uri
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return [];
  }
  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    return;
  }
  readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    const fs = this.openedFiles.get(uri.path);
    if (fs && fs.data) {
      return fs.data;
    }
    throw vscode.FileSystemError.FileNotFound();
  }
  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): void | Thenable<void> {
    const fs = this.openedFiles.get(uri.path);
    if (fs) {
      fs.saveFunc(content);
    }
  }
  initFile(
    uri: vscode.Uri,
    content: Uint8Array,
    saveFunc: (content: Uint8Array) => void
  ): void | Thenable<void> {
    const name = uri.path;
    let fs = this.openedFiles.get(name);
    if (!fs) {
      fs = new VGGCode(name);
      this.openedFiles.set(name, fs);
    }
    fs.mtime = Date.now();
    fs.size = content.byteLength;
    fs.data = content;
    fs.saveFunc = saveFunc;
  }
  delete(
    uri: vscode.Uri,
    options: { recursive: boolean }
  ): void | Thenable<void> {
    this.openedFiles.delete(uri.path);
  }
  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): void | Thenable<void> {
    return;
  }
}

export function activate(context: vscode.ExtensionContext) {
  let currPanel: vscode.WebviewPanel | undefined = undefined;
  const vggFS = new VGGFS();

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("vgg.openEditor", () => {
    if (currPanel) {
      currPanel.reveal(vscode.ViewColumn.Two);
      return;
    }

    currPanel = vscode.window.createWebviewPanel(
      "vgg_editor",
      "VGG Editor",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    currPanel.webview.html = template({ host });
    currPanel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case "openExternal":
            vscode.env.openExternal(vscode.Uri.parse(msg.url));
            return;
          case "showInputBox":
            vscode.window.showInputBox({
              value: msg.text,
            });
            return;
          case "openEntityCode":
            const id = msg.entityID;
            const ext = msg.codeExt;
            const url = vscode.Uri.parse(`vggfs:/${id}.${ext}`);
            vggFS.initFile(
              url,
              Buffer.from(msg.content),
              (content: Uint8Array) => {
                currPanel?.webview.postMessage({
                  command: "saveEntityCode",
                  entityID: msg.entityID,
                  content: content.toString(),
                });
              }
            );
            vscode.window.showTextDocument(url, {
              viewColumn: vscode.ViewColumn.Beside,
            });
            return;
        }
      },
      undefined,
      context.subscriptions
    );
    currPanel.onDidDispose(
      () => {
        currPanel = undefined;
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("vggfs", vggFS, {
      isCaseSensitive: true,
    })
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
