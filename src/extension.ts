import * as vscode from "vscode";
import { ChatViewProvider } from "./chatViewProvider";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatViewProvider(context);
  vscode.window.registerWebviewViewProvider("chatView", provider);
}

export function deactivate() {}
