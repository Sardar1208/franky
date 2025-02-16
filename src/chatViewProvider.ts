import * as vscode from "vscode";
import { getWebviewContent } from "./webviewContent";
import { ChatManager } from "./ollamaClient";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private chatManager: ChatManager;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this.chatManager = new ChatManager();
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };

    webviewView.webview.html = getWebviewContent();
    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this.chatManager.streamChatWithOllama(webviewView, message.text);
    });
  }
}
