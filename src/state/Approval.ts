import * as vscode from "vscode";

export interface Approval {
  editor: vscode.TextEditor;
  range: vscode.Range;
  highlight: vscode.TextEditorDecorationType;
  providerDisposable: vscode.Disposable;
}

let _activeApproval: Approval | null = null;

// Getter
export function getActiveApproval() {
  return _activeApproval;
}

// Setter
export function setActiveApproval(approval: Approval | null) {
  _activeApproval = approval;
}
