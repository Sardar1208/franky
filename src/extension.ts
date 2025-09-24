import * as vscode from "vscode";
import { ChatViewProvider } from "./chatViewProvider";
import { getActiveApproval, setActiveApproval } from "./state/Approval";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatViewProvider(context);
  vscode.window.registerWebviewViewProvider("chatView", provider);

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.acceptChange", async () => {
      const activeApproval = getActiveApproval();
      if (activeApproval) {
        const { editor, highlight, providerDisposable } = activeApproval;
        editor.setDecorations(highlight, []);
        providerDisposable.dispose();
        setActiveApproval(null);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.declineChange", async () => {
      const activeApproval = getActiveApproval();
      if (activeApproval) {
        const { editor, range, highlight, providerDisposable } = activeApproval;
        await editor.edit((editBuilder) => {
          editBuilder.delete(range);
        });
        editor.setDecorations(highlight, []);
        providerDisposable.dispose();
        setActiveApproval(null);
      }
    })
  );
}

export function deactivate() {}
