import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let currPanel: vscode.WebviewPanel | undefined = undefined;

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
    currPanel.webview.html = fs
      .readFileSync(path.join(__filename, "..", "..", "res", "main.html"))
      .toString();
    currPanel.onDidDispose(
      () => {
        currPanel = undefined;
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
